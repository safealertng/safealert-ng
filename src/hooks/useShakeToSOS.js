import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

// Tuned so normal handling/walking doesn't trigger false positives.
const SHAKE_THRESHOLD = 15; // m/s^2 change between motion samples
const MIN_SHAKE_GAP_MS = 100; // ignore re-triggers from the same physical shake
const SHAKE_WINDOW_MS = 1500; // all 3 shakes must land inside this window
const SHAKES_REQUIRED = 3;
const COOLDOWN_MS = 2000; // pause detection right after a successful toggle

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMotionSupported = () =>
  typeof window !== "undefined" && "DeviceMotionEvent" in window;

const needsExplicitPermission = () =>
  typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function";

// Detects 3 rapid phone shakes and silently toggles a live-location SOS to
// the user's own family tracker contacts. No sound/visual feedback on
// trigger by design — `armed` below is only for the setup screen.
export default function useShakeToSOS(session) {
  const [active, setActive] = useState(false);
  // Devices that don't need an explicit permission prompt are armed as soon
  // as the listener is attached; iOS 13+ needs a user gesture first.
  const [armed, setArmed] = useState(() => isMotionSupported() && !needsExplicitPermission());
  const activeRef = useRef(false);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const shakeTimes = useRef([]);
  const lastShakeAt = useRef(0);
  const cooldownRef = useRef(false);

  // Restore toggle state across reloads
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("shake_sos_events")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .limit(1);
      if (cancelled) return;
      const isActive = !!(data && data.length > 0);
      activeRef.current = isActive;
      setActive(isActive);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const triggerShakeSOS = async () => {
    if (!session?.user?.id) return;
    const turningOn = !activeRef.current;
    activeRef.current = turningOn;
    setActive(turningOn);

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          if (turningOn) {
            await supabase.from("shake_sos_events").insert({
              user_id: session.user.id,
              lat: latitude,
              lng: longitude,
              status: "active",
            });
          } else {
            await supabase
              .from("shake_sos_events")
              .update({ status: "cancelled", resolved_at: new Date().toISOString() })
              .eq("user_id", session.user.id)
              .eq("status", "active");
          }

          await fetch(`${SUPABASE_URL}/functions/v1/send-shake-sos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              userId: session.user.id,
              lat: latitude,
              lng: longitude,
              action: turningOn ? "activate" : "cancel",
            }),
          });
        } catch (e) {
          console.error("Shake SOS error:", e);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    const handleMotion = (event) => {
      const accel = event.accelerationIncludingGravity || event.acceleration;
      if (!accel) return;
      const x = accel.x || 0, y = accel.y || 0, z = accel.z || 0;
      const delta =
        Math.abs(x - lastAccel.current.x) +
        Math.abs(y - lastAccel.current.y) +
        Math.abs(z - lastAccel.current.z);
      lastAccel.current = { x, y, z };

      if (delta <= SHAKE_THRESHOLD) return;

      const now = Date.now();
      if (now - lastShakeAt.current < MIN_SHAKE_GAP_MS) return;
      lastShakeAt.current = now;

      shakeTimes.current = shakeTimes.current.filter((t) => now - t < SHAKE_WINDOW_MS);
      shakeTimes.current.push(now);

      if (shakeTimes.current.length >= SHAKES_REQUIRED) {
        shakeTimes.current = [];
        if (cooldownRef.current) return;
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, COOLDOWN_MS);
        triggerShakeSOS();
      }
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [session?.user?.id]);

  // iOS 13+ requires an explicit, user-gesture-triggered permission request.
  // Returns "granted" | "denied" | "unsupported" so the UI can confirm/error.
  const requestPermission = async () => {
    if (!isMotionSupported()) return "unsupported";

    if (!needsExplicitPermission()) {
      setArmed(true);
      return "granted";
    }

    try {
      const result = await DeviceMotionEvent.requestPermission();
      const granted = result === "granted";
      setArmed(granted);
      return granted ? "granted" : "denied";
    } catch {
      setArmed(false);
      return "denied";
    }
  };

  return { active, armed, requestPermission };
}
