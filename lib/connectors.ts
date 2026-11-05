export type ConnectorCategory =
  | "featured"
  | "productivity"
  | "finance"
  | "developer"
  | "sales"
  | "social"
  | "analytics"
  | "advertising"
  | "custom";

/** Supabase Auth provider used for real OAuth */
export type OauthProvider = "google" | "github" | "azure" | "discord";

export interface Connector {
  id: string;
  name: string;
  description: string;
  category: ConnectorCategory;
  icon?: string;
  /** Real OAuth via Supabase Auth provider */
  oauthProvider?: OauthProvider;
  /** Extra OAuth scopes requested (space-joined by the client) */
  oauthScopes?: string[];
  /** Optional external MCP endpoint hint */
  mcpHint?: string;
}

export const CONNECTORS: Connector[] = [
  // Featured
  {
    id: "finance",
    name: "Finance",
    description: "Securely connect financial accounts",
    category: "featured",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Search and draft emails",
    category: "featured",
    oauthProvider: "google",
    oauthScopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Check your schedule",
    category: "featured",
    oauthProvider: "google",
    oauthScopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Search files and docs",
    category: "featured",
    oauthProvider: "google",
    oauthScopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
    ],
  },
  {
    id: "box",
    name: "Box",
    description: "Search files and docs",
    category: "featured",
  },
  {
    id: "canva",
    name: "Canva",
    description: "Create and edit designs",
    category: "featured",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search pages and docs",
    category: "featured",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Manage your store",
    category: "featured",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Look up payments",
    category: "featured",
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Manage your deploys",
    category: "featured",
  },
  {
    id: "wix",
    name: "Wix",
    description: "Manage your Wix site",
    category: "featured",
  },

  // Productivity
  {
    id: "outlook",
    name: "Outlook",
    description: "Search and draft emails",
    category: "productivity",
    oauthProvider: "azure",
    oauthScopes: [
      "Mail.Read",
      "Mail.ReadWrite",
      "Mail.Send",
      "User.Read",
    ],
  },
  {
    id: "outlook-calendar",
    name: "Outlook Calendar",
    description: "Check your schedule",
    category: "productivity",
    oauthProvider: "azure",
    oauthScopes: ["Calendars.Read", "Calendars.ReadWrite", "User.Read"],
  },
  {
    id: "asana",
    name: "Asana",
    description: "Track projects and tasks",
    category: "productivity",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Schedule meetings",
    category: "productivity",
  },
  {
    id: "clickup",
    name: "ClickUp",
    description: "Track projects and tasks",
    category: "productivity",
  },
  {
    id: "figma",
    name: "Figma",
    description: "Inspect designs and files",
    category: "productivity",
  },
  {
    id: "gamma",
    name: "Gamma",
    description: "Generate presentations",
    category: "productivity",
  },
  {
    id: "hyperframes",
    name: "HyperFrames by HeyGen",
    description: "Create AI videos",
    category: "productivity",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Search and update issues",
    category: "productivity",
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    description: "Search chats and channels",
    category: "productivity",
    oauthProvider: "azure",
    oauthScopes: ["Chat.Read", "ChannelMessage.Read.All", "User.Read"],
  },
  {
    id: "ringcentral-chat",
    name: "RingCentral Chat",
    description: "mcp.labs.ringcentral.com",
    category: "productivity",
    mcpHint: "mcp.labs.ringcentral.com",
  },
  {
    id: "ringcentral-phone",
    name: "RingCentral Phone",
    description: "mcp.labs.ringcentral.com",
    category: "productivity",
    mcpHint: "mcp.labs.ringcentral.com",
  },
  {
    id: "whop",
    name: "Whop",
    description: "mcp.whop.com",
    category: "productivity",
    mcpHint: "mcp.whop.com",
  },

  // Finance
  {
    id: "bigdata",
    name: "Bigdata.com",
    description: "Finance research, news & data",
    category: "finance",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    description: "Trade stocks, derivatives, & crypto",
    category: "finance",
  },
  {
    id: "daloopa",
    name: "Daloopa",
    description: "Financial model data",
    category: "finance",
  },
  {
    id: "finary",
    name: "Finary",
    description: "public-api.finary.com",
    category: "finance",
    mcpHint: "public-api.finary.com",
  },
  {
    id: "ibkr",
    name: "Interactive Brokers (IBKR)",
    description: "View markets and trades",
    category: "finance",
  },
  {
    id: "robinhood",
    name: "Robinhood",
    description: "Track your investments",
    category: "finance",
  },
  {
    id: "spglobal",
    name: "S&P Global",
    description: "Market and company data",
    category: "finance",
  },
  {
    id: "scalable-capital",
    name: "Scalable Capital",
    description: "mcp.scalable.capital",
    category: "finance",
    mcpHint: "mcp.scalable.capital",
  },
  {
    id: "webull",
    name: "Webull",
    description: "Track markets and trades",
    category: "finance",
  },
  {
    id: "x-money",
    name: "X Money",
    description: "Pay and manage money on X",
    category: "finance",
  },
  {
    id: "etoro",
    name: "etoro",
    description: "Track your portfolio",
    category: "finance",
  },

  // Developer
  {
    id: "github",
    name: "GitHub",
    description: "Search code, repos, issues and more",
    category: "developer",
    oauthProvider: "github",
    oauthScopes: ["repo", "read:user", "user:email", "read:org"],
  },
  {
    id: "netlify",
    name: "Netlify",
    description: "Manage sites and deploys",
    category: "developer",
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Query and manage your projects",
    category: "developer",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    description: "Query and manage databases",
    category: "developer",
  },
  {
    id: "datadog",
    name: "Datadog",
    description: "Query metrics and logs",
    category: "developer",
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    description: "Sketch diagrams",
    category: "developer",
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    description: "Query product analytics",
    category: "developer",
  },

  // Sales
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Query contacts and deals",
    category: "sales",
  },
  {
    id: "meltwater",
    name: "Meltwater",
    description: "Monitor media coverage",
    category: "sales",
  },

  // Social Media
  {
    id: "buffer",
    name: "Buffer",
    description: "Social media scheduling and publishing",
    category: "social",
  },

  // Analytics
  {
    id: "bigquery",
    name: "Google Cloud BigQuery",
    description: "Query BigQuery datasets",
    category: "analytics",
    oauthProvider: "google",
    oauthScopes: ["https://www.googleapis.com/auth/bigquery"],
  },

  // Advertising
  {
    id: "x-ads",
    name: "X Ads",
    description: "Manage X ad campaigns",
    category: "advertising",
  },
];

export const CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  featured: "Featured",
  productivity: "Productivity",
  finance: "Finance",
  developer: "Developer",
  sales: "Sales",
  social: "Social Media",
  analytics: "Analytics",
  advertising: "Advertising",
  custom: "Custom",
};

export const CATEGORY_ORDER: ConnectorCategory[] = [
  "featured",
  "productivity",
  "finance",
  "developer",
  "sales",
  "social",
  "analytics",
  "advertising",
];

export function getConnectorById(id: string): Connector | undefined {
  return CONNECTORS.find((c) => c.id === id);
}
