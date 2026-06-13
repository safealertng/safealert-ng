import { useEffect, useRef } from "react";
import { cvS } from "./convoyStyles";

// Small, non-interactive Leaflet preview — used for danger-route cards and
// "nearby active convoys" list items. Leaflet itself is loaded via the
// <link> tag in index.html; the JS module is still dynamically imported to
// avoid pulling it into the main bundle.
export default function MiniMap({ center, markers = [], zoom = 12, style }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!mapRef.current || center?.lat == null || center?.lng == null) return;

    import("leaflet").then(({ default: L }) => {
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
      }).setView([center.lat, center.lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      markers.forEach((m) => {
        if (m.lat == null || m.lng == null) return;
        const color = m.color || "#FF6B00";
        const icon = L.divIcon({
          html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ${color}"></div>`,
          iconSize: [12, 12],
          className: "",
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        if (m.label) marker.bindTooltip(m.label);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // `markers` is intentionally excluded — parents pass a fresh array each
    // render, and this preview only needs to redraw when the center/zoom move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng, zoom]);

  if (center?.lat == null || center?.lng == null) {
    return (
      <div style={{ ...cvS.miniMapWrap, ...style, display: "flex", alignItems: "center", justifyContent: "center", color: "#5b6b8c", fontSize: 11 }}>
        Map preview unavailable
      </div>
    );
  }

  return <div ref={mapRef} style={{ ...cvS.miniMapWrap, ...style }} />;
}
