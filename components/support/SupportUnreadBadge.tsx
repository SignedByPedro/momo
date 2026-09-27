"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Area = "admin" | "portal";

/** Displays an exclamation point when the current person has unread tickets. */
export default function SupportUnreadBadge({
  area,
  initialCount,
  language = "pt",
}: {
  area: Area;
  initialCount: number;
  language?: "pt" | "en";
}) {
  const pathname = usePathname();
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch(`/api/${area}/support/unread`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const result = (await response.json()) as { count?: unknown };
        if (active && typeof result.count === "number" && Number.isFinite(result.count)) {
          setCount(Math.max(0, result.count));
        }
      } catch {
        // A temporary network failure must not block navigation or erase a
        // previously visible notification. The next check will retry.
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onFocus = () => void refresh();
    // Also refresh on client navigation and after a ticket has been read.
    void refresh();
    const timer = window.setInterval(onVisible, 45_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("momo:support-read", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("momo:support-read", onFocus);
    };
  }, [area, pathname]);

  if (count === 0) return null;

  const description = area === "admin"
    ? language === "en"
      ? `${count} ${count === 1 ? "unread ticket" : "unread tickets"}`
      : `${count} ${count === 1 ? "ticket por consultar" : "tickets por consultar"}`
    : language === "en"
      ? `${count} ${count === 1 ? "ticket with a new reply" : "tickets with new replies"}`
      : `${count} ${count === 1 ? "ticket com nova resposta" : "tickets com novas respostas"}`;

  return (
    <span
      aria-label={description}
      title={description}
      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#0d0d0d] bg-[#ff7a18] px-0.5 text-[10px] font-black leading-none text-[#17110d] shadow-[0_0_10px_rgba(255,122,24,0.35)]"
    >
      !
    </span>
  );
}
