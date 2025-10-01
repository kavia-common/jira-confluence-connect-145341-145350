"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SessionResponse = { session_token: string };
type StartAuthResponse = { auth_url: string };

type ConfluenceSpace = {
  id?: string | number;
  key?: string;
  name?: string;
  title?: string;
  type?: string;
  [k: string]: unknown;
};
type SpacesResponse = { spaces: ConfluenceSpace[] };

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function useSessionToken(key: string) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (t) setToken(t);
  }, [key]);
  const update = (val: string | null) => {
    setToken(val);
    if (typeof window !== "undefined") {
      if (val) window.localStorage.setItem(key, val);
      else window.localStorage.removeItem(key);
    }
  };
  return { token, setToken: update, clear: () => update(null) };
}

export default function ConfluencePage() {
  const confluence = useSessionToken("confluence_session_token");
  const [spaces, setSpaces] = useState<ConfluenceSpace[] | null>(null);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState<string | null>(null);

  const [confEmail, setConfEmail] = useState("");
  const [confToken, setConfToken] = useState("");
  const [confSite, setConfSite] = useState("");

  const confluenceConnected = useMemo(() => Boolean(confluence.token), [confluence.token]);

  const headersWith = (token?: string | null): HeadersInit => {
    const h = new Headers();
    h.set("Content-Type", "application/json");
    if (token) h.set("X-Session-Token", token);
    return h;
  };

  const startConfluenceOAuth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/confluence/oauth/start`, { cache: "no-store" });
      const data = (await res.json()) as StartAuthResponse;
      if (data.auth_url) {
        const w = 720;
        const h = 800;
        const left = window.screen.width / 2 - w / 2;
        const top = window.screen.height / 2 - h / 2;
        const popup = window.open(data.auth_url, "oauthPopup", `width=${w},height=${h},top=${top},left=${left}`);
        if (!popup) return;
        const interval = setInterval(() => {
          try {
            const stored = window.localStorage.getItem("confluence_session_token");
            if (stored) {
              clearInterval(interval);
              popup.close();
              confluence.setToken(stored);
            }
          } catch {
            // ignore
          }
          if (popup.closed) clearInterval(interval);
        }, 800);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confluenceApiTokenAuth = async (email: string, api_token: string, site?: string) => {
    const body = JSON.stringify({ email, api_token, site: site || null });
    const res = await fetch(`${BACKEND_URL}/auth/confluence/api-token`, {
      method: "POST",
      headers: headersWith(),
      body,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(err.detail || "Failed to authenticate Confluence");
    }
    const data = (await res.json()) as SessionResponse;
    confluence.setToken(data.session_token);
  };

  const loadSpaces = useCallback(async () => {
    if (!confluence.token) return;
    setSpacesLoading(true);
    setSpacesError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/confluence/spaces`, { headers: headersWith(confluence.token), cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || "Failed to load spaces");
      }
      const data = (await res.json()) as SpacesResponse;
      setSpaces(data.spaces ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSpacesError(msg);
    } finally {
      setSpacesLoading(false);
    }
  }, [confluence.token]);

  useEffect(() => {
    if (confluence.token) void loadSpaces();
  }, [confluence.token, loadSpaces]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 rounded-2xl bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Confluence Connector</h2>
          <p className="text-sm text-gray-600">Authenticate and browse your Confluence spaces.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-success">{confluenceConnected ? "Confluence Connected" : "Confluence Disconnected"}</span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card-surface p-4 lg:col-span-1">
          <h3 className="section-title">Authenticate</h3>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn btn-secondary" onClick={startConfluenceOAuth}>
              Start Confluence OAuth
            </button>
            {confluenceConnected && (
              <button className="btn btn-primary" onClick={() => { confluence.clear(); setSpaces(null); }}>
                Disconnect
              </button>
            )}
          </div>

          <div className="mt-5 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent" />

          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await confluenceApiTokenAuth(confEmail, confToken, confSite);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed Confluence token auth";
                alert(msg);
              }
            }}
          >
            <div>
              <label className="text-xs font-medium text-gray-700">Email</label>
              <input className="input mt-1" placeholder="you@company.com" value={confEmail} onChange={(e) => setConfEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">API Token</label>
              <input className="input mt-1" placeholder="••••••••" value={confToken} onChange={(e) => setConfToken(e.target.value)} type="password" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Site (optional)</label>
              <input className="input mt-1" placeholder="example.atlassian.net" value={confSite} onChange={(e) => setConfSite(e.target.value)} />
            </div>
            <button className="btn btn-secondary w-full" type="submit">
              Authenticate via API Token
            </button>
          </form>
        </div>

        <div className="card-surface p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Spaces</h3>
            <div className="flex items-center gap-2">
              {confluenceConnected ? <span className="badge badge-success">Connected</span> : <span className="badge badge-error">Not Connected</span>}
              <button className="btn btn-primary" onClick={loadSpaces} disabled={!confluenceConnected || spacesLoading}>
                {spacesLoading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {spacesError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{spacesError}</p>}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {(spaces ?? []).map((s, idx: number) => (
              <div key={s.id || s.key || idx} className="rounded-xl border border-pink-100 bg-white/70 p-4">
                <p className="text-sm font-semibold text-gray-800">{s.name || s.title || s.key || `Space ${idx + 1}`}</p>
                <p className="text-xs text-gray-500 break-all">ID: {s.id ?? "n/a"} {s.key ? `• Key: ${s.key}` : ""}</p>
                {s.type && <p className="mt-1 text-xs text-gray-600">Type: {s.type}</p>}
              </div>
            ))}
            {!spaces?.length && confluenceConnected && !spacesLoading && !spacesError && (
              <p className="text-sm text-gray-600">No spaces found or insufficient permissions.</p>
            )}
            {!confluenceConnected && <p className="text-sm text-gray-600">Connect to Confluence to view your spaces.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
