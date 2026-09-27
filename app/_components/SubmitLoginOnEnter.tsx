"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = { children: ReactNode };

// Keep the login forms as Server Components with their existing server actions.
// The normal submit button still works for mouse, touch and keyboard users.
export default function SubmitLoginOnEnter({ children }: Props) {
  const { pending } = useFormStatus();
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key !== "Enter" ||
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !["email", "password"].includes(input.type)) {
      return;
    }

    const form = input.form;
    if (!form) return;

    // A second Enter cannot send a duplicate request while logging in.
    if (pending) {
      event.preventDefault();
      return;
    }

    // requestSubmit preserves native required/email validation and the
    // existing Next.js server action, unlike calling form.submit().
    event.preventDefault();
    form.requestSubmit();
  }

  return (
    <div className="contents" onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}
