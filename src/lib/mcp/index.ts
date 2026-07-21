import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getCurrentUser from "./tools/get-current-user";
import listEmployees from "./tools/list-employees";
import listReports from "./tools/list-my-reports";
import listAnnouncements from "./tools/list-announcements";

// Direct Supabase issuer (never the .lovable.cloud proxy). Read the project ref
// from the Vite env inlined at build time so this module stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "emergence-drc-mcp",
  title: "Emergence DRC",
  version: "0.1.0",
  instructions:
    "Tools for the Emergence DRC HR platform. Every call runs as the signed-in user and respects the app's row-level security (RH, paie, présence, rapports, etc.). Use get_current_user first to confirm identity and roles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getCurrentUser, listEmployees, listReports, listAnnouncements],
});
