import { ProviderConfig, ModelInfo } from "@/types";

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    models: [
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", provider: "groq", free: true, context: "131K", description: "High performance open model" },
      { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", provider: "groq", free: true, context: "131K", description: "Fast mid-size model" },
      { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B", provider: "groq", free: true, context: "131K", description: "Strong coding and reasoning" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", free: true, context: "131K", description: "Meta Llama versatile" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", provider: "groq", free: true, context: "131K", description: "Ultra fast small model" },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", provider: "groq", free: true, context: "131K", description: "Meta Llama 4 Scout" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    models: [
      { id: "openrouter/free", name: "Free Router (Auto)", provider: "openrouter", free: true, context: "200K", description: "Routes to available free models" },
      { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra", provider: "openrouter", free: true, context: "1M", description: "NVIDIA frontier reasoning" },
      { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B", provider: "openrouter", free: true, context: "262K", description: "Google Gemma 4" },
      { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B A4B", provider: "openrouter", free: true, context: "262K", description: "Google Gemma 4 MoE" },
      { id: "nvidia/nemotron-3.5-lightning:free", name: "Nemotron 3.5 Lightning", provider: "openrouter", free: true, context: "1M", description: "Fast NVIDIA model" },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", provider: "openrouter", free: true, context: "64K", description: "DeepSeek R1 reasoning free" },
      { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek Chat V3 (Free)", provider: "openrouter", free: true, context: "64K", description: "DeepSeek chat free tier" },
      { id: "moonshotai/kimi-k2:free", name: "Kimi K2 (Free)", provider: "openrouter", free: true, context: "32K", description: "Moonshot Kimi free via OpenRouter" },
      { id: "x-ai/grok-4.1-fast:free", name: "Grok 4.1 Fast (Free)", provider: "openrouter", free: true, context: "128K", description: "xAI Grok free via OpenRouter when available" },
      { id: "cohere/north-mini-code:free", name: "North Mini Code", provider: "openrouter", free: true, context: "256K", description: "Cohere coding model" },
      { id: "liquid/lfm-2.5-2.6b:free", name: "LFM 2.5 2.6B", provider: "openrouter", free: true, context: "66K", description: "LiquidAI small model" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    envKey: "DEEPSEEK_API_KEY",
    models: [
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", provider: "deepseek", free: true, context: "64K", description: "Free via OpenRouter route" },
      { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek Chat V3 (Free)", provider: "deepseek", free: true, context: "64K", description: "Free via OpenRouter route" },
      { id: "deepseek-chat", name: "DeepSeek Chat (Paid)", provider: "deepseek", free: false, context: "64K", description: "Official DeepSeek API" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner (Paid)", provider: "deepseek", free: false, context: "64K", description: "Official reasoning model" },
    ],
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    baseUrl: "https://api.moonshot.ai/v1",
    envKey: "MOONSHOT_API_KEY",
    models: [
      { id: "moonshotai/kimi-k2:free", name: "Kimi K2 (Free)", provider: "kimi", free: true, context: "32K", description: "Free via OpenRouter route" },
      { id: "moonshot-v1-8k", name: "Moonshot V1 8K (Paid)", provider: "kimi", free: false, context: "8K", description: "Official Moonshot API" },
      { id: "moonshot-v1-32k", name: "Moonshot V1 32K (Paid)", provider: "kimi", free: false, context: "32K", description: "Official Moonshot API" },
      { id: "moonshot-v1-128k", name: "Moonshot V1 128K (Paid)", provider: "kimi", free: false, context: "128K", description: "Official Moonshot API" },
    ],
  },
  {
    id: "xai",
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1",
    envKey: "XAI_API_KEY",
    models: [
      { id: "x-ai/grok-4.1-fast:free", name: "Grok 4.1 Fast (Free)", provider: "xai", free: true, context: "128K", description: "Free via OpenRouter when listed" },
      { id: "grok-2-1212", name: "Grok 2 (Paid)", provider: "xai", free: false, context: "128K", description: "Official xAI API" },
      { id: "grok-2-vision-1212", name: "Grok 2 Vision (Paid)", provider: "xai", free: false, context: "32K", description: "Official xAI vision" },
      { id: "grok-3", name: "Grok 3 (Paid)", provider: "xai", free: false, context: "128K", description: "Official xAI Grok 3" },
    ],
  },
];

export function getAllModels(): ModelInfo[] {
  return PROVIDERS.flatMap((p) => p.models);
}

export function getProviderById(id: string): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getModelById(modelId: string): ModelInfo | undefined {
  return getAllModels().find((m) => m.id === modelId);
}

export function getFreeModels(): ModelInfo[] {
  return getAllModels().filter((m) => m.free);
}

/** Free models under deepseek/kimi/xai route through OpenRouter */
export function shouldUseOpenRouter(provider: string, modelId: string): boolean {
  if (provider === "openrouter" || provider === "groq") return false;
  const model = getModelById(modelId);
  return !!model?.free;
}
