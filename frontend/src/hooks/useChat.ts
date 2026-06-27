import { useState, useCallback, useRef } from "react";
import { chatApi } from "../api/chat";
import { usePolling } from "./usePolling";
import type { Message } from "../types";

export function useGroupChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const lastTimestamp = useRef<string | undefined>(undefined);

  const loadHistory = useCallback(async () => {
    try {
      const res = await chatApi.getGrupHistory();
      setMessages(res.messages);
      if (res.messages.length > 0) {
        const last = res.messages[res.messages.length - 1];
        // Use ISO string from server to avoid client/server clock skew
        const ts = last.dibuat_pada;
        lastTimestamp.current = typeof ts === "string" ? ts : new Date(Number(ts) * 1000).toISOString();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const poll = useCallback(async () => {
    const res = await chatApi.syncGrup(lastTimestamp.current);
    if (res.data.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = res.data.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMsgs];
      });
      // Always update cursor from server response (server authoritative)
      if (res.last_timestamp) lastTimestamp.current = res.last_timestamp;
    }
  }, []);

  usePolling(poll, [poll], { enabled: !loading });

  const sendMessage = useCallback(async (data: {
    jenis: string; isi: string; keterangan?: string;
    ukuran_file?: number; durasi?: string; balas_ke?: number;
  }) => {
    const res = await chatApi.sendGrupMessage(data);
    setMessages((prev) => {
      if (prev.find((m) => m.id === res.message.id)) return prev;
      return [...prev, res.message];
    });
    lastTimestamp.current = String(res.message.dibuat_pada);
    return res.message;
  }, []);

  return { messages, loading, loadHistory, sendMessage, setMessages };
}

export function useDMChat(penerima: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const lastTimestamp = useRef<string | undefined>(undefined);

  const loadHistory = useCallback(async () => {
    try {
      const res = await chatApi.getDMHistory(penerima);
      setMessages(res.messages);
      if (res.messages.length > 0) {
        const last = res.messages[res.messages.length - 1];
        const ts = last.dibuat_pada;
        lastTimestamp.current = typeof ts === "string" ? ts : new Date(Number(ts) * 1000).toISOString();
      }
    } finally {
      setLoading(false);
    }
  }, [penerima]);

  const poll = useCallback(async () => {
    const res = await chatApi.syncDM(penerima, lastTimestamp.current);
    if (res.data.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = res.data.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMsgs];
      });
      if (res.last_timestamp) lastTimestamp.current = res.last_timestamp;
    }
  }, [penerima]);

  usePolling(poll, [poll], { enabled: !loading });

  const sendMessage = useCallback(async (data: {
    jenis: string; isi: string; keterangan?: string;
    balas_ke?: number;
  }) => {
    const res = await chatApi.sendDMMessage({ ...data, penerima });
    setMessages((prev) => {
      if (prev.find((m) => m.id === res.message.id)) return prev;
      return [...prev, res.message];
    });
    return res.message;
  }, [penerima]);

  return { messages, loading, loadHistory, sendMessage };
}
