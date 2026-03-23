import { LoaderCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { LoadingStateProps } from "@/src/types";

export function LoadingState({
  label = "Carregando...",
  className,
  inline = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        inline ? "inline-flex items-center gap-2 text-sm" : "flex items-center justify-center gap-2",
        "text-[#b9afa2]",
        className,
      )}
    >
      <LoaderCircle className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
