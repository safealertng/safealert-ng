import { useEffect } from "react";

const EmailLink = () => <a href="mailto:support@safealert.ng" style={S.link}>support@safealert.ng</a>;
const SiteLink = () => <a href="https://safealert.ng" style={S.link} target="_blank" rel="noopener noreferrer">safealert.ng</a>;
const PrivacyLink = () => <a href="/privacy" style={S.link}>Privacy Policy</a>;

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    blocks: [
      { type: "p", text: "By using SafeAlertNG you agree to these terms. If you do not agree, please do not use the app." },
    ],
  },
  {
    title: "2. What SafeAlertNG Is",
    blocks: [
      { type: "p", text: "SafeAlertNG is a community-powered safety platform that allows Nigerian communities to share real-time safety alerts, report incidents, and coordinate emergency responses." },
    ],
  },
  {
    title: "3. What SafeAlertNG Is NOT",
    blocks: [
      { type: "ul", items: [
        "We are NOT a substitute for official emergency services",
        "Always call 199 (Police), 112 (Emergency), or 123 (Fire Service) for immediate emergencies",
        "We do NOT guarantee response times or outcomes",
        "We are NOT liable for incidents reported on the platform",
      ] },
    ],
  },
  {
    title: "4. User Responsibilities",
    blocks: [
      { type: "ul", items: [
        "You must provide accurate information when reporting",
        "FALSE or MISLEADING reports are strictly prohibited",
        "Misuse may result in immediate account suspension",
        "You are responsible for your own safety decisions",
        "Do not rely solely on SafeAlertNG during emergencies",
      ] },
    ],
  },
  {
    title: "5. Content Policy",
    blocks: [
      { type: "ul", items: [
        "No hate speech, harassment or discriminatory content",
        "No false emergency reports",
        "No spam or promotional content",
        "Violation results in immediate account termination",
      ] },
    ],
  },
  {
    title: "6. Location & Privacy",
    blocks: [
      { type: "ul", items: [
        "Your location is only shared when YOU choose to report",
        "Exact location is visible to admins and yourself only",
        <>We handle all location data per our <PrivacyLink /></>,
      ] },
    ],
  },
  {
    title: "7. Limitation of Liability",
    blocks: [
      { type: "p", text: "SafeAlertNG and its developers shall NOT be held liable for:" },
      { type: "ol", items: [
        "Any harm, loss or injury resulting from use of the app",
        "Inaccurate community-submitted reports",
        "Delayed or failed push notifications",
        "Any actions taken based on information in the app",
      ] },
      { type: "warning", text: "USE THE APP AT YOUR OWN RISK" },
    ],
  },
  {
    title: "8. Intellectual Property",
    blocks: [
      { type: "ul", items: [
        "SafeAlertNG, its logo and features are owned by Lord Foster / SafeAlertNG",
        "You may not copy, resell or redistribute any part of this platform",
      ] },
    ],
  },
  {
    title: "9. Termination",
    blocks: [
      { type: "p", text: "We reserve the right to suspend or terminate any account that violates these terms without prior notice." },
    ],
  },
  {
    title: "10. Governing Law",
    blocks: [
      { type: "p", text: "These terms are governed by the laws of the Federal Republic of Nigeria." },
    ],
  },
  {
    title: "11. Contact",
    blocks: [
      { type: "p", node: <>Email: <EmailLink /></> },
      { type: "p", node: <>Website: <SiteLink /></> },
    ],
  },
];

const S = {
  page: { background: "#0a0e1a", minHeight: "100vh", color: "#cfd6e4", fontFamily: "'Barlow Condensed', sans-serif" },
  header: { position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "#0a0e1aee", backdropFilter: "blur(10px)", borderBottom: "1px solid #1a2540" },
  back: { background: "transparent", border: "1px solid #2a3a5c", borderRadius: 8, color: "#FF6B00", padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1 },
  brand: { fontSize: 16, fontWeight: 900, letterSpacing: 1, color: "#fff" },
  container: { maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px" },
  title: { color: "#FF6B00", fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 900, letterSpacing: 1, marginBottom: 6 },
  meta: { color: "#5d6b85", fontSize: 12, fontFamily: "monospace", letterSpacing: 1, marginBottom: 28 },
  divider: { border: "none", borderTop: "1px solid #1a2540", margin: "26px 0" },
  sectionTitle: { color: "#FF6B00", fontSize: 18, fontWeight: 800, letterSpacing: 0.5, marginBottom: 12 },
  p: { fontSize: 14, lineHeight: 1.9, color: "#cfd6e4", margin: "0 0 10px" },
  ul: { margin: "0 0 10px", paddingLeft: 20, fontSize: 14, lineHeight: 1.9, color: "#cfd6e4" },
  ol: { margin: "0 0 10px", paddingLeft: 20, fontSize: 14, lineHeight: 1.9, color: "#cfd6e4", listStyleType: "lower-alpha" },
  li: { marginBottom: 6 },
  warning: { background: "#FF6B0018", border: "1px solid #FF6B0055", borderRadius: 8, padding: "12px 16px", color: "#FF6B00", fontWeight: 900, fontSize: 13, letterSpacing: 1.5, margin: "0 0 10px" },
  link: { color: "#FF6B00", fontWeight: 700, textDecoration: "underline" },
  footer: { textAlign: "center", marginTop: 40, fontSize: 11, color: "#3a455c", fontFamily: "monospace", letterSpacing: 2 },
};

export default function TermsOfService({ onBack }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap'); * { box-sizing: border-box; }`}</style>

      <div style={S.header}>
        <button onClick={onBack} style={S.back}>← Back</button>
        <div style={S.brand}>🛡️ SafeAlert<span style={{ color: "#FF6B00" }}>NG</span></div>
      </div>

      <div style={S.container}>
        <div style={S.title}>Terms of Service</div>
        <div style={S.meta}>Effective Date: June 2026 · SafeAlertNG (safealert.ng)</div>

        {SECTIONS.map((section, i) => (
          <div key={section.title}>
            <div style={S.sectionTitle}>{section.title}</div>
            {section.blocks.map((block, j) => {
              if (block.type === "ul" || block.type === "ol") {
                const Tag = block.type;
                return (
                  <Tag key={j} style={block.type === "ol" ? S.ol : S.ul}>
                    {block.items.map((item, k) => <li key={k} style={S.li}>{item}</li>)}
                  </Tag>
                );
              }
              if (block.type === "warning") {
                return <div key={j} style={S.warning}>⚠️ {block.text}</div>;
              }
              return <p key={j} style={S.p}>{block.node || block.text}</p>;
            })}
            {i < SECTIONS.length - 1 && <hr style={S.divider} />}
          </div>
        ))}

        <div style={S.footer}>SAFEALERTNG · 🇳🇬 NIGERIA · 2026</div>
      </div>
    </div>
  );
}
