import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_announcements",
  title: "List announcements",
  description: "List the most recent internal announcements visible to the signed-in user.",
  inputSchema: {
    limit: z.number().int().positive().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const capped = Math.min(limit ?? 20, 100);
    const { data, error } = await supabaseForUser(ctx)
      .from("announcements")
      .select("id,title,body,created_at,author_id")
      .order("created_at", { ascending: false })
      .limit(capped);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { announcements: data ?? [] },
    };
  },
});
