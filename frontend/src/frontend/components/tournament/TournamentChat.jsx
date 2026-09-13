"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "@/frontend/lib/i18n/LanguageContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { fetchAuthJson, fetchJson } from "@/frontend/lib/api/client";

/**
 * Chat del centro de actividades.
 *
 * El estilo va en línea, igual que en la tabla de posiciones: la modalidad 4
 * pinta la página de blanco y oscurece el texto, y las clases del chat quedaban
 * ilegibles sobre ese fondo (nombres grises sobre blanco, caja de escritura
 * gris). Con su propio lienzo oscuro se lee igual en todas las modalidades.
 */

const SURFACE = {
  backgroundColor: "#0b0e1b",
  color: "#f4f4f5",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 10px 40px rgba(0,0,0,.45)",
};

const POLL_MS = 6000;

function avatarInitials(username) {
  const name = username || "?";
  const parts = name.split(/[_\s-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

function ChatMessageRow({ msg, isSelf }) {
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 rounded-xl px-2.5 py-2"
      style={{
        backgroundColor: isSelf ? "rgba(168,85,247,.12)" : "rgba(255,255,255,.03)",
        border: `1px solid ${isSelf ? "rgba(168,85,247,.35)" : "rgba(255,255,255,.06)"}`,
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
        style={{ backgroundColor: msg.avatarColor || "#7c3aed", color: "#fff" }}
        aria-hidden
      >
        {avatarInitials(msg.username)}
      </span>

      <div className="min-w-0 flex-1">
        <header className="flex items-baseline justify-between gap-2">
          <span
            className="truncate text-xs font-black"
            style={{ color: isSelf ? "#c4b5fd" : "#f4f4f5" }}
          >
            {msg.username}
            {isSelf && <span className="ml-1 text-[9px] font-bold opacity-70">(tú)</span>}
          </span>
          {time ? (
            <time className="shrink-0 text-[10px] font-bold" style={{ color: "rgba(255,255,255,.35)" }}>
              {time}
            </time>
          ) : null}
        </header>
        <p className="break-words text-[13px] font-medium" style={{ color: "rgba(255,255,255,.85)" }}>
          {msg.text}
        </p>
      </div>
    </motion.article>
  );
}

export default function TournamentChat({ variant = "embedded" }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const feedRef = useRef(null);

  const load = async () => {
    try {
      const data = await fetchJson("/chat");
      if (data?.messages) setMessages(data.messages);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const ok = await load();
      if (cancelled && ok) return;
    };
    tick();
    const iv = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    if (!user) {
      setError("Entra con tu alias para poder escribir en el chat.");
      return;
    }

    setSending(true);
    setError("");
    try {
      await fetchAuthJson("/chat", { method: "POST", body: JSON.stringify({ text }) });
      setMessage("");
      await load();
    } catch (err) {
      // Antes el fallo era silencioso: el mensaje desaparecía del cuadro y el
      // jugador no sabía si se había enviado. Ahora se conserva y se explica.
      const detail = err?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "No se pudo enviar el mensaje. Revisa tu conexión e inténtalo otra vez.",
      );
    } finally {
      setSending(false);
    }
  };

  const canWrite = Boolean(user);

  return (
    <section
      className={[
        "w-full rounded-3xl p-4 md:p-5",
        variant === "leaderboard" ? "tournament-chat--leaderboard" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={SURFACE}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider" style={{ color: "#fff" }}>
          <MessageCircle className="h-4 w-4" style={{ color: "#a855f7" }} />
          Chat del torneo
        </h3>
        <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,.35)" }}>
          {messages.length} mensaje{messages.length === 1 ? "" : "s"}
        </span>
      </header>

      <div
        ref={feedRef}
        role="log"
        aria-live="polite"
        className="mb-3 flex max-h-[340px] min-h-[140px] flex-col gap-2 overflow-y-auto pr-1"
      >
        {messages.length === 0 ? (
          <p
            className="py-10 text-center text-xs font-bold"
            style={{ color: "rgba(255,255,255,.4)" }}
          >
            💬 {t("chatPage.emptyState") || "Aún no hay mensajes. ¡Sé el primero en escribir!"}
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessageRow key={msg.id} msg={msg} isSelf={msg.username === user?.username} />
          ))
        )}
      </div>

      {error && (
        <p
          className="mb-2 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold"
          style={{
            backgroundColor: "rgba(239,68,68,.12)",
            border: "1px solid rgba(239,68,68,.35)",
            color: "#fca5a5",
          }}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="tournament-chat-input">
          {t("chatPage.inputPlaceholder")}
        </label>
        <input
          id="tournament-chat-input"
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={
            canWrite
              ? t("chatPage.inputPlaceholder") || "Escribe un mensaje..."
              : "Entra con tu alias para escribir"
          }
          disabled={!canWrite || sending}
          className="flex-1 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none disabled:opacity-50"
          style={{
            backgroundColor: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.12)",
            color: "#f4f4f5",
          }}
          autoComplete="off"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!canWrite || sending || !message.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: "#7c3aed", color: "#fff" }}
          aria-label={t("chatPage.send")}
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>

      <p className="mt-2 text-center text-[10px] font-semibold" style={{ color: "rgba(255,255,255,.3)" }}>
        {t("chatPage.disclaimer")}
      </p>
    </section>
  );
}
