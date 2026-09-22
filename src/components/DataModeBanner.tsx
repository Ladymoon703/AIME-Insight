import { getDataMode } from "@/lib/data/adapter";

/**
 * 演示模式横幅：未配置 FUYAO_API_KEY 时显示，明确告知当前数据为演示数据。
 * 绝不把演示数据伪装成真实金融数据。
 */
export default function DataModeBanner() {
  const mode = getDataMode();
  if (mode === "live") return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto max-w-6xl px-4 py-2 text-center text-xs text-amber-800">
        <span className="mr-1 rounded bg-amber-200/60 px-1.5 py-0.5 font-medium">
          演示模式
        </span>
        未配置 FUYAO_API_KEY，当前所有金融数据均为演示数据，不构成真实行情或财务信息。
      </div>
    </div>
  );
}
