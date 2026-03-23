"use client";
/* eslint-disable @next/next/no-img-element */

import { Badge } from "@/src/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/src/components/ui/card";
import { LoadingState } from "@/src/components/loading-state";
import horseImg from "@/public/images/cavalo.webp";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CustomCardProps } from "@/src/types";

export function CustomCard({ item }: CustomCardProps) {
  const router = useRouter();
  const [isSelected, setIsSelected] = useState(false);
  const [isPending, startTransition] = useTransition();
  const highlightsSummary = item.highlights
    .map((highlight) => highlight.value.trim())
    .filter(Boolean)
    .join(" - ");

  function handleClick() {
    setIsSelected(true);
    startTransition(() => {
      router.push(`/animal/${item.identifier}`);
    });
  }

  return (
    <Card
      className="relative w-xs overflow-hidden border-white/8 bg-[#151311] pt-0 text-[#ece6dd] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.85)] transition hover:-translate-y-1 hover:border-[#7f756a] hover:shadow-[0_28px_80px_-36px_rgba(0,0,0,0.92)]"
      onClick={handleClick}
    >
      {isPending && isSelected ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <LoadingState label="Carregando animal..." />
        </div>
      ) : null}
      <img src={item.previewImageUrl || horseImg.src} alt={item.name} className="relative aspect-video w-full object-cover" />
      <CardHeader className="gap-4">
        <CardAction>
          <Badge variant="secondary" className="border border-white/8 bg-white/8 text-[#d9d0c5]">
            {item.badge ?? "Catalogo"}
          </Badge>
        </CardAction>
        <CardTitle className="text-xl text-[#f4eee6]">{item.name}</CardTitle>
        {highlightsSummary ? (
          <p className="text-sm leading-6 text-[#b9afa2]">{highlightsSummary}</p>
        ) : (
          <p className="text-sm text-[#8f8579]">Sem caracteristicas principais configuradas.</p>
        )}
      </CardHeader>
    </Card>
  );
}
