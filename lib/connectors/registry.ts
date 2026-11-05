export type ConnectorAuth = "mcp-oauth" | "github" | "google";

export interface ConnectorDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  group: "Developer" | "Google" | "Data" | "Productivity";
  auth: ConnectorAuth;
  /** Remote MCP endpoint (not used for Google connectors, which use Google REST APIs). */
  url?: string;
  scopes?: string[];
  /** Short prefix used when namespacing tool names for the model. */
  toolPrefix: string;
  /** Allow pasting an access token instead of the OAuth sign-in. */
  allowToken?: boolean;
  tokenHelp?: string;
  /** Env vars that must exist before this connector can be connected. */
  requiredEnv: string[];
}

const GOOGLE_ENV = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];

export const CONNECTORS: ConnectorDef[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Repos, files, branches, issues, pull requests, Actions. Official GitHub MCP server.",
    icon: "🐙",
    group: "Developer",
    auth: "github",
    url: "https://api.githubcopilot.com/mcp/",
    scopes: ["repo", "workflow", "read:org", "gist", "user"],
    toolPrefix: "github",
    allowToken: true,
    tokenHelp: "GitHub personal access token (github.com/settings/tokens)",
    requiredEnv: ["GITHUB_MCP_CLIENT_ID", "GITHUB_MCP_CLIENT_SECRET"],
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Projects, deployments, logs, domains, env vars. Official Vercel MCP server.",
    icon: "▲",
    group: "Developer",
    auth: "mcp-oauth",
    url: "https://mcp.vercel.com",
    toolPrefix: "vercel",
    allowToken: true,
    tokenHelp: "Vercel access token (vercel.com/account/tokens)",
    requiredEnv: [],
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "Sites, deploys, env vars, forms. Official Netlify MCP server.",
    icon: "🌐",
    group: "Developer",
    auth: "mcp-oauth",
    url: "https://netlify-mcp.netlify.app/mcp",
    toolPrefix: "netlify",
    allowToken: true,
    tokenHelp: "Netlify personal access token",
    requiredEnv: [],
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Projects, tables, SQL, migrations, edge functions, logs. Official Supabase MCP server.",
    icon: "⚡",
    group: "Data",
    auth: "mcp-oauth",
    url: "https://mcp.supabase.com/mcp",
    toolPrefix: "supabase",
    allowToken: true,
    tokenHelp: "Supabase personal access token (supabase.com/dashboard/account/tokens)",
    requiredEnv: [],
  },
  {
    id: "mongodb",
    name: "MongoDB Atlas",
    description: "Clusters, databases, collections, queries. Official MongoDB Atlas MCP server.",
    icon: "🍃",
    group: "Data",
    auth: "mcp-oauth",
    url: "https://mcp.mongodb.com",
    toolPrefix: "mongodb",
    allowToken: true,
    tokenHelp: "Atlas MCP access token",
    requiredEnv: [],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Search, read, create and edit Drive files, Google Docs and Google Sheets.",
    icon: "📁",
    group: "Google",
    auth: "google",
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
    toolPrefix: "gdrive",
    requiredEnv: GOOGLE_ENV,
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "List calendars, read, create, update and delete events.",
    icon: "📅",
    group: "Google",
    auth: "google",
    scopes: ["https://www.googleapis.com/auth/calendar"],
    toolPrefix: "gcal",
    requiredEnv: GOOGLE_ENV,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Search, read, send and draft email, manage labels.",
    icon: "✉️",
    group: "Google",
    auth: "google",
    scopes: ["https://www.googleapis.com/auth/gmail.modify"],
    toolPrefix: "gmail",
    requiredEnv: GOOGLE_ENV,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search and edit pages and databases. Official Notion MCP server.",
    icon: "📝",
    group: "Productivity",
    auth: "mcp-oauth",
    url: "https://mcp.notion.com/mcp",
    toolPrefix: "notion",
    requiredEnv: [],
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issues, projects and cycles. Official Linear MCP server.",
    icon: "📐",
    group: "Productivity",
    auth: "mcp-oauth",
    url: "https://mcp.linear.app/mcp",
    toolPrefix: "linear",
    requiredEnv: [],
  },
];

export function getConnectorDef(id: string): ConnectorDef | undefined {
  return CONNECTORS.find((c) => c.id === id);
}

export function missingEnv(def: ConnectorDef): string[] {
  return def.requiredEnv.filter((k) => !process.env[k]);
}

/** Env var names holding a pre-registered OAuth client for a connector (optional for DCR servers). */
export function clientEnvKeys(def: ConnectorDef): { id: string; secret: string } {
  if (def.auth === "google") {
    return { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" };
  }
  const p = def.id.toUpperCase().replace(/-/g, "_") + "_MCP";
  return { id: `${p}_CLIENT_ID`, secret: `${p}_CLIENT_SECRET` };
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "custom"
  );
}
