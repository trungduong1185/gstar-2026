"use client";
import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { withBasePath } from "@/lib/base-path";

const nav = [
  ["Workspace", [["Overview", "/dashboard", "grid"], ["Applications", "/dashboard/applications", "users"], ["Campaigns & UTM", "/dashboard/campaigns", "chart"]]],
  ["Program", [["Program content", "/dashboard/program", "calendar"], ["Mentor network", "/dashboard/mentors", "users"]]],
  ["System", [["User accounts", "/dashboard/users", "key"], ["Integrations", "/dashboard/settings", "settings"]]]
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.35.7.6 1 .3.3.7.43 1.1.4h.09v4h-.09a1.7 1.7 0 0 0-1.7.6Z"/></>,
    key: <><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.5 12.5 8-8M16 3l3 3M14 5l3 3"/></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{paths[name]}</svg>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className={`admin-shell${open ? " is-nav-open" : ""}`}>
    <header className="admin-topbar"><button className="admin-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">☰</button><a className="admin-brand" href={withBasePath("/dashboard")} aria-label="New Turing Institute Admin"><img src={withBasePath("/static/img/logo-nti-white.svg")} alt="New Turing Institute"/><span>Admin</span></a><div className="admin-topbar__right"><a href={withBasePath("/")} target="_blank">View website ↗</a><div className="admin-user"><i>A</i><div><b>Administrator</b><span>Program operations</span></div></div><form action={withBasePath("/api/auth/logout")} method="post"><button aria-label="Sign out" title="Sign out">↪</button></form></div></header>
    <aside className="admin-sidebar"><nav>{nav.map(([group, items]) => <div key={group}><span>{group}</span>{items.map(([label, href, icon]) => { const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href); return <a key={href} href={withBasePath(href)} className={active ? "is-active" : ""} onClick={() => setOpen(false)}><Icon name={icon}/>{label}</a>; })}</div>)}</nav><footer><span>System status</span><b><i/>Operational</b><small>GStar 2026</small></footer></aside>
    <button className="admin-nav-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />
    <div className="admin-content">{children}</div>
  </div>;
}
