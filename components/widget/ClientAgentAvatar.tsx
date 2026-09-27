"use client";

import type { WidgetAvatarStyle } from "@/lib/admin/widgets";

type Props = {
  name: string;
  avatarStyle: WidgetAvatarStyle;
  avatarUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  size?: number;
};

export default function ClientAgentAvatar({
  name,
  avatarStyle,
  avatarUrl,
  primaryColor,
  secondaryColor,
  tertiaryColor,
  size = 36,
}: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "A";
  const canShowImage = avatarStyle === "image" && Boolean(avatarUrl);

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 text-white shadow-lg"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${secondaryColor}, ${primaryColor} 52%, ${tertiaryColor})`,
        boxShadow: `0 7px 22px ${primaryColor}33, inset 0 1px 0 rgba(255,255,255,.28)`,
      }}
      aria-hidden="true"
    >
      {canShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl ?? ""}
          alt=""
          className="h-[72%] w-[72%] object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,.24)]"
        />
      ) : avatarStyle === "initial" || (avatarStyle === "image" && !avatarUrl) ? (
        <span className="relative z-10 text-sm font-bold">{initial}</span>
      ) : (
        <svg
          width={Math.max(15, size * 0.48)}
          height={Math.max(15, size * 0.48)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <path
            d="M7.25 5.75h9.5A3.25 3.25 0 0 1 20 9v4.5a3.25 3.25 0 0 1-3.25 3.25h-4.7l-3.8 2.5v-2.5h-1A3.25 3.25 0 0 1 4 13.5V9a3.25 3.25 0 0 1 3.25-3.25Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M8 11.25h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
