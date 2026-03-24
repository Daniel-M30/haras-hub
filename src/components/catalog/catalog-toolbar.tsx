"use client";

import { Check, ChevronDown, Filter, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, type UIEvent, useMemo, useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { LoadingState } from "@/src/components/loading-state";
import type {
  BooleanFilterState,
  CatalogDraftCharacteristicToken,
  CatalogDraftFilterState,
  CatalogFacetAnimal,
  CatalogFacetMatchOverrides,
  CatalogFilterData,
  CatalogToolbarProps,
  CatalogSelectOption,
  NumberFilterState,
  SelectFilterState,
} from "@/src/types";

function matchesFacetAnimal(animal: CatalogFacetAnimal, state: CatalogDraftFilterState, overrides: CatalogFacetMatchOverrides = {}) {
  const selectedAnimalTypeId = overrides.animalTypeId ?? state.animalTypeId;

  if (selectedAnimalTypeId && animal.animalTypeId !== selectedAnimalTypeId) {
    return false;
  }

  for (const [characteristicId, selectedValue] of Object.entries(state.selectFilters)) {
    const effectiveValue = overrides.selectFilter?.characteristicId === characteristicId ? overrides.selectFilter.value : selectedValue;

    if (!effectiveValue) {
      continue;
    }

    if (animal.values[characteristicId]?.optionId !== effectiveValue) {
      return false;
    }
  }

  for (const [characteristicId, selectedValue] of Object.entries(state.booleanFilters)) {
    const effectiveValue = overrides.booleanFilter?.characteristicId === characteristicId ? overrides.booleanFilter.value : selectedValue;

    if (!effectiveValue) {
      continue;
    }

    const animalValue = animal.values[characteristicId]?.valueBoolean;

    if (animalValue === null || animalValue === undefined) {
      return false;
    }

    if (animalValue !== (effectiveValue === "true")) {
      return false;
    }
  }

  for (const [characteristicId, selectedRange] of Object.entries(state.numberFilters)) {
    const effectiveRange = overrides.numberFilter?.characteristicId === characteristicId ? overrides.numberFilter.value : selectedRange;
    const minValue = effectiveRange?.min.trim() ?? "";
    const maxValue = effectiveRange?.max.trim() ?? "";

    if (!minValue && !maxValue) {
      continue;
    }

    const animalValue = animal.values[characteristicId]?.valueNumber;

    if (animalValue === null || animalValue === undefined) {
      return false;
    }

    if (minValue && animalValue < Number(minValue)) {
      return false;
    }

    if (maxValue && animalValue > Number(maxValue)) {
      return false;
    }
  }

  return true;
}

function filterFacetAnimals(animals: CatalogFacetAnimal[], state: CatalogDraftFilterState, overrides: CatalogFacetMatchOverrides = {}) {
  return animals.filter((animal) => matchesFacetAnimal(animal, state, overrides));
}

function getAvailableNumberRange(animals: CatalogFacetAnimal[], characteristicId: string) {
  const values = animals
    .map((animal) => animal.values[characteristicId]?.valueNumber)
    .filter((value): value is number => value !== null && value !== undefined);

  if (!values.length) {
    return null;
  }

  return {
    maxValue: Math.max(...values),
    minValue: Math.min(...values),
  };
}

function buildSearchParams({ animalTypes, characteristicTokens, search }: { animalTypes: string[]; characteristicTokens: string[]; search: string }) {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("q", search.trim());
  }

  for (const value of animalTypes) {
    params.append("type", value);
  }

  for (const value of characteristicTokens) {
    params.append("char", value);
  }

  return params;
}

function parseCharacteristicToken(token: string): CatalogDraftCharacteristicToken | null {
  const [kind, characteristicId, ...rest] = token.split("|");
  const rawValue = decodeURIComponent(rest.join("|"));

  if (!kind || !characteristicId || !rawValue) {
    return null;
  }

  switch (kind) {
    case "option":
      return { characteristicId, kind, value: rawValue };
    case "number_min":
      return { characteristicId, kind, value: rawValue };
    case "number_max":
      return { characteristicId, kind, value: rawValue };
    case "boolean":
      return rawValue === "true" || rawValue === "false" ? { characteristicId, kind, value: rawValue } : null;
    default:
      return null;
  }
}

