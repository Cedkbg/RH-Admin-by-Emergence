import { NextRequest, NextResponse } from "next/server";
import { getLocalSession } from "@/server/auth";
import { prisma } from "@/server/prisma";

const delegates: Record<string, string> = {
  absence_justifications: "absenceJustification",
  agent_reports: "agentReport",
  announcements: "announcement",
  app_settings: "appSetting",
  appointments: "appointment",
  assistant_records: "assistantRecord",
  attendance: "attendance",
  attendance_locations: "attendanceLocation",
  audit_logs: "auditLog",
  break_sessions: "breakSession",
  candidates: "candidate",
  contacts: "contact",
  departments: "department",
  direction_executives: "directionExecutive",
  directions: "direction",
  documents: "document",
  employees: "employee",
  job_offers: "jobOffer",
  leave_requests: "leaveRequest",
  legal_records: "legalRecord",
  mail_register: "mailRegister",
  meeting_minutes: "meetingMinute",
  notifications: "notification",
  organizations: "organization",
  organization_members: "organizationMember",
  payroll: "payroll",
  performance_review_comments: "performanceReviewComment",
  performance_reviews: "performanceReview",
  platform_admins: "platformAdmin",
  profiles: "profile",
  role_audit_log: "roleAuditLog",
  talents: "talent",
  talent_rewards: "talentReward",
  task_chat_messages: "taskChatMessage",
  task_comments: "taskComment",
  tasks: "task",
  trainings: "training",
  user_roles: "userRole",
  wellbeing_surveys: "wellbeingSurvey",
};

const elevatedRoles = new Set(["admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction"]);
const restrictedTables = new Set(["payroll", "user_roles", "role_audit_log", "platform_admins"]);
const employeeScopedTables = new Set(["attendance", "leave_requests", "wellbeing_surveys", "agent_reports", "break_sessions"]);
const snakeToCamel = (value: string) => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const camelToSnake = (value: string) => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

function mapKeys(value: unknown, mapper: (key: string) => string): any {
  if (Array.isArray(value)) return value.map((item) => mapKeys(item, mapper));
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [mapper(key), mapKeys(item, mapper)]));
}

function selection(columns?: string) {
  if (!columns || columns === "*") return undefined;
  const fields = columns.split(",").map((field) => field.trim()).filter((field) => /^[a-zA-Z_][\w]*$/.test(field));
  return fields.length ? Object.fromEntries(fields.map((field) => [snakeToCamel(field), true])) : undefined;
}

