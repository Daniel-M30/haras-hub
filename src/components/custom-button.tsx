"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  createAnimalWhatsappMessage,
  createDefaultWhatsappMessage,
  createWhatsappUrl,
  getAnimalReferenceFromPath,
} from "@/src/lib/whatsapp";
import type { CustomButtonProps } from "@/src/types";
import whatsappIcon from "@/public/icons/whatsapp.svg";

export function CustomButton({
  label = "Falar no WhatsApp",
  message,
  className,
  floating = false,
}: CustomButtonProps) {
  const pathname = usePathname();
  const animalReference = getAnimalReferenceFromPath(pathname);
  const resolvedMessage =
    message ?? (animalReference ? createAnimalWhatsappMessage(animalReference) : createDefaultWhatsappMessage());
  const href = createWhatsappUrl(resolvedMessage);
  const resolvedLabel = floating && label === "Falar no WhatsApp" ? "WhatsApp" : label;

  if (floating) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={resolvedLabel}
        className={`fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full border border-white/70 bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-[0_24px_50px_-18px_rgba(37,211,102,0.85)] transition hover:-translate-y-0.5 hover:bg-[#20bd5a] ${className ?? ""}`}
      >
        <span className="relative flex size-10 items-center justify-center rounded-full bg-white/18">
          <Image src={whatsappIcon} alt="" className="size-5 object-contain" />
        </span>
        <span className="whitespace-nowrap">{resolvedLabel}</span>
      </Link>
    );
  }

  return (
    <Button
      asChild
      className={`h-12 rounded-2xl bg-[#128C7E] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(18,140,126,0.9)] transition hover:bg-[#0f7569] ${className ?? ""}`}
    >
      <Link href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-white/14">
          <Image src={whatsappIcon} alt="" className="size-4 object-contain" />
        </span>
        <span className="whitespace-nowrap">{resolvedLabel}</span>
      </Link>
    </Button>
  );
}
