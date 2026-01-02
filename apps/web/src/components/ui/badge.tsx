import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-rn-primary text-white [a&]:hover:bg-rn-primary-strong",
        secondary:
          "border-transparent bg-rn-surface-2 text-rn-text [a&]:hover:bg-rn-border",
        destructive:
          "border-transparent bg-rn-danger text-white [a&]:hover:bg-rn-danger/90",
        success:
          "border-transparent bg-rn-success text-white [a&]:hover:bg-rn-success/90",
        warning:
          "border-transparent bg-rn-warning text-white [a&]:hover:bg-rn-warning/90",
        outline:
          "border-rn-border text-rn-text [a&]:hover:bg-rn-surface-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
