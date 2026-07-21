import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_current_user",
  title: "Get current user",
  description: "Return the profile, roles, and linked employee record of the signed-in Emergence DRC user.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [{ data: profile }, { data: roles }, { data: employee }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,approval_status").eq("id", userId!).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!),
      supabase.rpc("current_employee_id"),
    ]);

    const payload = {
      user_id: userId,
      email: ctx.getUserEmail(),
      profile,
      roles: (roles ?? []).map((r: any) => r.role),
      employee_id: employee ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
