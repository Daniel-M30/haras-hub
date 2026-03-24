import { CatalogToolbar } from "@/src/components/catalog/catalog-toolbar";
import { CustomCard } from "@/src/components/custom-card";
import { AnimalCarousel } from "@/src/components/catalog/animal-carousel";
import { getCatalogAnimals, getCatalogFilters, getFeaturedCatalogAnimals } from "@/src/lib/catalog";
import type { CatalogPageProps } from "@/src/types";

function getStringValue(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function getArrayValue(value?: string | string[]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export default async function Home({ searchParams }: CatalogPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = getStringValue(resolvedSearchParams.q);
  const selectedAnimalTypes = getArrayValue(resolvedSearchParams.type);
  const selectedCharacteristicTokens = getArrayValue(resolvedSearchParams.char);
  const [filters, animals, featuredAnimals] = await Promise.all([
    getCatalogFilters({
      search,
    }),
    getCatalogAnimals({
      animalTypeIds: selectedAnimalTypes,
      characteristicTokens: selectedCharacteristicTokens,
      search,
    }),
    getFeaturedCatalogAnimals(),
  ]);

  return (
    <div className="mx-auto w-full max-w-272 space-y-10 px-4 py-6">
      {featuredAnimals.length ? (
        <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#141210_0%,#23201d_46%,#3f3933_100%)] p-4 shadow-[0_30px_90px_-45px_rgba(0,0,0,0.85)] md:p-6">
          <AnimalCarousel items={featuredAnimals} />
        </section>
      ) : null}

      <section id="catalogo" className="space-y-6">
        <CatalogToolbar
          key={`${search}|${selectedAnimalTypes.join(",")}|${selectedCharacteristicTokens.join(",")}`}
          filters={filters}
          initialSearch={search}
          initialAnimalTypes={selectedAnimalTypes}
          initialCharacteristicTokens={selectedCharacteristicTokens}
        />

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4 rounded-[2rem] border border-white/8 bg-[#151311] p-5 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.78)]">
            <div>
              <h2 className="text-2xl font-bold text-[#f3ede5]">Animais encontrados</h2>
              <p className="mt-1 text-sm text-[#a89f93]">{animals.length} resultado(s) para os filtros atuais.</p>
            </div>
          </div>

          {animals.length ? (
            <section className="flex flex-wrap justify-center gap-4">
              {animals.map((item) => (
                <CustomCard key={item.id} item={item} />
              ))}
            </section>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#151311] p-10 text-center text-sm text-[#a89f93]">
              Nenhum animal corresponde aos filtros atuais.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
