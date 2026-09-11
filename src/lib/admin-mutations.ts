import bcrypt from "bcryptjs";
import { CharacteristicDataType, MediaKind } from "@/src/generated/prisma/enums";
import { Prisma } from "@/src/generated/prisma/client";
import { maxAnimalAvailability, minAnimalAvailability, parseAnimalAvailability } from "@/src/lib/animal-availability";
import { parseDateInputValue } from "@/src/lib/date";
import { buildUniqueIdentifier, normalizeIdentifier } from "@/src/lib/identifier";
import { prisma } from "@/src/lib/prisma";
import { deleteStorageObjects } from "@/src/lib/storage";
import type { AnimalCharacteristicAssignmentInput, AnimalCharacteristicMutationInput } from "@/src/types";
import { getAdminClassDefinition } from "./admin-read";
import {
  AdminMutationError,
  getActionPermissionScopes,
  hasPermission,
  normalizePermissionScopes,
  type AdminAction,
  type AdminClassId,
  type AdminSession,
  type MutationResult,
} from "./admin-types";

function getStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalStringValue(value: unknown) {
  const normalized = getStringValue(value);
  return normalized ? normalized : null;
}

function getLowercaseEmail(value: unknown) {
  return getStringValue(value).toLowerCase();
}

function getStringArrayValue(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(item => getStringValue(item)).filter(Boolean))];
}

function getBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true" || value === "on";
  }

  return false;
}

function getObjectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getRequiredString(value: unknown, label: string) {
  const normalized = getStringValue(value);

  if (!normalized) {
    throw new AdminMutationError(`Informe ${label}.`);
  }

  return normalized;
}

function getRequiredIdentifier(value: unknown, fallbackValue: unknown) {
  const normalized = normalizeIdentifier(getStringValue(value) || getStringValue(fallbackValue));

  if (!normalized) {
    throw new AdminMutationError("Informe um identificador valido para o animal.");
  }

  return normalized;
}

async function resolveAnimalIdentifier(value: unknown, fallbackValue: unknown, currentAnimalId?: string) {
  const normalized = getRequiredIdentifier(value, fallbackValue);
  const existingAnimals = await prisma.animal.findMany({
    where: {
      id: currentAnimalId
        ? {
            not: currentAnimalId,
          }
        : undefined,
      OR: [
        {
          identifier: normalized,
        },
        {
          identifier: {
            startsWith: `${normalized}-`,
          },
        },
      ],
    },
    select: {
      identifier: true,
    },
  });

  return buildUniqueIdentifier(
    normalized,
    existingAnimals.map((item) => item.identifier),
  );
}

function getAvailabilityValue(value: unknown) {
  const parsedAvailability = parseAnimalAvailability(value);

  if (parsedAvailability === null) {
    throw new AdminMutationError(`Informe a disponibilidade com um numero inteiro entre ${minAnimalAvailability} e ${maxAnimalAvailability}.`);
  }

  return parsedAvailability;
}

function getDataTypeValue(value: unknown) {
  return Object.values(CharacteristicDataType).includes(value as CharacteristicDataType)
    ? (value as CharacteristicDataType)
    : CharacteristicDataType.text;
}

async function ensureUniqueBirthDateCharacteristic(currentCharacteristicId?: string) {
  const existingCharacteristic = await prisma.characteristic.findFirst({
    where: {
      id: currentCharacteristicId
        ? {
            not: currentCharacteristicId,
          }
        : undefined,
      isBirthDate: true,
    },
    select: {
      id: true,
    },
  });

  if (existingCharacteristic) {
    throw new AdminMutationError("Ja existe uma caracteristica marcada como data de nascimento.");
  }
}

async function getBirthDateValue(dataTypeValue: CharacteristicDataType, inputValue: unknown, currentCharacteristicId?: string) {
  if (dataTypeValue !== CharacteristicDataType.date) {
    return false;
  }

  const isBirthDate = getBooleanValue(inputValue);

  if (isBirthDate) {
    await ensureUniqueBirthDateCharacteristic(currentCharacteristicId);
  }

  return isBirthDate;
}

