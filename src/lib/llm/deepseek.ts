/**
 * DeepSeek LLM 适配器（OpenAI 兼容 HTTP API）。
 * 仅服务端调用；API Key 只从环境变量读取，绝不写死、绝不下发前端。
 */
import {
  DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL,
  deepSeekApiKey,
  hasDeepSeekKey,
} from "@/lib/config";

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMError";
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  json?: boolean;
  timeoutMs?: number;
}

/** 调用 DeepSeek chat/completions，返回文本内容；失败抛 LLMError */
export async function deepSeekChat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  if (!hasDeepSeekKey()) {
    throw new LLMError("DEEPSEEK_API_KEY 未配置");
  }

  const url = `${DEEPSEEK_BASE_URL}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 30000,
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepSeekApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: options.temperature ?? 0.2,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      throw new LLMError(`DeepSeek API 返回 HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new LLMError("DeepSeek 返回内容为空");
    }
    return content;
  } catch (e) {
    if (e instanceof LLMError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new LLMError("DeepSeek 请求超时");
    }
    throw new LLMError(`DeepSeek 请求失败: ${(e as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}
