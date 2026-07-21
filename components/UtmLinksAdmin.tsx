"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminSelect } from "@/components/AdminSelect";
import { withBasePath } from "@/lib/base-path";

type UtmLink = {
  id: string; label: string; baseUrl: string; source: string; medium: string;
  campaign: string; content: string; term: string; fullUrl: string;
  shortCode: string | null; clicks: number; active: boolean;
  createdAt: string; updatedAt: string;
};

const DEFAULT_BASE = "https://summit.newturing.ai/gstar/";

const CHANNELS: Record<string, { source: string; medium: string }> = {
  "Facebook Ads": { source: "facebook", medium: "paid_social" },
  "Facebook Organic": { source: "facebook", medium: "organic_social" },
  "Google Search Ads": { source: "google", medium: "cpc" },
  "LinkedIn Ads": { source: "linkedin", medium: "paid_social" },
  "LinkedIn Organic": { source: "linkedin", medium: "organic_social" },
  "TikTok Ads": { source: "tiktok", medium: "paid_social" },
  "YouTube Ads": { source: "youtube", medium: "paid_video" },
  "YouTube Organic": { source: "youtube", medium: "organic_social" },
  "Email Newsletter": { source: "nti_newsletter", medium: "email" },
  "X (Twitter)": { source: "x", medium: "organic_social" },
  "Zalo": { source: "zalo", medium: "organic_social" },
  "Custom": { source: "", medium: "" },
};

const channelKeys = Object.keys(CHANNELS);
const emptyForm = { label: "", baseUrl: DEFAULT_BASE, source: "", medium: "", campaign: "", content: "", term: "", shortCode: "" };

