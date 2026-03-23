import { Availability, CharacteristicDataType, MediaKind } from "@/src/generated/prisma/enums";
import type { Prisma } from "@/src/generated/prisma/client";
import { formatAgeFromBirthDate, formatDateOnly } from "@/src/lib/date";
import { prisma } from "@/src/lib/prisma";
import { getPublicMediaUrl } from "@/src/lib/storage";
import type {
  CatalogAnimalCard,
  CatalogAnimalDetail,
  CatalogCarouselEntry,
  CatalogCharacteristicFilter,
  CatalogFilterData,
  CatalogParsedCharacteristicToken,
  CatalogQuery,
  FilterDefinition,
  FilterableCharacteristicDataType,
} from "@/src/types";

const birthDateCharacteristicKey = "birthDate";

function getCharacteristicValue(value: {
  option: { label: string; value: string } | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
  valueNumber: number | null;
  valueText: string | null;
}) {
  if (value.option) {
    return value.option.label;
  }

  if (value.valueText) {
    return value.valueText;
  }

  if (value.valueNumber !== null) {
    return value.valueNumber.toString();
  }

  if (value.valueDate) {
    return formatDateOnly(value.valueDate);
  }

  if (value.valueBoolean !== null) {
    return value.valueBoolean ? "Sim" : "Nao";
  }

  return "Nao informado";
}

function getPublicCharacteristicPresentation(
  characteristic: {
    key: string;
    label: string;
  },
  value: {
    option: { label: string; value: string } | null;
    valueBoolean: boolean | null;
    valueDate: Date | null;
    valueNumber: number | null;
    valueText: string | null;
  },
) {
  if (characteristic.key === birthDateCharacteristicKey && value.valueDate) {
    return {
      label: "Idade",
      value: formatAgeFromBirthDate(value.valueDate),
    };
  }

  return {
    label: characteristic.label,
    value: getCharacteristicValue(value),
  };
}

function parseCharacteristicToken(token: string): CatalogParsedCharacteristicToken | null {
  const [kind, characteristicId, ...rest] = token.split("|");
  const rawValue = decodeURIComponent(rest.join("|"));

  if (!kind || !characteristicId) {
    return null;
  }

  switch (kind) {
    case "option":
      return rawValue ? { characteristicId, kind, value: rawValue } : null;
    case "number_min": {
      const parsedValue = Number(rawValue);
      return Number.isNaN(parsedValue) ? null : { characteristicId, kind, value: parsedValue };
    }
    case "number_max": {
      const parsedValue = Number(rawValue);
      return Number.isNaN(parsedValue) ? null : { characteristicId, kind, value: parsedValue };
    }
    case "boolean":
      return rawValue === "true" || rawValue === "false"
        ? { characteristicId, kind, value: rawValue === "true" }
        : null;
    default:
      return null;
  }
}