function createCharacteristicToken(parsed: CatalogDraftCharacteristicToken) {
  return `${parsed.kind}|${parsed.characteristicId}|${encodeURIComponent(parsed.value)}`;
}

function buildInitialStates(filters: CatalogFilterData, initialAnimalTypes: string[], tokens: string[]) {
  const numberFilters: NumberFilterState = {};
  const booleanFilters: BooleanFilterState = {};
  const selectFilters: SelectFilterState = {};

  for (const filter of filters.characteristics) {
    if (filter.dataType === "number") {
      numberFilters[filter.characteristicId] = { max: "", min: "" };
      continue;
    }

    if (filter.dataType === "boolean") {
      booleanFilters[filter.characteristicId] = "";
      continue;
    }

    selectFilters[filter.characteristicId] = "";
  }

  for (const rawToken of tokens) {
    const token = parseCharacteristicToken(rawToken);

    if (!token) {
      continue;
    }

    switch (token.kind) {
      case "option":
        selectFilters[token.characteristicId] = token.value;
        break;
      case "number_min":
        numberFilters[token.characteristicId] = {
          ...(numberFilters[token.characteristicId] ?? { max: "", min: "" }),
          min: token.value,
        };
        break;
      case "number_max":
        numberFilters[token.characteristicId] = {
          ...(numberFilters[token.characteristicId] ?? { max: "", min: "" }),
          max: token.value,
        };
        break;
      case "boolean":
        booleanFilters[token.characteristicId] = token.value;
        break;
    }
  }

  return {
    animalTypeId: initialAnimalTypes[0] ?? "",
    booleanFilters,
    numberFilters,
    selectFilters,
  };
}

function buildCharacteristicTokens({
  booleanFilters,
  numberFilters,
  selectFilters,
}: {
  booleanFilters: BooleanFilterState;
  numberFilters: NumberFilterState;
  selectFilters: SelectFilterState;
}) {
  const tokens: string[] = [];

  for (const [characteristicId, value] of Object.entries(selectFilters)) {
    if (!value) {
      continue;
    }

    tokens.push(
      createCharacteristicToken({
        characteristicId,
        kind: "option",
        value,
      }),
    );
  }

  for (const [characteristicId, value] of Object.entries(booleanFilters)) {
    if (!value) {
      continue;
    }

    tokens.push(
      createCharacteristicToken({
        characteristicId,
        kind: "boolean",
        value,
      }),
    );
  }

  for (const [characteristicId, value] of Object.entries(numberFilters)) {
    if (value.min.trim()) {
      tokens.push(
        createCharacteristicToken({
          characteristicId,
          kind: "number_min",
          value: value.min.trim(),
        }),
      );
    }

    if (value.max.trim()) {
      tokens.push(
        createCharacteristicToken({
          characteristicId,
          kind: "number_max",
          value: value.max.trim(),
        }),
      );
    }
  }

  return tokens;
}

function getFilterCount({
  animalTypeId,
  booleanFilters,
  numberFilters,
  selectFilters,
}: {
  animalTypeId: string;
  booleanFilters: BooleanFilterState;
  numberFilters: NumberFilterState;
  selectFilters: SelectFilterState;
}) {
  const numberCount = Object.values(numberFilters).filter((value) => value.min.trim() || value.max.trim()).length;
  const booleanCount = Object.values(booleanFilters).filter(Boolean).length;
  const selectCount = Object.values(selectFilters).filter(Boolean).length;

  return (animalTypeId ? 1 : 0) + numberCount + booleanCount + selectCount;
}

function getSingleSelectLabel(options: CatalogSelectOption[], selectedValue: string, placeholder: string) {
  if (!selectedValue) {
    return placeholder;
  }

  return options.find((option) => option.id === selectedValue)?.label ?? placeholder;
}

