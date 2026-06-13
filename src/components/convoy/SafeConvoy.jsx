import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import MiniMap from "./MiniMap";
import ConvoyChat from "./ConvoyChat";
import useConvoyTracking from "./useConvoyTracking";
import { cvS, cvCSS, RISK_COLORS, STATUS_COLORS, STATUS_LABELS } from "./convoyStyles";
import {
  validateNigerianPlate,
  formatRelativeTime,
  computeProgressPct,
  computeETA,
  isGpsLost,
} from "./convoyHelpers";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const VEHICLE_TYPES = [
  { value: "Sedan", label: "🚗 Sedan" },
  { value: "SUV", label: "🚙 SUV" },
  { value: "Bus", label: "🚌 Bus" },
  { value: "Truck", label: "🚛 Truck" },
  { value: "Pickup", label: "🛻 Pickup" },
  { value: "Motorcycle", label: "🏍️ Motorcycle" },
];

const VEHICLE_ICONS = { Sedan: "🚗", SUV: "🚙", Bus: "🚌", Truck: "🚛", Pickup: "🛻", Motorcycle: "🏍️" };

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const TABS_NO_CONVOY = [
  ["active", "🚗 Active"],
  ["create", "➕ Start New"],
  ["join", "🔗 Join Existing"],
  ["routes", "⚠️ Routes"],
];
const TABS_IN_CONVOY = [
  ["active", "🚗 Active"],
  ["chat", "💬 Chat"],
  ["join", "➕ Start/Join"],
  ["routes", "⚠️ Routes"],
];

