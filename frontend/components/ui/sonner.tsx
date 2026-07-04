"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-400" />,
        info: <InfoIcon className="size-4 text-white" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-400" />,
        error: <CircleAlertIcon className="size-4 fill-white text-black" />,
        loading: <Loader2Icon className="size-4 animate-spin text-white" />,
      }}
      style={
        {
          "--normal-bg": "#000000",
          "--normal-text": "#ffffff",
          "--normal-border": "transparent",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast border-0 shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
          title: "text-sm font-normal text-white",
          description: "text-sm text-neutral-300",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
