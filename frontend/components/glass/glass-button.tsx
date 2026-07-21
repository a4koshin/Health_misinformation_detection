import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const glassButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[#ff5c00] text-white shadow-[0_12px_28px_-12px_rgba(255,92,0,0.65)] hover:bg-[#e65300] hover:shadow-[0_16px_36px_-12px_rgba(255,92,0,0.75)] active:translate-y-px",
        glass:
          "glass text-[#0f172a] hover:bg-gray-100 hover:shadow-[0_14px_32px_-16px_rgba(204,74,0,0.35)] active:translate-y-px",
        outline:
          "border border-[#ff5c00]/30 bg-gray-100 text-[#cc4a00] backdrop-blur-xl hover:border-[#ff5c00]/60 hover:bg-gray-100 active:translate-y-px",
        ghost: "text-[#475569] hover:bg-gray-100 hover:text-[#0f172a]",
        destructive:
          "bg-red-500/10 text-red-600 backdrop-blur-xl hover:bg-red-500/20 active:translate-y-px",
      },
      size: {
        sm: "h-9 rounded-xl px-4 text-sm",
        md: "h-11 rounded-2xl px-5 text-sm",
        lg: "h-12 rounded-2xl px-7 text-base",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function GlassButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof glassButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      className={cn(glassButtonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { glassButtonVariants };