// Calls the send-convoy-alert edge function and reports back whether the
// push notification actually went out, so the UI can show success/failure.
async function notifyConvoy(payload) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-convoy-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || `Request failed (${res.status})` };
    return { ok: true, sent: data?.sent ?? 0 };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default function SafeConvoy({ session }) {
  const [convoyTab, setConvoyTab] = useState("active");
  const [myConvoy, setMyConvoy] = useState(null);
  const [loadingConvoy, setLoadingConvoy] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [dismissedEventId, setDismissedEventId] = useState(null);
  const [distressSent, setDistressSent] = useState(false);
  const [distressBusy, setDistressBusy] = useState(false);
  const [showDistressConfirm, setShowDistressConfirm] = useState(false);
  const [distressResult, setDistressResult] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leavingConvoy, setLeavingConvoy] = useState(false);
  const [convoyToast, setConvoyToast] = useState("");

  // Start/Join form
  const [destination, setDestination] = useState("");
  const [route, setRoute] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [routeDistanceKm, setRouteDistanceKm] = useState("");
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joinPin, setJoinPin] = useState("");
  const [joinHasPin, setJoinHasPin] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [pinPromptConvoy, setPinPromptConvoy] = useState(null);

  const [nearbyConvoys, setNearbyConvoys] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  // Danger routes
  const [dangerRoutes, setDangerRoutes] = useState([]);
  const [dangerRoutesError, setDangerRoutesError] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [confirmedRoutes, setConfirmedRoutes] = useState(new Set());

  // Map
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef({});

  const tracking = useConvoyTracking({
    convoyId: myConvoy?.id,
    memberId: myConvoy?.memberId,
    session,
    route: myConvoy?.route,
  });

  const plateValid = !plateNumber || validateNigerianPlate(plateNumber);
  const isLeader = myConvoy?.leader_id === session?.user?.id;
  const progressPct = useMemo(() => computeProgressPct(myConvoy, tracking.members), [myConvoy, tracking.members]);

  const bannerEvent =
    tracking.lastEvent &&
    (tracking.lastEvent.event_type === "stopped" || tracking.lastEvent.event_type === "distress") &&
    tracking.lastEvent.id !== dismissedEventId
      ? tracking.lastEvent
      : null;

  const sortedMembers = useMemo(() => {
    return [...tracking.members].sort((a, b) => {
      if (a.is_leader !== b.is_leader) return a.is_leader ? -1 : 1;
      const aMe = a.user_id === session?.user?.id;
      const bMe = b.user_id === session?.user?.id;
      if (aMe !== bMe) return aMe ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [tracking.members, session?.user?.id]);

  const filteredRoutes = useMemo(() => {
    return dangerRoutes.filter(
      (r) => (riskFilter === "all" || r.risk_level === riskFilter) && (stateFilter === "all" || r.state === stateFilter)
    );
  }, [dangerRoutes, riskFilter, stateFilter]);

  // Tab bar differs depending on whether the user is in an active convoy.
  const tabs = myConvoy ? TABS_IN_CONVOY : TABS_NO_CONVOY;

  // ── one-shot geolocation for create/join/nearby ──
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── auto-dismiss the "convoy ended / left" toast ──
  useEffect(() => {
    if (!convoyToast) return;
    const t = setTimeout(() => setConvoyToast(""), 4000);
    return () => clearTimeout(t);
  }, [convoyToast]);

  // ── load the convoy the user is already a member of (if any) ──
  useEffect(() => {
    let active = true;
    (async () => {
      if (!session?.user?.id) {
        if (active) setLoadingConvoy(false);
        return;
      }
      const { data } = await supabase
        .from("convoy_members")
        .select("id, convoy_id, convoys!inner(*)")
        .eq("user_id", session.user.id)
        .eq("convoys.status", "active")
        .limit(1);
      if (!active) return;
      if (data && data.length > 0) {
        setMyConvoy({ ...data[0].convoys, memberId: data[0].id });
      }
      setLoadingConvoy(false);
    })();
    return () => { active = false; };
  }, [session?.user?.id]);

  // ── nearby active convoys ──
  const fetchNearby = async () => {
    setNearbyLoading(true);
    const { data } = await supabase.rpc("get_active_convoys", {
      p_route: route.trim() || null,
      p_lat: userLocation?.lat ?? null,
      p_lng: userLocation?.lng ?? null,
    });
    setNearbyConvoys(data || []);
    setNearbyLoading(false);
  };

  useEffect(() => {
    if (convoyTab !== "join" || myConvoy) return;
    (async () => {
      await fetchNearby();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convoyTab, myConvoy, userLocation?.lat, userLocation?.lng]);

  // ── danger routes (public reference data — load on mount, not gated on tab) ──
  useEffect(() => {
    if (dangerRoutes.length > 0) return;
    (async () => {
      const { data, error } = await supabase.from("danger_routes").select("*");
      console.log("[SafeConvoy] danger_routes result:", data, error);
      if (error) {
        setDangerRoutesError(error.message);
        return;
      }
      setDangerRoutesError("");
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const sorted = (data || []).sort(
        (a, b) => (order[a.risk_level] ?? 9) - (order[b.risk_level] ?? 9) || b.incident_count - a.incident_count
      );
      setDangerRoutes(sorted);
    })();
  }, [dangerRoutes.length]);

  function renderMarkers() {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    const seen = new Set();
    tracking.members.forEach((m) => {
      if (m.lat == null || m.lng == null) return;
      seen.add(m.id);
      const color = STATUS_COLORS[m.status] || STATUS_COLORS.offline;
      const icon = L.divIcon({
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ${color}"></div>`,
        iconSize: [14, 14], className: "",
      });
      const popup = `<b>${m.name}</b><br/>${[m.vehicle_color, m.vehicle_type].filter(Boolean).join(" ")}`;
      const existing = markersRef.current[m.id];
      if (existing) {
        existing.setLatLng([m.lat, m.lng]);
        existing.setIcon(icon);
        existing.setPopupContent(popup);
      } else {
        markersRef.current[m.id] = L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popup);
      }
    });

    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
  }

  // ── Leaflet map: init once per "active" tab visit, then live-update markers ──
  useEffect(() => {
    if (convoyTab !== "active" || !myConvoy || !mapRef.current) return;
    let cancelled = false;

    import("leaflet").then(({ default: L }) => {
      if (cancelled || !mapRef.current) return;
      leafletRef.current = L;
      if (!mapInstanceRef.current) {
        // Defensive: a stale Leaflet instance (e.g. from a StrictMode
        // double-invoke or a fast tab switch) can leave `_leaflet_id` set
        // on the container, which makes `L.map()` throw "Map container is
        // already initialized". Clear it before creating a fresh map.
        if (mapRef.current._leaflet_id) {
          delete mapRef.current._leaflet_id;
        }
        const hasFix = tracking.myLocation || myConvoy.start_lat != null;
        const center = tracking.myLocation
          ? [tracking.myLocation.lat, tracking.myLocation.lng]
          : myConvoy.start_lat != null
            ? [myConvoy.start_lat, myConvoy.start_lng]
            : [9.0820, 8.6753];
        const map = L.map(mapRef.current).setView(center, hasFix ? 12 : 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
        mapInstanceRef.current = map;
      }
      renderMarkers();
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convoyTab, myConvoy?.id]);

  // Keep markers in sync with live roster updates.
  useEffect(() => {
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking.members]);

  // Tear the map down when leaving the Active tab or unmounting.
  useEffect(() => {
    if (convoyTab !== "active" && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    }
  }, [convoyTab]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  // ── helpers ──
  const vehicleFieldsError = () => {
    if (plateNumber && !validateNigerianPlate(plateNumber)) return "Enter a valid Nigerian plate number (e.g. ABJ 234 EF).";
    return null;
  };

  const myName = () => session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "Convoy Member";
  const myAvatar = () => session?.user?.user_metadata?.avatar_url || null;

  const shareRoute = (r) => {
    const text = `⚠️ DANGER ALERT: ${r.name} is rated ${r.risk_level} risk. ${r.incident_count} incidents reported. Last incident: ${formatRelativeTime(r.last_incident_at)}. Stay safe! 🛡️ via SafeAlert NG`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleCreateConvoy = async () => {
    const vErr = vehicleFieldsError();
    if (vErr) { setCreateError(vErr); return; }
    if (!destination.trim() || !route.trim()) { setCreateError("Destination and route are required."); return; }
    if (pinEnabled && !/^\d{4}$/.test(pin)) { setCreateError("PIN must be exactly 4 digits."); return; }

    setCreateError("");
    setCreating(true);

    try {
      const { data, error } = await supabase.rpc("create_convoy", {
        p_destination: destination.trim(),
        p_route: route.trim(),
        p_pin: pinEnabled ? pin : null,
        p_vehicle_type: vehicleType || null,
        p_vehicle_color: vehicleColor || null,
        p_plate_number: plateNumber || null,
        p_lat: userLocation?.lat ?? null,
        p_lng: userLocation?.lng ?? null,
        p_route_distance_km: routeDistanceKm ? Number(routeDistanceKm) : null,
        p_name: myName(),
        p_avatar_url: myAvatar(),
      });

      console.log("[SafeConvoy] create_convoy →", { data, error });

      if (error) { setCreateError(error.message); setCreating(false); return; }

      const { data: memberRow, error: memberError } = await supabase
        .from("convoy_members")
        .select("id")
        .eq("convoy_id", data.id)
        .eq("user_id", session.user.id)
        .single();

      if (memberError) console.error("[SafeConvoy] failed to load own member row:", memberError);

      const convoy = { ...data, memberId: memberRow?.id };
      console.log("[SafeConvoy] myConvoy set (create) →", convoy);
      setMyConvoy(convoy);
      setCreating(false);
      setDistressSent(false);
      setDistressResult(null);
      setConvoyTab("active");
    } catch (e) {
      console.error("[SafeConvoy] create_convoy threw:", e);
      setCreateError(e.message || "Something went wrong creating the convoy.");
      setCreating(false);
    }
  };

  const handleJoin = async (code, pinValue) => {
    const vErr = vehicleFieldsError();
    if (vErr) { setJoinError(vErr); return; }
    if (!code?.trim()) { setJoinError("Enter a convoy code."); return; }

    setJoinError("");
    setJoining(true);

    console.log("[SafeConvoy] joining convoy with code:", code);

    try {
      const { data, error } = await supabase.rpc("join_convoy", {
        p_code: code.trim(),
        p_pin: pinValue || null,
        p_vehicle_type: vehicleType || null,
        p_vehicle_color: vehicleColor || null,
        p_plate_number: plateNumber || null,
        p_name: myName(),
        p_avatar_url: myAvatar(),
        p_lat: userLocation?.lat ?? null,
        p_lng: userLocation?.lng ?? null,
      });

      console.log("[SafeConvoy] join_convoy →", { data, error });

      if (error) {
        const friendly = /not found/i.test(error.message)
          ? "Invalid convoy code — check it and try again."
          : error.message;
        setJoinError(friendly);
        setJoining(false);
        return;
      }

      const { data: memberRow, error: memberError } = await supabase
        .from("convoy_members")
        .select("id")
        .eq("convoy_id", data.id)
        .eq("user_id", session.user.id)
        .single();

      if (memberError) console.error("[SafeConvoy] failed to load own member row:", memberError);

      const convoy = { ...data, memberId: memberRow?.id };
      console.log("[SafeConvoy] myConvoy set (join) →", convoy);
      setMyConvoy(convoy);
      setJoining(false);
      setPinPromptConvoy(null);
      setDistressSent(false);
      setDistressResult(null);
      setConvoyTab("active");
    } catch (e) {
      console.error("[SafeConvoy] join_convoy threw:", e);
      setJoinError(e.message || "Something went wrong joining the convoy.");
      setJoining(false);
    }
  };

  const handleDistress = async () => {
    if (!myConvoy) return;
    console.log("[SafeConvoy] distress confirmed — sending alert for convoy", myConvoy.id);
    setDistressBusy(true);
    setDistressResult(null);
    const name = myName();
    const lat = tracking.myLocation?.lat ?? userLocation?.lat ?? null;
    const lng = tracking.myLocation?.lng ?? userLocation?.lng ?? null;
    const description = `🆘 ${name} triggered a DISTRESS ALERT — convoy needs help!`;

    await supabase.rpc("log_convoy_event", {
      p_convoy_id: myConvoy.id, p_event_type: "distress", p_lat: lat, p_lng: lng, p_description: description,
    });
    await supabase.from("convoy_messages").insert({
      convoy_id: myConvoy.id, sender_name: "System", message: description, message_type: "system",
    });
    const result = await notifyConvoy({
      convoyId: myConvoy.id, eventType: "distress", memberName: name, routeName: myConvoy.route, excludeUserId: session?.user?.id,
    });

    setDistressSent(true);
    setDistressBusy(false);
    setDistressResult(
      result.ok
        ? { ok: true, text: result.sent > 0 ? `Push alert delivered to ${result.sent} convoy member${result.sent === 1 ? "" : "s"}.` : "Distress event logged — no convoy members have push notifications enabled yet." }
        : { ok: false, text: `Distress event logged, but the push notification failed to send (${result.error}).` }
    );
  };

  const handleCancelDistress = async () => {
    if (!myConvoy) return;
    const name = myName();
    const lat = tracking.myLocation?.lat ?? null;
    const lng = tracking.myLocation?.lng ?? null;
    const description = `✅ ${name} cancelled their DISTRESS ALERT`;

    await supabase.rpc("log_convoy_event", {
      p_convoy_id: myConvoy.id, p_event_type: "distress_cancelled", p_lat: lat, p_lng: lng, p_description: description,
    });
    await supabase.from("convoy_messages").insert({
      convoy_id: myConvoy.id, sender_name: "System", message: description, message_type: "system",
    });
    setDistressSent(false);
    setDistressResult(null);
  };

  // Leader → ends the convoy for everyone; non-leader → leaves it themselves.
  const handleEndOrLeaveConvoy = async () => {
    if (!myConvoy) return;
    setLeavingConvoy(true);
    const code = myConvoy.code;

    try {
      if (isLeader) {
        await supabase.from("convoy_messages").insert({
          convoy_id: myConvoy.id, sender_name: "System",
          message: `🏁 Convoy ${code} has ended. Safe travels!`,
          message_type: "system",
        });
        const { error } = await supabase.from("convoys").update({ status: "completed" }).eq("id", myConvoy.id);
        if (error) throw error;
        setConvoyToast("Convoy ended. Stay safe!");
      } else {
        const { error } = await supabase
          .from("convoy_members")
          .delete()
          .eq("convoy_id", myConvoy.id)
          .eq("user_id", session.user.id);
        if (error) throw error;
        setConvoyToast("You've left the convoy.");
      }

      setShowLeaveConfirm(false);
      setDismissedEventId(null);
      setDistressSent(false);
      setDistressResult(null);
      setMyConvoy(null);
      setConvoyTab("active");
    } catch (e) {
      console.error("[SafeConvoy] end/leave convoy failed:", e);
      setConvoyToast(`Failed: ${e.message}`);
    } finally {
      setLeavingConvoy(false);
    }
  };

  // Shared "Your Vehicle" card — reused on both the "Start New" and "Join
  // Existing" tabs since they read/write the same vehicleType/vehicleColor/
  // plateNumber state.
  const vehicleCard = (
    <div style={cvS.card}>
      <div style={cvS.sectionLabel}>Your Vehicle</div>
      <div style={cvS.fieldWrap}>
        <label style={cvS.label}>Vehicle Type</label>
        <select style={cvS.input} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
          <option value="">Select vehicle type...</option>
          {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
      </div>
      <div style={cvS.fieldWrap}>
        <label style={cvS.label}>Vehicle Color</label>
        <input style={cvS.input} value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="e.g. Black, White, Red" />
      </div>
      <div style={{ ...cvS.fieldWrap, marginBottom: 0 }}>
        <label style={cvS.label}>Plate Number</label>
        <input
          style={{ ...cvS.input, ...(plateNumber && !plateValid ? cvS.inputError : {}), textTransform: "uppercase" }}
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
          placeholder="e.g. ABJ 234 EF"
        />
        {plateNumber && !plateValid && <div style={cvS.errorText}>Enter a valid Nigerian plate number (e.g. ABJ 234 EF)</div>}
      </div>
    </div>
  );

  const handleConfirmRoute = async (routeId) => {
    if (confirmedRoutes.has(routeId)) return;
    setConfirmedRoutes((prev) => new Set(prev).add(routeId));
    setDangerRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...r, confirmations_count: (r.confirmations_count || 0) + 1 } : r)));
    const { error } = await supabase.rpc("confirm_danger_route", { p_route_id: routeId });
    if (error) {
      setConfirmedRoutes((prev) => { const next = new Set(prev); next.delete(routeId); return next; });
      setDangerRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...r, confirmations_count: Math.max(0, (r.confirmations_count || 0) - 1) } : r)));
    }
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      <style>{cvCSS}</style>

      <div style={cvS.intro}>
        🚗 Safe Convoy lets drivers form moving groups on dangerous roads. All members share live GPS. If any vehicle stops unexpectedly, the entire convoy is alerted instantly.
      </div>

      <div style={cvS.tabBar}>
        {tabs.map(([t, l]) => (
          <button key={t} onClick={() => setConvoyTab(t)} style={cvS.tabBtn(convoyTab === t)}>{l}</button>
        ))}
      </div>

      {convoyTab === "active" && (
        <div key="active" style={{ padding: "0 16px", ...cvS.fadeIn }}>
          {loadingConvoy ? (
            <div style={{ textAlign: "center", padding: 40, color: "#5b6b8c", fontFamily: cvS.bodyFont }}>Loading your convoy...</div>
          ) : !myConvoy ? (
            <div style={cvS.card}>
              <div style={{ fontSize: 32, textAlign: "center", marginBottom: 10 }}>🚗</div>
              <div style={{ textAlign: "center", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>You're not in a convoy yet</div>
              <div style={{ textAlign: "center", color: "#7d8bab", fontSize: 12, marginBottom: 14 }}>
                Start a new convoy or join one with a code to begin live tracking.
              </div>
              <button style={cvS.primaryBtn} onClick={() => setConvoyTab("create")}>➕ Start or Join a Convoy</button>
            </div>
          ) : (
            <>
              {bannerEvent && (
                <div style={cvS.bannerRed}>
                  <div style={cvS.bannerText}>{bannerEvent.description || "A convoy member needs attention."}</div>
                  <button style={cvS.bannerDismiss} onClick={() => setDismissedEventId(bannerEvent.id)}>Dismiss</button>
                </div>
              )}
              {bannerEvent && isLeader && (
                <a href="tel:199" style={{ textDecoration: "none", display: "block", margin: "0 16px 10px" }}>
                  <div style={cvS.policeBtn}>📞 Contact Police (199)</div>
                </a>
              )}

              <div style={cvS.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{myConvoy.code}</div>
                    <div style={{ color: "#9aa7c7", fontSize: 12, marginTop: 2 }}>{myConvoy.destination} · {myConvoy.route}</div>
                    <div style={{ color: "#5b6b8c", fontSize: 11, marginTop: 2 }}>
                      Started {new Date(myConvoy.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span style={cvS.liveBadge}>● LIVE</span>
                </div>
                {progressPct != null && (
                  <>
                    <div style={cvS.progressTrack}><div style={{ ...cvS.progressFill, width: `${progressPct}%` }} /></div>
                    <div style={{ fontSize: 11, color: "#7d8bab", marginTop: 6 }}>{Math.round(progressPct)}% of route completed</div>
                  </>
                )}
              </div>

              <div ref={mapRef} style={cvS.mapWrap} />

              <div style={cvS.card}>
                <div style={cvS.sectionLabel}>Convoy Members ({sortedMembers.length})</div>
                {sortedMembers.map((m) => {
                  const mine = m.user_id === session?.user?.id;
                  const gpsLostFlag = mine ? tracking.gpsLost : isGpsLost(m.last_updated);
                  const eta = computeETA(myConvoy, progressPct, m.speed);
                  return (
                    <div key={m.id} style={cvS.memberRow}>
                      <div style={cvS.memberAvatar}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          VEHICLE_ICONS[m.vehicle_type] || "🚗"
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={cvS.memberName}>{m.name}{mine ? " (You)" : ""}{m.is_leader ? " 👑" : ""}</div>
                        <div style={cvS.memberSub}>
                          {[m.vehicle_color, m.vehicle_type, m.plate_number].filter(Boolean).join(" · ") || "No vehicle info"}
                        </div>
                        <div style={cvS.memberSub}>
                          {m.lat != null && (!mine || (tracking.myLocation && !tracking.gpsLost))
                            ? `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`
                            : "Waiting for GPS..."}
                        </div>
                        {gpsLostFlag && <span style={cvS.gpsLostTag}>GPS LOST</span>}
                      </div>
                      <div style={cvS.memberMeta}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          {m.status === "stopped" && <span style={cvS.pulseDot(STATUS_COLORS.stopped)} />}
                          <span style={cvS.pill(m.status)}>{STATUS_LABELS[m.status] || STATUS_LABELS.offline}</span>
                        </div>
                        <div style={cvS.memberSpeed}>{Math.round(m.speed || 0)} km/h</div>
                        {eta && <div style={cvS.memberMicro}>ETA {eta}</div>}
                        <div style={cvS.memberMicro}>{formatRelativeTime(m.last_updated)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                style={{ ...cvS.ghostBtn, border: "1px solid #FF2D2D55", color: "#FF6666", marginBottom: 10 }}
                onClick={() => setShowLeaveConfirm(true)}
              >
                {isLeader ? "🏁 End Convoy" : "🚪 Leave Convoy"}
              </button>

              {!distressSent ? (
                <button
                  style={cvS.distressBtn(false)}
                  onClick={() => {
                    console.log("[SafeConvoy] distress button clicked — showing confirmation modal");
                    setShowDistressConfirm(true);
                  }}
                  disabled={distressBusy}
                >
                  {distressBusy ? "SENDING..." : "🚨 SEND CONVOY DISTRESS ALERT"}
                </button>
              ) : (
                <div style={cvS.bannerRed}>
                  <div style={cvS.bannerText}>🆘 DISTRESS ALERT ACTIVE — All convoy members have been notified.</div>
                  <button style={cvS.bannerDismiss} onClick={handleCancelDistress}>Cancel</button>
                </div>
              )}

              {distressResult && (
                <div style={distressResult.ok ? cvS.bannerGreen : cvS.bannerRed}>
                  <div style={distressResult.ok ? cvS.bannerGreenText : cvS.bannerText}>
                    {distressResult.ok ? "✅ " : "⚠️ "}{distressResult.text}
                  </div>
                  <button style={distressResult.ok ? cvS.bannerGreenDismiss : cvS.bannerDismiss} onClick={() => setDistressResult(null)}>
                    Dismiss
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {convoyTab === "chat" && myConvoy && (
        <div key="chat" style={{ padding: "0 16px", ...cvS.fadeIn }}>
          <div style={cvS.card}>
            <div style={cvS.sectionLabel}>💬 Convoy Chat — {myConvoy.code}</div>
            <ConvoyChat convoyId={myConvoy.id} session={session} />
          </div>
        </div>
      )}

      {showDistressConfirm && (
        <div style={cvS.modalOverlay} onClick={() => setShowDistressConfirm(false)}>
          <div style={cvS.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={cvS.modalTitle}>🆘 Send Distress Alert?</div>
            <div style={cvS.modalText}>
              This immediately notifies every member of convoy {myConvoy?.code} with a push notification and logs a distress event with your current location. Only send this if you need real help.
            </div>
            <div style={cvS.modalActions}>
              <button style={{ ...cvS.ghostBtn, flex: 1 }} onClick={() => setShowDistressConfirm(false)}>
                Cancel
              </button>
              <button
                style={{ ...cvS.distressBtn(false), flex: 1, marginTop: 0 }}
                onClick={() => { setShowDistressConfirm(false); handleDistress(); }}
                disabled={distressBusy}
              >
                {distressBusy ? "SENDING..." : "🚨 Yes, Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div style={cvS.modalOverlay} onClick={() => setShowLeaveConfirm(false)}>
          <div style={cvS.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={cvS.modalTitle}>{isLeader ? "End Convoy?" : "Leave Convoy?"}</div>
            <div style={cvS.modalText}>
              {isLeader
                ? `This will end convoy ${myConvoy?.code} for ALL members. Only do this when your trip is complete.`
                : `Leave convoy ${myConvoy?.code}? You can rejoin with the code later.`}
            </div>
            <div style={cvS.modalActions}>
              <button style={{ ...cvS.ghostBtn, flex: 1 }} onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </button>
              <button
                style={{ ...cvS.distressBtn(false), flex: 1, marginTop: 0 }}
                onClick={handleEndOrLeaveConvoy}
                disabled={leavingConvoy}
              >
                {leavingConvoy ? "..." : isLeader ? "🏁 Yes, End Convoy" : "🚪 Yes, Leave"}
              </button>
            </div>
          </div>
        </div>
      )}

      {convoyTab === "create" && (
        <div key="create" style={{ padding: "0 16px", ...cvS.fadeIn }}>
          {myConvoy ? (
            <div style={cvS.card}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: "#fff" }}>You're already in convoy {myConvoy.code}</div>
              <div style={{ color: "#7d8bab", fontSize: 12, marginBottom: 12 }}>
                Finish or leave your current convoy before starting another.
              </div>
              <button style={cvS.ghostBtn} onClick={() => setConvoyTab("active")}>View Active Convoy</button>
            </div>
          ) : (
            <>
              {vehicleCard}

              <div style={cvS.card}>
                <div style={cvS.sectionLabel}>Start a New Convoy</div>
                <div style={cvS.fieldWrap}>
                  <label style={cvS.label}>Destination</label>
                  <input style={cvS.input} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Abuja, FCT" />
                </div>
                <div style={cvS.fieldWrap}>
                  <label style={cvS.label}>Route / Highway</label>
                  <input style={cvS.input} value={route} onChange={(e) => setRoute(e.target.value)} placeholder="e.g. Kaduna–Abuja Expressway" />
                </div>
                <div style={cvS.fieldWrap}>
                  <label style={cvS.label}>Route Distance (km) — optional</label>
                  <input style={cvS.input} type="number" min="0" step="0.1" value={routeDistanceKm} onChange={(e) => setRouteDistanceKm(e.target.value)} placeholder="e.g. 180" />
                </div>
                <div style={cvS.toggleRow}>
                  <span style={{ fontSize: 13, color: "#fff", fontWeight: 600, fontFamily: cvS.bodyFont }}>🔒 Make this convoy private (PIN)</span>
                  <button type="button" style={{ ...cvS.toggle(pinEnabled), padding: 0 }} onClick={() => setPinEnabled((v) => !v)}>
                    <div style={cvS.toggleKnob(pinEnabled)} />
                  </button>
                </div>
                {pinEnabled && (
                  <div style={cvS.fieldWrap}>
                    <label style={cvS.label}>4-Digit PIN</label>
                    <input style={cvS.input} inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="e.g. 1234" />
                  </div>
                )}
                {createError && <div style={cvS.errorText}>{createError}</div>}
                <button style={{ ...cvS.primaryBtn, marginTop: 4 }} onClick={handleCreateConvoy} disabled={creating}>
                  {creating ? "Creating..." : "🚗 Start New Convoy"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {convoyTab === "join" && (
        <div key="join" style={{ padding: "0 16px", ...cvS.fadeIn }}>
          {myConvoy ? (
            <div style={cvS.card}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: "#fff" }}>You're already in convoy {myConvoy.code}</div>
              <div style={{ color: "#7d8bab", fontSize: 12, marginBottom: 12 }}>
                Finish or leave your current convoy before joining another.
              </div>
              <button style={cvS.ghostBtn} onClick={() => setConvoyTab("active")}>View Active Convoy</button>
            </div>
          ) : (
            <>
              {vehicleCard}

              <div style={cvS.card}>
                <div style={cvS.sectionLabel}>Join With a Code</div>
                <div style={cvS.fieldWrap}>
                  <label style={cvS.label}>Enter Convoy Code</label>
                  <input style={{ ...cvS.input, textTransform: "uppercase" }} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. NGS-3491" />
                </div>
                <div style={cvS.toggleRow}>
                  <span style={{ fontSize: 13, color: "#fff", fontWeight: 600, fontFamily: cvS.bodyFont }}>🔒 This convoy is private (has a PIN)</span>
                  <button type="button" style={{ ...cvS.toggle(joinHasPin), padding: 0 }} onClick={() => setJoinHasPin((v) => !v)}>
                    <div style={cvS.toggleKnob(joinHasPin)} />
                  </button>
                </div>
                {joinHasPin && (
                  <div style={cvS.fieldWrap}>
                    <label style={cvS.label}>4-Digit PIN</label>
                    <input style={cvS.input} inputMode="numeric" value={joinPin} onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="e.g. 1234" />
                  </div>
                )}
                {joinError && <div style={cvS.errorText}>{joinError}</div>}
                <button style={{ ...cvS.primaryBtn, marginTop: 4 }} onClick={() => handleJoin(joinCode, joinHasPin ? joinPin : null)} disabled={joining || !joinCode.trim()}>
                  {joining ? "Joining..." : "🔗 Join Convoy"}
                </button>
              </div>

              <div style={cvS.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ ...cvS.sectionLabel, marginBottom: 0 }}>Nearby Active Convoys</div>
                  <button style={{ background: "transparent", border: "none", color: "#FF6B00", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: cvS.headFont }} onClick={fetchNearby}>
                    ↻ Refresh
                  </button>
                </div>
                {nearbyLoading ? (
                  <div style={{ textAlign: "center", color: "#5b6b8c", fontSize: 12, padding: 12, fontFamily: cvS.bodyFont }}>Searching nearby convoys...</div>
                ) : nearbyConvoys.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#5b6b8c", fontSize: 12, padding: 12, fontFamily: cvS.bodyFont }}>No active convoys found nearby.</div>
                ) : (
                  nearbyConvoys.map((c) => (
                    <div key={c.id} style={cvS.nearbyCard}>
                      <MiniMap
                        center={c.leader_lat != null ? { lat: c.leader_lat, lng: c.leader_lng } : null}
                        markers={c.leader_lat != null ? [{ lat: c.leader_lat, lng: c.leader_lng, color: "#00FF88" }] : []}
                      />
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>{c.code} {c.has_pin ? "🔒" : ""}</div>
                        <div style={{ color: "#7d8bab", fontSize: 11, marginTop: 2 }}>{c.destination} · {c.route}</div>
                        <div style={{ color: "#5b6b8c", fontSize: 11, marginTop: 2 }}>
                          {c.member_count} member{c.member_count === 1 ? "" : "s"}
                          {c.distance_km != null ? ` · ${c.distance_km.toFixed(1)} km away` : ""}
                        </div>
                      </div>
                      {pinPromptConvoy === c.id ? (
                        <>
                          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                            <input
                              style={{ ...cvS.input, flex: 1 }}
                              inputMode="numeric"
                              autoFocus
                              value={joinPin}
                              onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              placeholder="Enter PIN"
                            />
                            <button style={{ ...cvS.primaryBtn, width: "auto", padding: "0 16px" }} onClick={() => handleJoin(c.code, joinPin)} disabled={joining}>
                              {joining ? "..." : "Join"}
                            </button>
                          </div>
                          {joinError && <div style={cvS.errorText}>{joinError}</div>}
                        </>
                      ) : (
                        <button
                          style={{ ...cvS.ghostBtn, marginTop: 10 }}
                          onClick={() => {
                            if (c.has_pin) { setPinPromptConvoy(c.id); setJoinError(""); }
                            else handleJoin(c.code, null);
                          }}
                        >
                          {c.has_pin ? "🔒 Enter PIN to Join" : "🔗 Join This Convoy"}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {convoyTab === "routes" && (
        <div key="routes" style={{ padding: "0 16px", ...cvS.fadeIn }}>
          {dangerRoutesError && (
            <div style={cvS.errorText}>⚠️ Failed to load danger routes: {dangerRoutesError}</div>
          )}
          <div style={cvS.filterRow}>
            {["all", "HIGH", "MEDIUM", "LOW"].map((r) => (
              <button key={r} style={cvS.filterPill(riskFilter === r, RISK_COLORS[r] || "#FF6B00")} onClick={() => setRiskFilter(r)}>
                {r === "all" ? "All" : r}
              </button>
            ))}
          </div>
          <div style={cvS.fieldWrap}>
            <select style={cvS.input} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
              <option value="all">All States</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {filteredRoutes.length === 0 ? (
            <div style={{ textAlign: "center", color: "#5b6b8c", fontSize: 12, padding: 24, fontFamily: cvS.bodyFont }}>No danger routes match this filter.</div>
          ) : (
            filteredRoutes.map((r) => {
              const color = RISK_COLORS[r.risk_level] || "#5b6b8c";
              const confirmed = confirmedRoutes.has(r.id);
              return (
                <div key={r.id} style={cvS.dangerCard(color)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{r.name}</div>
                      {r.state && <div style={{ color: "#7d8bab", fontSize: 11, marginTop: 2 }}>{r.state} State</div>}
                    </div>
                    <span style={cvS.riskBadge(color)}>{r.risk_level}</span>
                  </div>
                  <MiniMap
                    center={r.lat != null ? { lat: r.lat, lng: r.lng } : null}
                    markers={r.lat != null ? [{ lat: r.lat, lng: r.lng, color }] : []}
                  />
                  <div style={{ color: "#7d8bab", fontSize: 11, marginTop: 8 }}>
                    📊 {r.incident_count} incidents · Last: {formatRelativeTime(r.last_incident_at)} · ✅ {r.confirmations_count || 0} confirmed
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button style={cvS.actionBtn("#25D366")} onClick={() => shareRoute(r)}>📤 Share</button>
                    <button style={cvS.actionBtn(color)} onClick={() => handleConfirmRoute(r.id)} disabled={confirmed}>
                      {confirmed ? "✅ Confirmed" : "✅ Confirm Dangerous"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {convoyToast && (
        <div style={cvS.toast}>
          {convoyToast}
        </div>
      )}
    </div>
  );
}
