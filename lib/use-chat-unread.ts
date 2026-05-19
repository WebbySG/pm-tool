"use client";
import { useEffect, useState } from "react";
import { getTotalUnreadForUser, subscribeToInboxForUser } from "./chat-db";

export function useChatUnread(userId: string | undefined): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) { setCount(0); return; }
    let cancelled = false;
    const refresh = async () => {
      const n = await getTotalUnreadForUser(userId);
      if (!cancelled) setCount(n);
    };
    refresh();
    const unsub = subscribeToInboxForUser(userId, refresh);
    return () => { cancelled = true; unsub(); };
  }, [userId]);

  return count;
}
