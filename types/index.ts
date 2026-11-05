export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  provider?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
  provider: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  free: boolean;
  context?: string;
  description?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  envKey: string;
  models: ModelInfo[];
}
