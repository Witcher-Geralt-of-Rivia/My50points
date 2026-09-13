"use client";

import Image from "next/image";
import { useState } from "react";
import { strategyTicketAsset } from "@/frontend/lib/config/strategyAssets";

const VARIANT_LABEL = {
  full: "FULL POINT",
  dual: "DUAL POINT",
  smart: "SMART POINT",
};

const VARIANT_THEME = {
  full: "strategy-point-logo--full",
  dual: "strategy-point-logo--dual",
  smart: "strategy-point-logo--smart",
};

/**
 * Strategy ticket art for tournament play cards (left column).
 * Uses generated ticket PNGs; CSS text badge fallback if missing.
 */
export default function StrategyPointLogo({ variant = "full", alt, className = "" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = strategyTicketAsset(variant);
  const label = alt || VARIANT_LABEL[variant] || variant;
  const themeClass = VARIANT_THEME[variant] || VARIANT_THEME.full;

  if (!src || imgFailed) {
    return (
      <div
        className={`strategy-point-logo ${themeClass} ${className}`.trim()}
        role="img"
        aria-label={label}
      >
        <span className="strategy-point-logo__text">{VARIANT_LABEL[variant]}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={label}
      width={320}
      height={240}
      className={`strategy-point-ticket strategy-point-ticket--${variant} ${className}`.trim()}
      onError={() => setImgFailed(true)}
      unoptimized
    />
  );
}