function LazySingleSelect({
  clearCount,
  options,
  placeholder,
  selectedValue,
  onSelect,
}: {
  clearCount?: number;
  options: CatalogSelectOption[];
  placeholder: string;
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;

    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 24) {
      setVisibleCount((current) => Math.min(current + 20, options.length));
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-[#1f1a17] px-3 text-left text-sm text-[#ece6dd]"
        onClick={() => {
          setVisibleCount(20);
          setIsOpen((current) => !current);
        }}
      >
        <span className="truncate">{getSingleSelectLabel(options, selectedValue, placeholder)}</span>
        <ChevronDown className={`size-4 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border border-white/10 bg-[#151311] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)]">
          <div className="border-b border-white/10 p-2">
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                !selectedValue ? "bg-[#b8aea4] text-[#11100f]" : "text-[#d6cdc1] hover:bg-[#26211c] hover:text-white"
              }`}
              onClick={() => {
                onSelect("");
                setIsOpen(false);
              }}
            >
              <span>Sem filtro</span>
              {clearCount !== undefined ? (
                <span
                  className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    !selectedValue ? "bg-black/10 text-[#11100f]" : "bg-white/8 text-[#b9afa2]"
                  }`}
                >
                  {clearCount}
                </span>
              ) : null}
              {!selectedValue ? <Check className="size-4" /> : null}
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto p-2" onScroll={handleScroll}>
            {options.length ? (
              options.slice(0, visibleCount).map((option) => {
                const isSelected = selectedValue === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                      isSelected ? "bg-[#b8aea4] text-[#11100f]" : "text-[#d6cdc1] hover:bg-[#26211c] hover:text-white"
                    }`}
                    onClick={() => {
                      onSelect(isSelected ? "" : option.id);
                      setIsOpen(false);
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`inline-flex size-4 items-center justify-center rounded-full border ${isSelected ? "border-[#11100f]" : "border-white/15"}`}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </span>
                      <span className="truncate">{option.label}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${isSelected ? "bg-black/10 text-[#11100f]" : "bg-white/8 text-[#b9afa2]"}`}
                    >
                      {option.count}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-sm text-[#8f8579]">Nenhuma opcao disponivel.</p>
            )}
          </div>
          {options.length > visibleCount ? (
            <p className="border-t border-white/10 px-3 py-2 text-xs text-[#8f8579]">Role para carregar mais opcoes.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CatalogToolbar({ filters, initialSearch, initialAnimalTypes, initialCharacteristicTokens }: CatalogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const appliedState = useMemo(
    () => buildInitialStates(filters, initialAnimalTypes, initialCharacteristicTokens),
    [filters, initialAnimalTypes, initialCharacteristicTokens],
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [draftAnimalTypeId, setDraftAnimalTypeId] = useState(appliedState.animalTypeId);
  const [draftNumberFilters, setDraftNumberFilters] = useState<NumberFilterState>(appliedState.numberFilters);
  const [draftBooleanFilters, setDraftBooleanFilters] = useState<BooleanFilterState>(appliedState.booleanFilters);
  const [draftSelectFilters, setDraftSelectFilters] = useState<SelectFilterState>(appliedState.selectFilters);
  const dynamicFacetData = useMemo(() => {
    const draftState: CatalogDraftFilterState = {
      animalTypeId: draftAnimalTypeId,
      booleanFilters: draftBooleanFilters,
      numberFilters: draftNumberFilters,
      selectFilters: draftSelectFilters,
    };
    const animalTypeClearCount = filterFacetAnimals(filters.facetAnimals, draftState, {
      animalTypeId: "",
    }).length;
    const animalTypes = filters.animalTypes.map((option) => ({
      ...option,
      count: filterFacetAnimals(filters.facetAnimals, draftState, {
        animalTypeId: option.id,
      }).length,
    }));
    const selectOptions: Record<string, CatalogSelectOption[]> = {};
    const selectClearCounts: Record<string, number> = {};
    const booleanCounts: Record<string, { allCount: number; falseCount: number; trueCount: number }> = {};
    const numberRanges: Record<
      string,
      {
        availableCount: number;
        maxValue: number | null;
        minValue: number | null;
      }
    > = {};

    for (const filter of filters.characteristics) {
      if (filter.dataType === "select") {
        selectClearCounts[filter.characteristicId] = filterFacetAnimals(filters.facetAnimals, draftState, {
          selectFilter: {
            characteristicId: filter.characteristicId,
            value: "",
          },
        }).length;
        selectOptions[filter.characteristicId] = filter.options.map((option) => ({
          ...option,
          count: filterFacetAnimals(filters.facetAnimals, draftState, {
            selectFilter: {
              characteristicId: filter.characteristicId,
              value: option.id,
            },
          }).length,
        }));
        continue;
      }

      if (filter.dataType === "boolean") {
        booleanCounts[filter.characteristicId] = {
          allCount: filterFacetAnimals(filters.facetAnimals, draftState, {
            booleanFilter: {
              characteristicId: filter.characteristicId,
              value: "",
            },
          }).length,
          falseCount: filterFacetAnimals(filters.facetAnimals, draftState, {
            booleanFilter: {
              characteristicId: filter.characteristicId,
              value: "false",
            },
          }).length,
          trueCount: filterFacetAnimals(filters.facetAnimals, draftState, {
            booleanFilter: {
              characteristicId: filter.characteristicId,
              value: "true",
            },
          }).length,
        };
        continue;
      }

      const availableAnimals = filterFacetAnimals(filters.facetAnimals, draftState, {
        numberFilter: {
          characteristicId: filter.characteristicId,
          value: {
            max: "",
            min: "",
          },
        },
      });
      const range = getAvailableNumberRange(availableAnimals, filter.characteristicId);

      numberRanges[filter.characteristicId] = {
        availableCount: availableAnimals.filter(
          (animal) =>
            animal.values[filter.characteristicId]?.valueNumber !== null && animal.values[filter.characteristicId]?.valueNumber !== undefined,
        ).length,
        maxValue: range?.maxValue ?? null,
        minValue: range?.minValue ?? null,
      };
    }

    return {
      animalTypeClearCount,
      animalTypes,
      booleanCounts,
      numberRanges,
      selectClearCounts,
      selectOptions,
    };
  }, [draftAnimalTypeId, draftBooleanFilters, draftNumberFilters, draftSelectFilters, filters]);
  const activeFilterCount = useMemo(
    () =>
      getFilterCount({
        animalTypeId: appliedState.animalTypeId,
        booleanFilters: appliedState.booleanFilters,
        numberFilters: appliedState.numberFilters,
        selectFilters: appliedState.selectFilters,
      }),
    [appliedState],
  );
  const hasActiveSearch = Boolean(initialSearch.trim());
  const hasActiveFilters = activeFilterCount > 0;
  const summaryText = useMemo(() => {
    if (!hasActiveFilters) {
      return "Sem filtros ativos";
    }

    return `${activeFilterCount} filtro(s) ativo(s)`;
  }, [activeFilterCount, hasActiveFilters]);

  function openModal() {
    setDraftAnimalTypeId(appliedState.animalTypeId);
    setDraftNumberFilters(appliedState.numberFilters);
    setDraftBooleanFilters(appliedState.booleanFilters);
    setDraftSelectFilters(appliedState.selectFilters);
    setIsModalOpen(true);
  }

  function closeModal() {
    setDraftAnimalTypeId(appliedState.animalTypeId);
    setDraftNumberFilters(appliedState.numberFilters);
    setDraftBooleanFilters(appliedState.booleanFilters);
    setDraftSelectFilters(appliedState.selectFilters);
    setIsModalOpen(false);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      openModal();
      return;
    }

    closeModal();
  }

  function navigate(nextSearch: string, nextAnimalTypeId: string, nextCharacteristicTokens: string[]) {
    const params = buildSearchParams({
      animalTypes: nextAnimalTypeId ? [nextAnimalTypeId] : [],
      characteristicTokens: nextCharacteristicTokens,
      search: nextSearch,
    });
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startTransition(() => {
      router.push(nextUrl);
    });
  }

  function applyFilters() {
    setIsModalOpen(false);
    navigate(
      search,
      draftAnimalTypeId,
      buildCharacteristicTokens({
        booleanFilters: draftBooleanFilters,
        numberFilters: draftNumberFilters,
        selectFilters: draftSelectFilters,
      }),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters();
  }

  function handleChangeNumber(characteristicId: string, key: "min" | "max", value: string) {
    setDraftNumberFilters((current) => ({
      ...current,
      [characteristicId]: {
        ...(current[characteristicId] ?? { max: "", min: "" }),
        [key]: value,
      },
    }));
  }

  function handleChangeBoolean(characteristicId: string, value: "" | "true" | "false") {
    setDraftBooleanFilters((current) => ({
      ...current,
      [characteristicId]: current[characteristicId] === value ? "" : value,
    }));
  }

  function handleClearFilters() {
    const clearedState = buildInitialStates(filters, [], []);
    setDraftAnimalTypeId("");
    setDraftNumberFilters(clearedState.numberFilters);
    setDraftBooleanFilters(clearedState.booleanFilters);
    setDraftSelectFilters(clearedState.selectFilters);
    setIsModalOpen(false);
    navigate(search, "", []);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-[1.5rem] border border-white/8 bg-[#151311] p-3 md:p-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8f8579]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Garimpar"
              className="h-12 rounded-2xl border-white/10 bg-[#1f1a17] pl-10 text-[#ece6dd] placeholder:text-[#8f8579]"
            />
          </div>
          <button type="submit" className="sr-only">
            Buscar
          </button>

          <Dialog open={isModalOpen} onOpenChange={handleDialogOpenChange}>
            <div className="relative">
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant={hasActiveFilters ? "default" : "outline"}
                  size="icon"
                  className="size-12 rounded-2xl"
                  aria-label="Abrir filtros"
                >
                  <Filter />
                </Button>
              </DialogTrigger>
              {hasActiveFilters ? (
                <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-[#b8aea4] text-[10px] font-bold text-[#11100f]">
                  {activeFilterCount}
                </span>
              ) : null}
            </div>

            <DialogContent
              showCloseButton={false}
              className="gap-0 overflow-hidden rounded-[2rem] border border-white/8 bg-[#151311] p-0 text-[#ece6dd] shadow-[0_30px_80px_-38px_rgba(0,0,0,0.9)] sm:left-[50%] sm:right-auto sm:bottom-auto sm:w-full sm:translate-x-[-50%] sm:translate-y-[-50%]"
            >
              <DialogHeader className="shrink-0 gap-0 border-b border-white/10 p-5 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl font-bold text-[#f3ede5]">Filtros</DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-[#b9afa2]">
                      Os filtros so entram em vigor quando voce clicar em aplicar.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="space-y-3 rounded-2xl border border-white/8 bg-[#1b1714] p-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8f8579]">Tipo de animal</h3>
                    <p className="mt-1 text-sm text-[#b9afa2]">Escolha apenas um tipo por vez.</p>
                  </div>
                  <LazySingleSelect
                    clearCount={dynamicFacetData.animalTypeClearCount}
                    options={dynamicFacetData.animalTypes}
                    placeholder="Selecionar tipo"
                    selectedValue={draftAnimalTypeId}
                    onSelect={setDraftAnimalTypeId}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8f8579]">Caracteristicas</h3>
                  {filters.characteristics.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filters.characteristics.map((filter) => (
                        <div key={filter.characteristicId} className="space-y-3 rounded-2xl border border-white/8 bg-[#1b1714] p-4">
                          <div>
                            <p className="text-sm font-semibold text-[#f3ede5]">{filter.label}</p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-[#8f8579]">
                              {filter.dataType === "select" ? "Selecao unica" : filter.dataType === "number" ? "Intervalo numerico" : "Booleano"}
                            </p>
                          </div>

                          {filter.dataType === "select" ? (
                            <LazySingleSelect
                              clearCount={dynamicFacetData.selectClearCounts[filter.characteristicId]}
                              options={dynamicFacetData.selectOptions[filter.characteristicId] ?? filter.options}
                              placeholder="Selecionar opcao"
                              selectedValue={draftSelectFilters[filter.characteristicId] ?? ""}
                              onSelect={(value) =>
                                setDraftSelectFilters((current) => ({
                                  ...current,
                                  [filter.characteristicId]: value,
                                }))
                              }
                            />
                          ) : null}

                          {filter.dataType === "number" ? (
                            <div className="space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-[#8f8579]">Minimo</label>
                                  <Input
                                    type="number"
                                    step="any"
                                    value={draftNumberFilters[filter.characteristicId]?.min ?? ""}
                                    onChange={(event) => handleChangeNumber(filter.characteristicId, "min", event.target.value)}
                                    placeholder={String(dynamicFacetData.numberRanges[filter.characteristicId]?.minValue ?? filter.minValue)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-[#8f8579]">Maximo</label>
                                  <Input
                                    type="number"
                                    step="any"
                                    value={draftNumberFilters[filter.characteristicId]?.max ?? ""}
                                    onChange={(event) => handleChangeNumber(filter.characteristicId, "max", event.target.value)}
                                    placeholder={String(dynamicFacetData.numberRanges[filter.characteristicId]?.maxValue ?? filter.maxValue)}
                                  />
                                </div>
                              </div>
                              {dynamicFacetData.numberRanges[filter.characteristicId]?.availableCount ? (
                                <p className="text-xs text-[#b9afa2]">
                                  Valores disponiveis entre {dynamicFacetData.numberRanges[filter.characteristicId]?.minValue ?? filter.minValue} e{" "}
                                  {dynamicFacetData.numberRanges[filter.characteristicId]?.maxValue ?? filter.maxValue}.
                                </p>
                              ) : (
                                <p className="text-xs text-[#b9afa2]">Nenhum valor numerico disponivel com os filtros atuais.</p>
                              )}
                            </div>
                          ) : null}

                          {filter.dataType === "boolean" ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant={draftBooleanFilters[filter.characteristicId] === "" ? "default" : "outline"}
                                onClick={() => handleChangeBoolean(filter.characteristicId, "")}
                              >
                                Todos ({dynamicFacetData.booleanCounts[filter.characteristicId]?.allCount ?? filter.trueCount + filter.falseCount})
                              </Button>
                              <Button
                                type="button"
                                variant={draftBooleanFilters[filter.characteristicId] === "true" ? "default" : "outline"}
                                onClick={() => handleChangeBoolean(filter.characteristicId, "true")}
                              >
                                Verdadeiro ({dynamicFacetData.booleanCounts[filter.characteristicId]?.trueCount ?? filter.trueCount})
                              </Button>
                              <Button
                                type="button"
                                variant={draftBooleanFilters[filter.characteristicId] === "false" ? "default" : "outline"}
                                onClick={() => handleChangeBoolean(filter.characteristicId, "false")}
                              >
                                Falso ({dynamicFacetData.booleanCounts[filter.characteristicId]?.falseCount ?? filter.falseCount})
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#1b1714] p-4 text-sm text-[#b9afa2]">
                      Nenhuma caracteristica esta marcada como filtravel no momento.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="shrink-0 justify-between gap-3 border-t border-white/10 p-5 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={handleClearFilters}>
                  Limpar filtros
                </Button>
                <div className="flex flex-wrap gap-3">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Fechar
                    </Button>
                  </DialogClose>
                  <Button type="button" onClick={applyFilters}>
                    Aplicar filtros
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {hasActiveSearch || hasActiveFilters || isPending ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#b9afa2]">
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-[#ece6dd]">{summaryText}</span>
            {hasActiveSearch ? (
              <span className="rounded-full border border-white/10 bg-[#26211c] px-3 py-1 text-xs font-medium text-[#ece6dd]">
                Pesquisa: {`"${initialSearch.trim()}"`}
              </span>
            ) : null}
            {isPending ? <LoadingState inline label="Carregando catalogo..." /> : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}