function getPositiveIntegerValue(value: unknown, label: string) {
  const parsedValue = Number.parseInt(getStringValue(value), 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new AdminMutationError(`Informe ${label} com um numero inteiro maior que zero.`);
  }

  return parsedValue;
}

async function ensureExistingGroups(groupIds: string[]) {
  if (!groupIds.length) {
    return;
  }

  const groups = await prisma.group.findMany({
    where: {
      id: {
        in: groupIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (groups.length !== groupIds.length) {
    throw new AdminMutationError("Um ou mais grupos informados nao existem.");
  }
}

async function ensureExistingRoles(roleIds: string[]) {
  if (!roleIds.length) {
    return;
  }

  const roles = await prisma.role.findMany({
    where: {
      id: {
        in: roleIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (roles.length !== roleIds.length) {
    throw new AdminMutationError("Um ou mais papeis informados nao existem.");
  }
}

async function ensureExistingPermissions(permissionKeys: string[]) {
  if (!permissionKeys.length) {
    return [];
  }

  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        in: permissionKeys,
      },
    },
    select: {
      id: true,
      key: true,
    },
  });

  if (permissions.length !== permissionKeys.length) {
    throw new AdminMutationError("Uma ou mais permissoes informadas nao existem.");
  }

  return permissions;
}

async function ensureAnimalImageBelongsToAnimal(animalId: string, animalMediaId: string) {
  const media = await prisma.animalMedia.findFirst({
    where: {
      animalId,
      id: animalMediaId,
      kind: MediaKind.image,
    },
    select: {
      id: true,
    },
  });

  if (!media) {
    throw new AdminMutationError("Selecione uma imagem valida do animal informado.");
  }

  return media;
}

function getOptionLabels(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  return [...new Set(value.split(/\r?\n/).map(item => item.trim()).filter(Boolean))];
}

function toAdminError(error: unknown) {
  if (error instanceof AdminMutationError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new AdminMutationError("Ja existe um registro com esses dados.", 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004") {
    return new AdminMutationError("As permissoes obrigatorias da classe nao podem ser removidas.", 400);
  }

  if (error instanceof Error) {
    return new AdminMutationError(error.message || "Nao foi possivel concluir a operacao.", 400);
  }

  return new AdminMutationError("Nao foi possivel concluir a operacao.", 400);
}

async function parseAnimalTypeAssignments(value: unknown) {
  if (!Array.isArray(value)) {
    throw new AdminMutationError("Informe as caracteristicas do tipo de animal.");
  }

  const assignments = value
    .map(item => {
      const entry = getObjectValue(item);

      if (!entry) {
        return null;
      }

      const characteristicId = getStringValue(entry.characteristicId);

      if (!characteristicId || !getBooleanValue(entry.selected)) {
        return null;
      }

      return {
        characteristicId,
        dataType: getDataTypeValue(entry.dataType),
        displayOrder: Number.parseInt(getStringValue(entry.displayOrder), 10),
        required: getBooleanValue(entry.required),
        showInCard: getBooleanValue(entry.showInCard),
        selected: true,
      };
    })
    .filter((item): item is AnimalCharacteristicAssignmentInput => Boolean(item));

  if (!assignments.length) {
    throw new AdminMutationError("Selecione ao menos uma caracteristica.");
  }

  const uniqueAssignments = [...new Map(assignments.map(item => [item.characteristicId, item])).values()];
  const characteristics = await prisma.characteristic.findMany({
    where: {
      id: {
        in: uniqueAssignments.map(item => item.characteristicId),
      },
    },
    select: {
      dataType: true,
      id: true,
    },
  });

  if (characteristics.length !== uniqueAssignments.length) {
    throw new AdminMutationError("Uma ou mais caracteristicas informadas nao existem.");
  }

  const characteristicMap = new Map(characteristics.map(item => [item.id, item]));

  return uniqueAssignments.map(item => {
    if (!Number.isInteger(item.displayOrder) || item.displayOrder <= 0) {
      throw new AdminMutationError(`Defina uma ordem valida para a caracteristica ${item.characteristicId}.`);
    }

    const characteristic = characteristicMap.get(item.characteristicId);

    if (!characteristic) {
      throw new AdminMutationError("Caracteristica invalida.");
    }

    return {
      ...item,
      dataType: characteristic.dataType,
    };
  });
}

async function buildAnimalCharacteristicMutations(
  animalTypeId: string,
  characteristicValuesInput: unknown,
): Promise<AnimalCharacteristicMutationInput[]> {
  const characteristicValues = getObjectValue(characteristicValuesInput) ?? {};
  const animalType = await prisma.animalType.findUnique({
    where: {
      id: animalTypeId,
    },
    select: {
      characteristics: {
        orderBy: {
          displayOrder: "asc",
        },
        select: {
          characteristicId: true,
          dataType: true,
          required: true,
          characteristic: {
            select: {
              dataType: true,
              label: true,
              options: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!animalType) {
    throw new AdminMutationError("O tipo de animal informado nao existe.");
  }

  const mutations: AnimalCharacteristicMutationInput[] = [];

  for (const item of animalType.characteristics) {
    const rawValue = getObjectValue(characteristicValues[item.characteristicId]) ?? {};
    const label = item.characteristic.label;

    switch (item.characteristic.dataType) {
      case CharacteristicDataType.text: {
        const text = getStringValue(rawValue.text);

        if (item.required && !text) {
          throw new AdminMutationError(`Informe ${label}.`);
        }

        if (text) {
          mutations.push({ characteristicId: item.characteristicId, valueText: text });
        }

        break;
      }
      case CharacteristicDataType.number: {
        const numberValue = getStringValue(rawValue.number);

        if (item.required && !numberValue) {
          throw new AdminMutationError(`Informe ${label}.`);
        }

        if (!numberValue) {
          break;
        }

        const parsedNumber = Number(numberValue);

        if (Number.isNaN(parsedNumber)) {
          throw new AdminMutationError(`Informe um numero valido para ${label}.`);
        }

        mutations.push({ characteristicId: item.characteristicId, valueNumber: parsedNumber });
        break;
      }
      case CharacteristicDataType.date: {
        const dateValue = getStringValue(rawValue.date);

        if (item.required && !dateValue) {
          throw new AdminMutationError(`Informe ${label}.`);
        }

        if (!dateValue) {
          break;
        }

        const parsedDate = parseDateInputValue(dateValue);

        if (!parsedDate) {
          throw new AdminMutationError(`Informe uma data valida para ${label}.`);
        }

        mutations.push({ characteristicId: item.characteristicId, valueDate: parsedDate });
        break;
      }
      case CharacteristicDataType.boolean:
        mutations.push({ characteristicId: item.characteristicId, valueBoolean: getBooleanValue(rawValue.boolean) });
        break;
      case CharacteristicDataType.select: {
        const optionId = getStringValue(rawValue.optionId);

        if (item.required && !optionId) {
          throw new AdminMutationError(`Selecione ${label}.`);
        }

        if (!optionId) {
          break;
        }

        const validOptionIds = item.characteristic.options.map(option => option.id);

        if (!validOptionIds.includes(optionId)) {
          throw new AdminMutationError(`A opcao selecionada para ${label} nao e valida.`);
        }

        mutations.push({ characteristicId: item.characteristicId, optionId });
        break;
      }
    }
  }

  return mutations;
}

export async function assertAdminPermission(classId: AdminClassId, permissions: string[], action: AdminAction) {
  const definition = await getAdminClassDefinition(classId);

  if (!definition) {
    throw new AdminMutationError("Classe administrativa invalida.", 404);
  }

  if (!hasPermission(permissions, definition.identifier, getActionPermissionScopes(definition, action))) {
    throw new AdminMutationError("Voce nao tem permissao para essa acao.", 403);
  }

  return definition;
}

export async function createObjectByClass(classId: AdminClassId, payload: unknown): Promise<MutationResult> {
  try {
    const body = getObjectValue(payload);

    if (!body) {
      throw new AdminMutationError("Dados invalidos para criacao.");
    }

    switch (classId) {
      case "adminClasses":
        throw new AdminMutationError("Nao e permitido criar classes administrativas.", 405);
      case "users": {
        const groupIds = getStringArrayValue(body.groupIds);
        await ensureExistingGroups(groupIds);
        const passwordHash = await bcrypt.hash(getRequiredString(body.password, "a senha"), 10);
        const user = await prisma.user.create({
          data: {
            email: getRequiredString(getLowercaseEmail(body.email), "o email"),
            name: getOptionalStringValue(body.name),
            password: passwordHash,
            userGroups: groupIds.length ? { create: groupIds.map(groupId => ({ groupId })) } : undefined,
          },
          select: {
            id: true,
          },
        });

        return { id: user.id };
      }
      case "groups": {
        const roleIds = getStringArrayValue(body.roleIds);
        await ensureExistingRoles(roleIds);
        const group = await prisma.group.create({
          data: {
            identifier: getRequiredString(body.identifier, "o identificador do grupo"),
            name: getRequiredString(body.name, "o nome do grupo"),
            groupRoles: roleIds.length ? { create: roleIds.map(roleId => ({ roleId })) } : undefined,
          },
          select: {
            id: true,
          },
        });

        return { id: group.id };
      }
      case "roles": {
        const permissions = await ensureExistingPermissions(getStringArrayValue(body.permissionKeys));
        const role = await prisma.role.create({
          data: {
            name: getRequiredString(body.name, "o nome do papel"),
            rolePermissions: permissions.length
              ? { create: permissions.map(permission => ({ permissionId: permission.id })) }
              : undefined,
          },
          select: {
            id: true,
          },
        });

        return { id: role.id };
      }
      case "characteristics": {
        const optionLabels = getOptionLabels(body.optionsText);
        const dataType = getDataTypeValue(body.dataType);
        const characteristic = await prisma.characteristic.create({
          data: {
            dataType,
            isBirthDate: await getBirthDateValue(dataType, body.isBirthDate),
            isFilterable: getBooleanValue(body.isFilterable),
            key: getRequiredString(body.key, "a chave da caracteristica"),
            label: getRequiredString(body.label, "o rotulo da caracteristica"),
            options: optionLabels.length
              ? {
                  create: optionLabels.map((label, index) => ({
                    displayOrder: index + 1,
                    label,
                    value: label.toLowerCase().replaceAll(" ", "_"),
                  })),
                }
              : undefined,
          },
          select: {
            id: true,
          },
        });

        return { id: characteristic.id };
      }
      case "animalTypes": {
        const assignments = await parseAnimalTypeAssignments(body.characteristics);
        const animalType = await prisma.animalType.create({
          data: {
            name: getRequiredString(body.name, "o nome do tipo de animal"),
            characteristics: {
              create: assignments.map(item => ({
                characteristicId: item.characteristicId,
                dataType: item.dataType,
                displayOrder: item.displayOrder,
                required: item.required,
                showInCard: item.showInCard,
              })),
            },
          },
          select: {
            id: true,
          },
        });

        return { id: animalType.id };
      }
      case "animals": {
        const animalTypeId = getRequiredString(body.animalTypeId, "o tipo do animal");
        const identifier = await resolveAnimalIdentifier(body.identifier, body.name);
        const characteristicMutations = await buildAnimalCharacteristicMutations(
          animalTypeId,
          body.characteristicValues,
        );
        const animal = await prisma.animal.create({
          data: {
            animalTypeId,
            availability: getAvailabilityValue(body.availability),
            characteristicValues: characteristicMutations.length ? { create: characteristicMutations } : undefined,
            description: getOptionalStringValue(body.description),
            identifier,
            name: getRequiredString(body.name, "o nome do animal"),
          },
          select: {
            id: true,
          },
        });

        return { id: animal.id };
      }
      case "carouselEntries": {
        const animalId = getRequiredString(body.animalId, "o animal");
        const animalMediaId = getRequiredString(body.animalMediaId, "a imagem de destaque");
        await ensureAnimalImageBelongsToAnimal(animalId, animalMediaId);
        const entry = await prisma.carouselEntry.create({
          data: {
            animalMediaId,
            description: getOptionalStringValue(body.description),
            displayOrder: getPositiveIntegerValue(body.displayOrder, "a ordem de exibicao"),
          },
          select: {
            id: true,
          },
        });

        return { id: entry.id };
      }
    }
  } catch (error) {
    throw toAdminError(error);
  }
}

export async function updateObjectByClass(
  classId: AdminClassId,
  objectId: string,
  payload: unknown,
): Promise<MutationResult> {
  try {
    const body = getObjectValue(payload);

    if (!body) {
      throw new AdminMutationError("Dados invalidos para atualizacao.");
    }

    switch (classId) {
      case "adminClasses": {
        const currentAdminClass = await prisma.adminClass.findUnique({
          where: {
            id: objectId,
          },
          select: {
            identifier: true,
          },
        });

        if (!currentAdminClass) {
          throw new AdminMutationError("Classe administrativa nao encontrada.", 404);
        }

        const nextIdentifier = getRequiredString(body.identifier, "o identificador da classe");

        if (nextIdentifier !== currentAdminClass.identifier) {
          throw new AdminMutationError("O identificador da classe administrativa nao pode ser alterado.");
        }

        await prisma.adminClass.update({
          where: {
            id: objectId,
          },
          data: {
            allowCreate:
              currentAdminClass.identifier === "adminClasses" ? false : getBooleanValue(body.allowCreate),
            allowDelete:
              currentAdminClass.identifier === "adminClasses" ? false : getBooleanValue(body.allowDelete),
            createPermissions: normalizePermissionScopes(getStringArrayValue(body.createPermissions), "create"),
            deletePermissions: normalizePermissionScopes(getStringArrayValue(body.deletePermissions), "delete"),
            description: getRequiredString(body.description, "a descricao da classe"),
            label: getRequiredString(body.label, "o rotulo da classe"),
            readPermissions: normalizePermissionScopes(getStringArrayValue(body.readPermissions), "read"),
            updatePermissions: normalizePermissionScopes(getStringArrayValue(body.updatePermissions), "update"),
          },
        });

        return { id: objectId };
      }
      case "users": {
        const groupIds = getStringArrayValue(body.groupIds);
        await ensureExistingGroups(groupIds);

        await prisma.$transaction(async transaction => {
          await transaction.user.update({
            where: {
              id: objectId,
            },
            data: {
              email: getRequiredString(getLowercaseEmail(body.email), "o email"),
              name: getOptionalStringValue(body.name),
              password: getStringValue(body.password) ? await bcrypt.hash(getStringValue(body.password), 10) : undefined,
            },
          });
          await transaction.userGroup.deleteMany({
            where: {
              userId: objectId,
            },
          });

          if (groupIds.length) {
            await transaction.userGroup.createMany({
              data: groupIds.map(groupId => ({
                groupId,
                userId: objectId,
              })),
            });
          }
        });

        return { id: objectId };
      }
      case "groups": {
        const roleIds = getStringArrayValue(body.roleIds);
        await ensureExistingRoles(roleIds);

        await prisma.$transaction(async transaction => {
          await transaction.group.update({
            where: {
              id: objectId,
            },
            data: {
              identifier: getRequiredString(body.identifier, "o identificador do grupo"),
              name: getRequiredString(body.name, "o nome do grupo"),
            },
          });
          await transaction.groupRole.deleteMany({
            where: {
              groupId: objectId,
            },
          });

          if (roleIds.length) {
            await transaction.groupRole.createMany({
              data: roleIds.map(roleId => ({
                groupId: objectId,
                roleId,
              })),
            });
          }
        });

        return { id: objectId };
      }
      case "roles": {
        const permissions = await ensureExistingPermissions(getStringArrayValue(body.permissionKeys));

        await prisma.$transaction(async transaction => {
          await transaction.role.update({
            where: {
              id: objectId,
            },
            data: {
              name: getRequiredString(body.name, "o nome do papel"),
            },
          });
          await transaction.rolePermission.deleteMany({
            where: {
              roleId: objectId,
            },
          });

          if (permissions.length) {
            await transaction.rolePermission.createMany({
              data: permissions.map(permission => ({
                permissionId: permission.id,
                roleId: objectId,
              })),
            });
          }
        });

        return { id: objectId };
      }
      case "characteristics": {
        const optionLabels = getOptionLabels(body.optionsText);
        const dataType = getDataTypeValue(body.dataType);

        await prisma.$transaction(async transaction => {
          await transaction.characteristic.update({
            where: {
              id: objectId,
            },
            data: {
              dataType,
              isBirthDate: await getBirthDateValue(dataType, body.isBirthDate, objectId),
              isFilterable: getBooleanValue(body.isFilterable),
              key: getRequiredString(body.key, "a chave da caracteristica"),
              label: getRequiredString(body.label, "o rotulo da caracteristica"),
            },
          });
          await transaction.animalTypeCharacteristic.updateMany({
            where: {
              characteristicId: objectId,
            },
            data: {
              dataType,
            },
          });
          await transaction.animalCharacteristicValue.deleteMany({
            where: {
              characteristicId: objectId,
            },
          });
          await transaction.characteristicOption.deleteMany({
            where: {
              characteristicId: objectId,
            },
          });

          if (optionLabels.length) {
            await transaction.characteristicOption.createMany({
              data: optionLabels.map((label, index) => ({
                characteristicId: objectId,
                displayOrder: index + 1,
                label,
                value: label.toLowerCase().replaceAll(" ", "_"),
              })),
            });
          }
        });

        return { id: objectId };
      }
      case "carouselEntries": {
        const animalId = getRequiredString(body.animalId, "o animal");
        const animalMediaId = getRequiredString(body.animalMediaId, "a imagem de destaque");
        await ensureAnimalImageBelongsToAnimal(animalId, animalMediaId);

        await prisma.carouselEntry.update({
          where: {
            id: objectId,
          },
          data: {
            animalMediaId,
            description: getOptionalStringValue(body.description),
            displayOrder: getPositiveIntegerValue(body.displayOrder, "a ordem de exibicao"),
          },
        });

        return { id: objectId };
      }
      case "animalTypes": {
        const assignments = await parseAnimalTypeAssignments(body.characteristics);
        const currentAnimalType = await prisma.animalType.findUnique({
          where: {
            id: objectId,
          },
          select: {
            characteristics: {
              select: {
                characteristicId: true,
              },
            },
          },
        });

        if (!currentAnimalType) {
          throw new AdminMutationError("O tipo de animal selecionado nao foi encontrado.", 404);
        }

        const removedCharacteristicIds = currentAnimalType.characteristics
          .map(item => item.characteristicId)
          .filter(id => !assignments.some(assignment => assignment.characteristicId === id));

        await prisma.$transaction(async transaction => {
          if (removedCharacteristicIds.length) {
            const animals = await transaction.animal.findMany({
              where: {
                animalTypeId: objectId,
              },
              select: {
                id: true,
              },
            });

            if (animals.length) {
              await transaction.animalCharacteristicValue.deleteMany({
                where: {
                  animalId: {
                    in: animals.map(item => item.id),
                  },
                  characteristicId: {
                    in: removedCharacteristicIds,
                  },
                },
              });
            }
          }

          await transaction.animalType.update({
            where: {
              id: objectId,
            },
            data: {
              name: getRequiredString(body.name, "o nome do tipo de animal"),
            },
          });
          await transaction.animalTypeCharacteristic.deleteMany({
            where: {
              animalTypeId: objectId,
            },
          });
          await transaction.animalTypeCharacteristic.createMany({
            data: assignments.map(item => ({
              animalTypeId: objectId,
              characteristicId: item.characteristicId,
              dataType: item.dataType,
              displayOrder: item.displayOrder,
              required: item.required,
              showInCard: item.showInCard,
            })),
          });
        });

        return { id: objectId };
      }
      case "animals": {
        const animalTypeId = getRequiredString(body.animalTypeId, "o tipo do animal");
        const identifier = await resolveAnimalIdentifier(body.identifier, body.name, objectId);
        const characteristicMutations = await buildAnimalCharacteristicMutations(
          animalTypeId,
          body.characteristicValues,
        );

        await prisma.$transaction(async transaction => {
          await transaction.animal.update({
            where: {
              id: objectId,
            },
            data: {
              animalTypeId,
              availability: getAvailabilityValue(body.availability),
              description: getOptionalStringValue(body.description),
              identifier,
              name: getRequiredString(body.name, "o nome do animal"),
            },
          });
          await transaction.animalCharacteristicValue.deleteMany({
            where: {
              animalId: objectId,
            },
          });

          if (characteristicMutations.length) {
            await transaction.animalCharacteristicValue.createMany({
              data: characteristicMutations.map(item => ({
                animalId: objectId,
                characteristicId: item.characteristicId,
                optionId: "optionId" in item ? item.optionId : undefined,
                valueBoolean: "valueBoolean" in item ? item.valueBoolean : undefined,
                valueDate: "valueDate" in item ? item.valueDate : undefined,
                valueNumber: "valueNumber" in item ? item.valueNumber : undefined,
                valueText: "valueText" in item ? item.valueText : undefined,
              })),
            });
          }
        });

        return { id: objectId };
      }
    }
  } catch (error) {
    throw toAdminError(error);
  }
}

export async function deleteObjectByClass(classId: AdminClassId, objectId: string, session: AdminSession) {
  try {
    switch (classId) {
      case "adminClasses":
        throw new AdminMutationError("Nao e permitido excluir classes administrativas.", 405);
      case "users": {
        if (session.userId === objectId) {
          throw new AdminMutationError("Nao e permitido excluir o proprio usuario logado.");
        }

        await prisma.$transaction(async transaction => {
          await transaction.userGroup.deleteMany({
            where: {
              userId: objectId,
            },
          });
          await transaction.user.delete({
            where: {
              id: objectId,
            },
          });
        });

        return;
      }
      case "groups": {
        await prisma.$transaction(async transaction => {
          await transaction.userGroup.deleteMany({
            where: {
              groupId: objectId,
            },
          });
          await transaction.groupRole.deleteMany({
            where: {
              groupId: objectId,
            },
          });
          await transaction.group.delete({
            where: {
              id: objectId,
            },
          });
        });

        return;
      }
      case "roles": {
        await prisma.$transaction(async transaction => {
          await transaction.groupRole.deleteMany({
            where: {
              roleId: objectId,
            },
          });
          await transaction.rolePermission.deleteMany({
            where: {
              roleId: objectId,
            },
          });
          await transaction.role.delete({
            where: {
              id: objectId,
            },
          });
        });

        return;
      }
      case "characteristics": {
        await prisma.$transaction(async transaction => {
          await transaction.animalCharacteristicValue.deleteMany({
            where: {
              characteristicId: objectId,
            },
          });
          await transaction.animalTypeCharacteristic.deleteMany({
            where: {
              characteristicId: objectId,
            },
          });
          await transaction.characteristicOption.deleteMany({
            where: {
              characteristicId: objectId,
            },
          });
          await transaction.characteristic.delete({
            where: {
              id: objectId,
            },
          });
        });

        return;
      }
      case "animalTypes": {
        const animalType = await prisma.animalType.findUnique({
          where: {
            id: objectId,
          },
          select: {
            animals: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!animalType) {
          throw new AdminMutationError("O tipo de animal selecionado nao foi encontrado.", 404);
        }

        if (animalType.animals.length) {
          throw new AdminMutationError("Exclua os animais desse tipo antes de remover a estrutura.");
        }

        await prisma.$transaction(async transaction => {
          await transaction.animalTypeCharacteristic.deleteMany({
            where: {
              animalTypeId: objectId,
            },
          });
          await transaction.animalType.delete({
            where: {
              id: objectId,
            },
          });
        });

        return;
      }
      case "animals": {
        const media = await prisma.animalMedia.findMany({
          where: {
            animalId: objectId,
          },
          select: {
            storageKey: true,
          },
        });

        await deleteStorageObjects(media.map(item => item.storageKey));

        await prisma.$transaction(async transaction => {
          await transaction.animalMedia.deleteMany({
            where: {
              animalId: objectId,
            },
          });
          await transaction.animalCharacteristicValue.deleteMany({
            where: {
              animalId: objectId,
            },
          });
          await transaction.animal.delete({
            where: {
              id: objectId,
            },
          });
        });
        return;
      }
      case "carouselEntries": {
        await prisma.carouselEntry.delete({
          where: {
            id: objectId,
          },
        });
        return;
      }
    }
  } catch (error) {
    throw toAdminError(error);
  }
}

export { toAdminError };
