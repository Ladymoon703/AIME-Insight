import Link from "next/link";
import { QUICK_TASKS } from "@/lib/home";

export default function QuickTasks() {
  return (
    <section className="mx-auto max-w-6xl px-4">
      <h2 className="text-sm font-medium text-zinc-400">快捷研究入口</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {QUICK_TASKS.map((t) => {
          const href = t.query
            ? `/map?q=${encodeURIComponent(t.query)}`
            : t.href!;
          return (
            <Link
              key={t.title}
              href={href}
              className="group rounded-xl border border-black/5 bg-white p-4 transition-colors hover:border-accent/30 hover:bg-accent-soft"
            >
              <div className="text-sm font-medium text-zinc-800 group-hover:text-accent">
                {t.title}
              </div>
              <div className="mt-1.5 text-xs leading-5 text-zinc-500">
                {t.description}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
