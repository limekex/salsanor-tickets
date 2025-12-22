"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-rn-border bg-rn-surface data-[state=checked]:bg-rn-primary data-[state=checked]:text-white dark:data-[state=checked]:bg-rn-primary data-[state=checked]:border-rn-primary rn-focus-ring aria-invalid:ring-rn-danger/20 dark:aria-invalid:ring-rn-danger/40 aria-invalid:border-rn-danger size-4 shrink-0 rounded-[4px] border shadow-rn-1 transition-shadow outline-none disabled:cursor-not-allowed disabled:opacity-55",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
