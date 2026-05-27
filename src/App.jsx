import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import MainApp from "./components/MainApp";
import AuthScreen from "./components/AuthScreen";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        background: "#080808",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Barlow Condensed', sans-serif",
        color: "#fff"
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>
          SafeAlert<span style={{ color: "#00FF88" }}>NG</span>
        </div>
        <div style={{
          marginTop: 24,
          width: 40,
          height: 40,
          border: "3px solid #FF2D2D22",
          borderTop: "3px solid #FF2D2D",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return session ? (
    <MainApp session={session} />
  ) : (
    <AuthScreen onAuth={setSession} />
  );
}
