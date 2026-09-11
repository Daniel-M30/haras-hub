import { cookies } from "next/headers";
import { CharacteristicDataType, MediaKind } from "@/src/generated/prisma/enums";
import { defaultAnimalAvailability, formatAnimalAvailability } from "@/src/lib/animal-availability";
import { AUTH_TOKEN_COOKIE_NAME, verifyAuthToken } from "@/src/lib/auth";
import { formatDateInputValue, formatDateOnly, formatDetailedAgeFromBirthDate } from "@/src/lib/date";
import { prisma } from "@/src/lib/prisma";
import { getPublicMediaUrl } from "@/src/lib/storage";
import type { DetailView, ObjectsType } from "@/src/types";
import type { AdminClassDefinition, AdminPermissionScope } from "@/src/types/admin";
import {
  dataTypeOptions,
  getActionPermissionScopes,
  hasPermission,
  type AdminAnimalMediaItem,
  type AdminClassCapabilities,
  type AdminClassId,
  type AdminFormState,
  type AdminSession,
} from "./admin-types";

function formatDateTime(value: Date) {
  return value.toLocaleString("pt-BR");
}

function formatAvailability(value: number) {
  return formatAnimalAvailability(value);
}

function formatDataType(value: CharacteristicDataType) {
  return dataTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function formatPermissionScopes(scopes: string[]) {
  return scopes.join(", ");
}

function getCharacteristicDisplayValue(
  characteristic: {
    isBirthDate?: boolean;
  },
  value: {
  option: { label: string; value: string } | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
  valueNumber: number | null;
  valueText: string | null;
},
) {
  if (characteristic.isBirthDate && value.valueDate) {
    return `${formatDateOnly(value.valueDate)} (${formatDetailedAgeFromBirthDate(value.valueDate)})`;
  }

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

function buildEmptyAnimalCharacteristicValues(
  animalTypes: Array<{
    characteristics: Array<{ characteristicId: string }>;
  }>,
) {
  return Object.fromEntries(
    animalTypes.flatMap((animalType) =>
      animalType.characteristics.map((characteristic) => [
        characteristic.characteristicId,
        {
          boolean: false,
          date: "",
          number: "",
          optionId: "",
          text: "",
        },
      ]),
    ),
  );
}

async function getAnimalTypeDefinitions() {
  const animalTypes = await prisma.animalType.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      characteristics: {
        orderBy: {
          displayOrder: "asc",
        },
        select: {
          characteristicId: true,
          required: true,
          showInCard: true,
              characteristic: {
                select: {
                  dataType: true,
                  isBirthDate: true,
                  key: true,
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
          },
        },
      },
    },
  });

  return animalTypes.map((animalType) => ({
    value: animalType.id,
    label: animalType.name,
      characteristics: animalType.characteristics.map((item) => ({
        characteristicId: item.characteristicId,
        dataType: item.characteristic.dataType,
        isBirthDate: item.characteristic.isBirthDate,
        key: item.characteristic.key,
        label: item.characteristic.label,
        options: item.characteristic.options.map((option) => ({
        value: option.id,
        label: option.label,
      })),
      required: item.required,
      showInCard: item.showInCard,
    })),
  }));
}

function mapAdminClassRecord(adminClass: {
  identifier: string;
  label: string;
  description: string;
  readPermissions: string[];
  createPermissions: string[];
  updatePermissions: string[];
  deletePermissions: string[];
  allowCreate: boolean;
  allowDelete: boolean;
}): AdminClassDefinition {
  return {
    allowCreate: adminClass.allowCreate,
    allowDelete: adminClass.allowDelete,
    createPermissions: adminClass.createPermissions as AdminPermissionScope[],
    deletePermissions: adminClass.deletePermissions as AdminPermissionScope[],
    description: adminClass.description,
    identifier: adminClass.identifier as AdminClassId,
    label: adminClass.label,
    readPermissions: adminClass.readPermissions as AdminPermissionScope[],
    updatePermissions: adminClass.updatePermissions as AdminPermissionScope[],
  };
}

export async function getAdminClasses(): Promise<AdminClassDefinition[]> {
  const adminClasses = await prisma.adminClass.findMany({
    orderBy: {
      label: "asc",
    },
    select: {
      allowCreate: true,
      allowDelete: true,
      createPermissions: true,
      deletePermissions: true,
      description: true,
      identifier: true,
      label: true,
      readPermissions: true,
      updatePermissions: true,
    },
  });

  return adminClasses.map(mapAdminClassRecord);
}

