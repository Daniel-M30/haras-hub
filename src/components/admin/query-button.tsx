"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { LoadingState } from "@/src/components/loading-state";
import type { AdminQueryButtonProps } from "@/src/types";
import { cn } from "@/src/lib/utils";

export function AdminQueryButton({ label, loadingLabel, updates, clears, className, variant = "outline" }: AdminQueryButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates ?? {})) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    for (const key of clears ?? []) {
      params.delete(key);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.push(nextUrl);
    });
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button type="button" variant={variant} disabled={isPending} onClick={handleClick}>
        {isPending ? "Carregando..." : label}
      </Button>
      {isPending ? <LoadingState inline label={loadingLabel} /> : null}
    </div>
  );
}