export function UtmLinksAdmin() {
  const [links, setLinks] = useState<UtmLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof emptyForm | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [channelName, setChannelName] = useState("Custom");
  const drawer = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(withBasePath("/api/admin/utm"), { headers: { "Cache-Control": "no-store" } });
      if (!res.ok) throw new Error("Failed to load links");
      setLinks(await res.json());
    } catch { setError("Unable to load UTM links."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    drawer.current?.focus();
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selected]);

  function generatePreview(form: typeof emptyForm) {
    const params = new URLSearchParams();
    if (form.source) params.set("utm_source", form.source);
    if (form.medium) params.set("utm_medium", form.medium);
    if (form.campaign) params.set("utm_campaign", form.campaign);
    if (form.content) params.set("utm_content", form.content);
    if (form.term) params.set("utm_term", form.term);
    const sep = form.baseUrl.includes("?") ? "&" : "?";
    return params.toString() ? `${form.baseUrl}${sep}${params.toString()}` : form.baseUrl;
  }

  function openCreate() {
    setSelected({ ...emptyForm });
    setEditId(null);
    setChannelName("Custom");
    setError("");
  }

  function openEdit(l: UtmLink) {
    setSelected({ label: l.label, baseUrl: l.baseUrl, source: l.source, medium: l.medium, campaign: l.campaign, content: l.content, term: l.term, shortCode: l.shortCode || "" });
    setEditId(l.id);
    const match = Object.entries(CHANNELS).find(([, v]) => v.source === l.source && v.medium === l.medium);
    setChannelName(match ? match[0] : "Custom");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const url = editId ? withBasePath(`/api/admin/utm/${editId}`) : withBasePath("/api/admin/utm");
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      setSelected(null);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    setSaving(false);
  }

  async function deleteLink(id: string, label: string) {
    if (!confirm(`Delete "${label}"?`)) return;
    setError("");
    try {
      const res = await fetch(withBasePath(`/api/admin/utm/${id}`), { method: "DELETE" });
      if (!res.ok) { const r = await res.json(); throw new Error(r.error || "Failed"); }
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  }

  function onChannelChange(name: string) {
    setChannelName(name);
    const c = CHANNELS[name];
    if (selected) setSelected({ ...selected, source: c.source, medium: c.medium });
  }

  function update(field: keyof typeof emptyForm, value: string) {
    if (selected) setSelected({ ...selected, [field]: value });
  }

  const preview = selected ? generatePreview(selected) : "";
  const query = search.trim().toLowerCase();
  const filtered = links.filter((l) => !query || [l.label, l.source, l.medium, l.campaign].some((v) => v.toLowerCase().includes(query)));

  return (
    <>
      <main className="admin-page">
        <div className="admin-pagehead"><div><span>Marketing</span><h1>UTM Link Builder</h1><p>Create, manage, and track UTM-tagged links for campaigns.</p></div><button onClick={openCreate}>Create link</button></div>

        {error && !selected && <p className="admin-notice" role="alert">{error}</p>}

        <div className="dashboard-filters applications-filters" aria-label="UTM link filters">
          <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Label, source or campaign" /></label>
          <div className="dashboard-freshness"><span>Library</span><b>{links.length} links</b><small>{filtered.length} shown</small></div>
        </div>

        <section className="admin-data">
          <header><div><span>Link library</span><h2>Tracked links ({filtered.length})</h2></div><small>{loading ? "Loading…" : `${filtered.length} of ${links.length}`}</small></header>
          <div className="dashboard-table-wrap">
            {loading ? <p style={{ padding: 20 }}>Loading…</p> : (
              <table>
                <thead><tr><th>Label</th><th>Source / Medium</th><th>Campaign</th><th>URL</th><th>Clicks</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id}>
                      <td><b>{l.label}</b>{l.shortCode && <small> /{l.shortCode}</small>}</td>
                      <td><code>{l.source}</code> / <code>{l.medium}</code></td>
                      <td><code>{l.campaign}</code>{l.content && <small> · {l.content}</small>}</td>
                      <td><div className="utm-url-cell"><code>{l.fullUrl.length > 60 ? l.fullUrl.slice(0, 60) + "…" : l.fullUrl}</code><button className="admin-row-action" onClick={() => copy(l.fullUrl, l.id)}>{copied === l.id ? "✓" : "Copy"}</button></div></td>
                      <td>{l.clicks}</td>
                      <td>{l.active ? <span className="admin-status">Active</span> : <span className="admin-status" style={{ opacity: 0.5 }}>Paused</span>}</td>
                      <td><div className="admin-row-actions"><button className="admin-row-action" onClick={() => openEdit(l)}>Edit</button><button className="admin-row-action" onClick={() => deleteLink(l.id, l.label)}>Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && !filtered.length && <p className="admin-empty">No UTM links match the current filters.</p>}
          </div>
        </section>
      </main>

      {selected && (
        <div className="mentor-editor" role="presentation">
          <button className="mentor-editor__backdrop" onClick={() => setSelected(null)} aria-label="Close UTM editor" />
          <aside role="dialog" aria-modal="true" aria-labelledby="utm-editor-title" ref={drawer} tabIndex={-1}>
            <header>
              <div><span>{editId ? "Edit link" : "New link"}</span><h2 id="utm-editor-title">{editId ? selected.label || "Edit link" : "Create UTM link"}</h2></div>
              <button onClick={() => setSelected(null)} aria-label="Close UTM editor">×</button>
            </header>
            <form onSubmit={submit}>
              {error && <p className="admin-notice" role="alert">{error}</p>}
              <label>Label<input required value={selected.label} onChange={(e) => update("label", e.target.value)} maxLength={120} placeholder="e.g. Facebook carousel — July intake" /></label>
              <AdminSelect name="channel" label="Channel" options={channelKeys} value={channelName} onChange={onChannelChange} />
              <label>utm_source<input required value={selected.source} onChange={(e) => update("source", e.target.value)} placeholder="facebook" /></label>
              <label>utm_medium<input required value={selected.medium} onChange={(e) => update("medium", e.target.value)} placeholder="paid_social" /></label>
              <label>utm_campaign<input required value={selected.campaign} onChange={(e) => update("campaign", e.target.value)} placeholder="gstar_scholarship" /></label>
              <label>utm_content<input value={selected.content} onChange={(e) => update("content", e.target.value)} placeholder="carousel_v1" /></label>
              <label>utm_term<input value={selected.term} onChange={(e) => update("term", e.target.value)} placeholder="ai_bootcamp" /></label>
              <label>Short code (optional)<input value={selected.shortCode} onChange={(e) => update("shortCode", e.target.value)} placeholder="jul2026" maxLength={20} /></label>
              <div className="admin-form__preview" style={{ margin: 0 }}>
                <b>Generated URL</b>
                <code>{preview}</code>
                <button type="button" className="admin-row-action" onClick={() => copy(preview, "preview")}>{copied === "preview" ? "Copied!" : "Copy URL"}</button>
              </div>
              <footer>
                <span />
                <button type="button" onClick={() => setSelected(null)}>Cancel</button>
                <button disabled={saving}>{saving ? "Saving…" : editId ? "Apply changes" : "Create link"}</button>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
