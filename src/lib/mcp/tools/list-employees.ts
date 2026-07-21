import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_employees",
  title: "List employees",
  description:
    "List employees visible to the signed-in user (respects Emergence DRC access rules). Supports optional name/email search and a result limit.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Optional substring matched against first name, last name, or email."),
    limit: z.number().int().positive().optional().describe("Maximum number of rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const capped = Math.min(limit ?? 50, 200);
    let query = supabaseForUser(ctx)
      .from("employees")
      .select("id,matricule,first_name,last_name,email,position,direction_code,department_id,active")
      .order("last_name", { ascending: true })
      .limit(capped);

    if (search) {
      const s = search.replace(/[%,]/g, "");
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { employees: data ?? [] },
    };
  },
});
