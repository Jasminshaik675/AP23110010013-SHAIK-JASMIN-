import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getLogToken, Log, setLogToken } from "../../Logging Middleware/src/log";
import "./styles.css";

type UrlInput = {
  id: number;
  originalUrl: string;
  validityMinutes: string;
  shortcode: string;
};

type ShortLink = {
  id: string;
  originalUrl: string;
  shortcode: string;
  createdAt: string;
  expiresAt: string;
  clicks: ClickRecord[];
};

type ClickRecord = {
  timestamp: string;
  source: string;
  location: string;
};

const STORAGE_KEY = "afford_short_links";
const DEFAULT_VALIDITY_MINUTES = 30;
const MAX_ROWS = 5;

function App() {
  const [token, setToken] = useState(getLogToken());
  const [links, setLinks] = useState<ShortLink[]>(readLinks);
  const [rows, setRows] = useState<UrlInput[]>([emptyRow(1)]);
  const [view, setView] = useState<"shorten" | "stats">("shorten");
  const [message, setMessage] = useState("Ready");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash && hash !== "stats") {
      handleRedirect(hash, links);
      return;
    }

    if (hash === "stats") {
      setView("stats");
    }

    void Log("frontend", "info", "page", "URL shortener application mounted");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }, [links]);

  const activeLinks = useMemo(
    () => links.filter((link) => new Date(link.expiresAt).getTime() > Date.now()),
    [links]
  );

  function saveToken() {
    setLogToken(token);
    setMessage("Access token saved for logging requests.");
    void Log("frontend", "info", "auth", "Bearer token saved in browser storage");
  }

  function updateRow(id: number, patch: Partial<UrlInput>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) {
      setMessage("You can shorten up to five URLs at once.");
      void Log("frontend", "warn", "component", "User attempted to add more than five URL rows");
      return;
    }

    setRows((current) => [...current, emptyRow(Date.now())]);
  }

  function removeRow(id: number) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
  }

  async function createLinks(event: React.FormEvent) {
    event.preventDefault();
    const existingCodes = new Set(links.map((link) => link.shortcode.toLowerCase()));
    const created: ShortLink[] = [];

    for (const row of rows) {
      if (!row.originalUrl.trim()) continue;

      const validation = validateRow(row, existingCodes);
      if (!validation.ok) {
        setMessage(validation.error);
        await Log("frontend", "warn", "component", validation.error);
        return;
      }

      const shortcode = row.shortcode.trim() || generateCode(existingCodes);
      existingCodes.add(shortcode.toLowerCase());
      const validity = Number(row.validityMinutes || DEFAULT_VALIDITY_MINUTES);
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + validity * 60 * 1000);

      created.push({
        id: crypto.randomUUID(),
        originalUrl: normalizeUrl(row.originalUrl),
        shortcode,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        clicks: []
      });
    }

    if (created.length === 0) {
      setMessage("Enter at least one URL to shorten.");
      await Log("frontend", "warn", "component", "Create request submitted without a URL");
      return;
    }

    setLinks((current) => [...created, ...current]);
    setRows([emptyRow(Date.now())]);
    setMessage(`Created ${created.length} short link${created.length === 1 ? "" : "s"}.`);
    await Log("frontend", "info", "state", `Created ${created.length} short link records`);
  }

  async function copyLink(shortcode: string) {
    const url = shortUrl(shortcode);
    await navigator.clipboard.writeText(url);
    setMessage(`Copied ${url}`);
    void Log("frontend", "debug", "utils", `Copied shortcode ${shortcode}`);
  }

  function clearExpired() {
    const before = links.length;
    setLinks((current) => current.filter((link) => new Date(link.expiresAt).getTime() > Date.now()));
    setMessage(`Removed ${before - activeLinks.length} expired link${before - activeLinks.length === 1 ? "" : "s"}.`);
    void Log("frontend", "info", "state", "Expired links cleared from local storage");
  }

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Afford Frontend Track</p>
          <h1>URL Shortener</h1>
          <p className="lede">Create up to five short links at once, manage validity windows, use custom shortcodes, and inspect click statistics.</p>
        </div>
        <div className="auth-panel">
          <label htmlFor="token">Bearer token</label>
          <div className="token-row">
            <input
              id="token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste access_token"
              type="password"
            />
            <button type="button" onClick={saveToken}>Save</button>
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label="Application views">
        <button className={view === "shorten" ? "active" : ""} type="button" onClick={() => setView("shorten")}>Shorten</button>
        <button className={view === "stats" ? "active" : ""} type="button" onClick={() => setView("stats")}>Statistics</button>
      </nav>

      <div className="status-row">
        <span>{message}</span>
        <span>{links.length} total links / {activeLinks.length} active</span>
      </div>

      {view === "shorten" ? (
        <section className="panel">
          <form onSubmit={createLinks}>
            <div className="form-head">
              <h2>Shorten URLs</h2>
              <button type="button" onClick={addRow}>Add URL</button>
            </div>
            <div className="rows">
              {rows.map((row, index) => (
                <div className="url-row" key={row.id}>
                  <label>
                    <span>Original URL {index + 1}</span>
                    <input
                      value={row.originalUrl}
                      onChange={(event) => updateRow(row.id, { originalUrl: event.target.value })}
                      placeholder="https://example.com/resource"
                    />
                  </label>
                  <label>
                    <span>Validity</span>
                    <input
                      min={1}
                      type="number"
                      value={row.validityMinutes}
                      onChange={(event) => updateRow(row.id, { validityMinutes: event.target.value })}
                      placeholder="30"
                    />
                  </label>
                  <label>
                    <span>Shortcode</span>
                    <input
                      value={row.shortcode}
                      onChange={(event) => updateRow(row.id, { shortcode: event.target.value })}
                      placeholder="optional"
                    />
                  </label>
                  <button className="muted" type="button" onClick={() => removeRow(row.id)}>Remove</button>
                </div>
              ))}
            </div>
            <button className="primary-action" type="submit">Create Short Links</button>
          </form>

          <section className="results" aria-label="Recent short links">
            {links.slice(0, 5).map((link) => (
              <ShortLinkCard key={link.id} link={link} onCopy={copyLink} />
            ))}
          </section>
        </section>
      ) : (
        <section className="panel">
          <div className="form-head">
            <h2>Statistics</h2>
            <button type="button" onClick={clearExpired}>Clear Expired</button>
          </div>
          <div className="stats-list">
            {links.map((link) => (
              <StatsCard key={link.id} link={link} onCopy={copyLink} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ShortLinkCard({ link, onCopy }: { link: ShortLink; onCopy: (shortcode: string) => void }) {
  const expired = new Date(link.expiresAt).getTime() <= Date.now();

  return (
    <article className="link-card">
      <div>
        <p className="eyebrow">{expired ? "Expired" : "Active"}</p>
        <h3>{shortUrl(link.shortcode)}</h3>
        <p className="long-url">{link.originalUrl}</p>
      </div>
      <dl>
        <div><dt>Created</dt><dd>{formatDate(link.createdAt)}</dd></div>
        <div><dt>Expires</dt><dd>{formatDate(link.expiresAt)}</dd></div>
        <div><dt>Clicks</dt><dd>{link.clicks.length}</dd></div>
      </dl>
      <button type="button" onClick={() => onCopy(link.shortcode)}>Copy</button>
    </article>
  );
}

function StatsCard({ link, onCopy }: { link: ShortLink; onCopy: (shortcode: string) => void }) {
  return (
    <article className="stats-card">
      <div className="stats-title">
        <div>
          <h3>{link.shortcode}</h3>
          <p>{link.originalUrl}</p>
        </div>
        <button type="button" onClick={() => onCopy(link.shortcode)}>Copy</button>
      </div>
      <dl>
        <div><dt>Short URL</dt><dd>{shortUrl(link.shortcode)}</dd></div>
        <div><dt>Created</dt><dd>{formatDate(link.createdAt)}</dd></div>
        <div><dt>Expires</dt><dd>{formatDate(link.expiresAt)}</dd></div>
        <div><dt>Total Clicks</dt><dd>{link.clicks.length}</dd></div>
      </dl>
      <div className="click-table">
        {link.clicks.length === 0 ? (
          <p>No clicks recorded yet.</p>
        ) : (
          link.clicks.map((click, index) => (
            <div className="click-row" key={`${click.timestamp}-${index}`}>
              <span>{formatDate(click.timestamp)}</span>
              <span>{click.source}</span>
              <span>{click.location}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function validateRow(row: UrlInput, existingCodes: Set<string>): { ok: true } | { ok: false; error: string } {
  try {
    new URL(normalizeUrl(row.originalUrl));
  } catch {
    return { ok: false, error: `Invalid URL: ${row.originalUrl}` };
  }

  const validity = Number(row.validityMinutes || DEFAULT_VALIDITY_MINUTES);
  if (!Number.isInteger(validity) || validity <= 0) {
    return { ok: false, error: "Validity must be a positive integer number of minutes." };
  }

  const shortcode = row.shortcode.trim();
  if (shortcode) {
    if (!/^[a-zA-Z0-9-]{4,20}$/.test(shortcode)) {
      return { ok: false, error: "Shortcode must be 4-20 letters, numbers, or hyphens." };
    }

    if (existingCodes.has(shortcode.toLowerCase())) {
      return { ok: false, error: `Shortcode already exists: ${shortcode}` };
    }
  }

  return { ok: true };
}

function handleRedirect(shortcode: string, currentLinks: ShortLink[]) {
  const link = currentLinks.find((item) => item.shortcode.toLowerCase() === shortcode.toLowerCase());

  if (!link) {
    void Log("frontend", "error", "page", `Redirect failed because shortcode ${shortcode} was not found`);
    return;
  }

  if (new Date(link.expiresAt).getTime() <= Date.now()) {
    void Log("frontend", "warn", "page", `Expired shortcode ${shortcode} was opened`);
    return;
  }

  const nextLinks = currentLinks.map((item) =>
    item.id === link.id
      ? {
          ...item,
          clicks: [
            ...item.clicks,
            {
              timestamp: new Date().toISOString(),
              source: document.referrer || "direct",
              location: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"
            }
          ]
        }
      : item
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLinks));
  void Log("frontend", "info", "page", `Redirecting shortcode ${shortcode}`);
  window.location.href = link.originalUrl;
}

function readLinks(): ShortLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ShortLink[]) : [];
  } catch {
    return [];
  }
}

function emptyRow(id: number): UrlInput {
  return {
    id,
    originalUrl: "",
    validityMinutes: "",
    shortcode: ""
  };
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function generateCode(existingCodes: Set<string>): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    if (!existingCodes.has(code.toLowerCase())) return code;
  }

  return crypto.randomUUID().slice(0, 8);
}

function shortUrl(shortcode: string): string {
  return `${window.location.origin}/#/${shortcode}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

createRoot(document.getElementById("root")!).render(<App />);
