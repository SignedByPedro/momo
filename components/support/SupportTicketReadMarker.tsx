"use client";

import { useEffect } from "react";

/** A POST (not a GET render) records the last incoming message actually shown. */
export default function SupportTicketReadMarker({
  area,
  ticketId,
  lastMessageId,
}: {
  area: "admin" | "portal";
  ticketId: string;
  lastMessageId: string | null;
}) {
  useEffect(() => {
    // Portal users have no incoming event to acknowledge before the team replies.
    if (area === "portal" && !lastMessageId) return;
    const controller = new AbortController();
    async function markRead() {
      try {
        const response = await fetch(`/api/${area}/support/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ ticketId, lastMessageId }),
          signal: controller.signal,
        });
        if (response.ok && !controller.signal.aborted) {
          window.dispatchEvent(new Event("momo:support-read"));
        }
      } catch {
        // Leave the ticket unread if the read receipt cannot be saved.
      }
    }
    void markRead();
    return () => controller.abort();
  }, [area, ticketId, lastMessageId]);
  return null;
}
