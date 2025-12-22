import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-rn-1 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-55 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:rn-focus-ring",
  {
    variants: {
      variant: {
        default: "bg-rn-primary text-white hover:bg-rn-primary-strong",
        destructive:
          "bg-rn-danger text-white hover:bg-rn-danger/90",
        outline:
          "border border-rn-border bg-rn-surface hover:bg-rn-surface-2",
        secondary:
          "bg-rn-surface-2 text-rn-text hover:bg-rn-border",
        ghost:
          "hover:bg-rn-surface-2 text-rn-text-muted hover:text-rn-text",
        link: "text-rn-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-rn-4 has-[>svg]:px-rn-3",
        sm: "h-9 rounded-rn-1 gap-1.5 px-rn-3 has-[>svg]:px-rn-2",
        lg: "h-11 rounded-rn-1 px-rn-5 has-[>svg]:px-rn-4",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
