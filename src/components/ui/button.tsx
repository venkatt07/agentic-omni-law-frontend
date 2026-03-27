import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow,filter,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
           "border border-primary-border text-primary-foreground bg-[linear-gradient(180deg,hsl(var(--primary)),color-mix(in_oklab,hsl(var(--primary))_84%,rgb(14_165_233)))] shadow-[0_14px_28px_-18px_rgba(59,130,246,0.34)] hover:-translate-y-[1px] hover:brightness-[1.02]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
        outline:
          "border [border-color:var(--button-outline)] bg-white/48 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.12)] hover:bg-white/68 active:shadow-none dark:bg-white/[0.04] dark:hover:bg-white/[0.08]",
        secondary:
          "border bg-secondary/95 text-secondary-foreground border border-secondary-border hover:bg-secondary",
        ghost: "border border-transparent hover:bg-muted/55",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-9 px-3.5 py-2",
        sm: "min-h-7.5 rounded-md px-2.5 text-xs",
        lg: "min-h-10 rounded-lg px-6",
        icon: "h-8.5 w-8.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
