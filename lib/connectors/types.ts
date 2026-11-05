export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

/** Anything that can list tools and run them (a remote MCP server or a built-in provider). */
export interface ToolProvider {
  listTools(): Promise<McpTool[]>;
  callTool(name: string, args: any): Promise<string>;
}

/** Secret material for one connection. Stored AES-GCM encrypted. */
export interface ConnData {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  resource?: string;
  codeVerifier?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  staticToken?: boolean;
}
