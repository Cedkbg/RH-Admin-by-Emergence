export type LocalUser = {
  id: string;
  email?: string;
  updated_at?: string;
  last_sign_in_at?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown> & { full_name?: string };
};

export type LocalSession = {
  access_token: string;
  refresh_token?: string;
  user: LocalUser;
  expires_at?: number;
};

export type User = LocalUser;
export type Session = LocalSession;

type QueryState = {
  table: string;
  operation: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  payload?: unknown;
  filters: Array<{ field: string; operator: string; value: unknown }>;
  order?: { field: string; ascending: boolean };
  limit?: number;
  range?: { from: number; to: number };
  count?: "exact";
  head?: boolean;
  single?: boolean;
};

type QueryResult<T> = { data: T; error: { message: string } | null; count?: number | null };

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Database request failed");
  return body as T;
};

class LocalQuery<T = any> implements PromiseLike<QueryResult<T>> {
  private readonly state: QueryState;

  constructor(table: string) {
    this.state = { table, operation: "select", filters: [] };
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.state.columns = columns;
    this.state.count = options?.count;
    this.state.head = options?.head;
    return this;
  }

  insert(payload: unknown) { this.state.operation = "insert"; this.state.payload = payload; return this; }
  update(payload: unknown) { this.state.operation = "update"; this.state.payload = payload; return this; }
  upsert(payload: unknown, options?: unknown) { this.state.operation = "upsert"; this.state.payload = payload; return this; }
  delete() { this.state.operation = "delete"; return this; }
  eq(field: string, value: unknown) { this.state.filters.push({ field, operator: "eq", value }); return this; }
  neq(field: string, value: unknown) { this.state.filters.push({ field, operator: "neq", value }); return this; }
  in(field: string, value: unknown[]) { this.state.filters.push({ field, operator: "in", value }); return this; }
  ilike(field: string, value: unknown) { this.state.filters.push({ field, operator: "ilike", value }); return this; }
  gte(field: string, value: unknown) { this.state.filters.push({ field, operator: "gte", value }); return this; }
  lte(field: string, value: unknown) { this.state.filters.push({ field, operator: "lte", value }); return this; }
  lt(field: string, value: unknown) { this.state.filters.push({ field, operator: "lt", value }); return this; }
  is(field: string, value: unknown) { this.state.filters.push({ field, operator: "is", value }); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.state.order = { field, ascending: options?.ascending ?? true }; return this; }
  limit(value: number) { this.state.limit = value; return this; }
  range(from: number, to: number) { this.state.range = { from, to }; return this; }
  single() { this.state.single = true; return this; }
  maybeSingle() { this.state.single = true; return this; }
  returns<R>() { return this as unknown as LocalQuery<R>; }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const result = request<QueryResult<T>>("/api/data", {
      method: "POST",
      body: JSON.stringify(this.state),
    }).catch((error: Error) => ({ data: null as T, error: { message: error.message }, count: null }));
    return result.then(onfulfilled, onrejected);
  }
}

type AuthListener = (event: string, session: LocalSession | null) => void;
const authListeners = new Set<AuthListener>();
const notifyAuth = (event: string, session: LocalSession | null) => authListeners.forEach((listener) => listener(event, session));

const auth = {
  getSession: () => request<{ data: { session: LocalSession | null } }>("/api/auth/session"),
  getUser: () => request<{ data: { user: LocalUser | null } }>("/api/auth/user"),
  signInWithPassword: async (credentials: { email: string; password: string }) => {
    const result = await request<{ data: { user: LocalUser | null; session: LocalSession | null }; error: { message: string } | null }>("/api/auth/sign-in", { method: "POST", body: JSON.stringify(credentials) });
    if (result.data.session) notifyAuth("SIGNED_IN", result.data.session);
    return result;
  },
  signUp: (payload: unknown) => request<{ error: { message: string } | null }>("/api/auth/sign-up", { method: "POST", body: JSON.stringify(payload) }),
  signOut: async (_options?: unknown) => {
    const result = await request<{ error: { message: string } | null }>("/api/auth/sign-out", { method: "POST" });
    notifyAuth("SIGNED_OUT", null);
    return result;
  },
  resetPasswordForEmail: (email: string, options?: unknown) => request<{ error: { message: string } | null }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email, options }) }),
  exchangeCodeForSession: async (code: string) => {
    const result = await request<{ data: { session: LocalSession | null }; error: { message: string } | null }>("/api/auth/exchange", { method: "POST", body: JSON.stringify({ code }) });
    if (result.data.session) notifyAuth("SIGNED_IN", result.data.session);
    return result;
  },
  setSession: async (session: { access_token: string; refresh_token?: string }) => {
    const result = await request<{ data: { session: LocalSession | null }; error: { message: string } | null }>("/api/auth/session", { method: "POST", body: JSON.stringify(session) });
    if (result.data.session) notifyAuth("SIGNED_IN", result.data.session);
    return result;
  },
  updateUser: (payload: unknown) => request<{ error: { message: string } | null }>("/api/auth/user", { method: "PATCH", body: JSON.stringify(payload) }),
  onAuthStateChange: (callback?: AuthListener) => {
    if (callback) authListeners.add(callback);
    return { data: { subscription: { unsubscribe: () => { if (callback) authListeners.delete(callback); } } } };
  },
};

