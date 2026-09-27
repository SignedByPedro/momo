"use client";

import { useEffect } from "react";

export default function EmbedTransparency() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.style.setProperty("background", "rgba(0, 0, 0, 0)", "important");
    html.style.setProperty("background-color", "rgba(0, 0, 0, 0)", "important");
    html.style.setProperty("background-image", "none", "important");
    body.style.setProperty("background", "rgba(0, 0, 0, 0)", "important");
    body.style.setProperty("background-color", "rgba(0, 0, 0, 0)", "important");
    body.style.setProperty("background-image", "none", "important");

    return () => {
      html.style.removeProperty("background");
      html.style.removeProperty("background-color");
      html.style.removeProperty("background-image");
      body.style.removeProperty("background");
      body.style.removeProperty("background-color");
      body.style.removeProperty("background-image");
    };
  }, []);

  return null;
}
