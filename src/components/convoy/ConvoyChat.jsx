import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { cvS } from "./convoyStyles";

export default function ConvoyChat({ convoyId, session }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!convoyId) return;

    let active = true;
    (async () => {
      const { data } = await supabase
        .from("convoy_messages")
        .select("*")
        .eq("convoy_id", convoyId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (active && data) setMessages(data.reverse());
    })();

    const channel = supabase
      .channel(`convoy-chat-${convoyId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "convoy_messages", filter: `convoy_id=eq.${convoyId}` },
        (payload) => {
          setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [convoyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const message = text.trim();
    if (!message || !convoyId) return;
    setText("");
    const senderName = session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "You";
    await supabase.from("convoy_messages").insert({
      convoy_id: convoyId,
      user_id: session?.user?.id,
      sender_name: senderName,
      message,
      message_type: "user",
    });
  };

  return (
    <div style={cvS.chatWrap}>
      <div style={cvS.chatScroll}>
        {messages.length === 0 && (
          <div style={cvS.chatSystem}>No messages yet — say hello to your convoy 👋</div>
        )}
        {messages.map((m) => {
          if (m.message_type === "system") {
            return <div key={m.id} style={cvS.chatSystem}>{m.message}</div>;
          }
          const mine = m.user_id === session?.user?.id;
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} style={cvS.chatBubble(mine)}>
              {!mine && <div style={cvS.chatSender}>{m.sender_name}</div>}
              <div>{m.message}</div>
              <div style={cvS.chatTime}>{time}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} style={cvS.chatInputRow}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message your convoy..."
          style={cvS.chatInput}
        />
        <button type="submit" style={cvS.chatSendBtn}>➤</button>
      </form>
    </div>
  );
}
