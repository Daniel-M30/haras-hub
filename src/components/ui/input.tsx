import * as React from "react"

import { cn } from "@/src/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border border-white/10 bg-[#1f1a17] px-3 py-1 text-base text-[#ece6dd] shadow-xs transition-[color,box-shadow,border-color,background-color] outline-none selection:bg-[#b8aea4] selection:text-[#11100f] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#ece6dd] placeholder:text-[#8f8579] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[#b8aea4]/70 focus-visible:ring-[3px] focus-visible:ring-[#b8aea4]/20",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
