import { ProviderConfig, ModelInfo } from "@/types";

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    models: [
      {
        id: "openai/gpt-oss-120b",
        name: "GPT-OSS 120B",
        provider: "groq",
        free: true,
        context: "131K",
        description: "High performance open model",
      },
      {
        id: "openai/gpt-oss-20b",
        name: "GPT-OSS 20B",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Fast mid-size model",
      },
      {
        id: "qwen/qwen3.8-27b",
        name: "Qwen 3.8 27B",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Strong coding and reasoning",
      },
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Meta Llama versatile",
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Ultra fast small model",
      },
      {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        name: "Llama 4 Scout",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Meta Llama 4 Scout",
      },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    models: [
      {
        id: "openrouter/free",
        name: "Free Router (Auto)",
        provider: "openrouter",
        free: true,
        context: "200K",
        description: "Routes to available free models",
      },
      {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        name: "Nemotron 3 Ultra",
        provider: "openrouter",
        free: true,
        context: "1M",
        description: "NVIDIA frontier reasoning",
      },
      {
        id: "google/gemma-4-31b-it:free",
        name: "Gemma 4 31B",
        provider: "openrouter",
        free: true,
        context: "262K",
        description: "Google Gemma 4",
      },
      {
        id: "google/gemma-4-26b-a4b-it:free",
        name: "Gemma 4 26B A4B",
        provider: "openrouter",
        free: true,
        context: "262K",
        description: "Google Gemma 4 MoE",
      },
      {
        id: "nvidia/nemotron-3.5-lightning:free",
        name: "Nemotron 3.5 Lightning",
        provider: "openrouter",
        free: true,
        context: "1M",
        description: "Fast NVIDIA model",
      },
      {
        id: "nvidia/nemotron-3.5-super-vl:free",
        name: "Nemotron 3.5 Super VL",
        provider: "openrouter",
        free: true,
        context: "1M",
        description: "Multimodal NVIDIA",
      },
      {
        id: "cohere/north-mini-code:free",
        name: "North Mini Code",
        provider: "openrouter",
        free: true,
        context: "256K",
        description: "Cohere coding model",
      },
      {
        id: "recursive/flint-v1.0:free",
        name: "Flint v1.0",
        provider: "openrouter",
        free: true,
        context: "262K",
        description: "Coding agent model",
      },
      {
        id: "liquid/lfm-2.5-2.6b:free",
        name: "LFM 2.5 2.6B",
        provider: "openrouter",
        free: true,
        context: "66K",
        description: "LiquidAI small model",
      },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    envKey: "DEEPSEEK_API_KEY",
    models: [
      {
        id: "deepseek-flash",
        name: "DeepSeek V4.1 Flash",
        provider: "deepseek",
        free: false,
        context: "1M",
        description: "Fast DeepSeek model (requires credits)",
      },
      {
        id: "deepseek-v4-pro",
        name: "DeepSeek V4 Pro",
        provider: "deepseek",
        free: false,
        context: "1M",
        description: "Pro DeepSeek model (requires credits)",
      },
    ],
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    baseUrl: "https://api.moonshot.ai/v1",
    envKey: "MOONSHOT_API_KEY",
    models: [
      {
        id: "kimi-k3",
        name: "Kimi K3",
        provider: "kimi",
        free: false,
        context: "1M",
        description: "Flagship Kimi model (requires credits)",
      },
      {
        id: "kimi-k2.6",
        name: "Kimi K2.6",
        provider: "kimi",
        free: false,
        context: "256K",
        description: "Kimi K2.6 (requires credits)",
      },
      {
        id: "moonshot-v1-8k",
        name: "Moonshot V1 8K",
        provider: "kimi",
        free: false,
        context: "8K",
        description: "Legacy Moonshot model",
      },
    ],
  },
  {
    id: "xai",
    name: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1",
    envKey: "XAI_API_KEY",
    models: [
      {
        id: "grok-4.20",
        name: "Grok 4.20",
        provider: "xai",
        free: false,
        context: "1M",
        description: "Grok 4.20 (requires credits)",
      },
      {
        id: "grok-4.3",
        name: "Grok 4.3",
        provider: "xai",
        free: false,
        context: "1M",
        description: "Grok 4.3 (requires credits)",
      },
      {
        id: "grok-4.1-fast",
        name: "Grok 4.1 Fast",
        provider: "xai",
        free: false,
        context: "128K",
        description: "Fast Grok model (requires credits)",
      },
      {
        id: "grok-build-0.1",
        name: "Grok Build 0.1",
        provider: "xai",
        free: false,
        context: "256K",
        description: "Grok coding model (requires credits)",
      },
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
