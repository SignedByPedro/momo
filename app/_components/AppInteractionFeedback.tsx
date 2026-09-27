"use client";

import { useEffect } from "react";

// One small listener for the whole application: works for buttons rendered by
// Server Components, Client Components and after client-side navigation.
// It is visual feedback only. We deliberately leave each control's action,
// form validation, keyboard semantics and accessibility untouched.
const CONTROL_SELECTOR = [
  "button:not(:disabled)",
  "input[type='submit']:not(:disabled)",
  "input[type='button']:not(:disabled)",
  "a[href][class*='rounded']",
  "[role='button']:not([aria-disabled='true'])",
].join(", ");

function findControl(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(CONTROL_SELECTOR);
}

export default function AppInteractionFeedback() {
  useEffect(() => {
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

    function showPress(control: HTMLElement | null) {
      if (!control || control.dataset.momoPending === "true") return;
      const oldTimer = timers.get(control);
      if (oldTimer) clearTimeout(oldTimer);
      control.dataset.momoPressed = "true";
      timers.set(
        control,
        setTimeout(() => {
          delete control.dataset.momoPressed;
          timers.delete(control);
        }, 230),
      );
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button === 0) showPress(findControl(event.target));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== "Enter" && event.key !== " ") return;

      const control = findControl(event.target);
      if (control) {
        // A focused button, including a keyboard-triggered submit.
        showPress(control);
      } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
        // requestSubmit() from the login input has no explicit submitter.
        // Make the button visibly acknowledge Enter immediately, before the
        // server action has entered its pending state.
        const input = event.target;
        if (input.type !== "email" && input.type !== "password") return;
        const submit = input.form?.querySelector<HTMLElement>(
          "button[type='submit']:not(:disabled), button:not([type]):not(:disabled), input[type='submit']:not(:disabled)",
        );
        showPress(submit ?? null);
      }
    }

    function onClick(event: MouseEvent) {
      // Covers activation by assistive technology, as well as pointer/key.
      showPress(findControl(event.target));
    }

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
      for (const [control, timer] of timers) {
        clearTimeout(timer);
        delete control.dataset.momoPressed;
      }
      timers.clear();
    };
  }, []);

  return null;
}
