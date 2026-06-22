import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-2xl border bg-white/70 px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary dark:bg-background/70",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
