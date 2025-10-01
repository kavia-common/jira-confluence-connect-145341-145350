"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SessionResponse = { session_token: string };
type StartAuthResponse = { auth_url: string };

// Minimal shapes to satisfy typing without relying on Atlassian SDK types
type JiraProject = {
  id?: string | number;
  key?: string;
  name?: string;
  title?: string;
  projectTypeKey?: string;
  [k: string]: unknown;
};
type ConfluenceSpace = {
  id?: string | number;
  key?: string;
  name?: string;
  title?: string;
  type?: string;
  [k: string]: unknown;
};

type ProjectsResponse = { projects: JiraProject[] };
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<"jira" | "confluence">("jira");

  // Jira session state
  const jira = useSessionToken("jira_session_token");
  const [jiraProjects, setJiraProjects] = useState<JiraProject[] | null>(null);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);

  // Confluence session state
  const confluence = useSessionToken("confluence_session_token");
  const [spaces, setSpaces] = useState<ConfluenceSpace[] | null>(null);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState<string | null>(null);

  // OAuth popup flow helper
  const openAuthPopupAndCapture = (authUrl: string, storageKey: "jira_session_token" | "confluence_session_token") => {
    const w = 720;
    const h = 800;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    const popup = window.open(authUrl, "oauthPopup", `width=${w},height=${h},top=${top},left=${left}`);
    if (!popup) return;

    const interval = setInterval(() => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          clearInterval(interval);
          popup.close();
          if (storageKey === "jira_session_token") jira.setToken(stored);
          else confluence.setToken(stored);
        }
      } catch {
        // Ignore cross-origin errors
      }
      if (popup.closed) clearInterval(interval);
    }, 800);
  };

  // Backend calls
  const headersWith = (token?: string | null): HeadersInit => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["X-Session-Token"] = token;
    return headers;
  };

  const startJiraOAuth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/jira/oauth/start`, { cache: "no-store" });
      const data = (await res.json()) as StartAuthResponse;
      if (data.auth_url) openAuthPopupAndCapture(data.auth_url, "jira_session_token");
    } catch (e) {
      console.error(e);
    }
  };

  const startConfluenceOAuth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/confluence/oauth/start`, { cache: "no-store" });
      const data = (await res.json()) as StartAuthResponse;
      if (data.auth_url) openAuthPopupAndCapture(data.auth_url, "confluence_session_token");
    } catch (e) {
      console.error(e);
    }
  };

  const jiraApiTokenAuth = async (email: string, api_token: string, site?: string) => {
    const body = JSON.stringify({ email, api_token, site: site || null });
    const res = await fetch(`${BACKEND_URL}/auth/jira/api-token`, {
      method: "POST",
      headers: headersWith(),
      body,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(err.detail || "Failed to authenticate Jira");
    }
    const data = (await res.json()) as SessionResponse;
    jira.setToken(data.session_token);
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

  const loadJiraProjects = useCallback(async () => {
    if (!jira.token) return;
    setJiraLoading(true);
    setJiraError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/jira/projects`, { headers: headersWith(jira.token), cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail || "Failed to load projects");
      }
      const data = (await res.json()) as ProjectsResponse;
      setJiraProjects(data.projects ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setJiraError(msg);
    } finally {
      setJiraLoading(false);
    }
  }, [jira.token]);

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
    if (jira.token) void loadJiraProjects();
  }, [jira.token, loadJiraProjects]);

  useEffect(() => {
    if (confluence.token) void loadSpaces();
  }, [confluence.token, loadSpaces]);

  // Simple forms state
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraSite, setJiraSite] = useState("");

  const [confEmail, setConfEmail] = useState("");
  const [confToken, setConfToken] = useState("");
  const [confSite, setConfSite] = useState("");

  const jiraConnected = useMemo(() => Boolean(jira.token), [jira.token]);
  const confluenceConnected = useMemo(() => Boolean(confluence.token), [confluence.token]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-2 rounded-2xl bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Jira / Confluence Connector</h2>
          <p className="text-sm text-gray-600">Authenticate, check status, and browse your Jira projects and Confluence spaces.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-success">{jiraConnected ? "Jira Connected" : "Jira Disconnected"}</span>
          <span className="badge badge-success">{confluenceConnected ? "Confluence Connected" : "Confluence Disconnected"}</span>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="flex w-full items-center justify-between rounded-2xl border border-purple-200 bg-white/70 p-1">
        <button
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "jira" ? "bg-pink-500 text-white shadow" : "text-gray-600 hover:bg-white"
          }`}
          onClick={() => setActiveTab("jira")}
        >
          Jira
        </button>
        <button
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "confluence" ? "bg-purple-600 text-white shadow" : "text-gray-600 hover:bg-white"
          }`}
          onClick={() => setActiveTab("confluence")}
        >
          Confluence
        </button>
      </div>

      {/* Panels */}
      {activeTab === "jira" ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Auth controls */}
          <div className="card-surface p-4 lg:col-span-1">
            <h3 className="section-title">Authenticate to Jira</h3>
            <p className="mt-1 text-sm text-gray-600">Choose OAuth or API Token.</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className="btn btn-primary" onClick={startJiraOAuth}>
                Start Jira OAuth
              </button>
              {jiraConnected && (
                <button className="btn btn-secondary" onClick={() => { jira.clear(); setJiraProjects(null); }}>
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
                  await jiraApiTokenAuth(jiraEmail, jiraToken, jiraSite);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Failed Jira token auth";
                  alert(msg);
                }
              }}
            >
              <div>
                <label className="text-xs font-medium text-gray-700">Email</label>
                <input className="input mt-1" placeholder="you@company.com" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">API Token</label>
                <input className="input mt-1" placeholder="••••••••" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} type="password" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Site (optional)</label>
                <input className="input mt-1" placeholder="example.atlassian.net" value={jiraSite} onChange={(e) => setJiraSite(e.target.value)} />
              </div>
              <button className="btn btn-primary w-full" type="submit">
                Authenticate via API Token
              </button>
            </form>
          </div>

          {/* Status and data */}
          <div className="card-surface p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Jira Projects</h3>
              <div className="flex items-center gap-2">
                {jiraConnected ? <span className="badge badge-success">Connected</span> : <span className="badge badge-error">Not Connected</span>}
                <button className="btn btn-secondary" onClick={loadJiraProjects} disabled={!jiraConnected || jiraLoading}>
                  {jiraLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Error */}
            {jiraError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{jiraError}</p>}

            {/* List */}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {(jiraProjects ?? []).map((p, idx: number) => (
                <div key={p.id || p.key || idx} className="rounded-xl border border-purple-100 bg-white/70 p-4">
                  <p className="text-sm font-semibold text-gray-800">{p.name || p.title || p.key || `Project ${idx + 1}`}</p>
                  <p className="text-xs text-gray-500 break-all">ID: {p.id ?? "n/a"} {p.key ? `• Key: ${p.key}` : ""}</p>
                  {p.projectTypeKey && <p className="mt-1 text-xs text-gray-600">Type: {p.projectTypeKey}</p>}
                </div>
              ))}
              {!jiraProjects?.length && jiraConnected && !jiraLoading && !jiraError && (
                <p className="text-sm text-gray-600">No projects found or insufficient permissions.</p>
              )}
              {!jiraConnected && <p className="text-sm text-gray-600">Connect to Jira to view your projects.</p>}
            </div>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Auth controls */}
          <div className="card-surface p-4 lg:col-span-1">
            <h3 className="section-title">Authenticate to Confluence</h3>
            <p className="mt-1 text-sm text-gray-600">Choose OAuth or API Token.</p>

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

          {/* Status and data */}
          <div className="card-surface p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Confluence Spaces</h3>
              <div className="flex items-center gap-2">
                {confluenceConnected ? <span className="badge badge-success">Connected</span> : <span className="badge badge-error">Not Connected</span>}
                <button className="btn btn-primary" onClick={loadSpaces} disabled={!confluenceConnected || spacesLoading}>
                  {spacesLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>

            {/* Error */}
            {spacesError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{spacesError}</p>}

            {/* List */}
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
      )}

      {/* Help */}
      <footer className="text-center text-xs text-gray-500">
        Set NEXT_PUBLIC_BACKEND_URL in your environment to point to the FastAPI server. Example: http://localhost:8000
      </footer>
    </div>
  );
}
