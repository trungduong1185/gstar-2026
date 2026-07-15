"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminSelect } from "@/components/AdminSelect";
import { withBasePath } from "@/lib/base-path";

type User = {
  id: string; username: string; displayName: string; email: string;
  role: string; active: boolean; lastLoginAt: string | null;
  createdAt: string; updatedAt: string;
};

const empty = { username: "", displayName: "", email: "", password: "", role: "admin" };

export function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", email: "", password: "", role: "admin", active: true });
  const userDrawer = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(withBasePath("/api/admin/users"), { headers: { "Cache-Control": "no-store" } });
      if (!res.ok) throw new Error("Failed to load users");
      setUsers(await res.json());
    } catch { setError("Unable to load users."); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!createOpen && !editingId) return;
    userDrawer.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating && !saving) closeUserDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [createOpen, editingId, creating, saving]);

  function closeUserDrawer() {
    setCreateOpen(false);
    setEditingId(null);
    setCreateError("");
    setEditError("");
  }

  function openCreateDrawer() {
    setEditingId(null);
    setCreateError("");
    setCreateOpen(true);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setCreateError("");
    try {
      const res = await fetch(withBasePath("/api/admin/users"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      setForm({ ...empty });
      await load();
      setCreateOpen(false);
    } catch (err) { setCreateError(err instanceof Error ? err.message : "Failed"); }
    setCreating(false);
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(withBasePath(`/api/admin/users/${editingId}`), {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editForm.displayName,
          email: editForm.email,
          password: editForm.password || undefined,
          role: editForm.role,
          active: editForm.active
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      setEditingId(null);
      await load();
    } catch (err) { setEditError(err instanceof Error ? err.message : "Failed"); }
    setSaving(false);
  }

  async function deleteUser(id: string, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setError("");
    try {
      const res = await fetch(withBasePath(`/api/admin/users/${id}`), { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  function startEdit(u: User) {
    setCreateOpen(false);
    setEditError("");
    setEditingId(u.id);
    setEditForm({ displayName: u.displayName, email: u.email, password: "", role: u.role, active: u.active });
  }

  const editingUser = editingId ? users.find((user) => user.id === editingId) : null;

  return <>
      <main className="admin-page users-admin">
        <div className="admin-pagehead">
          <div><span>System</span><h1>User accounts</h1><p>Create, edit, and manage admin dashboard accounts.</p></div>
          <button onClick={openCreateDrawer}>New admin</button>
        </div>

        {error && <p className="settings-message is-error" role="alert">{error}</p>}

        <section className="users-panel">
          <div className="dashboard-panel__heading"><div><span>Accounts</span><h2>All users ({users.length})</h2></div></div>
          {loading ? <p className="settings-status">Loading…</p> : (
            <div className="dashboard-table-wrap">
              <table>
                <thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td><b>{u.username}</b></td>
                      <td>{u.displayName}</td>
                      <td>{u.email}</td>
                      <td><span className={`users-badge users-badge--${u.role}`}>{u.role === "superadmin" ? "Super Admin" : "Admin"}</span></td>
                      <td>{u.active ? <span className="users-badge users-badge--active">Active</span> : <span className="users-badge users-badge--inactive">Inactive</span>}</td>
                      <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                      <td><div className="users-row-actions"><button onClick={() => startEdit(u)}>Edit</button><button className="is-danger" onClick={() => deleteUser(u.id, u.username)}>Delete</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {createOpen && <div className="mentor-editor users-editor" role="presentation">
        <button className="mentor-editor__backdrop" onClick={() => !creating && closeUserDrawer()} aria-label="Close new admin drawer" />
        <aside ref={userDrawer} role="dialog" aria-modal="true" aria-labelledby="new-admin-title" tabIndex={-1}>
          <header>
            <div><span>User account</span><h2 id="new-admin-title">New admin account</h2><p>Add a user who can access the administration dashboard.</p></div>
            <button onClick={closeUserDrawer} disabled={creating} aria-label="Close new admin drawer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17 7L7 17M7 7L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </header>
          <form className="users-form" onSubmit={createUser}>
            <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required minLength={3} maxLength={40} autoComplete="off" autoFocus /></label>
            <label>Display name<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required maxLength={80} /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></label>
            <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
            <AdminSelect name="role" label="Role" options={["admin", "superadmin"]} value={form.role} onChange={(role) => setForm({ ...form, role })} labels={{ admin: "Admin", superadmin: "Super Admin" }} />
            {createError && <p className="settings-message is-error" role="alert">{createError}</p>}
            <footer className="users-form__actions"><button type="button" onClick={closeUserDrawer} disabled={creating}>Cancel</button><button type="submit" disabled={creating}>{creating ? "Creating…" : "Create admin"}</button></footer>
          </form>
        </aside>
      </div>}

      {editingUser && <div className="mentor-editor users-editor" role="presentation">
        <button className="mentor-editor__backdrop" onClick={() => !saving && closeUserDrawer()} aria-label="Close edit admin drawer" />
        <aside ref={userDrawer} role="dialog" aria-modal="true" aria-labelledby="edit-admin-title" tabIndex={-1}>
          <header>
            <div><span>User account</span><h2 id="edit-admin-title">Edit admin</h2><p>Update access and profile details for {editingUser.username}.</p></div>
            <button onClick={closeUserDrawer} disabled={saving} aria-label="Close edit admin drawer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17 7L7 17M7 7L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </header>
          <form className="users-form" onSubmit={saveUser}>
            <label>Username<input value={editingUser.username} disabled /></label>
            <label>Display name<input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} required maxLength={80} autoFocus /></label>
            <label>Email<input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required autoComplete="email" /></label>
            <label>New password <small>Leave blank to keep the current password.</small><input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} minLength={8} autoComplete="new-password" /></label>
            <AdminSelect name="edit-role" label="Role" options={["admin", "superadmin"]} value={editForm.role} onChange={(role) => setEditForm({ ...editForm, role })} labels={{ admin: "Admin", superadmin: "Super Admin" }} />
            <div className="users-status-control"><div><b>Account status</b><span>Inactive users cannot sign in.</span></div><label className="users-checkbox"><input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} /> Active</label></div>
            {editError && <p className="settings-message is-error" role="alert">{editError}</p>}
            <footer className="users-form__actions"><button type="button" onClick={closeUserDrawer} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></footer>
          </form>
        </aside>
      </div>}
  </>;
}
