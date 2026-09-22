import Link from "next/link";
import DataModeBanner from "@/components/DataModeBanner";

export default function ObservationsPage() {
  return (
    <>
      <DataModeBanner />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold">我的观察</h1>
        <p className="mt-1 text-sm text-zinc-500">
          持续跟踪关键指标，出现重要变化时重新验证研究判断（Phase 5 完成）。
        </p>
        <div className="mt-8 rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
          <p className="text-zinc-500">还没有观察任务</p>
          <p className="mt-1 text-sm text-zinc-400">
            完成一次研究后，可以建立观察持续跟踪。
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            去研究一家公司
          </Link>
        </div>
      </div>
    </>
  );
}
