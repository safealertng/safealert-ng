import { useEffect } from "react";

const EmailLink = () => <a href="mailto:support@safealert.ng" style={S.link}>support@safealert.ng</a>;
const SiteLink = () => <a href="https://safealert.ng" style={S.link} target="_blank" rel="noopener noreferrer">safealert.ng</a>;

const SECTIONS = [
  {
    title: "1. Introduction",
    blocks: [
      { type: "p", text: "SafeAlertNG is Nigeria's #1 community safety platform. We are committed to protecting your privacy and keeping your data safe." },
    ],
  },
  {
    title: "2. Information We Collect",
    blocks: [
      { type: "ul", items: [
        "Account email and display name (for authentication only)",
        "Device location (only when you submit a report or activate SOS)",
        "Incident reports and media you voluntarily submit",
        "Push notification tokens (to deliver safety alerts)",
      ] },
      { type: "p", text: "We do NOT collect: browsing history, contacts, financial data, or any data unrelated to safety." },
    ],
  },
  {
    title: "3. How We Use Your Information",
    blocks: [
      { type: "ul", items: [
        "To deliver real-time community safety alerts",
        "To connect you with your community during emergencies",
        "To improve app safety and performance",
      ] },
      { type: "p", text: "We NEVER sell your data to third parties." },
    ],
  },
  {
    title: "4. Location Data Privacy",
    blocks: [
      { type: "ul", items: [
        "Your exact GPS location is NEVER shown publicly",
        "Only YOU (the reporter) and verified SafeAlertNG admins can see your exact location",
        'All other users see "📍 Location Private" only',
        "Location data attached to reports is automatically reviewed after 7 days",
      ] },
    ],
  },
  {
    title: "5. Anonymous Tips",
    blocks: [
      { type: "ul", items: [
        "Tips submitted anonymously contain NO personally identifiable information",
        "We cannot trace anonymous tips back to any user",
      ] },
    ],
  },
  {
    title: "6. Data Retention",
    blocks: [
      { type: "ul", items: [
        "Active incident reports are retained for community safety purposes",
        "Reports with no admin followup are flagged for review after 7 days",
        "Users can request deletion of their data at any time",
      ] },
      { type: "p", node: <>Email: <EmailLink /></> },
    ],
  },
  {
    title: "7. Third Party Services",
    blocks: [
      { type: "ul", items: [
        "We use Supabase for secure data storage",
        "We use push notification services to deliver safety alerts",
        "These services have their own privacy policies",
      ] },
    ],
  },
  {
    title: "8. Your Rights",
    blocks: [
      { type: "ul", items: [
        "Access your data anytime in your profile",
        <>Request data deletion by emailing <EmailLink /></>,
        "Opt out of push notifications in device settings",
      ] },
    ],
  },
  {
    title: "9. Children's Privacy",
    blocks: [
      { type: "ul", items: [
        "SafeAlertNG is not intended for users under 13",
        "We do not knowingly collect data from minors",
      ] },
    ],
  },
  {
    title: "10. Changes to This Policy",
    blocks: [
      { type: "ul", items: [
        "We will notify users of significant changes via push notification",
        "Continued use of the app constitutes acceptance",
      ] },
    ],
  },
  {
    title: "11. Contact Us",
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
  li: { marginBottom: 6 },
  link: { color: "#FF6B00", fontWeight: 700, textDecoration: "underline" },
  footer: { textAlign: "center", marginTop: 40, fontSize: 11, color: "#3a455c", fontFamily: "monospace", letterSpacing: 2 },
};

export default function PrivacyPolicy({ onBack }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap'); * { box-sizing: border-box; }`}</style>

      <div style={S.header}>
        <button onClick={onBack} style={S.back}>← Back</button>
        <div style={S.brand}>🛡️ SafeAlert<span style={{ color: "#FF6B00" }}>NG</span></div>
      </div>

      <div style={S.container}>
        <div style={S.title}>Privacy Policy</div>
        <div style={S.meta}>Effective Date: June 2026 · SafeAlertNG (safealert.ng)</div>

        {SECTIONS.map((section, i) => (
          <div key={section.title}>
            <div style={S.sectionTitle}>{section.title}</div>
            {section.blocks.map((block, j) => {
              if (block.type === "ul") {
                return (
                  <ul key={j} style={S.ul}>
                    {block.items.map((item, k) => <li key={k} style={S.li}>{item}</li>)}
                  </ul>
                );
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
