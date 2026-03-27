import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input/80 bg-background/70 px-3 py-2 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 focus-visible:shadow-[0_0_0_4px_rgba(59,130,246,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
