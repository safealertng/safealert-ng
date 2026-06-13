import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const LOCATION_INTERVAL_MS = 10000;
const STOP_SPEED_THRESHOLD_KMH = 2;
const STOP_DURATION_MS = 3 * 60 * 1000;
const GPS_LOST_MS = 15000;

// Tracks the caller's GPS, pushes it to convoy_members every 10s, runs the
// stop/resume state machine (3-minute "stopped" threshold), and subscribes
// to realtime updates for the convoy roster + events (for the alert banner).
export default function useConvoyTracking({ convoyId, memberId, session, route }) {
  const [members, setMembers] = useState({});
  const [myLocation, setMyLocation] = useState(null);
  const [gpsLost, setGpsLost] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  const sampleRef = useRef(null);
  const lastFixAtRef = useRef(null);
  const stopSinceRef = useRef(null);
  const statusRef = useRef("moving");

  // Watch GPS position.
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const speed = Number.isFinite(pos.coords.speed) ? pos.coords.speed * 3.6 : 0;
        const heading = Number.isFinite(pos.coords.heading) ? pos.coords.heading : null;
        sampleRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, speed, heading };
        lastFixAtRef.current = Date.now();
        setMyLocation(sampleRef.current);
        setGpsLost(false);
      },
      (err) => console.error("Convoy GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // GPS-lost watchdog.
  useEffect(() => {
    const t = setInterval(() => {
      if (lastFixAtRef.current && Date.now() - lastFixAtRef.current > GPS_LOST_MS) setGpsLost(true);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Push location every 10s + stop/resume state machine.
  useEffect(() => {
    if (!convoyId || !memberId) return;
    statusRef.current = "moving";
    stopSinceRef.current = null;

    const tick = async () => {
      const sample = sampleRef.current;
      if (!sample) return;

      let status = "moving";
      if (sample.speed < STOP_SPEED_THRESHOLD_KMH) {
        if (!stopSinceRef.current) stopSinceRef.current = Date.now();
        status = Date.now() - stopSinceRef.current >= STOP_DURATION_MS ? "stopped" : "warning";
      } else {
        stopSinceRef.current = null;
      }

      const prevStatus = statusRef.current;

      await supabase.rpc("update_convoy_member_location", {
        p_convoy_id: convoyId,
        p_lat: sample.lat,
        p_lng: sample.lng,
        p_speed: sample.speed,
        p_heading: sample.heading,
        p_status: status,
      });

      const name = session?.user?.user_metadata?.full_name || "A convoy member";

      if (status === "stopped" && prevStatus !== "stopped") {
        await supabase.rpc("log_convoy_event", {
          p_convoy_id: convoyId, p_event_type: "stopped",
          p_lat: sample.lat, p_lng: sample.lng,
          p_description: `${name}'s vehicle has STOPPED`,
        });
        await supabase.from("convoy_messages").insert({
          convoy_id: convoyId, sender_name: "System",
          message: `🚨 ${name}'s vehicle has STOPPED on ${route || "the route"}. Check on them!`,
          message_type: "system",
        });
        fetch(`${SUPABASE_URL}/functions/v1/send-convoy-alert`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ convoyId, eventType: "stopped", memberName: name, routeName: route, excludeUserId: session?.user?.id }),
        }).catch(() => {});
      } else if (status === "moving" && prevStatus !== "moving") {
        await supabase.rpc("log_convoy_event", {
          p_convoy_id: convoyId, p_event_type: "resumed",
          p_lat: sample.lat, p_lng: sample.lng,
          p_description: `${name}'s vehicle is moving again`,
        });
        await supabase.from("convoy_messages").insert({
          convoy_id: convoyId, sender_name: "System",
          message: `✅ ${name}'s vehicle is moving again`,
          message_type: "system",
        });
      }

      statusRef.current = status;
    };

    tick();
    const interval = setInterval(tick, LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [convoyId, memberId, session?.user?.id, session?.user?.user_metadata?.full_name, route]);

  // Realtime roster + event feed (drives the map, member list, and alert banner).
  useEffect(() => {
    if (!convoyId) return;

    let active = true;
    (async () => {
      const { data } = await supabase.from("convoy_members").select("*").eq("convoy_id", convoyId);
      if (active && data) {
        const map = {};
        data.forEach((m) => { map[m.id] = m; });
        setMembers(map);
      }
    })();

    const channel = supabase
      .channel(`convoy-${convoyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "convoy_members", filter: `convoy_id=eq.${convoyId}` },
        (payload) => {
          setMembers((prev) => {
            const next = { ...prev };
            if (payload.eventType === "DELETE") delete next[payload.old.id];
            else next[payload.new.id] = payload.new;
            return next;
          });
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "convoy_events", filter: `convoy_id=eq.${convoyId}` },
        (payload) => setLastEvent(payload.new)
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [convoyId]);

  return {
    members: Object.values(members),
    myLocation,
    gpsLost,
    lastEvent,
    dismissEvent: () => setLastEvent(null),
  };
}
