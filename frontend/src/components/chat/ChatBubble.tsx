import { useState } from "react";
import { Trash2, SmilePlus, Reply, CheckCheck } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Message } from "../../types";
import Avatar from "../ui/Avatar";
import { chatApi } from "../../api/chat";

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

interface ChatBubbleProps {
  message: Message;
  isSelf: boolean;
  isGroup?: boolean;
  onReply?: (msg: Message) => void;
  onDelete?: (id: number) => void;
  currentUser: string;
}

export default function ChatBubble({
  message, isSelf, isGroup, onReply, onDelete, currentUser,
}: ChatBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [localReaksi, setLocalReaksi] = useState<Record<string, string>>(
    message.reaksi ? JSON.parse(message.reaksi) : {}
  );

  const waktu = (() => {
    const d = typeof message.dibuat_pada === "string"
      ? new Date(message.dibuat_pada)
      : new Date(Number(message.dibuat_pada) * 1000);
    return formatDistanceToNow(d, { addSuffix: true, locale: idLocale });
  })();

  const handleReact = async (emoji: string) => {
    try {
      await chatApi.react(message.id, emoji, isGroup ? "grup" : "personal");
      setLocalReaksi((prev) => {
        const next = { ...prev };
        if (next[currentUser] === emoji) delete next[currentUser];
        else next[currentUser] = emoji;
        return next;
      });
    } catch {}
    setShowMenu(false);
  };

  const reaksiGroups = Object.entries(localReaksi).reduce<Record<string, number>>((acc, [, emoji]) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});

  if (message.deleted) {
    return (
      <div className={clsx("flex items-end gap-2 mb-1", isSelf && "flex-row-reverse")}>
        {!isSelf && <Avatar nama={message.nama_pengirim || message.pengirim} size="xs" className="mb-1 opacity-50" />}
        <div className="px-3 py-2 rounded-xl text-xs text-text-secondary italic border border-white/5">
          Pesan telah dihapus
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx("flex items-end gap-2 group mb-1", isSelf && "flex-row-reverse")}
      onClick={() => setShowMenu(false)}
    >
      {/* Avatar (hanya grup, bukan self) */}
      {isGroup && !isSelf && (
        <Avatar nama={message.nama_pengirim || message.pengirim} size="xs" className="mb-1 shrink-0" />
      )}

      {/* Bubble */}
      <div className={clsx("max-w-[75%] relative", isSelf ? "items-end" : "items-start")}>
        {/* Nama pengirim di grup */}
        {isGroup && !isSelf && (
          <p className="text-[10px] font-semibold text-primary mb-0.5 px-1">
            {message.nama_pengirim || message.pengirim}
          </p>
        )}

        {/* Balas ke */}
        {message.balas_ke && (
          <div className={clsx(
            "text-[10px] px-2 py-1 mb-1 rounded-lg border-l-2 border-primary/70",
            isSelf ? "bg-white/5" : "bg-black/20"
          )}>
            <span className="text-text-secondary">Membalas pesan</span>
          </div>
        )}

        {/* Konten */}
        <div
          className={clsx(isSelf ? "bubble-sent" : "bubble-recv", "px-3 py-2 text-sm relative")}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
          onDoubleClick={() => setShowMenu(true)}
        >
          {message.jenis === "teks" ? (
            <p className="leading-relaxed break-words">{message.isi}</p>
          ) : message.jenis === "foto" ? (
            <img
              src={message.isi}
              alt={message.keterangan || "Foto"}
              className="rounded-lg max-w-full cursor-pointer"
              loading="lazy"
              onClick={() => window.open(message.isi, "_blank")}
            />
          ) : message.jenis === "suara" ? (
            <audio controls src={message.isi} className="max-w-[200px]" />
          ) : message.jenis === "video" ? (
            <video controls src={message.isi} className="rounded-lg max-w-full" />
          ) : null}

          {message.keterangan && (
            <p className="text-[11px] opacity-70 mt-1 break-words">{message.keterangan}</p>
          )}
        </div>

        {/* Reaksi */}
        {Object.keys(reaksiGroups).length > 0 && (
          <div className={clsx("flex gap-1 mt-1 flex-wrap", isSelf && "justify-end")}>
            {Object.entries(reaksiGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={clsx(
                  "text-[11px] px-1.5 py-0.5 rounded-full border transition-all",
                  localReaksi[currentUser] === emoji
                    ? "bg-primary/20 border-primary/50"
                    : "bg-bg-elevated border-white/10 hover:bg-white/10"
                )}
              >
                {emoji} {count > 1 ? count : ""}
              </button>
            ))}
          </div>
        )}

        {/* Meta (waktu + status) */}
        <div className={clsx("flex items-center gap-1 mt-0.5 px-1", isSelf && "justify-end")}>
          <span className="text-[10px] text-text-secondary">{waktu}</span>
          {isSelf && message.status === "read" && (
            <CheckCheck size={10} className="text-secondary" />
          )}
        </div>
      </div>

      {/* Action menu (tap/hold) */}
      {showMenu && (
        <div className={clsx(
          "absolute z-40 glass rounded-xl p-2 flex flex-col gap-1 shadow-xl animate-bounce-in",
          isSelf ? "right-0" : "left-0",
          "bottom-8"
        )} style={{ position: "absolute" }}>
          {/* Emoji bar */}
          <div className="flex gap-1.5 px-1">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => handleReact(e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
          <div className="h-px bg-white/5 my-1" />
          {onReply && (
            <button onClick={() => { onReply(message); setShowMenu(false); }}
              className="flex items-center gap-2 text-xs text-text-secondary hover:text-white px-2 py-1 rounded-lg hover:bg-white/5">
              <Reply size={12} /> Balas
            </button>
          )}
          {isSelf && onDelete && (
            <button onClick={() => { onDelete(message.id); setShowMenu(false); }}
              className="flex items-center gap-2 text-xs text-danger hover:text-danger px-2 py-1 rounded-lg hover:bg-danger/10">
              <Trash2 size={12} /> Hapus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
