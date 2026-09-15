import * as React from "react";
import { Wrench } from "lucide-react";

export interface BrandMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
}

/**
 * The official FixGrid brand mark squircle.
 * Seamless silk sunset gradient (#0284c7 -> #0f3d4c -> #ea580c) with pure white wrench.
 */
export function BrandMark({ size = "md", className = "", ...props }: BrandMarkProps) {
  const sizeClasses = {
    sm: "size-7 rounded-[8px]",
    md: "size-8 rounded-[9px]",
    lg: "size-10 rounded-[12px]",
  };

  const iconSizes = {
    sm: "size-4",
    md: "size-4.5",
    lg: "size-5.5",
  };

  return (
    <span
      className={`grid shrink-0 place-items-center text-white shadow-[0_0_16px_rgba(234,88,12,0.32),0_0_10px_rgba(2,132,199,0.22)] transition-transform duration-200 ${sizeClasses[size]} ${className}`}
      style={{
        background: "linear-gradient(135deg, #0284c7 0%, #0f3d4c 45%, #c2410c 85%, #ea580c 100%)",
      }}
      {...props}
    >
      <Wrench aria-hidden className={`${iconSizes[size]} text-white`} strokeWidth={2.4} />
    </span>
  );
}