export async function POST(request: NextRequest) {
  const current = await getLocalSession();
  if (!current) return NextResponse.json({ data: null, error: { message: "Authentification requise" } }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.table !== "string" || typeof body.operation !== "string") {
    return NextResponse.json({ data: null, error: { message: "Requête de données invalide" } }, { status: 400 });
  }
  const table = body.table as string;
  const delegateName = delegates[table];
  if (!delegateName) return NextResponse.json({ data: null, error: { message: "Table non autorisée" } }, { status: 403 });

  try {
    const roles = await prisma.userRole.findMany({ where: { userId: current.user.id }, select: { role: true } });
    const roleSet = new Set(roles.map(({ role }) => role));
    const isElevated = roles.some(({ role }) => elevatedRoles.has(role));
    if (restrictedTables.has(table) && !isElevated) {
      return NextResponse.json({ data: null, error: { message: "Permission refusée" } }, { status: 403 });
    }

    const model = (prisma as unknown as Record<string, any>)[delegateName];
    const where: Record<string, any> = {};
    const profile = current.session.profile;
    let hasOrganizationColumn = false;
    if (table === "organizations") {
      if (!profile.organizationId) return NextResponse.json({ data: [], error: null });
      where.id = profile.organizationId;
    } else if (table === "platform_admins") {
      where.userId = current.user.id;
    } else if (table === "user_roles" && !isElevated) {
      where.userId = current.user.id;
    } else {
      const schema = await prisma.$queryRaw<Array<{ has_org: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table} AND column_name = 'organization_id'
        ) AS has_org
      `;
      hasOrganizationColumn = Boolean(schema[0]?.has_org);
      if (hasOrganizationColumn && profile.organizationId) where.organizationId = profile.organizationId;
    }

    if (employeeScopedTables.has(table) && !isElevated) {
      const employee = await prisma.employee.findFirst({ where: { email: { equals: current.user.email, mode: "insensitive" } }, select: { id: true } });
      if (!employee) return NextResponse.json({ data: [], error: null });
      where.employeeId = employee.id;
    }

    for (const filter of Array.isArray(body.filters) ? body.filters : []) {
      if (!filter || typeof filter.field !== "string") continue;
      const field = snakeToCamel(filter.field);
      const operator = filter.operator;
      const value = filter.value;
      const condition = operator === "eq" ? value
        : operator === "neq" ? { not: value }
        : operator === "in" ? { in: value }
        : operator === "gte" ? { gte: value }
        : operator === "lte" ? { lte: value }
        : operator === "lt" ? { lt: value }
        : operator === "ilike" ? { contains: String(value).replaceAll("%", ""), mode: "insensitive" }
        : operator === "is" ? (value === null ? null : value)
        : undefined;
      if (condition !== undefined) where[field] = condition;
    }

    const operation = body.operation as string;
    if (["insert", "upsert"].includes(operation) && !isElevated && ["employees", "payroll", "organizations", "user_roles", "platform_admins", "app_settings"].includes(table)) {
      return NextResponse.json({ data: null, error: { message: "Permission refusée" } }, { status: 403 });
    }

    const orgColumnTables = new Set(Object.keys(delegates).filter((name) => name !== "organizations" && name !== "platform_admins"));
    const prepare = (row: unknown) => {
      const record = mapKeys(row, snakeToCamel) ?? {};
      if (hasOrganizationColumn) {
        if (!profile.organizationId) throw new Error("Aucune organisation n'est associée à ce compte");
        record.organizationId = profile.organizationId;
      }
      if (table === "task_comments") record.authorId = current.user.id;
      if (table === "task_chat_messages") record.authorId = current.user.id;
      if (table === "audit_logs") record.actorId = current.user.id;
      if (table === "notifications") record.userId = current.user.id;
      return record;
    };

    let result: any;
    const rows = Array.isArray(body.payload) ? body.payload.map(prepare) : prepare(body.payload);
    if (operation === "select") {
      const orderBy = body.order ? { [snakeToCamel(body.order.field)]: body.order.ascending === false ? "desc" : "asc" } : undefined;
      const skip = body.range ? Math.max(0, Number(body.range.from) || 0) : undefined;
      const take = body.range ? Math.max(0, Number(body.range.to) - Number(body.range.from) + 1) : body.limit;
      const [data, count] = await Promise.all([
        body.head ? Promise.resolve([]) : model.findMany({ where, select: selection(body.columns), orderBy, skip, take }),
        body.count === "exact" ? model.count({ where }) : Promise.resolve(null),
      ]);
      result = { data: body.single ? data[0] ?? null : data, error: null, count };
    } else if (operation === "insert") {
      const data = Array.isArray(rows)
        ? await model.createMany({ data: rows, skipDuplicates: true })
        : await model.create({ data: rows, select: selection(body.columns) });
      result = { data, error: null };
    } else if (operation === "update") {
      if (!Object.keys(where).length) throw new Error("Une condition est requise pour modifier des lignes");
      const data = await model.updateMany({ where, data: prepare(body.payload) });
      result = { data: null, error: null, count: data.count };
    } else if (operation === "delete") {
      if (!Object.keys(where).length) throw new Error("Une condition est requise pour supprimer des lignes");
      const data = await model.deleteMany({ where });
      result = { data: null, error: null, count: data.count };
    } else if (operation === "upsert") {
      if (!Object.keys(where).length) throw new Error("Une condition est requise pour remplacer une ligne");
      const uniqueField = Object.keys(where).find((field) => !field.startsWith("organization"));
      if (!uniqueField) throw new Error("Clé unique requise pour upsert");
      result = { data: await model.upsert({ where: { [uniqueField]: where[uniqueField] }, create: rows, update: rows, select: selection(body.columns) }), error: null };
    } else {
      throw new Error("Opération non prise en charge");
    }

    return NextResponse.json(mapKeys(result, camelToSnake));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de base de données";
    return NextResponse.json({ data: null, error: { message } });
  }
}
