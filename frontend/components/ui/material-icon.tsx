import type { CSSProperties, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type MaterialIconProps = {
  name: string;
  size?: number;
  fill?: boolean;
  weight?: number;
  grade?: number;
  opticalSize?: number;
  className?: string;
  style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

export function MaterialIcon({
  name,
  size = 20,
  fill = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  className,
  style,
  ...props
}: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "material-symbols-rounded inline-flex shrink-0 items-center justify-center select-none",
        className,
      )}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
        ...style,
      }}
      {...props}
    >
      {name}
    </span>
  );
}
