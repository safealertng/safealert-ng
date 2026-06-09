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
  const [tips, setTips] = useState([]);
  const [panicEvents, setPanicEvents] = useState([]);
  const [adminRoles, setAdminRoles] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("viewer");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [pendingNews, setPendingNews] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [adminReply, setAdminReply] = useState("");
  const [subCounts, setSubCounts] = useState({ freemium: 0, basic: 0, premium: 0 });
  const [subscribers, setSubscribers] = useState([]);

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
    const [usersRes, incidentsRes, panicRes, rolesRes, familyRes, checkpointsRes, pendingNewsRes, subsRes, supportRes] = await Promise.all([
      supabase.from("admin_users").select("*").order("created_at", { ascending: false }),
      supabase.from("incidents").select("*").order("created_at", { ascending: false }),
      supabase.from("panic_events").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("family_members").select("count", { count: "exact" }),
      supabase.from("checkpoint_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("security_news").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("user_subscriptions").select("*, subscription_plans(*), admin_users!user_subscriptions_user_id_fkey(full_name, email)").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
    ]);
    if (checkpointsRes.data) setCheckpoints(checkpointsRes.data);
    if (pendingNewsRes.data) setPendingNews(pendingNewsRes.data);
    if (supportRes.data) setSupportTickets(supportRes.data);
    if (subsRes.data) {
      setSubscribers(subsRes.data);
      setSubCounts({
        freemium: subsRes.data.filter(s => s.subscription_plans?.name === "Freemium").length,
        basic: subsRes.data.filter(s => s.subscription_plans?.name === "Basic").length,
        premium: subsRes.data.filter(s => s.subscription_plans?.name === "Premium").length,
      });
    }
    if (usersRes.data) setUsers(usersRes.data);
    if (incidentsRes.data) setIncidents(incidentsRes.data);
      const tipsRes = await supabase.from("anonymous_tips").select("*").order("created_at", { ascending: false });
      if (tipsRes.data) setTips(tipsRes.data);
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
          ["tips", "📩 Tips"],
          ["incidents", "🚨 Incidents"],
          ["panics", "🆘 Panics"],
          ["checkpoints", "🚧 Checkpoints"],
          ["pending", `📰 Pending${pendingNews.length > 0 ? ` (${pendingNews.length})` : ""}`],
          ["support", `💬 Support${supportTickets.length > 0 ? ` (${supportTickets.length})` : ""}`],
          ...(adminRole === "super_admin" ? [["roles", "🔐 Roles"]] : []),
          ...(adminRole === "super_admin" ? [["subscriptions", "💳 Subscriptions"]] : []),
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
            <div style={A.sectionTitle}>SUBSCRIPTIONS OVERVIEW</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140, background: "#111", border: "1px solid #00FF8820", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#00FF88" }}>{subCounts.freemium}</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginTop: 4 }}>FREEMIUM USERS</div>
          </div>
          <div style={{ flex: 1, minWidth: 140, background: "#111", border: "1px solid #FFB80020", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#FFB800" }}>{subCounts.basic}</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginTop: 4 }}>BASIC SUBSCRIBERS</div>
          </div>
          <div style={{ flex: 1, minWidth: 140, background: "#111", border: "1px solid #FF2D2D20", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#FF2D2D" }}>{subCounts.premium}</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginTop: 4 }}>PREMIUM SUBSCRIBERS</div>
          </div>
        </div>

        <div style={A.sectionTitle}>MANAGE SUBSCRIBERS</div>
        {subscribers.length === 0 ? (
          <div style={{ textAlign: "center", color: "#444", fontSize: 12, padding: "20px 0" }}>No subscribers yet</div>
        ) : (
          subscribers.map((sub) => (
            <div key={sub.id} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{sub.admin_users?.full_name || "Unknown User"}</div>
<div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{sub.admin_users?.email || sub.user_id}</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                    Plan: <span style={{ color: sub.subscription_plans?.name === "Premium" ? "#FF2D2D" : sub.subscription_plans?.name === "Basic" ? "#FFB800" : "#00FF88", fontWeight: 700 }}>{sub.subscription_plans?.name}</span>
                    {" · "}Status: <span style={{ color: sub.status === "active" ? "#00FF88" : "#FF2D2D", fontWeight: 700 }}>{sub.status}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                    Expires: {sub.end_date ? new Date(sub.end_date).toLocaleDateString("en-NG") : "N/A"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <select
                    onChange={async (e) => {
                      const newPlan = e.target.value;
                      if (!newPlan) return;
                      const { data: planData } = await supabase.from("subscription_plans").select("id").eq("name", newPlan).single();
                      if (!planData) return;
                      await supabase.from("user_subscriptions").update({ plan_id: planData.id, status: "active" }).eq("id", sub.id);
                      await supabase.from("subscription_audit").insert({ admin_id: session?.user?.id, user_id: sub.user_id, action: "plan_change", old_plan: sub.subscription_plans?.name, new_plan: newPlan });
                      showToast(`Plan updated to ${newPlan}`);
                      fetchAll();
                    }}
                    defaultValue=""
                    style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", fontSize: 10, padding: "4px 8px", cursor: "pointer" }}
                  >
                    <option value="">Change Plan</option>
                    <option value="Freemium">Freemium</option>
                    <option value="Basic">Basic</option>
                    <option value="Premium">Premium ⭐</option>
                  </select>
                  <button
                    onClick={async () => {
                      const newStatus = sub.status === "active" ? "suspended" : "active";
                      await supabase.from("user_subscriptions").update({ status: newStatus }).eq("id", sub.id);
                      await supabase.from("subscription_audit").insert({ admin_id: session?.user?.id, user_id: sub.user_id, action: newStatus === "suspended" ? "suspended" : "reinstated", old_plan: sub.subscription_plans?.name, new_plan: sub.subscription_plans?.name });
                      showToast(newStatus === "suspended" ? "User suspended" : "User reinstated", newStatus === "suspended" ? "#FF2D2D" : "#00FF88");
                      fetchAll();
                    }}
                    style={{ background: sub.status === "active" ? "#FF2D2D20" : "#00FF8820", border: `1px solid ${sub.status === "active" ? "#FF2D2D" : "#00FF88"}`, borderRadius: 6, color: sub.status === "active" ? "#FF2D2D" : "#00FF88", fontSize: 10, padding: "4px 8px", cursor: "pointer", fontWeight: 700 }}
                  >
                    {sub.status === "active" ? "Suspend" : "Reinstate"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

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

        {/* TIPS */}
        {nav === "tips" && (
          <div>
            <div style={A.sectionTitle}>ANONYMOUS TIPS — {tips.length} TOTAL</div>
            {tips.length === 0 && (
              <div style={{ color: "#444", padding: 20, textAlign: "center" }}>No tips submitted yet.</div>
            )}
            {tips.map(tip => (
              <div key={tip.id} style={{ ...A.row, flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#FFB800" }}>{tip.category?.toUpperCase()}</span>
                  <span style={{ fontSize: 10, color: "#333", fontFamily: "monospace" }}>{tip.tip_hash}</span>
                </div>
                <div style={{ color: "#555", fontSize: 11, marginBottom: 6 }}>🏛 {tip.agency} · 📍 {tip.state} · ⚡ {tip.urgency}</div>
                <div style={{ color: "#aaa", fontSize: 12, lineHeight: 1.6, marginBottom: 6 }}>{tip.tip_text}</div>
                <div style={{ color: "#333", fontSize: 10, fontFamily: "monospace" }}>{new Date(tip.created_at).toLocaleString("en-NG")}</div>
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
                      const pathParts = inc.video_url.split("/object/public/incident-videos/");
const fileName = pathParts[1] || inc.video_url.split("/").pop();
                      await supabase.storage.from("incident-videos").remove([fileName]);
                      await supabase.from("incidents").delete().eq("id", inc.id);
                      setIncidents(prev => prev.filter(i => i.id !== inc.id));
                      showToast("Incident & video deleted", "#FF2D2D");
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
        {nav === "support" && (
          <div>
            <div style={A.sectionTitle}>SUPPORT TICKETS</div>
            {!activeTicket ? (
              <div>
                {supportTickets.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#444", fontSize: 12, padding: "20px 0" }}>No support tickets yet</div>
                ) : supportTickets.map(t => (
                  <div key={t.id} onClick={async () => {
                    setActiveTicket(t);
                    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at", { ascending: true });
                    if (data) setTicketMessages(data);
                  }} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 14px", marginBottom: 10, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{t.category}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.status === "open" ? "#FFB800" : t.status === "resolved" ? "#00FF88" : "#FF2D2D" }}>{t.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{t.subject?.substring(0, 60)}...</div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{new Date(t.created_at).toLocaleDateString("en-NG")}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <button onClick={() => { setActiveTicket(null); setTicketMessages([]); }} style={{ background: "none", border: "none", color: "#FF2D2D", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 12, padding: 0 }}>← Back to Tickets</button>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>{activeTicket.category} · <span style={{ color: "#FFB800" }}>{activeTicket.status}</span></div>
                <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: 12, marginBottom: 12, maxHeight: 300, overflowY: "scroll", scrollbarWidth: "thin", scrollbarColor: "#FF2D2D #1a1a1a" }}>
                  {ticketMessages.map(m => (
                    <div key={m.id} style={{ marginBottom: 10, display: "flex", flexDirection: m.is_admin ? "row" : "row-reverse" }}>
                      <div style={{ maxWidth: "75%", background: m.is_admin ? "#1a1a1a" : "#FF2D2D20", border: `1px solid ${m.is_admin ? "#333" : "#FF2D2D40"}`, borderRadius: 10, padding: "8px 10px" }}>
                        {m.file_url && m.file_type?.startsWith("image/") && (
                        <img src={m.file_url} alt={m.file_name} style={{ width: "100%", borderRadius: 8, marginBottom: 6, cursor: "pointer" }} onClick={() => window.open(m.file_url, "_blank")} />
                      )}
                      {m.file_url && m.file_type === "application/pdf" && (
                        <a href={m.file_url} target="_blank" rel="noreferrer" style={{ display: "block", background: "#FF2D2D20", border: "1px solid #FF2D2D40", borderRadius: 8, padding: "6px 10px", color: "#FF2D2D", fontSize: 11, marginBottom: 6, textDecoration: "none" }}>📄 {m.file_name}</a>
                      )}
                      {!m.file_url && <div style={{ fontSize: 11, color: m.is_admin ? "#ccc" : "#fff" }}>{m.message}</div>}
                        <div style={{ fontSize: 9, color: "#444", marginTop: 4 }}>{m.is_admin ? "Support" : "User"} · {new Date(m.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Type your reply..." style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12 }} />
                  <button onClick={async () => {
                    if (!adminReply.trim()) return;
                    await supabase.from("support_messages").insert({ ticket_id: activeTicket.id, sender_id: session?.user?.id, message: adminReply, is_admin: true });
                    setTicketMessages(prev => [...prev, { id: Date.now(), ticket_id: activeTicket.id, message: adminReply, is_admin: true, created_at: new Date().toISOString() }]);
                    setAdminReply("");
                  }} style={{ background: "#FF2D2D", border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 14, cursor: "pointer" }}>➤</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={async () => {
                    await supabase.from("support_tickets").update({ status: "resolved" }).eq("id", activeTicket.id);
                    setActiveTicket({ ...activeTicket, status: "resolved" });
                    showToast("Ticket marked as resolved");
                  }} style={{ flex: 1, background: "#00FF8820", border: "1px solid #00FF88", borderRadius: 8, padding: "8px", color: "#00FF88", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✅ Mark Resolved</button>
                  <button onClick={async () => {
                    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", activeTicket.id);
                    setActiveTicket({ ...activeTicket, status: "closed" });
                    showToast("Ticket closed", "#FF2D2D");
                  }} style={{ flex: 1, background: "#FF2D2D20", border: "1px solid #FF2D2D", borderRadius: 8, padding: "8px", color: "#FF2D2D", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🔴 Close Ticket</button>
                </div>
              </div>
            )}
          </div>
        )}

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
  nav: { display: "flex", flexWrap: "wrap", borderBottom: "1px solid #111", background: "#0a0a0a" },
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