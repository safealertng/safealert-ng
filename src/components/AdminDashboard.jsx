import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const ROLES = ["super_admin", "admin", "moderator", "viewer"];
const ROLE_COLORS = { super_admin: "#FF2D2D", admin: "#FF6B00", moderator: "#FFB800", viewer: "#00FF88" };

export default function AdminDashboard({ session, onBack }) {
  const [adminRole, setAdminRole] = useState(null);
  const [checking, setChecking] = useState(true);
  const [nav, setNav] = useState("overview");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [panicEvents, setPanicEvents] = useState([]);
  const [adminRoles, setAdminRoles] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("viewer");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [pendingNews, setPendingNews] = useState([]);

  const showToast = (msg, color = "#00FF88") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  // Check if user is admin
  useEffect(() => {
    const checkRole = async () => {
      const { data, error } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", session?.user?.id);
      console.log('Admin role check:', data, error);
      if (!error && data && data.length > 0) setAdminRole(data[0].role);
      setChecking(false);
    };
    checkRole();
  }, [session]);

  // Fetch all data
  useEffect(() => {
    if (!adminRole) return;
    fetchAll();
  }, [adminRole]);

  const fetchAll = async () => {
    setLoading(true);
    const [usersRes, incidentsRes, panicRes, rolesRes, familyRes, checkpointsRes, pendingNewsRes] = await Promise.all([
      supabase.from("admin_users").select("*").order("created_at", { ascending: false }),
      supabase.from("incidents").select("*").order("created_at", { ascending: false }),
      supabase.from("panic_events").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("family_members").select("count", { count: "exact" }),
      supabase.from("checkpoint_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("security_news").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    if (checkpointsRes.data) setCheckpoints(checkpointsRes.data);
    if (pendingNewsRes.data) setPendingNews(pendingNewsRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    if (incidentsRes.data) setIncidents(incidentsRes.data);
    if (panicRes.data) setPanicEvents(panicRes.data);
    if (rolesRes.data) setAdminRoles(rolesRes.data);
    setStats({
      users: usersRes.data?.length || 0,
      incidents: incidentsRes.data?.length || 0,
      panics: panicRes.data?.length || 0,
      activeIncidents: incidentsRes.data?.filter(i => i.status === "active").length || 0,
      family: familyRes.count || 0,
      admins: rolesRes.data?.length || 0,
    });
    setLoading(false);
  };

  const updateIncidentStatus = async (id, status) => {
    await supabase.from("incidents").update({ status }).eq("id", id);
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    showToast(`Incident marked as ${status}`);
  };

  const banUser = async (userId) => {
    if (!window.confirm("Ban this user?")) return;
    await supabase.auth.admin.updateUserById(userId, { ban_duration: "876600h" });
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, banned_until: "banned" } : u));
    showToast("User banned", "#FF2D2D");
  };

  const unbanUser = async (userId) => {
    await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, banned_until: null } : u));
    showToast("User unbanned");
  };

  const addAdminRole = async () => {
    if (!newAdminEmail) return;
    const { data: userData } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("email", newAdminEmail)
      .single();
    if (!userData) { showToast("User not found", "#FF2D2D"); return; }
    const { error } = await supabase.from("admin_roles").insert({
      user_id: userData.user_id,
      role: newAdminRole,
      assigned_by: session?.user?.id,
    });
    if (!error) {
      showToast(`${newAdminEmail} added as ${newAdminRole}`);
      setNewAdminEmail("");
      fetchAll();
    } else showToast(error.message, "#FF2D2D");
  };

  const removeAdminRole = async (userId) => {
    if (!window.confirm("Remove this admin role?")) return;
    await supabase.from("admin_roles").delete().eq("user_id", userId);
    setAdminRoles(prev => prev.filter(r => r.user_id !== userId));
    showToast("Role removed", "#FF2D2D");
  };

  if (checking) return (
    <div style={A.center}>
      <div style={A.spinner} />
      <div style={{ color: "#555", marginTop: 12, fontSize: 12 }}>Verifying access...</div>
    </div>
  );

  if (!adminRole) return (
    <div style={A.center}>
      <div style={{ fontSize: 48 }}>🚫</div>
      <div style={{ fontWeight: 900, fontSize: 18, marginTop: 12, color: "#FF2D2D" }}>ACCESS DENIED</div>
      <div style={{ color: "#555", fontSize: 12, marginTop: 8 }}>You don't have admin privileges.</div>
      <button onClick={onBack} style={A.backBtn}>← Go Back</button>
    </div>
  );

  return (
    <div style={A.shell}>
      <style>{ACSS}</style>

      {/* Toast */}
      {toast && <div style={{ ...A.toast, background: toast.color }}>{toast.msg}</div>}

      {/* Header */}
      <div style={A.header}>
        <div>
          <div style={A.logo}>SafeAlert<span style={{ color: "#FF2D2D" }}>NG</span> <span style={{ color: "#FF6B00" }}>ADMIN</span></div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
            Logged in as <span style={{ color: ROLE_COLORS[adminRole] }}>{adminRole.replace("_", " ").toUpperCase()}</span>
          </div>
        </div>
        <button onClick={onBack} style={A.backBtn}>← App</button>
      </div>

      {/* Nav */}
      <div style={A.nav}>
        {[
          ["overview", "📊 Overview"],
          ["users", "👥 Users"],
          ["incidents", "🚨 Incidents"],
          ["panics", "🆘 Panics"],
          ["checkpoints", "🚧 Checkpoints"],
          ["pending", `📰 Pending${pendingNews.length > 0 ? ` (${pendingNews.length})` : ""}`],
          ...(adminRole === "super_admin" ? [["roles", "🔐 Roles"]] : []),
        ].map(([k, l]) => (
          <button key={k} onClick={() => setNav(k)} style={{ ...A.navBtn, borderBottom: nav === k ? "2px solid #FF2D2D" : "2px solid transparent", color: nav === k ? "#FF2D2D" : "#555" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: "16px", paddingBottom: 40 }}>

        {/* OVERVIEW */}
        {nav === "overview" && (
          <div>
            <div style={A.sectionTitle}>DASHBOARD OVERVIEW</div>
            <div style={A.grid2}>
              {[
                ["👥", stats.users, "Total Users", "#4A90D9"],
                ["🚨", stats.incidents, "Total Incidents", "#FF2D2D"],
                ["🆘", stats.panics, "Panic Events", "#FF6B00"],
                ["⚡", stats.activeIncidents, "Active Incidents", "#FFB800"],
                ["👨‍👩‍👧‍👦", stats.family, "Family Members", "#00FF88"],
                ["🔐", stats.admins, "Admin Users", "#9B59B6"],
              ].map(([icon, val, label, color]) => (
                <div key={label} style={A.statCard}>
                  <div style={{ fontSize: 28 }}>{icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color }}>{val ?? "—"}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={A.sectionTitle}>RECENT INCIDENTS</div>
            {incidents.slice(0, 5).map(inc => (
              <div key={inc.id} style={A.row}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{inc.type?.replace(/_/g, " ").toUpperCase()}</div>
                  <div style={{ color: "#555", fontSize: 11 }}>📍 {inc.state} · {new Date(inc.created_at).toLocaleString("en-NG")}</div>
                </div>
                <div style={{ ...A.badge, background: inc.status === "active" ? "#FF2D2D22" : "#00FF8822", color: inc.status === "active" ? "#FF2D2D" : "#00FF88", border: `1px solid ${inc.status === "active" ? "#FF2D2D44" : "#00FF8844"}` }}>{inc.status?.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}

        {/* USERS */}
        {nav === "users" && (
          <div>
            <div style={A.sectionTitle}>USER MANAGEMENT — {users.length} TOTAL</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email or name..." style={A.input} />
            {users.filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())).map(u => (
              <div key={u.id} style={A.row}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{u.full_name || "Unknown"}</div>
                  <div style={{ color: "#555", fontSize: 11 }}>{u.email} · {u.state || "No state"}</div>
                  <div style={{ color: "#444", fontSize: 10 }}>Joined: {new Date(u.created_at).toLocaleDateString("en-NG")}</div>
                </div>
                {u.banned_until ? (
                  <button onClick={() => unbanUser(u.user_id)} style={{ ...A.smBtn, color: "#00FF88", borderColor: "#00FF8844" }}>Unban</button>
                ) : (
                  adminRole === "super_admin" || adminRole === "admin" ? (
                    <button onClick={() => banUser(u.user_id)} style={{ ...A.smBtn, color: "#FF2D2D", borderColor: "#FF2D2D44" }}>Ban</button>
                  ) : null
                )}
              </div>
            ))}
          </div>
        )}

        {/* INCIDENTS */}
        {nav === "incidents" && (
          <div>
            <div style={A.sectionTitle}>ALL INCIDENTS — {incidents.length} TOTAL</div>
            {incidents.map(inc => (
              <div key={inc.id} style={A.row}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{inc.type?.replace(/_/g, " ").toUpperCase()}</div>
                  <div style={{ color: "#555", fontSize: 11 }}>📍 {inc.state} · {new Date(inc.created_at).toLocaleString("en-NG")}</div>
                  {inc.description && <div style={{ color: "#444", fontSize: 10, marginTop: 2 }}>{inc.description}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ ...A.badge, background: inc.status === "active" ? "#FF2D2D22" : "#00FF8822", color: inc.status === "active" ? "#FF2D2D" : "#00FF88", border: `1px solid ${inc.status === "active" ? "#FF2D2D44" : "#00FF8844"}` }}>{inc.status?.toUpperCase()}</div>
                  {(adminRole === "super_admin" || adminRole === "admin" || adminRole === "moderator") && inc.status === "active" && (
                    <button onClick={() => updateIncidentStatus(inc.id, "resolved")} style={{ ...A.smBtn, color: "#00FF88", borderColor: "#00FF8844", fontSize: 9 }}>✓ Resolve</button>
                  )}
                  {inc.video_url && (adminRole === "super_admin" || adminRole === "admin") && (
                    <button onClick={async () => {
                      if (!window.confirm("Delete this video?")) return;
                      const fileName = inc.video_url.split("/incident-videos/")[1];
                      await supabase.storage.from("incident-videos").remove([fileName]);
                      await supabase.from("incidents").update({ video_url: null }).eq("id", inc.id);
                      setIncidents(prev => prev.map(i => i.id === inc.id ? { ...i, video_url: null } : i));
                      showToast("Video deleted", "#FF2D2D");
                    }} style={{ ...A.smBtn, color: "#FF2D2D", borderColor: "#FF2D2D44", fontSize: 9 }}>🗑 Del Video</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PANICS */}
        {nav === "panics" && (
          <div>
            <div style={A.sectionTitle}>PANIC EVENTS — {panicEvents.length} TOTAL</div>
            {panicEvents.length === 0 && <div style={{ color: "#333", textAlign: "center", padding: 40 }}>No panic events recorded</div>}
            {panicEvents.map(p => (
              <div key={p.id} style={A.row}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#FF2D2D" }}>🆘 PANIC ACTIVATED</div>
                  <div style={{ color: "#555", fontSize: 11 }}>📍 {p.state} · {new Date(p.created_at).toLocaleString("en-NG")}</div>
                  <div style={{ color: "#444", fontSize: 10 }}>GPS: {p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}</div>
                </div>
                <div style={{ ...A.badge, background: p.resolved ? "#00FF8822" : "#FF2D2D22", color: p.resolved ? "#00FF88" : "#FF2D2D", border: `1px solid ${p.resolved ? "#00FF8844" : "#FF2D2D44"}` }}>{p.resolved ? "RESOLVED" : "ACTIVE"}</div>
              </div>
            ))}
          </div>
        )}

        {/* CHECKPOINTS */}
        {nav === "checkpoints" && (
          <div>
            <div style={A.sectionTitle}>CHECKPOINT REPORTS — {checkpoints.length} TOTAL</div>
            {checkpoints.length === 0 && <div style={{ color:"#333", textAlign:"center", padding:40 }}>No checkpoint reports yet</div>}
            {checkpoints.map(c => (
              <div key={c.id} style={A.row}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{c.route}</div>
                  <div style={{ color:"#555", fontSize:11, marginTop:2 }}>{c.description}</div>
                  <div style={{ color:"#444", fontSize:10, marginTop:2 }}>{new Date(c.created_at).toLocaleString("en-NG")}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <div style={{ ...A.badge, background: c.approved ? "#00FF8822" : "#FFB80022", color: c.approved ? "#00FF88" : "#FFB800", border:`1px solid ${c.approved ? "#00FF8844" : "#FFB80044"}` }}>
                    {c.approved ? "APPROVED" : "PENDING"}
                  </div>
                  {!c.approved && (
                    <button onClick={async () => {
                      await supabase.from("checkpoint_reports").update({ approved: true }).eq("id", c.id);
                      setCheckpoints(prev => prev.map(r => r.id === c.id ? { ...r, approved: true } : r));
                      showToast("Checkpoint approved!");
                    }} style={{ ...A.smBtn, color:"#00FF88", borderColor:"#00FF8844", fontSize:9 }}>✓ Approve</button>
                  )}
                  <button onClick={async () => {
                    await supabase.from("checkpoint_reports").delete().eq("id", c.id);
                    setCheckpoints(prev => prev.filter(r => r.id !== c.id));
                    showToast("Report deleted", "#FF2D2D");
                  }} style={{ ...A.smBtn, color:"#FF2D2D", borderColor:"#FF2D2D44", fontSize:9 }}>🗑 Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PENDING NEWS */}
        {nav === "pending" && (
          <div>
            <div style={A.sectionTitle}>PENDING NEWS — {pendingNews.length} AWAITING APPROVAL</div>
            {pendingNews.length === 0 && <div style={{ color:"#333", textAlign:"center", padding:40 }}>No pending news submissions</div>}
            {pendingNews.map(n => (
              <div key={n.id} style={A.row}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{n.headline}</div>
                  <div style={{ color:"#555", fontSize:11, marginTop:2 }}>📍 {n.state} · {n.category}</div>
                  <div style={{ color:"#666", fontSize:11, marginTop:2 }}>{n.body}</div>
                  <div style={{ color:"#444", fontSize:10, marginTop:2 }}>{new Date(n.created_at).toLocaleString("en-NG")}</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <button onClick={async () => {
                    await supabase.from("security_news").update({ status: "approved" }).eq("id", n.id);
                    setPendingNews(prev => prev.filter(p => p.id !== n.id));
                    showToast("News approved!");
                  }} style={{ ...A.smBtn, color:"#00FF88", borderColor:"#00FF8844", fontSize:9 }}>✓ Approve</button>
                  <button onClick={async () => {
                    await supabase.from("security_news").delete().eq("id", n.id);
                    setPendingNews(prev => prev.filter(p => p.id !== n.id));
                    showToast("News rejected", "#FF2D2D");
                  }} style={{ ...A.smBtn, color:"#FF2D2D", borderColor:"#FF2D2D44", fontSize:9 }}>✗ Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ROLES — Super Admin only */}
        {nav === "roles" && adminRole === "super_admin" && (
          <div>
            <div style={A.sectionTitle}>ROLE MANAGEMENT</div>
            <div style={A.card}>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: 2, fontFamily: "monospace", marginBottom: 10 }}>ADD NEW ADMIN</div>
              <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="User email address..." style={A.input} />
              <select value={newAdminRole} onChange={e => setNewAdminRole(e.target.value)} style={{ ...A.input, marginTop: 8 }}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace("_", " ").toUpperCase()}</option>)}
              </select>
              <button onClick={addAdminRole} style={A.redBtn}>ADD ROLE</button>
            </div>
            <div style={A.sectionTitle}>CURRENT ADMINS — {adminRoles.length}</div>
            {adminRoles.map(r => (
              <div key={r.id} style={A.row}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.user_id}</div>
                  <div style={{ color: "#444", fontSize: 10 }}>Added: {new Date(r.created_at).toLocaleDateString("en-NG")}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ ...A.badge, background: ROLE_COLORS[r.role] + "22", color: ROLE_COLORS[r.role], border: `1px solid ${ROLE_COLORS[r.role]}44` }}>{r.role.replace("_", " ").toUpperCase()}</div>
                  {r.user_id !== session?.user?.id && (
                    <button onClick={() => removeAdminRole(r.user_id)} style={{ ...A.smBtn, color: "#FF2D2D", borderColor: "#FF2D2D44" }}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const A = {
  shell: { background: "#080808", minHeight: "100vh", fontFamily: "'Barlow Condensed', sans-serif", color: "#fff", maxWidth: 430, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #111" },
  logo: { fontSize: 20, fontWeight: 900, letterSpacing: 1 },
  nav: { display: "flex", overflowX: "auto", borderBottom: "1px solid #111", background: "#0a0a0a", WebkitOverflowScrolling: "touch" },
  navBtn: { flexShrink: 0, padding: "10px 10px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 9, fontWeight: 700, letterSpacing: 2.5, color: "#444", marginBottom: 10, marginTop: 16, fontFamily: "monospace" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 },
  statCard: { background: "#0d0d0d", border: "1px solid #161616", borderRadius: 12, padding: 14, textAlign: "center" },
  row: { background: "#0d0d0d", border: "1px solid #161616", borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", gap: 10, alignItems: "center" },
  card: { background: "#0d0d0d", border: "1px solid #161616", borderRadius: 12, padding: 14, marginBottom: 12 },
  badge: { fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" },
  smBtn: { background: "none", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", whiteSpace: "nowrap" },
  input: { width: "100%", background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" },
  redBtn: { width: "100%", background: "linear-gradient(135deg,#FF2D2D,#990000)", border: "none", borderRadius: 8, padding: "12px", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", marginTop: 8 },
  backBtn: { background: "none", border: "1px solid #222", borderRadius: 8, padding: "6px 14px", color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#080808", fontFamily: "'Barlow Condensed', sans-serif", color: "#fff" },
  spinner: { width: 32, height: 32, border: "3px solid #FF2D2D22", borderTop: "3px solid #FF2D2D", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  toast: { position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", color: "#000", fontWeight: 900, fontSize: 12, padding: "8px 20px", borderRadius: 20, zIndex: 999, whiteSpace: "nowrap" },
};

const ACSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
::-webkit-scrollbar { display: none; }
`;