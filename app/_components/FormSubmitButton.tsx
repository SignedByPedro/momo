"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useFormStatus } from "react-dom";

type Props = ComponentPropsWithoutRef<"button"> & {
  pendingLabel?: string;
};

/**
 * A real submit button, inside its parent form. React's form status is the
 * source of truth so the spinner disappears when the server action settles.
 * No artificial timeouts or changes to existing server actions.
 */
export default function FormSubmitButton({
  children,
  className = "",
  disabled,
  pendingLabel,
  type = "submit",
  ...props
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type={type}
      className={`${className} momo-form-submit`}
      disabled={Boolean(disabled) || pending}
      aria-busy={pending}
      aria-live="polite"
      data-momo-pending={pending ? "true" : undefined}
    >
      {pending && pendingLabel ? pendingLabel : children}
      {pending && (
        <>
          <span className="momo-button-spinner" aria-hidden="true" />
          {!pendingLabel && <span className="sr-only">A processar…</span>}
        </>
      )}
    </button>
  );
}
