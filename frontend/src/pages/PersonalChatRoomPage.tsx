import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MessageList from "../components/chat/MessageList";
import ChatInput from "../components/chat/ChatInput";
import Avatar from "../components/ui/Avatar";
import { useAuthStore } from "../stores/authStore";
import { useDMChat } from "../hooks/useChat";
import { membershipApi } from "../api/membership";
import { chatApi } from "../api/chat";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import type { Message, Contact } from "../types";

export default function PersonalChatRoomPage() {
  const { link, penerima } = useParams<{ link: string; penerima: string }>();
  const navigate = useNavigate();
  const { payload } = useAuthStore();
  const { messages, loading, loadHistory, sendMessage } = useDMChat(penerima || "");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    loadHistory();
    // Cari info kontak
    membershipApi.getAnggota().then((res) => {
      const c = res.anggota.find((a) => a.kode_anggota === penerima);
      if (c) setContact(c);
    }).catch(() => {});
  }, [loadHistory, penerima]);

  const handleSend = async (data: any) => {
    await sendMessage(data);
  };

  const displayName = contact?.nama || penerima || "";

  return (
    <div className="flex flex-col h-dvh bg-bg-primary">
      {/* Header */}
      <div className="shrink-0 border-b border-white/5 bg-bg-surface safe-top">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            onClick={() => navigate(`/${link}/chat`)}
            className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <Avatar nama={displayName} src={contact?.foto_profil} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-[10px] text-text-secondary font-mono">{penerima}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUser={payload?.sub || ""}
        isGroup={false}
        onReply={setReplyTo}
        loading={loading}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={loading || !isOnline}
        placeholder={isOnline ? `Pesan ke ${displayName}...` : "Tidak ada koneksi..."}
      />
    </div>
  );
}
