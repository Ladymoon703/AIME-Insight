"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Hero() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/map?q=${encodeURIComponent(q)}`);
  }

  return (
    <section className="py-16 text-center sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        今天有什么可以帮到您？
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-zinc-500">
        输入股票、公司，或者直接告诉我你想研究的问题。
      </p>
      <form
        onSubmit={submit}
        className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-xl border border-black/10 bg-white p-2 shadow-sm"
      >
        <span className="pl-2 text-zinc-400">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例如：为什么宁德时代最近股价表现较弱？"
          className="h-11 flex-1 bg-transparent text-base outline-none placeholder:text-zinc-400"
          aria-label="研究问题输入"
        />
        <button
          type="submit"
          className="h-11 rounded-lg bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          disabled={!query.trim()}
        >
          开始研究
        </button>
      </form>
    </section>
  );
}
