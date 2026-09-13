"use client";

import { useState } from "react";

/** Renders a Hall of Fame asset; hides itself and shows fallback when the file is missing. */
export default function HofAssetImage({ src, alt = "", className = "", fallback = null }) {
  const [visible, setVisible] = useState(Boolean(src));

  if (!src) return fallback;

  if (!visible) return fallback;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setVisible(false)}
      loading="lazy"
      decoding="async"
    />
  );
}
