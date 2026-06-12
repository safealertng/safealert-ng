import { useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
import { supabase } from "../lib/supabase";

emailjs.init("EJAw6dlAaCLeS4iHq");

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara"
];

const SLIDES = [
  { icon: "🛡️", color: "#FF2D2D", title: "WELCOME TO SAFEALERTNG", subtitle: "Nigeria's #1 Community Safety Network", tag: "SECURITY · COMMUNITY · PROTECTION", body: "SafeAlertNG is a real-time security platform built for Nigerians. Report threats, trigger panic alerts, and stay informed — all in one place." },
  { icon: "🚨", color: "#FF2D2D", title: "PANIC BUTTON", subtitle: "One tap. Instant help.", tag: "EMERGENCY · GPS · ALERTS", body: "Hold the Panic Button for 2 seconds to instantly broadcast your live GPS location to emergency contacts and nearby users. Help comes faster." },
  { icon: "📡", color: "#FF6B00", title: "COMMUNITY ALERTS", subtitle: "Real-time incidents near you", tag: "LIVE · CROWDSOURCED · VERIFIED", body: "See and report armed robbery, kidnapping, suspicious activity and more — directly from your community, updated in real time." },
  { icon: "🕵️", color: "#4A90D9", title: "ANONYMOUS TIPS", subtitle: "Fight crime. Stay hidden.", tag: "ENCRYPTED · ANONYMOUS · SECURE", body: "Submit security tips to Nigerian agencies without revealing your identity. Your safety is our priority — zero traces left behind." },
  { icon: "💰", color: "#FF2D2D", title: "RANSOM ALERT", subtitle: "Verified kidnap response contacts", tag: "DSS · POLICE · ARMY · EFCC", body: "Verified contacts for Nigeria's top security agencies — DSS, Police Force, Nigerian Army — ready and accessible when every second counts." },
  { icon: "📍", color: "#00FF88", title: "NEARBY ALERTS", subtitle: "Threats within your radius", tag: "GPS · RADIUS · REAL-TIME", body: "See live security threats near your exact current location. Know what's happening around you before you step outside." },
  { icon: "🚧", color: "#FFB800", title: "CHECKPOINT TRACKER", subtitle: "Know before you travel", tag: "ROUTES · CHECKPOINTS · DRIVERS", body: "Crowdsourced checkpoint and roadblock reports from Nigerian drivers. Know the situation on your route before you hit the road." },
  { icon: "🗺️", color: "#FF6B00", title: "SAFETY HEAT MAP", subtitle: "Risk levels across all 36 states", tag: "STATES · RISK · TRENDS", body: "View real-time security risk levels across all Nigerian states and geopolitical zones. Know where is safe and where to avoid." },
  { icon: "📰", color: "#00FF88", title: "SECURITY NEWS", subtitle: "Latest from trusted Nigerian sources", tag: "CHANNELS TV · PUNCH · VANGUARD", body: "Real-time security news from Channels TV, Punch, Vanguard, Premium Times and more — all in one feed, updated live." },
];

