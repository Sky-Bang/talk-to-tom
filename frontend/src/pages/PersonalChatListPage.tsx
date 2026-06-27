import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import { chatApi } from "../api/chat";
import { membershipApi } from "../api/membership";
import { useAuthStore } from "../stores/authStore";
import type { ChatRoom, Contact } from "../types";

export default function PersonalChatListPage() {
  const { link } = useParams<{ link: string }>();
  const navigate = useNavigate();
  const { payload } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"aktif" | "kontak">("aktif");

  useEffect(() => {
    Promise.all([
      chatApi.getDMRooms().then((r) => setRooms(r.rooms)),
      membershipApi.getAnggota().then((r) => setContacts(r.anggota.filter((c) => c.aktif))),
    ]).finally(() => setLoading(false));
  }, []);

  const currentUser = payload?.sub || "";

  const filteredRooms = rooms.filter((r) => {
    const other = r.peserta_a === currentUser ? r.peserta_b : r.peserta_a;
    return other.toLowerCase().includes(query.toLowerCase());
  });

  const filteredContacts = contacts.filter((c) =>
    c.nama.toLowerCase().includes(query.toLowerCase()) ||
    c.kode_anggota.toLowerCase().includes(query.toLowerCase())
  );

  const goToChat = (penerima: string) => navigate(`/${link}/chat/${penerima}`);

  const getUnread = (room: ChatRoom) =>
    room.peserta_a === currentUser ? room.belum_dibaca_a : room.belum_dibaca_b;

  const getOther = (room: ChatRoom) =>
    room.peserta_a === currentUser ? room.peserta_b : room.peserta_a;

  const getContactName = (kode: string) =>
    contacts.find((c) => c.kode_anggota === kode)?.nama || kode;

  return (
    <AppShell
      header={
        <div className="px-4 pt-3 pb-2">
          <h2 className="text-base font-semibold mb-3">Chat Personal</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari..."
              className="input-base pl-9 py-2 text-sm"
            />
          </div>
          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            {[{ key: "aktif", label: "Riwayat" }, { key: "kontak", label: "Kontak" }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  tab === key ? "bg-primary/20 text-primary" : "text-text-secondary hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="skeleton w-11 h-11 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-28 rounded" />
                  <div className="skeleton h-3 w-44 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : tab === "aktif" ? (
          filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <MessageSquare size={32} className="text-text-secondary" />
              <p className="text-sm text-text-secondary">Belum ada percakapan</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredRooms.map((room) => {
                const other = getOther(room);
                const nama = getContactName(other);
                const unread = getUnread(room);
                return (
                  <button
                    key={room.id}
                    onClick={() => goToChat(other)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 transition-colors text-left"
                  >
                    <Avatar nama={nama} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-medium truncate">{nama}</p>
                        {room.pesan_terakhir_pada && (
                          <span className="text-[10px] text-text-secondary shrink-0 ml-2">
                            {formatDistanceToNow(new Date(Number(room.pesan_terakhir_pada) * 1000), { addSuffix: false, locale: idLocale })}
                          </span>
                        )}
                      </div>
                      {room.preview_pesan_terakhir && (
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {room.preview_pesan_terakhir}
                        </p>
                      )}
                    </div>
                    {unread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )
        ) : (
          filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <p className="text-sm text-text-secondary">Tidak ada kontak</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredContacts
                .filter((c) => c.kode_anggota !== currentUser)
                .map((c) => (
                  <button
                    key={c.kode_anggota}
                    onClick={() => goToChat(c.kode_anggota)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 transition-colors text-left"
                  >
                    <Avatar nama={c.nama} src={c.foto_profil} size="md" />
                    <div>
                      <p className="text-sm font-medium">{c.nama}</p>
                      <p className="text-[10px] text-text-secondary font-mono">{c.kode_anggota}</p>
                    </div>
                  </button>
                ))}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}
