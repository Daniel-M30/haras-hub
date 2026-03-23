import Link from "next/link";
import horseImg from "@/public/images/cavalo.webp";
import { CustomButton } from "@/src/components/custom-button";
import { ScrollToTop } from "@/src/components/scroll-to-top";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/src/components/ui/breadcrumb";
import { getCatalogAnimalByIdentifier } from "@/src/lib/catalog";
import { createAnimalWhatsappMessage } from "@/src/lib/whatsapp";
import type { AnimalDetailPageProps } from "@/src/types";
import { AnimalCarousel } from "@/src/components/catalog/animal-carousel";

export default async function Page({ params }: AnimalDetailPageProps) {
  const { identifier } = await params;
  const item = await getCatalogAnimalByIdentifier(identifier);

  if (!item) {
    return <h1>Animal nao encontrado</h1>;
  }

  const carouselItems = item.media.length
    ? item.media
    : [
        {
          id: `${item.id}-fallback`,
          kind: "image" as const,
          title: item.name,
          url: horseImg.src,
        },
      ];
  const whatsappMessage = createAnimalWhatsappMessage(item.name, item.identifier);

  return (
    <div className="w-full space-y-8 px-4 py-6 md:px-8">
      <ScrollToTop />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/" className="text-[#b9afa2]">
                Home
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[#efe7dc]">{item.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <AnimalCarousel items={carouselItems} showThumbnails />
          <div className="rounded-3xl border border-white/8 bg-[#151311] p-6 text-[#ece6dd] shadow-[0_20px_45px_-30px_rgba(0,0,0,0.72)]">
            <h2 className="text-xl font-semibold">Descricao</h2>
            <p className="mt-3 text-sm leading-7 text-[#b9afa2]">{item.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/8 bg-[#151311] p-6 text-[#ece6dd] shadow-[0_20px_45px_-30px_rgba(0,0,0,0.72)]">
            <h1 className="py-1 text-4xl font-bold">{item.name}</h1>
            <p className="text-xs font-bold tracking-[0.16em] text-[#8f8579]">Identificador: {item.identifier}</p>
          </div>

          <div className="rounded-3xl border border-white/8 bg-[#151311] p-6 text-[#ece6dd] shadow-[0_20px_45px_-30px_rgba(0,0,0,0.72)]">
            <h4 className="text-xl font-semibold">Caracteristicas</h4>
            <div className="mt-4 grid gap-3">
              {item.characteristics.map((characteristic) => (
                <div key={characteristic.key} className="rounded-2xl border border-white/8 bg-white/4 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8f8579]">{characteristic.label}</p>
                  <p className="mt-1 text-sm text-[#d8d0c5]">{characteristic.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-[#151311] p-6 text-[#ece6dd] shadow-[0_20px_45px_-30px_rgba(0,0,0,0.72)]">
            <h4 className="text-xl font-semibold">Informacoes</h4>
            <div className="mt-4 grid gap-3">
              {item.info.map((infoItem) => (
                <div key={infoItem.label} className="rounded-2xl border border-white/8 bg-white/4 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8f8579]">{infoItem.label}</p>
                  <p className="mt-1 text-sm text-[#d8d0c5]">{infoItem.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-[#151311] p-6 text-[#ece6dd] shadow-[0_20px_45px_-30px_rgba(0,0,0,0.72)]">
            <p className="text-sm text-[#b9afa2]">Para mais informacoes, entre em contato conosco pelo WhatsApp.</p>
            <CustomButton className="mt-4 w-full" label="Conversar sobre este animal" message={whatsappMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}
