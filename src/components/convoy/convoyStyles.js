// Visual system for the Safe Convoy revamp — stays in the app's existing
// deep-navy / orange / green / red / amber palette (see S.shell in
// MainApp.jsx: #0a0e1a background) but adds rounded cards with soft shadows,
// pill status badges, more breathing room, and a cleaner sans-serif body
// font for a "safety command center" feel.

export const RISK_COLORS = { HIGH: "#FF2D2D", MEDIUM: "#FFB800", LOW: "#00FF88" };

export const STATUS_COLORS = {
  moving: "#00FF88",
  warning: "#FFB800",
  stopped: "#FF2D2D",
  offline: "#5b6b8c",
};

export const STATUS_LABELS = {
  moving: "● MOVING",
  warning: "▲ WARNING",
  stopped: "■ STOPPED",
  offline: "○ OFFLINE",
};

// Extra keyframes layered on top of the global CSS already injected by
// <Shell> (which provides `pulse` and `blink`).
export const cvCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@keyframes cvPulse { 0%,100%{ opacity:1; box-shadow:0 0 0 0 rgba(255,45,45,0.45); } 50%{ opacity:0.85; box-shadow:0 0 0 8px rgba(255,45,45,0); } }
@keyframes cvFadeIn { from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:translateY(0); } }
`;

const bodyFont = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const headFont = "'Barlow Condensed', sans-serif";

export const cvS = {
  bodyFont,
  headFont,
  fadeIn: { animation: "cvFadeIn 0.25s ease" },

  intro: { background: "#11182b", border: "1px solid #1f2940", borderRadius: 14, margin: "12px 16px", padding: "12px 14px", fontSize: 12, color: "#9aa7c7", lineHeight: 1.6, fontFamily: bodyFont },

  tabBar: { display: "flex", gap: 6, margin: "0 16px 16px", background: "#11182b", borderRadius: 14, border: "1px solid #1f2940", padding: 4 },
  tabBtn: (active) => ({
    flex: 1, padding: "10px 4px", borderRadius: 10, border: "none", cursor: "pointer",
    fontWeight: 800, fontSize: 12, letterSpacing: 0.5, fontFamily: headFont,
    background: active ? "linear-gradient(135deg,#FF6B00,#aa4400)" : "transparent",
    color: active ? "#fff" : "#7d8bab",
    boxShadow: active ? "0 3px 12px #FF6B0040" : "none",
    transition: "all 0.2s ease",
  }),

  card: { background: "#11182b", border: "1px solid #1f2940", borderRadius: 16, padding: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.35)", marginBottom: 12, fontFamily: bodyFont },
  cardTight: { background: "#11182b", border: "1px solid #1f2940", borderRadius: 14, padding: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", marginBottom: 10, fontFamily: bodyFont },

  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#5b6b8c", textTransform: "uppercase", marginBottom: 10, fontFamily: bodyFont },

  liveBadge: { background: "#00FF8820", border: "1px solid #00FF8850", borderRadius: 20, padding: "4px 12px", fontSize: 10, fontWeight: 800, color: "#00FF88", letterSpacing: 1, fontFamily: headFont },

  mapWrap: { borderRadius: 16, overflow: "hidden", height: "40vh", minHeight: 240, border: "1px solid #1f2940", marginBottom: 14, position: "relative", zIndex: 1, background: "#0c1322" },
  miniMapWrap: { borderRadius: 12, overflow: "hidden", height: 110, border: "1px solid #1f2940", marginTop: 10, position: "relative", zIndex: 1, background: "#0c1322" },

  progressTrack: { height: 8, background: "#0c1322", borderRadius: 6, overflow: "hidden", marginTop: 10, border: "1px solid #1f2940" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#FF6B00,#FFB800)", borderRadius: 6, transition: "width 0.4s ease" },

  pill: (status) => {
    const color = STATUS_COLORS[status] || STATUS_COLORS.offline;
    return {
      display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
      fontSize: 10, fontWeight: 800, letterSpacing: 1, fontFamily: headFont,
      background: `${color}22`, color, border: `1px solid ${color}55`,
      animation: status === "stopped" ? "cvPulse 1.4s ease-in-out infinite" : "none",
    };
  },

  memberRow: { display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1f2940" },
  memberAvatar: { width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "#0c1322", border: "1px solid #232f4a", flexShrink: 0, overflow: "hidden" },
  memberName: { fontWeight: 700, fontSize: 14, color: "#fff", fontFamily: bodyFont },
  memberSub: { color: "#7d8bab", fontSize: 11, marginTop: 2, fontFamily: bodyFont },
  memberMeta: { textAlign: "right", flexShrink: 0 },
  memberSpeed: { fontSize: 12, fontWeight: 700, color: "#fff", marginTop: 4, fontFamily: bodyFont },
  memberMicro: { fontSize: 10, color: "#5b6b8c", marginTop: 2, fontFamily: bodyFont },
  gpsLostTag: { fontSize: 9, fontWeight: 800, color: "#FFB800", background: "#FFB80018", border: "1px solid #FFB80044", borderRadius: 6, padding: "1px 6px", marginTop: 4, display: "inline-block", letterSpacing: 1 },

  pulseDot: (color) => ({ width: 9, height: 9, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, animation: "blink 0.9s ease-in-out infinite", flexShrink: 0 }),

  bannerRed: { margin: "10px 16px", background: "linear-gradient(135deg,#3a0000,#1a0000)", border: "1px solid #FF2D2D66", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, animation: "cvFadeIn 0.3s ease, cvPulse 1.6s ease-in-out infinite", fontFamily: bodyFont },
  bannerText: { flex: 1, fontSize: 12, color: "#ffd6d6", lineHeight: 1.4, fontFamily: bodyFont },
  bannerDismiss: { background: "transparent", border: "1px solid #FF2D2D55", color: "#FF6666", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: headFont, flexShrink: 0 },

  bannerGreen: { margin: "10px 16px", background: "linear-gradient(135deg,#06301c,#0a1a10)", border: "1px solid #00FF8866", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, animation: "cvFadeIn 0.3s ease", fontFamily: bodyFont },
  bannerGreenText: { flex: 1, fontSize: 12, color: "#cdffe9", lineHeight: 1.4, fontFamily: bodyFont },
  bannerGreenDismiss: { background: "transparent", border: "1px solid #00FF8855", color: "#5fffc0", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: headFont, flexShrink: 0 },

  // Confirmation modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(5,8,15,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, animation: "cvFadeIn 0.15s ease" },
  modalCard: { background: "#11182b", border: "1px solid #2a3654", borderRadius: 18, padding: 22, maxWidth: 340, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", fontFamily: bodyFont },
  modalTitle: { fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 8, fontFamily: headFont, letterSpacing: 0.5 },
  modalText: { fontSize: 12, color: "#9aa7c7", lineHeight: 1.6, marginBottom: 18 },
  modalActions: { display: "flex", gap: 10 },

  policeBtn: { width: "100%", background: "linear-gradient(135deg,#0A2540,#08182b)", border: "1px solid #00BFFF44", borderRadius: 10, padding: "12px", color: "#7fd4ff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: headFont, marginBottom: 10, letterSpacing: 0.5 },

  distressBtn: (active) => ({
    width: "100%", border: "none", borderRadius: 14, padding: "16px",
    color: "#fff", fontSize: 15, fontWeight: 900, letterSpacing: 1.5, cursor: "pointer",
    fontFamily: headFont, background: "linear-gradient(135deg,#FF2D2D,#990000)",
    boxShadow: "0 4px 20px #FF2D2D44", marginTop: 4,
    animation: active ? "pulse 1.6s ease-in-out infinite" : "none",
  }),

  label: { fontSize: 11, color: "#7d8bab", fontWeight: 700, letterSpacing: 1.5, display: "block", marginBottom: 6, textTransform: "uppercase", fontFamily: bodyFont },
  input: { width: "100%", background: "#0c1322", border: "1px solid #232f4a", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, fontFamily: bodyFont, outline: "none" },
  inputError: { borderColor: "#FF2D2D88" },
  errorText: { fontSize: 11, color: "#FF6666", marginTop: 4, fontFamily: bodyFont },
  fieldWrap: { marginBottom: 12 },

  toggleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  toggle: (on) => ({ width: 42, height: 24, borderRadius: 14, background: on ? "#FF6B00" : "#232f4a", position: "relative", cursor: "pointer", transition: "background 0.2s", border: "none", flexShrink: 0 }),
  toggleKnob: (on) => ({ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }),

  primaryBtn: { width: "100%", background: "linear-gradient(135deg,#FF6B00,#aa4400)", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 14, fontWeight: 900, letterSpacing: 1, cursor: "pointer", fontFamily: headFont, boxShadow: "0 4px 18px #FF6B0033" },
  ghostBtn: { width: "100%", background: "transparent", border: "1px solid #232f4a", borderRadius: 12, padding: "13px", color: "#9aa7c7", fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer", fontFamily: headFont },

  filterRow: { display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 2 },
  filterPill: (active, color = "#FF6B00") => ({ flexShrink: 0, borderRadius: 20, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: headFont, background: active ? `${color}22` : "#11182b", color: active ? color : "#7d8bab", border: `1px solid ${active ? color + "55" : "#1f2940"}` }),

  dangerCard: (color) => ({ background: "#11182b", border: "1px solid #1f2940", borderLeft: `4px solid ${color}`, borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", fontFamily: bodyFont }),
  riskBadge: (color) => ({ background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 800, color, letterSpacing: 1, fontFamily: headFont }),

  actionBtn: (color) => ({ flex: 1, background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 8, padding: "9px 4px", fontSize: 11, color, fontWeight: 700, cursor: "pointer", fontFamily: headFont }),

  nearbyCard: { background: "#0c1322", border: "1px solid #1f2940", borderRadius: 12, padding: 12, marginBottom: 8, cursor: "pointer", fontFamily: bodyFont },

  // Chat
  chatWrap: { display: "flex", flexDirection: "column", height: 360 },
  chatScroll: { flex: 1, overflowY: "auto", padding: "4px 2px", display: "flex", flexDirection: "column", gap: 8 },
  chatBubble: (mine) => ({
    maxWidth: "80%", alignSelf: mine ? "flex-end" : "flex-start",
    background: mine ? "linear-gradient(135deg,#FF6B00,#aa4400)" : "#0c1322",
    border: mine ? "none" : "1px solid #232f4a",
    borderRadius: 12, padding: "8px 12px", fontSize: 13, color: "#fff", fontFamily: bodyFont,
  }),
  chatSystem: { alignSelf: "center", fontSize: 11, color: "#5b6b8c", fontFamily: bodyFont, textAlign: "center", padding: "2px 10px", background: "#0c132266", borderRadius: 20 },
  chatSender: { fontSize: 10, fontWeight: 700, color: "#FFB800", marginBottom: 2, fontFamily: bodyFont },
  chatTime: { fontSize: 9, color: "#5b6b8c", marginTop: 3, fontFamily: bodyFont },
  chatInputRow: { display: "flex", gap: 8, marginTop: 10 },
  chatInput: { flex: 1, background: "#0c1322", border: "1px solid #232f4a", borderRadius: 20, padding: "10px 16px", color: "#fff", fontSize: 13, fontFamily: bodyFont, outline: "none" },
  chatSendBtn: { background: "linear-gradient(135deg,#FF6B00,#aa4400)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0 },
};
