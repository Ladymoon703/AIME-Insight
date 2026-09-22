import Link from "next/link";
import DataModeBanner from "@/components/DataModeBanner";

export default function ResearchListPage() {
  return (
    <>
      <DataModeBanner />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold">我的研究</h1>
        <p className="mt-1 text-sm text-zinc-500">
          这里会展示你保存过的研究档案（Phase 5 完成）。
        </p>
        <div className="mt-8 rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
          <p className="text-zinc-500">还没有研究记录</p>
          <p className="mt-1 text-sm text-zinc-400">
            输入一家你正在关注的公司，开始建立第一份研究。
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            开始研究
          </Link>
        </div>
      </div>
    </>
  );
}