const storage = {
  from: (bucket: string) => ({
    upload: async (path: string, file: File, options?: unknown) => {
      const form = new FormData();
      form.set("bucket", bucket);
      form.set("path", path);
      form.set("file", file);
      form.set("options", JSON.stringify(options ?? {}));
      const response = await fetch("/api/files", { method: "POST", body: form, credentials: "same-origin" });
      const result = await response.json();
      return { data: result.data, error: response.ok ? result.error : { message: result.error?.message ?? "File upload failed" } };
    },
    getPublicUrl: (path: string) => ({ data: { publicUrl: `/api/files/${bucket}/${path}` } }),
    createSignedUrl: (path: string, expiresIn: number) => request<{ data: { signedUrl: string } | null; error: { message: string } | null }>(`/api/files/sign`, { method: "POST", body: JSON.stringify({ bucket, path, expiresIn }) }),
    remove: (paths: string[]) => request(`/api/files`, { method: "DELETE", body: JSON.stringify({ bucket, paths }) }),
  }),
};

const functions = {
  invoke: (name: string, options?: { body?: unknown; method?: string; headers?: Record<string, string> }) => {
    const method = options?.method ?? "POST";
    const init: RequestInit = { method, headers: options?.headers };
    if (method !== "GET" && method !== "HEAD") init.body = JSON.stringify(options?.body ?? null);
    return request<{ data: any; error: { message: string } | null }>(`/api/actions/${name}`, init);
  },
};

type ChangePayload = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: any; old: any };

const channel = (_name?: string) => {
  const subscriptions: Array<{ event: string; table: string; filter?: string; callback: (payload: ChangePayload) => void }> = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  const snapshots = new Map<string, Map<string, Record<string, unknown>>>();
  const subscription = {
    on: (_type: string, options: { event?: string; schema?: string; table?: string; filter?: string }, callback: (payload: ChangePayload) => void) => {
      if (options.table) subscriptions.push({ event: options.event ?? "*", table: options.table, filter: options.filter, callback });
      return subscription;
    },
    subscribe: () => {
      const poll = async () => {
        for (const item of subscriptions) {
          const key = `${item.table}:${item.filter ?? ""}`;
          const filters: QueryState["filters"] = [];
          const match = item.filter?.match(/^([^=]+)=eq\.(.*)$/);
          if (match) filters.push({ field: match[1], operator: "eq", value: match[2] });
          try {
            const result = await request<QueryResult<Record<string, unknown>[]>>("/api/data", {
              method: "POST", body: JSON.stringify({ table: item.table, operation: "select", columns: "*", filters }),
            });
            if (result.error) continue;
            const next = new Map((result.data ?? []).filter((row) => row.id).map((row) => [String(row.id), row]));
            const previous = snapshots.get(key);
            snapshots.set(key, next);
            if (!previous) continue;
            for (const [id, row] of next) {
              const old = previous.get(id);
              if (!old) {
                if (item.event === "*" || item.event === "INSERT") item.callback({ eventType: "INSERT", new: row, old: {} });
              } else if (JSON.stringify(old) !== JSON.stringify(row) && (item.event === "*" || item.event === "UPDATE")) {
                item.callback({ eventType: "UPDATE", new: row, old });
              }
            }
            for (const [id, row] of previous) {
              if (!next.has(id) && (item.event === "*" || item.event === "DELETE")) item.callback({ eventType: "DELETE", new: {}, old: row });
            }
          } catch { /* A failed poll is retried on the next interval. */ }
        }
      };
      void poll();
      timer = setInterval(poll, 5000);
      return subscription;
    },
    unsubscribe: () => { if (timer) clearInterval(timer); },
  };
  return subscription;
};

const channels = new Set<ReturnType<typeof channel>>();

export const localDb = {
  from: <R = any>(table: string) => new LocalQuery<R>(table),
  rpc: <R = any>(name: string, args?: unknown) => request<{ data: R; error: { message: string } | null }>(`/api/rpc/${name}`, { method: "POST", body: JSON.stringify(args ?? {}) }),
  auth,
  storage,
  functions,
  channel: (name?: string) => { const next = channel(name); channels.add(next); return next; },
  removeChannel: (subscription?: { unsubscribe?: () => void }) => { subscription?.unsubscribe?.(); },
};
