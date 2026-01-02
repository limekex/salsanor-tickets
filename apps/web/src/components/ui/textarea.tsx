import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-rn-border placeholder:text-rn-text-muted rn-focus-ring aria-invalid:ring-rn-danger/20 dark:aria-invalid:ring-rn-danger/40 aria-invalid:border-rn-danger bg-rn-surface flex field-sizing-content min-h-16 w-full rounded-rn-1 border px-rn-3 py-2 text-base shadow-rn-1 transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-55 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
