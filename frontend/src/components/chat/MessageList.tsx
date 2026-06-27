import { useEffect, useRef } from "react";
import type { Message } from "../../types";
import ChatBubble from "./ChatBubble";

interface MessageListProps {
  messages: Message[];
  currentUser: string;
  isGroup?: boolean;
  onReply?: (msg: Message) => void;
  onDelete?: (id: number) => void;
  loading?: boolean;
}

export default function MessageList({
  messages, currentUser, isGroup, onReply, onDelete, loading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ke bawah saat pesan baru
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className={`skeleton rounded-xl h-10 ${i % 2 === 0 ? "w-48" : "w-36"}`} />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <div className="text-4xl">💬</div>
        <p className="text-sm text-text-secondary">Belum ada pesan. Mulai ngobrol!</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="flex-1 chat-scroll px-3 py-3 space-y-1">
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          message={msg}
          isSelf={msg.pengirim === currentUser}
          isGroup={isGroup}
          onReply={onReply}
          onDelete={onDelete}
          currentUser={currentUser}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
