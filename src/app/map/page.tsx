import Link from "next/link";
import DataModeBanner from "@/components/DataModeBanner";
import ResearchMapView from "@/components/map/ResearchMapView";
import { planResearch } from "@/lib/agent/planner";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <>
        <DataModeBanner />
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">请输入要研究的问题</h1>
          <p className="mt-2 text-zinc-500">
            在首页输入股票、公司或研究问题后再开始研究。
          </p>
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

  const { company, researchMap, error } = await planResearch(query);

  if (error || !company || !researchMap) {
    return (
      <>
        <DataModeBanner />
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">暂时无法识别这个标的</h1>
          <p className="mt-2 text-zinc-500">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            重新输入
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <DataModeBanner />
      <ResearchMapView company={company} researchMap={researchMap} query={query} />
    </>
  );
}
