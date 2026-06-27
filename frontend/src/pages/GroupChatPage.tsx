import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Hash, RefreshCw } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import MessageList from "../components/chat/MessageList";
import ChatInput from "../components/chat/ChatInput";
import { useAuthStore } from "../stores/authStore";
import { useGroupChat } from "../hooks/useChat";
import { chatApi } from "../api/chat";
import type { Message } from "../types";

export default function GroupChatPage() {
  const { link } = useParams<{ link: string }>();
  const { payload } = useAuthStore();
  const { messages, loading, loadHistory, sendMessage, setMessages } = useGroupChat();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [subName, setSubName] = useState("Grup Chat");

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSend = async (data: {
    jenis: string; isi: string; keterangan?: string;
    ukuran_file?: number; balas_ke?: number;
  }) => {
    await sendMessage(data);
  };

  const handleDelete = async (id: number) => {
    await chatApi.deleteMessage(id, "grup", "semua");
    setMessages((prev) =>
      prev.map((m) => m.id === id ? { ...m, deleted: true, isi: "Pesan telah dihapus" } : m)
    );
  };

  return (
    <AppShell
      header={
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Hash size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Grup Chat</h2>
            <p className="text-[10px] text-text-secondary">
              {link} • polling 3 detik
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <MessageList
          messages={messages}
          currentUser={payload?.sub || ""}
          isGroup
          onReply={setReplyTo}
          onDelete={handleDelete}
          loading={loading}
        />
        <ChatInput
          onSend={handleSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          disabled={loading}
        />
      </div>
    </AppShell>
  );
}
