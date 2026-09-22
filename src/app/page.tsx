import Link from "next/link";
import DataModeBanner from "@/components/DataModeBanner";
import Hero from "@/components/home/Hero";
import QuickTasks from "@/components/home/QuickTasks";
import TodayWorthResearching from "@/components/home/TodayWorthResearching";

export default function Home() {
  return (
    <>
      <DataModeBanner />
      <div className="mx-auto max-w-6xl px-4">
        <Hero />
        <QuickTasks />
        <TodayWorthResearching />

        <section className="mt-12 grid grid-cols-1 gap-3 pb-16 sm:grid-cols-2">
          <div className="rounded-xl border border-dashed border-black/10 bg-white p-5">
            <h2 className="text-lg font-semibold">我的研究</h2>
            <p className="mt-2 text-sm text-zinc-500">
              还没有研究记录。输入一家你正在关注的公司，开始建立第一份研究。
            </p>
            <Link
              href="/research"
              className="mt-4 inline-flex rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              查看我的研究
            </Link>
          </div>
          <div className="rounded-xl border border-dashed border-black/10 bg-white p-5">
            <h2 className="text-lg font-semibold">我的观察</h2>
            <p className="mt-2 text-sm text-zinc-500">
              还没有观察任务。完成一次研究后，可以建立观察持续跟踪关键指标。
            </p>
            <Link
              href="/observations"
              className="mt-4 inline-flex rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              查看我的观察
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
