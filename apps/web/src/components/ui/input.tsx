import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-rn-1 border border-rn-border bg-rn-surface px-rn-3 py-2 text-base transition-colors outline-none",
        "text-rn-text placeholder:text-rn-text-muted",
        "focus-visible:rn-focus-ring focus-visible:border-rn-primary",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 disabled:bg-rn-surface-2",
        "aria-invalid:border-rn-danger",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-rn-text",
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
