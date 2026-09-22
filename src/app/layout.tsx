import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIME Insight — AI 公司研究工作台",
  description:
    "面向个人投资者的 AI 公司研究 Agent：看见变化、理解变化、验证判断、持续研究。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
                A
              </span>
              <span className="text-base font-semibold tracking-tight">
                AIME Insight
              </span>
              <span className="hidden text-xs text-zinc-400 sm:inline">
                AI 公司研究工作台
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              >
                首页
              </Link>
              <Link
                href="/research"
                className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              >
                我的研究
              </Link>
              <Link
                href="/observations"
                className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              >
                我的观察
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/5 py-6 text-center text-xs text-zinc-400">
          AIME Insight · AI 证据驱动个股研究 Agent · 数据仅供研究参考，不构成投资建议
        </footer>
      </body>
    </html>
  );
}