export async function getAdminClassDefinition(classId: AdminClassId): Promise<AdminClassDefinition | null> {
  const adminClass = await prisma.adminClass.findUnique({
    where: {
      identifier: classId,
    },
    select: {
      allowCreate: true,
      allowDelete: true,
      createPermissions: true,
      deletePermissions: true,
      description: true,
      identifier: true,
      label: true,
      readPermissions: true,
      updatePermissions: true,
    },
  });

  return adminClass ? mapAdminClassRecord(adminClass) : null;
}

export async function getAdminPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userGroups: {
        select: {
          group: {
            select: {
              groupRoles: {
                select: {
                  role: {
                    select: {
                      rolePermissions: {
                        select: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return [
    ...new Set(
      user.userGroups.flatMap(({ group }) =>
        group.groupRoles.flatMap((groupRole) => groupRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.key)),
      ),
    ),
  ];
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;
  const payload = await verifyAuthToken(authToken);

  if (!payload) {
    return null;
  }

  const permissions = await getAdminPermissions(payload.sub);

  if (!permissions) {
    return null;
  }

  const session: AdminSession = {
    permissions,
    userId: payload.sub,
  };

  return session;
}

export function getVisibleAdminClasses(adminClasses: AdminClassDefinition[], permissions: string[]) {
  return adminClasses.filter(classDefinition =>
    hasPermission(permissions, classDefinition.identifier, getActionPermissionScopes(classDefinition, "read")),
  );
}

export function getAdminClassCapabilities(
  classDefinition: AdminClassDefinition,
  permissions: string[],
): AdminClassCapabilities {
  const canRead = hasPermission(
    permissions,
    classDefinition.identifier,
    getActionPermissionScopes(classDefinition, "read"),
  );

  return {
    canCreate:
      classDefinition.allowCreate &&
      hasPermission(permissions, classDefinition.identifier, getActionPermissionScopes(classDefinition, "create")),
    canDelete:
      classDefinition.allowDelete &&
      hasPermission(permissions, classDefinition.identifier, getActionPermissionScopes(classDefinition, "delete")),
    canRead,
    canUpdate: hasPermission(
      permissions,
      classDefinition.identifier,
      getActionPermissionScopes(classDefinition, "update"),
    ),
  };
}

export async function getObjectsByClass(classId: AdminClassId): Promise<ObjectsType[]> {
  switch (classId) {
    case "adminClasses": {
      const adminClasses = await prisma.adminClass.findMany({
        orderBy: {
          label: "asc",
        },
        select: {
          allowCreate: true,
          allowDelete: true,
          createPermissions: true,
          deletePermissions: true,
          id: true,
          label: true,
          readPermissions: true,
          updatePermissions: true,
        },
      });

      return adminClasses.map((adminClass) => ({
        identifier: adminClass.id,
        label: adminClass.label,
        description:
          `Ler: ${formatPermissionScopes(adminClass.readPermissions)} | ` +
          `Criar: ${adminClass.allowCreate ? formatPermissionScopes(adminClass.createPermissions) : "desabilitado"} | ` +
          `Editar: ${formatPermissionScopes(adminClass.updatePermissions)} | ` +
          `Excluir: ${adminClass.allowDelete ? formatPermissionScopes(adminClass.deletePermissions) : "desabilitado"}`,
      }));
    }
    case "users": {
      const users = await prisma.user.findMany({
        orderBy: {
          email: "asc",
        },
        select: {
          email: true,
          id: true,
          name: true,
        },
      });

      return users.map((user) => ({
        identifier: user.id,
        label: user.name ?? user.email,
        description: user.name ? user.email : "Usuario sem nome",
      }));
    }
    case "groups": {
      const groups = await prisma.group.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          identifier: true,
          name: true,
        },
      });

      return groups.map((group) => ({
        identifier: group.id,
        label: group.name,
        description: group.identifier,
      }));
    }
    case "roles": {
      const roles = await prisma.role.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
        },
      });

      return roles.map((role) => ({
        identifier: role.id,
        label: role.name,
      }));
    }
    case "characteristics": {
      const characteristics = await prisma.characteristic.findMany({
        orderBy: {
          label: "asc",
        },
        select: {
          dataType: true,
          id: true,
          isBirthDate: true,
          isFilterable: true,
          key: true,
          label: true,
          options: {
            select: {
              id: true,
            },
          },
        },
      });

      return characteristics.map((characteristic) => ({
        identifier: characteristic.id,
        label: characteristic.label,
        description:
          `${characteristic.key} - ${formatDataType(characteristic.dataType)}` +
          `${characteristic.isBirthDate ? " - calcula idade" : ""}` +
          ` - ${characteristic.options.length} opcoes - filtro ${characteristic.isFilterable ? "ativo" : "inativo"}`,
      }));
    }
    case "animalTypes": {
      const animalTypes = await prisma.animalType.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
        },
      });

      return animalTypes.map((animalType) => ({
        identifier: animalType.id,
        label: animalType.name,
      }));
    }
    case "animals": {
      const animals = await prisma.animal.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          animalType: {
            select: {
              name: true,
            },
          },
          availability: true,
          id: true,
          identifier: true,
          name: true,
        },
      });

      return animals.map((animal) => ({
        identifier: animal.id,
        label: animal.name,
        description: `${animal.identifier} - ${animal.animalType.name} - ${formatAvailability(animal.availability)}`,
      }));
    }
    case "carouselEntries": {
      const entries = await prisma.carouselEntry.findMany({
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: {
          description: true,
          displayOrder: true,
          id: true,
          animalMedia: {
            select: {
              fileName: true,
              animal: {
                select: {
                  identifier: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return entries.map((entry) => ({
        identifier: entry.id,
        label: `${entry.displayOrder}. ${entry.animalMedia.animal.name}`,
        description: entry.description ?? `${entry.animalMedia.fileName} - ${entry.animalMedia.animal.identifier}`,
      }));
    }
  }
}

export async function getDetailByClass(classId: AdminClassId, objectId: string): Promise<DetailView | null> {
  switch (classId) {
    case "adminClasses": {
      const adminClass = await prisma.adminClass.findUnique({
        where: { id: objectId },
        select: {
          allowCreate: true,
          allowDelete: true,
          createdAt: true,
          createPermissions: true,
          deletePermissions: true,
          description: true,
          id: true,
          identifier: true,
          label: true,
          readPermissions: true,
          updatePermissions: true,
          updatedAt: true,
        },
      });

      if (!adminClass) {
        return null;
      }

      return {
        badges: [
          adminClass.allowCreate ? "Criacao habilitada" : "Criacao bloqueada",
          adminClass.allowDelete ? "Exclusao habilitada" : "Exclusao bloqueada",
        ],
        sections: [
          {
            fields: [
              { label: "ID", value: adminClass.id },
              { label: "Identificador", value: adminClass.identifier },
              { label: "Rotulo", value: adminClass.label },
              { label: "Descricao", value: adminClass.description },
              { label: "Criado em", value: formatDateTime(adminClass.createdAt) },
              { label: "Atualizado em", value: formatDateTime(adminClass.updatedAt) },
            ],
            title: "Resumo",
          },
          {
            emptyMessage: "Nenhuma permissao configurada para leitura.",
            items: adminClass.readPermissions.map((permission) => ({
              badge: ["admin", "manage", "get"].includes(permission) ? "Obrigatoria" : undefined,
              label: permission,
            })),
            title: "Permissoes de leitura",
          },
          {
            emptyMessage: "Nenhuma permissao configurada para criacao.",
            items: adminClass.createPermissions.map((permission) => ({
              badge: ["admin", "manage", "create"].includes(permission) ? "Obrigatoria" : undefined,
              label: permission,
            })),
            title: "Permissoes de criacao",
          },
          {
            emptyMessage: "Nenhuma permissao configurada para atualizacao.",
            items: adminClass.updatePermissions.map((permission) => ({
              badge: ["admin", "manage", "update"].includes(permission) ? "Obrigatoria" : undefined,
              label: permission,
            })),
            title: "Permissoes de atualizacao",
          },
          {
            emptyMessage: "Nenhuma permissao configurada para exclusao.",
            items: adminClass.deletePermissions.map((permission) => ({
              badge: ["admin", "manage", "delete"].includes(permission) ? "Obrigatoria" : undefined,
              label: permission,
            })),
            title: "Permissoes de exclusao",
          },
        ],
        subtitle: adminClass.identifier,
        title: adminClass.label,
      };
    }
    case "users": {
      const user = await prisma.user.findUnique({
        where: { id: objectId },
        select: {
          createdAt: true,
          email: true,
          id: true,
          name: true,
          updatedAt: true,
          userGroups: {
            select: {
              group: {
                select: {
                  identifier: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      return {
        badges: user.userGroups.map((item) => item.group.identifier),
        sections: [
          {
            fields: [
              { label: "ID", value: user.id },
              { label: "Nome", value: user.name ?? "Nao informado" },
              { label: "Email", value: user.email },
              { label: "Criado em", value: formatDateTime(user.createdAt) },
              { label: "Atualizado em", value: formatDateTime(user.updatedAt) },
            ],
            title: "Identificacao",
          },
          {
            emptyMessage: "Usuario sem grupos vinculados.",
            items: user.userGroups.map((item) => ({
              description: item.group.identifier,
              label: item.group.name,
            })),
            title: "Grupos",
          },
        ],
        subtitle: user.email,
        title: user.name ?? user.email,
      };
    }
    case "groups": {
      const group = await prisma.group.findUnique({
        where: { id: objectId },
        select: {
          createdAt: true,
          groupRoles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
          id: true,
          identifier: true,
          name: true,
          updatedAt: true,
          userGroups: {
            select: {
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        return null;
      }

      return {
        badges: group.groupRoles.map((item) => item.role.name),
        sections: [
          {
            fields: [
              { label: "ID", value: group.id },
              { label: "Identificador", value: group.identifier },
              { label: "Nome", value: group.name },
              { label: "Criado em", value: formatDateTime(group.createdAt) },
              { label: "Atualizado em", value: formatDateTime(group.updatedAt) },
            ],
            title: "Resumo",
          },
          {
            emptyMessage: "Nenhum papel vinculado.",
            items: group.groupRoles.map((item) => ({
              label: item.role.name,
            })),
            title: "Papeis vinculados",
          },
          {
            emptyMessage: "Nenhum usuario vinculado.",
            items: group.userGroups.map((item) => ({
              description: item.user.email,
              label: item.user.name ?? item.user.email,
            })),
            title: "Usuarios vinculados",
          },
        ],
        subtitle: group.identifier,
        title: group.name,
      };
    }
    case "roles": {
      const role = await prisma.role.findUnique({
        where: { id: objectId },
        select: {
          groupRoles: {
            select: {
              group: {
                select: {
                  identifier: true,
                  name: true,
                },
              },
            },
          },
          id: true,
          name: true,
          rolePermissions: {
            select: {
              permission: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
      });

      if (!role) {
        return null;
      }

      return {
        sections: [
          {
            fields: [
              { label: "ID", value: role.id },
              { label: "Nome", value: role.name },
            ],
            title: "Resumo",
          },
          {
            emptyMessage: "Nenhuma permissao vinculada.",
            items: role.rolePermissions.map((item) => ({
              label: item.permission.key,
            })),
            title: "Permissoes",
          },
          {
            emptyMessage: "Nenhum grupo usando este papel.",
            items: role.groupRoles.map((item) => ({
              description: item.group.identifier,
              label: item.group.name,
            })),
            title: "Grupos vinculados",
          },
        ],
        title: role.name,
      };
    }
    case "characteristics": {
      const characteristic = await prisma.characteristic.findUnique({
        where: { id: objectId },
        select: {
          animalTypes: {
            select: {
              animalType: {
                select: {
                  name: true,
                },
              },
              required: true,
              showInCard: true,
            },
          },
          dataType: true,
          id: true,
          isBirthDate: true,
          isFilterable: true,
          key: true,
          label: true,
          options: {
            orderBy: {
              displayOrder: "asc",
            },
            select: {
              label: true,
              value: true,
            },
          },
          values: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!characteristic) {
        return null;
      }

      return {
        sections: [
          {
            fields: [
              { label: "ID", value: characteristic.id },
              { label: "Chave", value: characteristic.key },
              { label: "Rotulo", value: characteristic.label },
              { label: "Tipo de dado", value: formatDataType(characteristic.dataType) },
              { label: "Data de nascimento", value: characteristic.isBirthDate ? "Sim" : "Nao" },
              { label: "Filtro publico", value: characteristic.isFilterable ? "Habilitado" : "Desabilitado" },
              { label: "Valores em animais", value: characteristic.values.length.toString() },
            ],
            title: "Resumo",
          },
          {
            emptyMessage: "Nenhuma opcao cadastrada.",
            items: characteristic.options.map((option) => ({
              description: option.value,
              label: option.label,
            })),
            title: "Opcoes",
          },
          {
            emptyMessage: "Nenhum tipo de animal utiliza esta caracteristica.",
            items: characteristic.animalTypes.map((item) => ({
              badge: item.required ? "Obrigatorio" : "Opcional",
              description: `${formatDataType(characteristic.dataType)} - ${item.showInCard ? "destaque na listagem" : "uso interno"}`,
              label: item.animalType.name,
            })),
            title: "Tipos vinculados",
          },
        ],
        subtitle: characteristic.key,
        title: characteristic.label,
      };
    }
    case "animalTypes": {
      const animalType = await prisma.animalType.findUnique({
        where: { id: objectId },
        select: {
          animals: {
            select: {
              availability: true,
              name: true,
            },
          },
          characteristics: {
            select: {
              characteristic: {
                select: {
                  dataType: true,
                  isBirthDate: true,
                  isFilterable: true,
                  key: true,
                  label: true,
                  options: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
              dataType: true,
              displayOrder: true,
              required: true,
              showInCard: true,
            },
          },
          id: true,
          name: true,
        },
      });

      if (!animalType) {
        return null;
      }

      return {
        sections: [
          {
            fields: [
              { label: "ID", value: animalType.id },
              { label: "Nome", value: animalType.name },
              { label: "Animais cadastrados", value: animalType.animals.length.toString() },
            ],
            title: "Resumo",
          },
          {
            emptyMessage: "Nenhuma caracteristica vinculada.",
            items: animalType.characteristics
              .sort((left, right) => left.displayOrder - right.displayOrder)
              .map((item) => ({
                badge: item.required ? "Obrigatorio" : item.showInCard ? "Destaque na listagem" : "Opcional",
                description:
                  `${item.characteristic.key} - ${formatDataType(item.characteristic.dataType)}` +
                  `${item.characteristic.isBirthDate ? " - calcula idade" : ""}` +
                  ` - ordem ${item.displayOrder} - filtro ${item.characteristic.isFilterable ? "ativo" : "inativo"} - card ${item.showInCard ? "ativo" : "inativo"}`,
                label: `${item.characteristic.label} (${item.characteristic.options.length} opcoes)`,
              })),
            title: "Caracteristicas",
          },
          {
            emptyMessage: "Nenhum animal cadastrado.",
            items: animalType.animals.map((item) => ({
              badge: formatAvailability(item.availability),
              label: item.name,
            })),
            title: "Animais",
          },
        ],
        title: animalType.name,
      };
    }
    case "animals": {
      const animal = await prisma.animal.findUnique({
        where: { id: objectId },
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
                  isBirthDate: true,
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
          createdAt: true,
          description: true,
          id: true,
          identifier: true,
          media: {
            select: {
              id: true,
            },
          },
          name: true,
          updatedAt: true,
        },
      });

      if (!animal) {
        return null;
      }

      return {
        badges: [animal.animalType.name, formatAvailability(animal.availability)],
        sections: [
          {
            fields: [
              { label: "ID", value: animal.id },
              { label: "Identificador", value: animal.identifier },
              { label: "Tipo", value: animal.animalType.name },
              { label: "Disponibilidade", value: formatAvailability(animal.availability) },
              { label: "Midias", value: animal.media.length.toString() },
              { label: "Criado em", value: formatDateTime(animal.createdAt) },
              { label: "Atualizado em", value: formatDateTime(animal.updatedAt) },
            ],
            title: "Resumo",
          },
          {
            fields: [{ label: "Descricao", value: animal.description ?? "Sem descricao cadastrada." }],
            title: "Descricao comercial",
          },
          {
            emptyMessage: "Nenhuma caracteristica preenchida.",
            items: animal.characteristicValues
              .map((item) => ({
                description: getCharacteristicDisplayValue(item.characteristic, item),
                label: item.characteristic.label,
              }))
              .sort((left, right) => left.label.localeCompare(right.label, "pt-BR")),
            title: "Caracteristicas",
          },
        ],
        subtitle: animal.animalType.name,
        title: animal.name,
      };
    }
    case "carouselEntries": {
      const entry = await prisma.carouselEntry.findUnique({
        where: { id: objectId },
        select: {
          createdAt: true,
          description: true,
          displayOrder: true,
          id: true,
          updatedAt: true,
          animalMedia: {
            select: {
              fileName: true,
              storageKey: true,
              animal: {
                select: {
                  identifier: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!entry) {
        return null;
      }

      return {
        badges: [`Ordem ${entry.displayOrder}`],
        sections: [
          {
            fields: [
              { label: "ID", value: entry.id },
              { label: "Animal", value: entry.animalMedia.animal.name },
              { label: "Identificador do animal", value: entry.animalMedia.animal.identifier },
              { label: "Imagem selecionada", value: entry.animalMedia.fileName },
              { label: "Descricao do slide", value: entry.description ?? "Sem descricao cadastrada." },
              { label: "Criado em", value: formatDateTime(entry.createdAt) },
              { label: "Atualizado em", value: formatDateTime(entry.updatedAt) },
            ],
            title: "Resumo",
          },
          {
            fields: [{ label: "URL da imagem", value: getPublicMediaUrl(entry.animalMedia.storageKey) }],
            title: "Midia vinculada",
          },
        ],
        subtitle: entry.animalMedia.animal.identifier,
        title: entry.animalMedia.animal.name,
      };
    }
  }
}

export async function getFormStateByClass(classId: AdminClassId, mode: "create" | "edit", objectId?: string): Promise<AdminFormState> {
  switch (classId) {
    case "adminClasses": {
      if (mode !== "edit" || !objectId) {
        throw new Error("Classes administrativas so podem ser editadas.");
      }

      const adminClass = await prisma.adminClass.findUnique({
        where: {
          id: objectId,
        },
        select: {
          allowCreate: true,
          allowDelete: true,
          createPermissions: true,
          deletePermissions: true,
          description: true,
          identifier: true,
          label: true,
          readPermissions: true,
          updatePermissions: true,
        },
      });

      if (!adminClass) {
        throw new Error("Classe administrativa nao encontrada.");
      }

      return {
        classId,
        description:
          "Ajuste os textos e os conjuntos de permissao que liberam leitura, criacao, edicao e exclusao desta classe.",
        mode,
        submitLabel: "Salvar classe",
        title: "Editar classe administrativa",
        values: {
          allowCreate: adminClass.identifier === "adminClasses" ? false : adminClass.allowCreate,
          allowDelete: adminClass.identifier === "adminClasses" ? false : adminClass.allowDelete,
          createPermissions: adminClass.createPermissions as AdminPermissionScope[],
          deletePermissions: adminClass.deletePermissions as AdminPermissionScope[],
          description: adminClass.description,
          identifier: adminClass.identifier,
          label: adminClass.label,
          readPermissions: adminClass.readPermissions as AdminPermissionScope[],
          updatePermissions: adminClass.updatePermissions as AdminPermissionScope[],
        },
      };
    }
    case "users": {
      const [groups, user] = await Promise.all([
        prisma.group.findMany({
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            identifier: true,
            name: true,
          },
        }),
        mode === "edit" && objectId
          ? prisma.user.findUnique({
              where: {
                id: objectId,
              },
              select: {
                email: true,
                name: true,
                userGroups: {
                  select: {
                    groupId: true,
                  },
                },
              },
            })
          : Promise.resolve(null),
      ]);

      return {
        classId,
        description:
          mode === "create"
            ? "Defina os dados basicos do usuario e os grupos aos quais ele pertence."
            : "Atualize os dados do usuario e ajuste os grupos vinculados.",
        groupOptions: groups.map((group) => ({
          value: group.id,
          label: group.name,
          description: group.identifier,
        })),
        mode,
        submitLabel: mode === "create" ? "Criar usuario" : "Salvar usuario",
        title: mode === "create" ? "Novo usuario" : "Editar usuario",
        values: {
          email: user?.email ?? "",
          groupIds: user?.userGroups.map((item) => item.groupId) ?? [],
          name: user?.name ?? "",
          password: "",
        },
      };
    }
    case "groups": {
      const [roles, group] = await Promise.all([
        prisma.role.findMany({
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
          },
        }),
        mode === "edit" && objectId
          ? prisma.group.findUnique({
              where: {
                id: objectId,
              },
              select: {
                groupRoles: {
                  select: {
                    roleId: true,
                  },
                },
                identifier: true,
                name: true,
              },
            })
          : Promise.resolve(null),
      ]);

      return {
        classId,
        description:
          mode === "create" ? "Cadastre um grupo e associe os papeis que controlam o acesso." : "Atualize o grupo e ajuste os papeis vinculados.",
        mode,
        roleOptions: roles.map((role) => ({
          value: role.id,
          label: role.name,
        })),
        submitLabel: mode === "create" ? "Criar grupo" : "Salvar grupo",
        title: mode === "create" ? "Novo grupo" : "Editar grupo",
        values: {
          identifier: group?.identifier ?? "",
          name: group?.name ?? "",
          roleIds: group?.groupRoles.map((item) => item.roleId) ?? [],
        },
      };
    }
    case "roles": {
      const [permissions, role] = await Promise.all([
        prisma.permission.findMany({
          orderBy: {
            key: "asc",
          },
          select: {
            key: true,
          },
        }),
        mode === "edit" && objectId
          ? prisma.role.findUnique({
              where: {
                id: objectId,
              },
              select: {
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            })
          : Promise.resolve(null),
      ]);

      return {
        classId,
        description:
          mode === "create" ? "Monte um papel com o conjunto de permissoes desejado." : "Atualize o nome e as permissoes associadas ao papel.",
        mode,
        permissionOptions: permissions.map((permission) => ({
          value: permission.key,
          label: permission.key,
        })),
        submitLabel: mode === "create" ? "Criar papel" : "Salvar papel",
        title: mode === "create" ? "Novo papel" : "Editar papel",
        values: {
          name: role?.name ?? "",
          permissionKeys: role?.rolePermissions.map((item) => item.permission.key) ?? [],
        },
      };
    }
    case "characteristics": {
      const characteristic =
        mode === "edit" && objectId
          ? await prisma.characteristic.findUnique({
              where: {
                id: objectId,
              },
              select: {
                dataType: true,
                isBirthDate: true,
                isFilterable: true,
                key: true,
                label: true,
                options: {
                  orderBy: {
                    displayOrder: "asc",
                  },
                  select: {
                    label: true,
                  },
                },
              },
            })
          : null;

      return {
        classId,
        description:
          mode === "create"
            ? "Cadastre um novo campo dinamico do catalogo. As opcoes sao usadas quando o tipo for selecao."
            : "Atualize a chave, o rotulo e a lista de opcoes dessa caracteristica.",
        mode,
        submitLabel: mode === "create" ? "Criar caracteristica" : "Salvar caracteristica",
        title: mode === "create" ? "Nova caracteristica" : "Editar caracteristica",
        values: {
          dataType: characteristic?.dataType ?? CharacteristicDataType.text,
          isBirthDate: characteristic?.isBirthDate ?? false,
          isFilterable: characteristic?.isFilterable ?? false,
          key: characteristic?.key ?? "",
          label: characteristic?.label ?? "",
          optionsText: characteristic?.options.map((option) => option.label).join("\n") ?? "",
        },
      };
    }
    case "animalTypes": {
      const [characteristics, animalType] = await Promise.all([
        prisma.characteristic.findMany({
          orderBy: {
            label: "asc",
          },
          select: {
            dataType: true,
            id: true,
            isBirthDate: true,
            key: true,
            label: true,
            options: {
              select: {
                id: true,
              },
            },
          },
        }),
        mode === "edit" && objectId
          ? prisma.animalType.findUnique({
              where: {
                id: objectId,
              },
              select: {
                characteristics: {
                  select: {
                    characteristicId: true,
                    displayOrder: true,
                    required: true,
                    showInCard: true,
                    characteristic: {
                      select: {
                        dataType: true,
                        isBirthDate: true,
                      },
                    },
                  },
                },
                name: true,
              },
            })
          : Promise.resolve(null),
      ]);

      const currentMap = new Map((animalType?.characteristics ?? []).map((item) => [item.characteristicId, item]));

      return {
        characteristics: characteristics.map((characteristic, index) => {
          const current = currentMap.get(characteristic.id);

          return {
            characteristicId: characteristic.id,
            dataType: current?.characteristic.dataType ?? characteristic.dataType,
            displayOrder: String(current?.displayOrder ?? index + 1),
            isBirthDate: current?.characteristic.isBirthDate ?? characteristic.isBirthDate,
            key: characteristic.key,
            label: characteristic.label,
            optionCount: characteristic.options.length,
            required: current?.required ?? false,
            selected: Boolean(current),
            showInCard: current?.showInCard ?? false,
          };
        }),
        classId,
        description:
          mode === "create"
            ? "Escolha as caracteristicas que esse tipo de animal deve exibir no cadastro."
            : "Ajuste a estrutura do tipo e a ordem das caracteristicas apresentadas.",
        mode,
        submitLabel: mode === "create" ? "Criar tipo" : "Salvar tipo",
        title: mode === "create" ? "Novo tipo de animal" : "Editar tipo de animal",
        values: {
          name: animalType?.name ?? "",
        },
      };
    }
    case "animals": {
      const [animalTypes, animal, animalIdentifiers] = await Promise.all([
        getAnimalTypeDefinitions(),
        mode === "edit" && objectId
          ? prisma.animal.findUnique({
              where: {
                id: objectId,
              },
              select: {
                animalTypeId: true,
                availability: true,
                characteristicValues: {
                  select: {
                    characteristicId: true,
                    optionId: true,
                    valueBoolean: true,
                    valueDate: true,
                    valueNumber: true,
                    valueText: true,
                  },
                },
                description: true,
                identifier: true,
                name: true,
              },
            })
          : Promise.resolve(null),
        prisma.animal.findMany({
          select: {
            id: true,
            identifier: true,
          },
        }),
      ]);

      const characteristicValues = buildEmptyAnimalCharacteristicValues(animalTypes);

      for (const item of animal?.characteristicValues ?? []) {
        characteristicValues[item.characteristicId] = {
          boolean: item.valueBoolean ?? false,
          date: item.valueDate ? formatDateInputValue(item.valueDate) : "",
          number: item.valueNumber !== null ? String(item.valueNumber) : "",
          optionId: item.optionId ?? "",
          text: item.valueText ?? "",
        };
      }

      return {
        animalTypes,
        characteristicValues,
        classId,
        description:
          mode === "create"
            ? "Cadastre o animal e preencha os campos definidos para o tipo selecionado."
            : "Atualize os dados comerciais e as caracteristicas desse animal.",
        mode,
        submitLabel: mode === "create" ? "Criar animal" : "Salvar animal",
        title: mode === "create" ? "Novo animal" : "Editar animal",
        values: {
          animalTypeId: animal?.animalTypeId ?? animalTypes[0]?.value ?? "",
          availability: animal?.availability ?? defaultAnimalAvailability,
          description: animal?.description ?? "",
          identifier: animal?.identifier ?? "",
          name: animal?.name ?? "",
        },
        existingIdentifiers: animalIdentifiers
          .filter((item) => item.id !== objectId)
          .map((item) => item.identifier),
      };
    }
    case "carouselEntries": {
      const [animals, entry] = await Promise.all([
        prisma.animal.findMany({
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            identifier: true,
            name: true,
            media: {
              where: {
                kind: MediaKind.image,
              },
              orderBy: {
                createdAt: "asc",
              },
              select: {
                fileName: true,
                id: true,
              },
            },
          },
        }),
        mode === "edit" && objectId
          ? prisma.carouselEntry.findUnique({
              where: {
                id: objectId,
              },
              select: {
                animalMediaId: true,
                description: true,
                displayOrder: true,
                animalMedia: {
                  select: {
                    animalId: true,
                  },
                },
              },
            })
          : Promise.resolve(null),
      ]);

      const animalOptions = animals
        .filter((animal) => animal.media.length)
        .map((animal) => ({
          value: animal.id,
          label: animal.name,
          description: animal.identifier,
        }));
      const mediaOptionsByAnimalId = Object.fromEntries(
        animals.map((animal) => [
          animal.id,
          animal.media.map((media) => ({
            value: media.id,
            label: media.fileName,
            description: animal.identifier,
          })),
        ]),
      );
      const defaultAnimalId = entry?.animalMedia.animalId ?? animalOptions[0]?.value ?? "";

      return {
        animalOptions,
        classId,
        description:
          mode === "create"
            ? "Selecione o animal, escolha uma imagem ja vinculada a ele e defina a ordem do destaque."
            : "Atualize o destaque do carrossel escolhendo outra imagem ou ajustando o texto descritivo.",
        mediaOptionsByAnimalId,
        mode,
        submitLabel: mode === "create" ? "Criar destaque" : "Salvar destaque",
        title: mode === "create" ? "Novo destaque do carrossel" : "Editar destaque do carrossel",
        values: {
          animalId: defaultAnimalId,
          animalMediaId: entry?.animalMediaId ?? mediaOptionsByAnimalId[defaultAnimalId]?.[0]?.value ?? "",
          description: entry?.description ?? "",
          displayOrder: entry ? String(entry.displayOrder) : String((await prisma.carouselEntry.count()) + 1),
        },
      };
    }
  }
}

export async function getAnimalMediaByAnimalId(animalId: string): Promise<AdminAnimalMediaItem[]> {
  const media = await prisma.animalMedia.findMany({
    where: {
      animalId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      bucket: true,
      contentType: true,
      createdAt: true,
      fileName: true,
      id: true,
      kind: true,
      storageKey: true,
    },
  });

  return media.map((item) => ({
    contentType: item.contentType,
    createdAt: item.createdAt.toISOString(),
    fileName: item.fileName,
    id: item.id,
    kind: item.kind,
    storageKey: item.storageKey,
    url: getPublicMediaUrl(item.storageKey),
  }));
}
