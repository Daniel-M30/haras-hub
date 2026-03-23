import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/src/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-[#b8aea4] text-[#11100f] [a&]:hover:bg-[#d8d0c5]",
        secondary:
          "border border-white/8 bg-white/8 text-[#e6ded3] [a&]:hover:bg-white/14 [a&]:hover:text-white",
        destructive:
          "bg-[#8e2f2f] text-white [a&]:hover:bg-[#a53737] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-white/10 text-[#d6cdc1] [a&]:hover:border-[#7f756a] [a&]:hover:bg-[#26211c] [a&]:hover:text-white",
        ghost: "text-[#d6cdc1] [a&]:hover:bg-white/10 [a&]:hover:text-white",
        link: "text-[#d6cdc1] underline-offset-4 [a&]:hover:text-white [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
