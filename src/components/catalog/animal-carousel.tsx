/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/src/components/ui/carousel";
import type { AnimalCarouselProps } from "@/src/types";

export function AnimalCarousel({ items, className, showThumbnails = false }: AnimalCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeItem = items[currentIndex] ?? items[0];

  useEffect(() => {
    if (!api) {
      return;
    }

    const syncIndex = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };

    syncIndex();
    api.on("select", syncIndex);
    api.on("reInit", syncIndex);

    return () => {
      api.off("select", syncIndex);
      api.off("reInit", syncIndex);
    };
  }, [api]);

  if (!activeItem) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: items.length > 1 }}
        className="overflow-hidden rounded-[2rem] border border-white/8 bg-[#1d1a16] shadow-[0_28px_70px_-35px_rgba(24,24,27,0.75)]"
      >
        <CarouselContent className="ml-0">
          {items.map((item) => (
            <CarouselItem key={`carousel-item-${item.id}`} className="pl-0">
              <div className="relative">
                <div className="aspect-video bg-[#16130f]">
                  {item.kind === "video" ? (
                    <video src={item.url} controls className="h-full w-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.title ?? "Animal"} className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black via-black/55 to-transparent px-5 pb-6 pt-20 text-white md:px-7">
                  {item.title || item.description ? (
                    <div className="mt-4 max-w-3xl">
                      {item.title ? <h3 className="text-2xl font-semibold md:text-3xl">{item.title}</h3> : null}
                      {item.description ? <p className="mt-2 text-sm leading-6 text-white/82 md:text-base">{item.description}</p> : null}
                    </div>
                  ) : null}

                  {item.href ? (
                    <div className="pointer-events-auto mt-5">
                      <Button asChild className="h-11 rounded-full bg-[#b8aea4] px-5 text-sm font-semibold text-[#11100f] hover:bg-[#d8d0c5]">
                        <Link href={item.href}>Ver detalhes</Link>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {items.length > 1 ? (
          <>
            <CarouselPrevious className="left-4 top-4 hidden size-11 translate-y-0 rounded-full border-white/25 bg-black/35 text-white hover:bg-black/55 disabled:opacity-35 md:flex" />
            <CarouselNext className="right-4 top-4 hidden size-11 translate-y-0 rounded-full border-white/25 bg-black/35 text-white hover:bg-black/55 disabled:opacity-35 md:flex" />
          </>
        ) : null}
      </Carousel>

      {items.length > 1 && !showThumbnails ? (
        <div className="flex items-center justify-center gap-2 md:hidden">
          {items.map((item, index) => {
            const isActive = index === currentIndex;

            return (
              <button
                key={`carousel-dot-${item.id}`}
                type="button"
                className={`h-2.5 rounded-full transition ${
                  isActive ? "w-7 bg-[#b8aea4]" : "w-2.5 bg-white/25 hover:bg-white/45"
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Ir para o arquivo ${index + 1}`}
                aria-pressed={isActive}
              />
            );
          })}
        </div>
      ) : null}

      {items.length > 1 && showThumbnails ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`group relative overflow-hidden rounded-4xl border transition ${
                index === currentIndex
                  ? "border-[#b8aea4] bg-[#26211c] shadow-[0_16px_36px_-24px_rgba(24,24,27,0.7)]"
                  : "border-white/10 bg-[#151311] hover:border-[#7f756a] hover:bg-[#26211c]"
              }`}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Visualizar arquivo ${index + 1}`}
            >
              <div className="aspect-video w-28 bg-[#16130f] sm:w-36">
                {item.kind === "video" ? (
                  <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={item.url} alt={item.title ?? `Arquivo ${index + 1}`} className="h-full w-full object-cover" />
                )}
              </div>
              <div
                className={`absolute inset-x-0 bottom-0 h-1 transition ${
                  index === currentIndex ? "bg-[#b8aea4]" : "bg-transparent group-hover:bg-[#b8aea4]/45"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
