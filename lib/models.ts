import { ProviderConfig, ModelInfo } from "@/types";

/**
 * Free models only where possible.
 * - Claude: no official free API (not listed)
 * - Hugging Face Inference: mostly paid in 2026 (not listed as free)
 * - Meta Llama: free via Groq + OpenRouter
 * - OpenRouter :free models update often — list reflects Nov 2026 live set
 */
export const PROVIDERS: ProviderConfig[] = [
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Meta Llama 3.3 — free on Groq",
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Meta Llama — ultra fast free",
      },
      {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        name: "Llama 4 Scout",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Meta Llama 4 Scout — free on Groq",
      },
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
        description: "Fast mid-size open model",
      },
      {
        id: "qwen/qwen3.8-27b",
        name: "Qwen 3.8 27B",
        provider: "groq",
        free: true,
        context: "131K",
        description: "Strong coding and reasoning",
      },
    ],
  },
  {
    id: "meta",
    name: "Meta (Llama)",
    baseUrl: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B (Groq)",
        provider: "meta",
        free: true,
        context: "131K",
        description: "Meta Llama 3.3 via Groq free tier",
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        provider: "meta",
        free: true,
        context: "131K",
        description: "Fast Meta Llama 3.1",
      },
      {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        name: "Llama 4 Scout",
        provider: "meta",
        free: true,
        context: "131K",
        description: "Meta Llama 4 Scout",
      },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter (Free)",
    baseUrl: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    models: [
      {
        id: "openrouter/free",
        name: "Free Router (Auto)",
        provider: "openrouter",
        free: true,
        context: "200K",
        description: "Auto-routes to available free models",
      },
      {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        name: "Nemotron 3 Ultra",
        provider: "openrouter",
        free: true,
        context: "1M",
        description: "NVIDIA frontier reasoning (free)",
      },
      {
        id: "nvidia/nemotron-3.5-lightning:free",
        name: "Nemotron 3.5 Lightning",
        provider: "openrouter",
        free: true,
        context: "1M",
        description: "Fast NVIDIA free model",
      },
      {
        id: "nvidia/nemotron-3.5-super-vl:free",
        name: "Nemotron 3.5 Super VL",
        provider: "openrouter",
        free: true,
        context: "1M",
        description: "NVIDIA multimodal free",
      },
      {
        id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        name: "Nemotron 3 Nano Omni",
        provider: "openrouter",
        free: true,
        context: "256K",
        description: "NVIDIA reasoning free",
      },
      {
        id: "google/gemma-4-31b-it:free",
        name: "Gemma 4 31B",
        provider: "openrouter",
        free: true,
        context: "262K",
        description: "Google Gemma 4 free",
      },
      {
        id: "google/gemma-4-26b-a4b-it:free",
        name: "Gemma 4 26B A4B",
        provider: "openrouter",
        free: true,
        context: "262K",
        description: "Google Gemma 4 MoE free",
      },
      {
        id: "cohere/north-mini-code:free",
        name: "North Mini Code",
        provider: "openrouter",
        free: true,
        context: "256K",
        description: "Cohere coding agent free",
      },
      {
        id: "recursive/flint-v1.0:free",
        name: "Flint v1.0",
        provider: "openrouter",
        free: true,
        context: "262K",
        description: "Coding-focused free model",
      },
      {
        id: "dots-studio/dots-3-note-preview:free",
        name: "Dots3-Note Preview",
        provider: "openrouter",
        free: true,
        context: "512K",
        description: "Long-context free model",
      },
      {
        id: "liquid/lfm-2.5-2.6b:free",
        name: "LFM 2.5 2.6B",
        provider: "openrouter",
        free: true,
        context: "66K",
        description: "LiquidAI small free model",
      },
      {
        id: "xingchen-agi/xing4.0-29b-a4b:free",
        name: "Xing4.0 29B A4B",
        provider: "openrouter",
        free: true,
        context: "262K",
        description: "XingChen free MoE",
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
        id: "deepseek-chat",
        name: "DeepSeek Chat",
        provider: "deepseek",
        free: false,
        context: "64K",
        description: "Official DeepSeek API (paid)",
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek Reasoner",
        provider: "deepseek",
        free: false,
        context: "64K",
        description: "Official reasoning (paid)",
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
        id: "moonshot-v1-8k",
        name: "Moonshot V1 8K",
        provider: "kimi",
        free: false,
        context: "8K",
        description: "Official Moonshot (paid)",
      },
      {
        id: "moonshot-v1-32k",
        name: "Moonshot V1 32K",
        provider: "kimi",
        free: false,
        context: "32K",
        description: "Official Moonshot (paid)",
      },
      {
        id: "moonshot-v1-128k",
        name: "Moonshot V1 128K",
        provider: "kimi",
        free: false,
        context: "128K",
        description: "Official Moonshot (paid)",
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
        id: "grok-2-1212",
        name: "Grok 2",
        provider: "xai",
        free: false,
        context: "128K",
        description: "Official xAI API (paid)",
      },
      {
        id: "grok-3",
        name: "Grok 3",
        provider: "xai",
        free: false,
        context: "128K",
        description: "Official xAI Grok 3 (paid)",
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

/**
 * Meta free models use Groq endpoint + GROQ_API_KEY.
 * Other free models under deepseek/kimi/xai would use OpenRouter if any remain.
 */
export function shouldUseOpenRouter(provider: string, modelId: string): boolean {
  if (provider === "openrouter" || provider === "groq" || provider === "meta") {
    return false;
  }
  const model = getModelById(modelId);
  return !!model?.free;
}
