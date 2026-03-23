"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "../ui/item";
import { Input } from "../ui/input";
import { LoadingState } from "@/src/components/loading-state";
import { cn } from "@/src/lib/utils";
import type { ListObjectsProps } from "@/src/types";

export function CustomList({
  items,
  queryKey,
  selectedIdentifier,
  clearKeys,
  emptyMessage = "Nenhum item encontrado.",
  searchPlaceholder,
}: ListObjectsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = items?.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    return `${item.label} ${item.description ?? ""}`.toLowerCase().includes(normalizedSearch);
  });

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(queryKey, value);

    clearKeys?.forEach((key) => {
      params.delete(key);
    });

    setPendingItemId(value);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  if (!items?.length) {
    return <p className="p-3 text-sm text-[#8f8579]">{emptyMessage}</p>;
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {isPending ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/70 backdrop-blur-sm">
          <LoadingState label="Carregando selecao..." />
        </div>
      ) : null}
      {searchPlaceholder ? (
        <div className="p-3 pb-0">
          <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={searchPlaceholder} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ItemGroup className={cn("gap-2 p-3", isPending ? "pointer-events-none opacity-60" : "")}>
          {filteredItems?.length ? (
            filteredItems.map((item) => (
              <Item
                className="cursor-pointer border-white/8 bg-white/4 text-[#ece6dd] hover:border-[#7f756a] hover:bg-[#26211c] hover:text-white"
                variant={item.identifier === selectedIdentifier || item.identifier === pendingItemId ? "muted" : "outline"}
                role="listitem"
                key={item.identifier}
                onClick={() => handleSelect(item.identifier)}
              >
                <ItemContent>
                  <ItemTitle>{item.label}</ItemTitle>
                  {item.description ? <ItemDescription>{item.description}</ItemDescription> : null}
                </ItemContent>
              </Item>
            ))
          ) : (
            <p className="text-sm text-[#8f8579]">Nenhum item corresponde a busca atual.</p>
          )}
        </ItemGroup>
      </div>
    </div>
  );
}
