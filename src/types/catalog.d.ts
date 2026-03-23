import type { CharacteristicDataType } from "@/src/generated/prisma/enums";

type CatalogQuery = {
  search?: string;
  animalTypeIds?: string[];
  characteristicTokens?: string[];
};

type CatalogAnimalCard = {
  id: string;
  identifier: string;
  name: string;
  badge?: string;
  highlights: Array<{
    label: string;
    value: string;
  }>;
  previewImageUrl?: string;
};

type CatalogCarouselEntry = {
  id: string;
  kind: "image" | "video";
  url: string;
  title: string;
  description: string;
  href: string;
};

type CatalogSelectOption = {
  id: string;
  label: string;
  count: number;
};

type CatalogNumberFilter = {
  characteristicId: string;
  dataType: "number";
  label: string;
  minValue: number;
  maxValue: number;
};

type CatalogSelectFilter = {
  characteristicId: string;
  dataType: "select";
  label: string;
  options: CatalogSelectOption[];
};

type CatalogBooleanFilter = {
  characteristicId: string;
  dataType: "boolean";
  label: string;
  trueCount: number;
  falseCount: number;
};

type CatalogCharacteristicFilter = CatalogNumberFilter | CatalogSelectFilter | CatalogBooleanFilter;
type FilterableCharacteristicDataType = Extract<CharacteristicDataType, "boolean" | "number" | "select">;

type FilterDefinition = {
  characteristicId: string;
  dataType: FilterableCharacteristicDataType;
  label: string;
  options: Array<{ id: string; label: string }>;
};

type CatalogFilterData = {
  animalTypes: CatalogSelectOption[];
  characteristics: CatalogCharacteristicFilter[];
  facetAnimals: Array<{
    id: string;
    animalTypeId: string;
    values: Record<
      string,
      {
        optionId?: string | null;
        valueBoolean?: boolean | null;
        valueNumber?: number | null;
      }
    >;
  }>;
};

type CatalogAnimalDetail = {
  availability: string;
  characteristics: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  description: string;
  id: string;
  identifier: string;
  info: Array<{
    label: string;
    value: string;
  }>;
  media: Array<{
    id: string;
    kind: "image" | "video";
    url: string;
    title: string;
  }>;
  name: string;
};

type CatalogParsedCharacteristicToken =
  | {
      kind: "option";
      characteristicId: string;
      value: string;
    }
  | {
      kind: "number_min";
      characteristicId: string;
      value: number;
    }
  | {
      kind: "number_max";
      characteristicId: string;
      value: number;
    }
  | {
      kind: "boolean";
      characteristicId: string;
      value: boolean;
    };

type CatalogDraftCharacteristicToken =
  | {
      kind: "option";
      characteristicId: string;
      value: string;
    }
  | {
      kind: "number_min";
      characteristicId: string;
      value: string;
    }
  | {
      kind: "number_max";
      characteristicId: string;
      value: string;
    }
  | {
      kind: "boolean";
      characteristicId: string;
      value: "true" | "false";
    };

type NumberFilterState = Record<string, { min: string; max: string }>;
type BooleanFilterState = Record<string, "" | "true" | "false">;
type SelectFilterState = Record<string, string>;
type CatalogFacetAnimal = CatalogFilterData["facetAnimals"][number];

type CatalogDraftFilterState = {
  animalTypeId: string;
  booleanFilters: BooleanFilterState;
  numberFilters: NumberFilterState;
  selectFilters: SelectFilterState;
};

type CatalogFacetMatchOverrides = {
  animalTypeId?: string;
  booleanFilter?: {
    characteristicId: string;
    value: "" | "true" | "false";
  };
  numberFilter?: {
    characteristicId: string;
    value: {
      min: string;
      max: string;
    };
  };
  selectFilter?: {
    characteristicId: string;
    value: string;
  };
};

export type {
  BooleanFilterState,
  CatalogAnimalCard,
  CatalogAnimalDetail,
  CatalogBooleanFilter,
  CatalogCarouselEntry,
  CatalogCharacteristicFilter,
  CatalogDraftCharacteristicToken,
  CatalogDraftFilterState,
  CatalogFacetAnimal,
  CatalogFacetMatchOverrides,
  CatalogFilterData,
  CatalogNumberFilter,
  CatalogParsedCharacteristicToken,
  CatalogQuery,
  CatalogSelectFilter,
  CatalogSelectOption,
  FilterableCharacteristicDataType,
  FilterDefinition,
  NumberFilterState,
  SelectFilterState,
};