function buildCatalogWhere(query: CatalogQuery): Prisma.AnimalWhereInput {
  const search = query.search?.trim();
  const animalTypeIds = [...new Set((query.animalTypeIds ?? []).filter(Boolean))];
  const tokens = [
    ...new Set(
      (query.characteristicTokens ?? [])
        .map(parseCharacteristicToken)
        .filter((token): token is CatalogParsedCharacteristicToken => Boolean(token)),
    ),
  ];
  const conditions: Prisma.AnimalWhereInput[] = [{ availability: Availability.available }];

  if (search) {
    conditions.push({
      OR: [
        {
          identifier: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          animalType: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          characteristicValues: {
            some: {
              OR: [
                {
                  characteristic: {
                    label: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  option: {
                    label: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  valueText: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  if (animalTypeIds.length) {
    conditions.push({
      animalTypeId: {
        in: animalTypeIds,
      },
    });
  }

  const groupedTokens = new Map<string, CatalogParsedCharacteristicToken[]>();

  for (const token of tokens) {
    const current = groupedTokens.get(token.characteristicId) ?? [];
    current.push(token);
    groupedTokens.set(token.characteristicId, current);
  }

  for (const [characteristicId, groupTokens] of groupedTokens.entries()) {
    const optionIds = groupTokens.filter(token => token.kind === "option").map(token => token.value);
    const minValues = groupTokens.filter(token => token.kind === "number_min").map(token => token.value);
    const maxValues = groupTokens.filter(token => token.kind === "number_max").map(token => token.value);
    const booleanValues = [...new Set(groupTokens.filter(token => token.kind === "boolean").map(token => token.value))];
    const valueConditions: Prisma.AnimalCharacteristicValueWhereInput[] = [{ characteristicId }];

    if (optionIds.length) {
      valueConditions.push({
        optionId: {
          in: optionIds,
        },
      });
    }

    if (minValues.length || maxValues.length) {
      const numberFilter: Prisma.FloatNullableFilter<"AnimalCharacteristicValue"> = {};

      if (minValues.length) {
        numberFilter.gte = Math.max(...minValues);
      }

      if (maxValues.length) {
        numberFilter.lte = Math.min(...maxValues);
      }

      valueConditions.push({
        valueNumber: numberFilter,
      });
    }

    if (booleanValues.length === 1) {
      valueConditions.push({
        valueBoolean: booleanValues[0],
      });
    }

    if (valueConditions.length > 1) {
      conditions.push({
        characteristicValues: {
          some: {
            AND: valueConditions,
          },
        },
      });
    }
  }

  return {
    AND: conditions,
  };
}

export async function getCatalogAnimals(query: CatalogQuery = {}): Promise<CatalogAnimalCard[]> {
  const animals = await prisma.animal.findMany({
    where: buildCatalogWhere(query),
    orderBy: {
      name: "asc",
    },
    select: {
      animalType: {
        select: {
          characteristics: {
            where: {
              showInCard: true,
            },
            orderBy: {
              displayOrder: "asc",
            },
            select: {
              characteristicId: true,
              characteristic: {
                select: {
                  key: true,
                  label: true,
                },
              },
            },
          },
          name: true,
        },
      },
      characteristicValues: {
        select: {
          characteristicId: true,
          option: {
            select: {
              label: true,
              value: true,
            },
          },
          valueBoolean: true,
          valueDate: true,
          valueNumber: true,
          valueText: true,
        },
      },
      id: true,
      identifier: true,
      media: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          kind: true,
          storageKey: true,
        },
      },
      name: true,
    },
  });

  return animals.map(animal => {
    const characteristicValueMap = new Map(animal.characteristicValues.map(item => [item.characteristicId, item]));

    return {
      badge: animal.animalType.name,
      highlights: animal.animalType.characteristics
        .map(item => {
          const rawValue = characteristicValueMap.get(item.characteristicId);

          if (!rawValue) {
            return null;
          }

          const presentation = getPublicCharacteristicPresentation(item.characteristic, rawValue);

          if (!presentation.value || presentation.value === "Nao informado") {
            return null;
          }

          return {
            label: presentation.label,
            value: presentation.value,
          };
        })
        .filter(
          (
            item,
          ): item is {
            label: string;
            value: string;
          } => Boolean(item),
        ),
      id: animal.id,
      identifier: animal.identifier,
      name: animal.name,
      previewImageUrl: getPublicMediaUrl(
        animal.media.find(item => item.kind === MediaKind.image)?.storageKey ?? animal.media[0]?.storageKey ?? "",
      ),
    };
  });
}

export async function getCatalogFilters(query: Pick<CatalogQuery, "search"> = {}): Promise<CatalogFilterData> {
  const [animals, characteristics] = await Promise.all([
    prisma.animal.findMany({
      where: buildCatalogWhere({
        search: query.search,
      }),
      select: {
        animalType: {
          select: {
            id: true,
            name: true,
          },
        },
        characteristicValues: {
          select: {
            characteristicId: true,
            optionId: true,
            valueBoolean: true,
            valueNumber: true,
          },
        },
        id: true,
      },
    }),
    prisma.characteristic.findMany({
      where: {
        isFilterable: true,
      },
      orderBy: {
        label: "asc",
      },
      select: {
        dataType: true,
        id: true,
        label: true,
        options: {
          orderBy: {
            displayOrder: "asc",
          },
          select: {
            id: true,
            label: true,
          },
        },
      },
    }),
  ]);

  const animalTypeMap = new Map<string, { id: string; label: string; count: number }>();

  for (const animal of animals) {
    const currentAnimalType = animalTypeMap.get(animal.animalType.id) ?? {
      count: 0,
      id: animal.animalType.id,
      label: animal.animalType.name,
    };
    currentAnimalType.count += 1;
    animalTypeMap.set(animal.animalType.id, currentAnimalType);
  }

  const filterDefinitions = characteristics
    .map(characteristic => {
      if (characteristic.dataType === CharacteristicDataType.text) {
        return null;
      }

      return {
        characteristicId: characteristic.id,
        dataType: characteristic.dataType as FilterableCharacteristicDataType,
        label: characteristic.label,
        options: characteristic.options,
      };
    })
    .filter((definition): definition is FilterDefinition => Boolean(definition));

  const definitionMap = new Map(
    filterDefinitions.map(definition => [
      definition.characteristicId,
      {
        dataType: definition.dataType,
        label: definition.label,
        options: definition.options,
      },
    ]),
  );
  const aggregations = new Map<
    string,
    | {
        dataType: "select";
        label: string;
        optionCounts: Map<string, number>;
        options: Array<{ id: string; label: string }>;
      }
    | {
        dataType: "boolean";
        label: string;
        trueCount: number;
        falseCount: number;
      }
    | {
        dataType: "number";
        label: string;
        minValue: number | null;
        maxValue: number | null;
      }
  >();

  for (const definition of filterDefinitions) {
    switch (definition.dataType) {
      case CharacteristicDataType.select:
        aggregations.set(definition.characteristicId, {
          dataType: "select",
          label: definition.label,
          optionCounts: new Map<string, number>(),
          options: definition.options,
        });
        break;
      case CharacteristicDataType.boolean:
        aggregations.set(definition.characteristicId, {
          dataType: "boolean",
          falseCount: 0,
          label: definition.label,
          trueCount: 0,
        });
        break;
      case CharacteristicDataType.number:
        aggregations.set(definition.characteristicId, {
          dataType: "number",
          label: definition.label,
          maxValue: null,
          minValue: null,
        });
        break;
      default:
        break;
    }
  }

  for (const animal of animals) {
    for (const value of animal.characteristicValues) {
      const definition = definitionMap.get(value.characteristicId);
      const aggregation = aggregations.get(value.characteristicId);

      if (!definition || !aggregation) {
        continue;
      }

      switch (definition.dataType) {
        case CharacteristicDataType.select:
          if (value.optionId && aggregation.dataType === "select") {
            aggregation.optionCounts.set(value.optionId, (aggregation.optionCounts.get(value.optionId) ?? 0) + 1);
          }
          break;
        case CharacteristicDataType.boolean:
          if (value.valueBoolean !== null && aggregation.dataType === "boolean") {
            if (value.valueBoolean) {
              aggregation.trueCount += 1;
            } else {
              aggregation.falseCount += 1;
            }
          }
          break;
        case CharacteristicDataType.number:
          if (value.valueNumber !== null && aggregation.dataType === "number") {
            aggregation.minValue =
              aggregation.minValue === null ? value.valueNumber : Math.min(aggregation.minValue, value.valueNumber);
            aggregation.maxValue =
              aggregation.maxValue === null ? value.valueNumber : Math.max(aggregation.maxValue, value.valueNumber);
          }
          break;
        default:
          break;
      }
    }
  }

  const characteristicFilters = [...aggregations.entries()]
    .map(([characteristicId, aggregation]) => {
      if (aggregation.dataType === "select") {
        return {
          characteristicId,
          dataType: "select" as const,
          label: aggregation.label,
          options: aggregation.options.map(option => ({
            count: aggregation.optionCounts.get(option.id) ?? 0,
            id: option.id,
            label: option.label,
          })),
        };
      }

      if (aggregation.dataType === "boolean") {
        if (!aggregation.trueCount && !aggregation.falseCount) {
          return null;
        }

        return {
          characteristicId,
          dataType: "boolean" as const,
          falseCount: aggregation.falseCount,
          label: aggregation.label,
          trueCount: aggregation.trueCount,
        };
      }

      if (aggregation.minValue === null || aggregation.maxValue === null) {
        return null;
      }

      return {
        characteristicId,
        dataType: "number" as const,
        label: aggregation.label,
        maxValue: aggregation.maxValue,
        minValue: aggregation.minValue,
      };
    })
    .filter((item): item is CatalogCharacteristicFilter => Boolean(item))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return {
    animalTypes: [...animalTypeMap.values()].sort((left, right) => left.label.localeCompare(right.label, "pt-BR")),
    characteristics: characteristicFilters,
    facetAnimals: animals.map(animal => ({
      animalTypeId: animal.animalType.id,
      id: animal.id,
      values: Object.fromEntries(
        animal.characteristicValues.map(item => [
          item.characteristicId,
          {
            optionId: item.optionId,
            valueBoolean: item.valueBoolean,
            valueNumber: item.valueNumber,
          },
        ]),
      ),
    })),
  };
}

export async function getFeaturedCatalogAnimals(): Promise<CatalogCarouselEntry[]> {
  const entries = await prisma.carouselEntry.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      description: true,
      id: true,
      animalMedia: {
        select: {
          kind: true,
          storageKey: true,
          animal: {
            select: {
              availability: true,
              description: true,
              identifier: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return entries
    .filter(entry => entry.animalMedia.kind === MediaKind.image && entry.animalMedia.animal.availability === Availability.available)
    .map(entry => ({
      description: entry.description ?? entry.animalMedia.animal.description ?? "Animal em destaque no catalogo.",
      href: `/animal/${entry.animalMedia.animal.identifier}`,
      id: entry.id,
      kind: "image" as const,
      title: entry.animalMedia.animal.name,
      url: getPublicMediaUrl(entry.animalMedia.storageKey),
    }));
}

export async function getCatalogAnimalByIdentifier(identifier: string): Promise<CatalogAnimalDetail | null> {
  const animal = await prisma.animal.findUnique({
    where: { identifier },
    select: {
      animalType: {
        select: {
          name: true,
        },
      },
      availability: true,
      characteristicValues: {
        select: {
          characteristic: {
            select: {
              key: true,
              label: true,
            },
          },
          option: {
            select: {
              label: true,
              value: true,
            },
          },
          valueBoolean: true,
          valueDate: true,
          valueNumber: true,
          valueText: true,
        },
      },
      description: true,
      id: true,
      identifier: true,
      media: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          kind: true,
          storageKey: true,
        },
      },
      name: true,
    },
  });

  if (!animal) {
    return null;
  }

  const characteristics = animal.characteristicValues
    .map(item => {
      const presentation = getPublicCharacteristicPresentation(item.characteristic, item);

      return {
        key: item.characteristic.key,
        label: presentation.label,
        value: presentation.value,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return {
    availability: animal.availability === Availability.available ? "Disponivel" : "Indisponivel",
    characteristics,
    description: animal.description ?? "Sem descricao cadastrada.",
    id: animal.id,
    identifier: animal.identifier,
    info: [
      {
        label: "Identificador",
        value: animal.identifier,
      },
      {
        label: "Tipo",
        value: animal.animalType.name,
      },
      {
        label: "Disponibilidade",
        value: animal.availability === Availability.available ? "Disponivel" : "Indisponivel",
      },
    ],
    media: animal.media.map(item => ({
      id: item.id,
      kind: item.kind === MediaKind.video ? "video" : "image",
      title: animal.name,
      url: getPublicMediaUrl(item.storageKey),
    })),
    name: animal.name,
  };
}
