"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { MaterialIcon } from "@/components/ui/material-icon";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <MaterialIcon name="check_circle" size={18} fill className="text-emerald-400" />
        ),
        info: <MaterialIcon name="info" size={18} fill className="text-white" />,
        warning: (
          <MaterialIcon name="warning" size={18} fill className="text-amber-400" />
        ),
        error: <MaterialIcon name="error" size={18} fill className="text-white" />,
        loading: (
          <MaterialIcon
            name="progress_activity"
            size={18}
            className="animate-spin text-white"
          />
        ),
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
