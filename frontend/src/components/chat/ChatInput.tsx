import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Mic, X, Reply, Image, FileAudio, Video } from "lucide-react";
import { clsx } from "clsx";
import type { Message } from "../../types";
import { useMediaUpload } from "../../hooks/useMediaUpload";
import { chatApi } from "../../api/chat";

interface ChatInputProps {
  onSend: (data: { jenis: string; isi: string; keterangan?: string; ukuran_file?: number; balas_ke?: number }) => Promise<void>;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend, replyTo, onCancelReply, disabled, placeholder = "Tulis pesan...",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [typing, setTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { upload, uploading, progress } = useMediaUpload();

  const handleTyping = useCallback(() => {
    if (!typing) {
      setTyping(true);
      chatApi.sendTyping(true).catch(() => {});
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(false);
      chatApi.sendTyping(false).catch(() => {});
    }, 2000);
  }, [typing]);

  const handleSend = useCallback(async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    setText("");
    setTyping(false);
    chatApi.sendTyping(false).catch(() => {});
    try {
      await onSend({ jenis: "teks", isi: msg, balas_ke: replyTo?.id });
      onCancelReply?.();
    } catch {
      setText(msg); // restore on error
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [text, sending, onSend, replyTo, onCancelReply]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttach(false);
    try {
      const { url, jenis, ukuran } = await upload(file);
      await onSend({ jenis, isi: url, ukuran_file: ukuran, balas_ke: replyTo?.id });
      onCancelReply?.();
    } catch (err: any) {
      console.error(err);
    }
    e.target.value = "";
  };

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="border-t border-white/5 bg-bg-surface">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 pt-2">
          <div className="flex-1 border-l-2 border-primary px-2 py-1 rounded bg-primary/10">
            <p className="text-[10px] text-primary font-medium">Membalas</p>
            <p className="text-xs text-text-secondary truncate">
              {replyTo.jenis !== "teks" ? `[${replyTo.jenis}]` : replyTo.isi}
            </p>
          </div>
          <button onClick={onCancelReply} className="text-text-secondary hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="px-3 pt-2">
          <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[10px] text-text-secondary mt-1">Mengunggah... {progress}%</p>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2 safe-bottom">
        {/* Attach button */}
        <div className="relative">
          <button
            onClick={() => setShowAttach(!showAttach)}
            disabled={disabled || uploading}
            className="p-2.5 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-all"
          >
            <Paperclip size={18} />
          </button>

          {/* Attach menu */}
          {showAttach && (
            <div className="absolute bottom-12 left-0 glass rounded-xl p-2 flex gap-2 animate-bounce-in shadow-xl">
              {[
                { icon: Image, label: "Foto", accept: "image/*", jenis: "foto" },
                { icon: FileAudio, label: "Audio", accept: "audio/*", jenis: "suara" },
                { icon: Video, label: "Video", accept: "video/*", jenis: "video" },
              ].map(({ icon: Icon, label, accept }) => (
                <button
                  key={label}
                  onClick={() => { fileRef.current?.setAttribute("accept", accept); fileRef.current?.click(); }}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white"
                >
                  <Icon size={18} />
                  <span className="text-[10px]">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); adjustHeight(); handleTyping(); }}
            onKeyDown={handleKeyDown}
            disabled={disabled || uploading}
            placeholder={placeholder}
            rows={1}
            className={clsx(
              "input-base w-full resize-none py-2.5 pr-2 leading-relaxed transition-all",
              "min-h-[42px] max-h-[120px] overflow-y-auto"
            )}
            style={{ height: "42px" }}
          />
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          className={clsx(
            "p-2.5 rounded-xl transition-all shrink-0",
            text.trim() && !sending
              ? "bg-primary text-white shadow-[0_4px_15px_rgba(255,45,120,0.4)] hover:brightness-110 active:scale-95"
              : "bg-bg-elevated text-text-secondary cursor-not-allowed"
          )}
        >
          {sending ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