export default function LandingPage({ onGetStarted }) {
  const [screen, setScreen] = useState("landing"); // "landing" | "slides" | "newsletter"
  const [slideIndex, setSlideIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [betaCount, setBetaCount] = useState(0);
  const [betaForm, setBetaForm] = useState({ name: "", email: "", state: "", phone: "", why: "" });
  const [betaSubmitting, setBetaSubmitting] = useState(false);
  const [betaError, setBetaError] = useState("");
  const [betaResult, setBetaResult] = useState(null);

  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  useEffect(() => {
    supabase.rpc("get_beta_signup_count").then(({ data, error }) => {
      if (!error && typeof data === "number") setBetaCount(data);
    });
  }, []);

  const handleBetaSignup = async (e) => {
    e.preventDefault();
    const { name, email: betaEmail, state, phone, why } = betaForm;
    if (!name.trim() || !betaEmail.includes("@") || !state || !phone.trim() || !why.trim()) {
      setBetaError("Please fill in all fields with a valid email.");
      return;
    }
    setBetaError("");
    setBetaSubmitting(true);
    const { data, error } = await supabase.rpc("signup_beta_tester", {
      p_name: name.trim(),
      p_email: betaEmail.trim().toLowerCase(),
      p_state: state,
      p_phone: phone.trim(),
      p_why: why.trim(),
    });
    setBetaSubmitting(false);
    if (error) {
      setBetaError(error.message?.includes("BETA_FULL") ? "All 100 beta spots have been claimed." : "Something went wrong. Please try again.");
      if (error.message?.includes("BETA_FULL")) setBetaCount(100);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setBetaResult({ spotNumber: row.spot_number, alreadyRegistered: row.already_registered });
    if (!row.already_registered) {
      setBetaCount(c => Math.min(c + 1, 100));
      const trimmedName = name.trim();
      const trimmedEmail = betaEmail.trim().toLowerCase();
      const sentAt = new Date().toLocaleString("en-NG");
      const welcomeSubject = `Welcome Beta Tester #${row.spot_number} - Your spot is confirmed on SafeAlertNG`;
      const welcomeMessage = `Congratulations ${trimmedName}! You're Beta Tester #${row.spot_number}. Your spot in the SafeAlertNG beta program is confirmed for ${trimmedEmail}. We'll email you when your beta access is ready.`;

      // Welcome email to the beta tester's own address.
      emailjs.send("safealert_service", "template_ooew17k", {
        to_email: trimmedEmail,
        to_name: trimmedName,
        name: trimmedName,
        email: trimmedEmail,
        spot_number: row.spot_number,
        subject: welcomeSubject,
        message: welcomeMessage,
        category: "Beta Tester Welcome",
        agency: "SafeAlertNG",
        state: `Beta Tester #${row.spot_number}`,
        urgency: trimmedName,
        tip_text: welcomeMessage,
        time: sentAt,
      }).then(() => console.log("Beta welcome email sent")).catch(err => console.error("EmailJS beta welcome error:", err));

      // Copy notification to the admin so they know a new beta tester signed up.
      const adminMessage = `New beta tester signup! Name: ${trimmedName}, Email: ${trimmedEmail}, State: ${state}, Phone: ${phone.trim()}, Spot #${row.spot_number}. Reason: ${why.trim()}`;
      emailjs.send("safealert_service", "template_ooew17k", {
        to_email: "lordfosterinc@gmail.com",
        to_name: "Admin",
        name: trimmedName,
        email: trimmedEmail,
        spot_number: row.spot_number,
        subject: `New Beta Signup: ${trimmedName} (#${row.spot_number})`,
        message: adminMessage,
        category: "New Beta Signup",
        agency: "SafeAlertNG Admin",
        state: state,
        urgency: `Spot #${row.spot_number}`,
        tip_text: adminMessage,
        time: sentAt,
      }).then(() => console.log("Beta admin notification sent")).catch(err => console.error("EmailJS beta admin notification error:", err));
    }
  };

  const handleNewsletter = async () => {
    if (!email.includes("@")) { setNewsletterStatus("error"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase() });
    setSubmitting(false);
    if (error && !error.message.includes("duplicate")) {
      setNewsletterStatus("error");
    } else {
      setNewsletterStatus("success");
    }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
    @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes glow { 0%,100%{box-shadow:0 0 20px #00660033} 50%{box-shadow:0 0 40px #00880055} }
    .feature-card:hover { border-color: #FF2D2D55 !important; transform: translateY(-3px); }
    .feature-card { transition: all 0.2s ease; }
    .plan-card:hover { border-color: #FF2D2D88 !important; transform: translateY(-4px); }
    .plan-card { transition: all 0.2s ease; }
    input:focus { outline: none; border-color: #FF2D2D66 !important; }
    input::placeholder { color: #333; }
    button:active { opacity: 0.85; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #080808; }
    ::-webkit-scrollbar-thumb { background: #FF2D2D44; border-radius: 4px; }
  `;

  // ─── ONBOARDING SLIDES ───────────────────────────────────────────
  if (screen === "slides") {
    return (
      <div style={{ background: "radial-gradient(ellipse at 50% 20%, #1a0a0088 0%, #080808 70%)", minHeight: "100vh", fontFamily: "'Barlow Condensed', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "40px 24px 48px", position: "relative", maxWidth: 430, margin: "0 auto" }}>
        <style>{CSS}</style>

        {/* Skip */}
        <button onClick={onGetStarted} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#444", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>
          SKIP →
        </button>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ width: i === slideIndex ? 20 : 6, height: 6, borderRadius: 3, background: i === slideIndex ? slide.color : "#222", transition: "all 0.3s ease" }} />
          ))}
        </div>

        {/* Slide content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 24, padding: "20px 0", animation: "slideUp 0.4s ease" }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: `${slide.color}18`, border: `2px solid ${slide.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, boxShadow: `0 0 40px ${slide.color}33` }}>
            {slide.icon}
          </div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: slide.color, fontFamily: "monospace" }}>{slide.tag}</div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1, marginBottom: 6 }}>{slide.title}</div>
            <div style={{ fontSize: 14, color: "#555", fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>{slide.subtitle}</div>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8, maxWidth: 320 }}>{slide.body}</div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button onClick={() => {
            if (isLast) { setScreen("newsletter"); }
            else setSlideIndex(s => s + 1);
          }} style={{ width: "100%", background: `linear-gradient(135deg,${slide.color},${slide.color}99)`, border: "none", borderRadius: 14, padding: "16px", color: slide.color === "#00FF88" || slide.color === "#FFB800" ? "#000" : "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2 }}>
            {isLast ? "🚀 GET STARTED" : "NEXT →"}
          </button>
          {slideIndex > 0 && (
            <button onClick={() => setSlideIndex(s => s - 1)} style={{ background: "none", border: "none", color: "#444", fontSize: 12, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 1 }}>← BACK</button>
          )}
        </div>
      </div>
    );
  }

  // ─── NEWSLETTER SCREEN ───────────────────────────────────────────
  if (screen === "newsletter") {
    return (
      <div style={{ background: "radial-gradient(ellipse at 50% 20%, #001a0088 0%, #080808 70%)", minHeight: "100vh", fontFamily: "'Barlow Condensed', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "80px 24px 60px", maxWidth: 430, margin: "0 auto", textAlign: "center" }}>
        <style>{CSS}</style>

        <div style={{ fontSize: 64, marginBottom: 16, animation: "pulse 2.5s ease-in-out infinite" }}>🇳🇬</div>
        <div style={{ fontSize: 10, letterSpacing: 5, color: "#00AA44", fontFamily: "monospace", marginBottom: 12 }}>STAY INFORMED</div>
        <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 1, marginBottom: 12 }}>Get Security <span style={{ color: "#00AA44" }}>Updates</span></h2>
        <div style={{ width: 44, height: 3, background: "linear-gradient(90deg,#008800,#00FF88)", margin: "0 auto 24px", borderRadius: 2 }} />
        <p style={{ fontSize: 15, color: "#999", lineHeight: 1.9, marginBottom: 32, maxWidth: 320 }}>
          Subscribe to receive safety tips, new feature announcements, and critical security alerts for Nigeria.
        </p>

        {newsletterStatus === "success" ? (
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ background: "#00AA4411", border: "1px solid #00AA4433", borderRadius: 12, padding: 24, color: "#00FF88", fontSize: 15, fontWeight: 700, marginBottom: 24 }}>
              ✅ You're in! We'll keep you posted.
            </div>
            <button onClick={onGetStarted} style={{ width: "100%", background: "linear-gradient(135deg,#FFB800,#aa7700)", border: "none", borderRadius: 12, padding: "16px", color: "#fff", fontSize: 16, fontWeight: 900, letterSpacing: 2, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", boxShadow: "0 6px 28px #FF2D2D44" }}>
              🛡️ CREATE MY ACCOUNT
              <button onClick={onGetStarted} style={{ width: "100%", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 12, padding: "16px", color: "#666", fontSize: 14, fontWeight: 700, letterSpacing: 2, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", marginTop: 10 }}>
  🔑 ALREADY HAVE AN ACCOUNT? LOGIN
</button>
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 380 }}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={e => { setEmail(e.target.value); setNewsletterStatus(""); }}
              style={{ width: "100%", background: "#0d0d0d", border: `1px solid ${newsletterStatus === "error" ? "#FF2D2D" : "#1e1e1e"}`, borderRadius: 10, padding: "14px 18px", color: "#fff", fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 12 }}
            />
            {newsletterStatus === "error" && <div style={{ color: "#FF6B00", fontSize: 11, marginBottom: 10, fontFamily: "monospace" }}>⚠ Enter a valid email address</div>}
            <button onClick={handleNewsletter} disabled={submitting} style={{ width: "100%", background: "linear-gradient(135deg,#006600,#004400)", border: "none", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 14, fontWeight: 900, letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 12, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "SUBSCRIBING..." : "🇳🇬 SUBSCRIBE"}
            </button>
            <button onClick={onGetStarted} style={{ width: "100%", background: "transparent", border: "1px solid #2a2a2a", borderRadius: 10, padding: "14px", color: "#555", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif" }}>
              SKIP → CREATE ACCOUNT
            </button>
          </div>
        )}

        <div style={{ marginTop: 40, fontSize: 9, color: "#1a1a1a", letterSpacing: 3, fontFamily: "monospace" }}>v1.0 · NIGERIA · 2026</div>
      </div>
    );
  }

  // ─── MAIN LANDING PAGE ───────────────────────────────────────────
  const features = [
    { icon: "🚨", title: "Panic Button", desc: "One tap sends your live GPS to emergency contacts and nearby users instantly." },
    { icon: "📡", title: "Community Alerts", desc: "Report and view real-time security incidents — robbery, kidnapping, suspicious activity." },
    { icon: "🕵️", title: "Anonymous Tips", desc: "Submit security tips without revealing your identity. Fight crime safely." },
    { icon: "💰", title: "Ransom Alert", desc: "Verified contacts for DSS, Police, Army, EFCC — ready when it matters most." },
    { icon: "📍", title: "Nearby Alerts", desc: "See live security threats near your current location. Stay aware, stay safe." },
    { icon: "📰", title: "Security News", desc: "Real-time Nigerian security news from Channels TV, Punch, Vanguard and more." },
  ];

  const plans = [
    { name: "Freemium", price: "Free", duration: "90-day trial", color: "#00FF88", features: ["Panic Button", "Community Alerts", "Up to 3 emergency contacts", "Security News"] },
    { name: "Basic", price: "₦2,000", duration: "/month", color: "#FF8800", features: ["Everything in Freemium", "Anonymous Tips", "Nearby Alerts", "Unlimited contacts"] },
    { name: "Premium", price: "₦3,500", duration: "/month", color: "#FF2D2D", features: ["Everything in Basic", "VVIP Alerts", "Safe Convoy", "Team Support", "Live Broadcast"], hot: true },
  ];

  const betaInputStyle = { width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 18px", color: "#fff", fontSize: 17, fontFamily: "'Barlow Condensed', sans-serif" };

  return (
    <div style={{ background: "linear-gradient(180deg, #0a0f05 0%, #080d04 40%, #0a0f05 70%, #0a0f05 100%)", minHeight: "100vh", fontFamily: "'Barlow Condensed', sans-serif", color: "#fff", overflowX: "hidden" }}>
      <style>{CSS}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "#08080899", backdropFilter: "blur(12px)", borderBottom: "1px solid #003300", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>🛡️ SafeAlert<span style={{ color: "#00FF88" }}>NG</span></div>
        <button onClick={() => { setSlideIndex(0); setScreen("slides"); }} style={{ background: "linear-gradient(135deg,#FF2D2D,#990000)", border: "none", borderRadius: 8, padding: "10px 22px", color: "#fff", fontSize: 13, fontWeight: 900, letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", boxShadow: "0 4px 16px #FF2D2D44" }}>
          GET STARTED
        </button>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", background: "radial-gradient(ellipse at 50% 20%, #1a2a0088 0%, #0a0f05 50%), radial-gradient(ellipse at 80% 80%, #2a1a0033 0%, transparent 60%), radial-gradient(ellipse at 20% 100%, #1a2a0044 0%, transparent 50%)" }}>
        <div style={{ fontSize: 72, marginBottom: 16, animation: "pulse 2.5s ease-in-out infinite" }}>🛡️</div>
        <div style={{ fontSize: 11, letterSpacing: 5, background: "linear-gradient(135deg,#FFB800,#aa7700)", fontFamily: "monospace", marginBottom: 16 }}>🇳🇬 NIGERIA'S #1 COMMUNITY SAFETY NETWORK</div>
        <h1 style={{ fontSize: "clamp(40px, 8vw, 80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: 1, marginBottom: 20, maxWidth: 700 }}>
          Your Safety,<br /><span style={{ color: "#FFB800" }}>One Tap</span> Away
        </h1>
        <p style={{ fontSize: 18, color: "#bbb", lineHeight: 1.8, maxWidth: 500, marginBottom: 40 }}>
          Real-time security alerts, panic button, anonymous tips and community-powered incident reporting — built for Nigerians, by Nigerians.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => { setSlideIndex(0); setScreen("slides"); }} style={{ background: "linear-gradient(135deg,#FF2D2D,#990000)", border: "none", borderRadius: 12, padding: "16px 36px", color: "#fff", fontSize: 16, fontWeight: 900, letterSpacing: 2, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", boxShadow: "0 6px 28px #FF2D2D44" }}>
            🚀 START FOR FREE
          </button>
          <button onClick={onGetStarted} style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 12, padding: "16px 36px", color: "#888", fontSize: 16, fontWeight: 700, letterSpacing: 2, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif" }}>
            🔑 LOGIN
          </button>
        </div>
        <div style={{ marginTop: 60, display: "flex", gap: 40, flexWrap: "wrap", justifyContent: "center" }}>
          {[["🇳🇬", "Nigeria-Focused"], ["⚡", "Real-Time Alerts"], ["🔒", "Anonymous & Secure"]].map(([icon, label]) => (
            <div key={label} style={{ fontSize: 13, color: "#444", letterSpacing: 1 }}>{icon} {label}</div>
          ))}
        </div>
      </section>

      {/* BETA TESTING */}
      <section style={{ padding: "80px 24px", background: "linear-gradient(180deg, #0a0a0a 0%, #0f0a02 50%, #0a0a0a 100%)" }}>
        <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: 5, color: "#FFB800", fontFamily: "monospace", marginBottom: 12 }}>LIMITED SPOTS</div>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, letterSpacing: 1 }}>Join the <span style={{ color: "#FFB800" }}>Beta</span> Program</h2>
          <div style={{ width: 44, height: 3, background: "linear-gradient(90deg,#aa7700,#FFB800,#aa7700)", margin: "20px auto 24px", borderRadius: 2 }} />
          <p style={{ fontSize: 17, color: "#999", lineHeight: 1.8, marginBottom: 28 }}>
            Be one of the first 100 Nigerians to try new SafeAlertNG features before everyone else.
          </p>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 16, color: "#ccc", marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>{betaCount}/100 SPOTS TAKEN</div>
            <div style={{ width: "100%", height: 8, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(betaCount, 100)}%`, height: "100%", background: "linear-gradient(90deg,#aa7700,#FFB800)", borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>
          </div>

          {betaResult ? (
            <div style={{ background: "#FFB80011", border: "1px solid #FFB80033", borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, color: "#FFB800" }}>
                {betaResult.alreadyRegistered ? "You're already on the list!" : "You're in!"}
              </div>
              <div style={{ fontSize: 17, color: "#bbb" }}>Your beta tester spot number is</div>
              <div style={{ fontSize: 56, fontWeight: 900, color: "#fff", margin: "8px 0" }}>#{betaResult.spotNumber}</div>
              <div style={{ fontSize: 16, color: "#777", lineHeight: 1.7 }}>
                {betaResult.alreadyRegistered ? "We'll notify you at the email you registered with." : "We'll email you when your beta access is ready."}
              </div>
            </div>
          ) : betaCount >= 100 ? (
            <div style={{ background: "#FF2D2D11", border: "1px solid #FF2D2D33", borderRadius: 12, padding: 24, color: "#FF6B6B", fontSize: 17, fontWeight: 700 }}>
              😔 All 100 beta spots have been claimed. Check back later!
            </div>
          ) : (
            <form onSubmit={handleBetaSignup} style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
              <input type="text" placeholder="Full Name" value={betaForm.name} onChange={e => setBetaForm(f => ({ ...f, name: e.target.value }))} style={betaInputStyle} />
              <input type="email" placeholder="Email Address" value={betaForm.email} onChange={e => setBetaForm(f => ({ ...f, email: e.target.value }))} style={betaInputStyle} />
              <select value={betaForm.state} onChange={e => setBetaForm(f => ({ ...f, state: e.target.value }))} style={{ ...betaInputStyle, color: betaForm.state ? "#fff" : "#333" }}>
                <option value="">State of Residence</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="tel" placeholder="Phone Number" value={betaForm.phone} onChange={e => setBetaForm(f => ({ ...f, phone: e.target.value }))} style={betaInputStyle} />
              <textarea placeholder="Why do you want to be a beta tester?" value={betaForm.why} onChange={e => setBetaForm(f => ({ ...f, why: e.target.value }))} style={{ ...betaInputStyle, resize: "none", height: 90, fontFamily: "'Barlow Condensed', sans-serif" }} />
              {betaError && <div style={{ color: "#FF6B00", fontSize: 14, fontFamily: "monospace" }}>⚠ {betaError}</div>}
              <button type="submit" disabled={betaSubmitting} style={{ background: "linear-gradient(135deg,#FFB800,#aa7700)", border: "none", borderRadius: 10, padding: "14px", color: "#000", fontSize: 17, fontWeight: 900, letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", opacity: betaSubmitting ? 0.6 : 1 }}>
                {betaSubmitting ? "SUBMITTING..." : "🚀 CLAIM MY SPOT"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 10, letterSpacing: 5, color: "#2ECC71", fontFamily: "monospace", marginBottom: 12 }}>WHAT WE DO</div>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, letterSpacing: 1 }}>Built for Nigerian <span style={{ color: "#FF2D2D" }}>Realities</span></h2>
          <div style={{ width: 44, height: 3, background: "linear-gradient(90deg,#008800,#FF2D2D,#008800)", margin: "20px auto 0", borderRadius: 2 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {features.map(f => (
            <div key={f.title} className="feature-card" style={{ background: "#111a08", border: "1px solid #2a3a10", borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, marginBottom: 10 }}>{f.title}</div>
              <div style={{ fontSize: 15, color: "#999", lineHeight: 1.8 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 24px", background: "linear-gradient(180deg, #0a0a0a 0%, #050a05 50%, #0a0a0a 100%)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 5, color: "#00AA44", fontFamily: "monospace", marginBottom: 12 }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, letterSpacing: 1, marginBottom: 56 }}>Up and Running in <span style={{ color: "#00AA44" }}>3 Steps</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
            {[
              { num: "01", title: "Sign Up Free", desc: "Create your account in seconds. No password needed — just your email and a magic link." },
              { num: "02", title: "Set Up Your Profile", desc: "Add your name, phone number, state of residence and emergency contacts." },
              { num: "03", title: "Stay Protected", desc: "Get real-time alerts, report incidents, and trigger your panic button anytime." },
            ].map(s => (
              <div key={s.num} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: "#00440022", fontFamily: "monospace", marginBottom: 8 }}>{s.num}</div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1, marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#888", lineHeight: 1.8 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 10, letterSpacing: 5, color: "#00AA44", fontFamily: "monospace", marginBottom: 12 }}>PRICING</div>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, letterSpacing: 1 }}>Simple, <span style={{ color: "#FF2D2D" }}>Affordable</span> Plans</h2>
          <div style={{ width: 44, height: 3, background: "linear-gradient(90deg,#008800,#FF2D2D,#008800)", margin: "20px auto 0", borderRadius: 2 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {plans.map(p => (
            <div key={p.name} className="plan-card" style={{ background: "#0d0d0d", border: `1px solid ${p.hot ? "#FF2D2D44" : "#1a1a1a"}`, borderRadius: 16, padding: 28, position: "relative" }}>
              {p.hot && <div style={{ position: "absolute", top: -12, right: 20, background: "linear-gradient(135deg,#FF2D2D,#FF8800)", borderRadius: 20, padding: "4px 14px", fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>🔥 POPULAR</div>}
              <div style={{ fontSize: 10, letterSpacing: 3, color: p.color, fontFamily: "monospace", marginBottom: 10 }}>{p.name.toUpperCase()}</div>
              <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 24, fontFamily: "monospace" }}>{p.duration}</div>
              <div style={{ marginBottom: 28 }}>
                {p.features.map(feat => (
                  <div key={feat} style={{ fontSize: 15, color: "#999", padding: "7px 0", borderBottom: "1px solid #111", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: p.color, fontSize: 10 }}>✓</span> {feat}
                  </div>
                ))}
              </div>
              <button onClick={() => { setSlideIndex(0); setScreen("slides"); }} style={{ width: "100%", background: p.hot ? "linear-gradient(135deg,#FF2D2D,#990000)" : "transparent", border: `1px solid ${p.hot ? "transparent" : "#2a2a2a"}`, borderRadius: 10, padding: 13, color: p.hot ? "#fff" : "#666", fontSize: 13, fontWeight: 900, letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif" }}>
                GET STARTED
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section style={{ padding: "80px 24px", background: "radial-gradient(ellipse at 50% 50%, #00330022 0%, #080808 70%)" }}>
        <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 5, color: "#00AA44", fontFamily: "monospace", marginBottom: 12 }}>STAY INFORMED</div>
          <h2 style={{ fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 900, letterSpacing: 1, marginBottom: 12 }}>Get Security <span style={{ color: "#00AA44" }}>Updates</span></h2>
          <div style={{ width: 44, height: 3, background: "linear-gradient(90deg,#008800,#00FF88)", margin: "0 auto 24px", borderRadius: 2 }} />
          <p style={{ fontSize: 15, color: "#999", lineHeight: 1.8, marginBottom: 32 }}>Subscribe to receive safety tips, new feature announcements, and critical security alerts for Nigeria.</p>
          {newsletterStatus === "success" ? (
            <div style={{ background: "#00AA4411", border: "1px solid #00AA4433", borderRadius: 12, padding: 20, color: "#00FF88", fontSize: 14, fontWeight: 700 }}>
              ✅ You're subscribed! We'll keep you posted.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <input type="email" placeholder="Enter your email address" value={email} onChange={e => { setEmail(e.target.value); setNewsletterStatus(""); }}
                style={{ flex: 1, minWidth: 240, background: "#0d0d0d", border: `1px solid ${newsletterStatus === "error" ? "#FF2D2D" : "#1e1e1e"}`, borderRadius: 10, padding: "14px 18px", color: "#fff", fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif" }} />
              <button onClick={handleNewsletter} style={{ background: "linear-gradient(135deg,#006600,#004400)", border: "none", borderRadius: 10, padding: "14px 28px", color: "#fff", fontSize: 14, fontWeight: 900, letterSpacing: 1.5, cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", whiteSpace: "nowrap" }}>
                🇳🇬 SUBSCRIBE
              </button>
            </div>
          )}
          {newsletterStatus === "error" && <div style={{ color: "#FF6B00", fontSize: 11, marginTop: 10, fontFamily: "monospace" }}>⚠ Enter a valid email address</div>}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "32px 24px", borderTop: "1px solid #004400", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, marginBottom: 8 }}>🛡️ SafeAlert<span style={{ color: "#00FF88" }}>NG</span></div>
        <div style={{ fontSize: 11, color: "#1a2a1a", letterSpacing: 3, fontFamily: "monospace" }}>v1.0 · 🇳🇬 NIGERIA · 2026</div>
      </footer>
    </div>
  );
}