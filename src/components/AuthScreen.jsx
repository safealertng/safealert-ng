import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara"
];

export default function AuthScreen({ onAuth }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Profile setup state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Check if new user needs profile setup
  useEffect(() => {
    const checkNewUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata;
        if (!meta?.full_name || !meta?.phone || !meta?.state) {
          setStep("profile");
        } else {
          onAuth(session);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const meta = session.user.user_metadata;
          if (!meta?.full_name || !meta?.phone || !meta?.state) {
            setStep("profile");
          } else {
            onAuth(session);
          }
        }
      }
    );

    checkNewUser();
    return () => subscription.unsubscribe();
  }, []);

  const sendMagicLink = async () => {
    setError("");
    if (!email.includes("@")) { setError("Enter a valid email address"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) { setError(error.message); } else { setStep("sent"); }
  };

  const saveProfile = async () => {
    if (!fullName.trim()) { setError("Please enter your full name"); return; }
    if (!phone.trim()) { setError("Please enter your phone number"); return; }
    if (!state) { setError("Please select your state"); return; }
    setSavingProfile(true);
    const { data: { session }, error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), phone: phone.trim(), state }
    });
    setSavingProfile(false);
    if (error) { setError(error.message); return; }
    const { data: { session: newSession } } = await supabase.auth.getSession();
    onAuth(newSession);
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
    @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin { to{transform:rotate(360deg)} }
    input:focus, select:focus { outline: none; border-color: #FF2D2D66 !important; }
    input::placeholder { color: #2a2a2a; }
    button:active { opacity: 0.8; }
  `;

  return (
    <div style={{ background:"radial-gradient(ellipse at 50% 25%, #1a0000 0%, #080808 65%)", minHeight:"100vh", fontFamily:"'Barlow Condensed', sans-serif", color:"#fff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{CSS}</style>

      <div style={{ textAlign:"center", marginBottom:40, animation:"slideUp 0.5s ease" }}>
        <div style={{ fontSize:64, marginBottom:12, animation:"pulse 2.5s ease-in-out infinite" }}>🛡️</div>
        <div style={{ fontSize:36, fontWeight:900, letterSpacing:2 }}>SafeAlert<span style={{ color:"#00FF88" }}>NG</span></div>
        <div style={{ fontSize:11, color:"#444", marginTop:5, letterSpacing:4, fontFamily:"monospace" }}>COMMUNITY SAFETY NETWORK</div>
        <div style={{ width:44, height:2, background:"linear-gradient(90deg,#FF2D2D,#FF8800)", margin:"16px auto 0", borderRadius:1 }} />
      </div>

      <div style={{ width:"100%", maxWidth:380, background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:16, padding:28, animation:"slideUp 0.6s ease" }}>

        {/* STEP 1 — EMAIL */}
        {step === "email" && (
          <>
            <div style={{ fontWeight:900, fontSize:20, marginBottom:6, letterSpacing:1 }}>Sign In</div>
            <div style={{ color:"#555", fontSize:13, marginBottom:24, lineHeight:1.7 }}>Enter your email. We will send you a secure magic link — no password needed.</div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#555", marginBottom:7, fontFamily:"monospace" }}>EMAIL ADDRESS</div>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMagicLink()}
                style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"12px 14px", color:"#fff", fontSize:14, fontFamily:"'Barlow Condensed', sans-serif" }} />
            </div>
            {error && <div style={{ color:"#FF6B00", fontSize:11, marginBottom:12, fontFamily:"monospace" }}>⚠ {error}</div>}
            <button onClick={sendMagicLink} disabled={loading}
              style={{ width:"100%", background:"linear-gradient(135deg,#FF2D2D,#990000)", border:"none", borderRadius:10, padding:15, color:"#fff", fontSize:15, fontWeight:900, letterSpacing:1.5, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", boxShadow:"0 4px 20px #FF2D2D33", opacity:loading?0.6:1, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              {loading ? <><div style={{ width:16, height:16, border:"2px solid #ffffff44", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />SENDING...</> : "📧 SEND MAGIC LINK"}
            </button>
            <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#2a2a2a", lineHeight:1.8 }}>By signing in you agree to SafeAlert NG Terms of Use and Privacy Policy</div>
          </>
        )}

        {/* STEP 2 — EMAIL SENT */}
        {step === "sent" && (
          <div style={{ textAlign:"center", padding:"10px 0" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>📬</div>
            <div style={{ fontWeight:900, fontSize:20, letterSpacing:1, marginBottom:10 }}>CHECK YOUR EMAIL</div>
            <div style={{ color:"#555", fontSize:13, lineHeight:1.8, marginBottom:20 }}>We sent a magic link to<br /><span style={{ color:"#fff", fontWeight:700 }}>{email}</span></div>
            <div style={{ background:"#00FF8810", border:"1px solid #00FF8833", borderRadius:10, padding:14, fontSize:12, color:"#666", lineHeight:1.8, marginBottom:20, textAlign:"left" }}>
              1. Open your email inbox<br />
              2. Click the <span style={{ color:"#00FF88" }}>"Log In to SafeAlert NG"</span> link<br />
              3. You will be signed in automatically
            </div>
            <button onClick={() => { setStep("email"); setEmail(""); setError(""); }}
              style={{ width:"100%", background:"transparent", border:"1px solid #1e1e1e", borderRadius:10, padding:12, color:"#666", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", letterSpacing:1 }}>
              USE A DIFFERENT EMAIL
            </button>
          </div>
        )}

        {/* STEP 3 — PROFILE SETUP */}
        {step === "profile" && (
          <>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:36 }}>👤</div>
              <div style={{ fontWeight:900, fontSize:20, marginTop:8, letterSpacing:1 }}>Complete Your Profile</div>
              <div style={{ color:"#555", fontSize:12, marginTop:6, lineHeight:1.7 }}>Just a few details to keep you and your family safe.</div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#555", marginBottom:7, fontFamily:"monospace" }}>FULL NAME</div>
              <input type="text" placeholder="e.g. Chidi Okonkwo" value={fullName} onChange={e => setFullName(e.target.value)}
                style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"12px 14px", color:"#fff", fontSize:14, fontFamily:"'Barlow Condensed', sans-serif" }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#555", marginBottom:7, fontFamily:"monospace" }}>PHONE NUMBER</div>
              <input type="tel" placeholder="e.g. 08012345678" value={phone} onChange={e => setPhone(e.target.value)}
                style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"12px 14px", color:"#fff", fontSize:14, fontFamily:"'Barlow Condensed', sans-serif" }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:"#555", marginBottom:7, fontFamily:"monospace" }}>STATE OF RESIDENCE</div>
              <select value={state} onChange={e => setState(e.target.value)}
                style={{ width:"100%", background:"#111", border:"1px solid #1e1e1e", borderRadius:8, padding:"12px 14px", color: state ? "#fff" : "#2a2a2a", fontSize:14, fontFamily:"'Barlow Condensed', sans-serif" }}>
                <option value="">Select your state...</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {error && <div style={{ color:"#FF6B00", fontSize:11, marginBottom:12, fontFamily:"monospace" }}>⚠ {error}</div>}
            <button onClick={saveProfile} disabled={savingProfile}
              style={{ width:"100%", background:"linear-gradient(135deg,#FF2D2D,#990000)", border:"none", borderRadius:10, padding:15, color:"#fff", fontSize:15, fontWeight:900, letterSpacing:1.5, cursor:"pointer", fontFamily:"'Barlow Condensed', sans-serif", boxShadow:"0 4px 20px #FF2D2D33", opacity:savingProfile?0.6:1, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              {savingProfile ? <><div style={{ width:16, height:16, border:"2px solid #ffffff44", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />SAVING...</> : "🛡️ ENTER SAFEALERTNG"}
            </button>
          </>
        )}
      </div>
      <div style={{ marginTop:28, fontSize:9, color:"#1a1a1a", letterSpacing:3, fontFamily:"monospace" }}>v1.0 · NIGERIA · 2026</div>
    </div>
  );
}