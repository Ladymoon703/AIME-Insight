/**
 * 集中读取环境配置，所有密钥统一从 process.env 读取（.env.local），
 * 不写入仓库。未配置时给出明确的降级行为。
 */

export function hasFuyaoKey(): boolean {
  return Boolean(process.env.FUYAO_API_KEY && process.env.FUYAO_API_KEY.trim());
}

export function hasDeepSeekKey(): boolean {
  return Boolean(
    process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim(),
  );
}

export const FUYAO_BASE_URL = "https://fuyao.aicubes.cn";

export function fuyaoApiKey(): string {
  return (process.env.FUYAO_API_KEY ?? "").trim();
}

export const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
export function deepSeekApiKey(): string {
  return (process.env.DEEPSEEK_API_KEY ?? "").trim();
}
