"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
  showLabel?: string;
  hideLabel?: string;
};

export default function PasswordInput({
  className = "",
  wrapperClassName = "",
  showLabel = "Mostrar password",
  hideLabel = "Ocultar password",
  ...props
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative w-full ${wrapperClassName}`.trim()}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        title={visible ? hideLabel : showLabel}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-white/35 transition hover:text-white/70 focus:outline-none focus-visible:text-white"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.7a2 2 0 002.7 2.7" />
            <path d="M9.9 4.25A10.8 10.8 0 0112 4c5.3 0 9 4.4 10 8a12.9 12.9 0 01-2.05 3.8" />
            <path d="M6.6 6.6C4.3 8 2.8 10 2 12c1 3.6 4.7 8 10 8a10.7 10.7 0 005.35-1.42" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
