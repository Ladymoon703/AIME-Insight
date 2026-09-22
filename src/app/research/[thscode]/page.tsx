import Link from "next/link";
import DataModeBanner from "@/components/DataModeBanner";

export default async function ResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ thscode: string }>;
  searchParams: Promise<{ goal?: string; window?: string; dims?: string }>;
}) {
  const { thscode } = await params;
  const sp = await searchParams;

  return (
    <>
      <DataModeBanner />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="text-xs text-zinc-400">{thscode}</div>
        <h1 className="mt-2 text-2xl font-semibold">公司研究台</h1>
        <p className="mt-2 text-zinc-500">
          研究台将在 Phase 3 完成。已收到研究计划：
        </p>
        <div className="mx-auto mt-4 max-w-md rounded-xl border border-black/5 bg-white p-4 text-left text-sm text-zinc-600">
          <div>目标：{sp.goal ?? "—"}</div>
          <div>时间范围：{sp.window ?? "—"}</div>
          <div>维度：{sp.dims ?? "—"}</div>
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          回到首页
        </Link>
      </div>
    </>
  );
}
