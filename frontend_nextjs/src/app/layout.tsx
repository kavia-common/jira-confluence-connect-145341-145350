import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Jira / Confluence Connector",
  description: "Connect and interact with Jira and Confluence via OAuth 2.0 or API token. Ocean Professional / Playful theme.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="ocean-gradient min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row gap-4 p-4">
          {/* Sidebar */}
          <aside className="card-surface md:sticky md:top-4 md:h-[calc(100vh-2rem)] w-full md:w-60 p-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg" />
              <div>
                <h1 className="text-base font-semibold text-gray-800">Ocean Connect</h1>
                <p className="text-xs text-gray-500">Jira + Confluence</p>
              </div>
            </div>
            <nav className="mt-6 space-y-1">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Connectors</p>
              <Link href="/" className="sidebar-link">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-pink-400" />
                Jira
              </Link>
              <Link href="/confluence" className="sidebar-link">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-purple-500" />
                Confluence
              </Link>
              <div className="mt-4 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent" />
              <Link href="/about" className="sidebar-link">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-400" />
                About
              </Link>
            </nav>
            <div className="mt-6 rounded-xl bg-gradient-to-br from-white/80 to-white/50 p-3 ring-1 ring-purple-100">
              <p className="text-xs text-gray-600">
                Use OAuth for the best experience, or API token if preferred. Sessions are ephemeral (in-memory).
              </p>
            </div>
          </aside>

          {/* Main content */}
          <main className="card-surface w-full p-4 md:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
