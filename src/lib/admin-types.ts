import { CharacteristicDataType } from "@/src/generated/prisma/enums";
import type {
  AdminAction,
  AdminAnimalMediaItem,
  AdminClassCapabilities,
  AdminClassDefinition,
  AdminClassId,
  AdminFormState,
  AdminOption,
  AdminPermissionScope,
  AdminSession,
  MutationResult,
} from "@/src/types/admin";

const adminClassIds = [
  "users",
  "groups",
  "roles",
  "characteristics",
  "animalTypes",
  "animals",
  "carouselEntries",
  "adminClasses",
] as const satisfies readonly AdminClassId[];

const requiredPermissionScopes = {
  read: ["admin", "manage", "get"],
  create: ["admin", "manage", "create"],
  update: ["admin", "manage", "update"],
  delete: ["admin", "manage", "delete"],
} as const satisfies Record<AdminAction, readonly AdminPermissionScope[]>;

const dataTypeOptions = [
  { value: CharacteristicDataType.text, label: "Texto" },
  { value: CharacteristicDataType.number, label: "Numero" },
  { value: CharacteristicDataType.date, label: "Data" },
  { value: CharacteristicDataType.boolean, label: "Booleano" },
  { value: CharacteristicDataType.select, label: "Selecao" },
] as const satisfies readonly AdminOption[];

const adminPermissionScopeOptions = [
  { value: "admin", label: "Admin", description: "Sempre concede acesso administrativo amplo para a classe." },
  { value: "manage", label: "Manage", description: "Permite acesso operacional amplo a todas as acoes da classe." },
  { value: "get", label: "Get", description: "Permite leitura da classe." },
  { value: "create", label: "Create", description: "Permite criar registros da classe." },
  { value: "update", label: "Update", description: "Permite editar registros da classe." },
  { value: "delete", label: "Delete", description: "Permite excluir registros da classe." },
] as const satisfies readonly AdminOption[];

class AdminMutationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminMutationError";
    this.status = status;
  }
}

function getPermissionKey(identifier: AdminClassId, scope: string) {
  return `${identifier}:${scope}`;
}

function getActionPermissionScopes(classDefinition: AdminClassDefinition, action: AdminAction) {
  switch (action) {
    case "read":
      return classDefinition.readPermissions;
    case "create":
      return classDefinition.createPermissions;
    case "update":
      return classDefinition.updatePermissions;
    case "delete":
      return classDefinition.deletePermissions;
  }
}

function hasPermission(permissions: string[] | undefined, identifier: AdminClassId, scopes: string[] | undefined) {
  if (!permissions?.length || !scopes?.length) {
    return false;
  }

  return scopes.some(scope => permissions.includes(getPermissionKey(identifier, scope)));
}

function normalizePermissionScopes(scopes: string[] | undefined, action: AdminAction) {
  const normalizedScopes = (scopes ?? [])
    .map(scope => scope.trim().toLowerCase())
    .filter(Boolean) as AdminPermissionScope[];

  return [...new Set([...requiredPermissionScopes[action], ...normalizedScopes])];
}

function isAdminClassId(value?: string): value is AdminClassId {
  return adminClassIds.some(identifier => identifier === value);
}

export {
  adminPermissionScopeOptions,
  adminClassIds,
  dataTypeOptions,
  getActionPermissionScopes,
  getPermissionKey,
  hasPermission,
  isAdminClassId,
  normalizePermissionScopes,
  requiredPermissionScopes,
  AdminMutationError,
};
export type {
  AdminAction,
  AdminAnimalMediaItem,
  AdminClassCapabilities,
  AdminClassDefinition,
  AdminClassId,
  AdminFormState,
  AdminSession,
  MutationResult,
  AdminOption,
  AdminPermissionScope,
};
