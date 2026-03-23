import { Availability, CharacteristicDataType, MediaKind } from "@/src/generated/prisma/enums";

type AdminMode = "view" | "create" | "edit";
type AdminAction = "read" | "create" | "update" | "delete";
type AdminPermissionScope = "admin" | "manage" | "get" | "create" | "update" | "delete";
type AdminClassId =
  | "users"
  | "groups"
  | "roles"
  | "characteristics"
  | "animalTypes"
  | "animals"
  | "carouselEntries"
  | "adminClasses";

type AdminSession = {
  permissions: string[];
  userId: string;
};

type AdminClassDefinition = {
  identifier: AdminClassId;
  label: string;
  description: string;
  readPermissions: AdminPermissionScope[];
  createPermissions: AdminPermissionScope[];
  updatePermissions: AdminPermissionScope[];
  deletePermissions: AdminPermissionScope[];
  allowCreate: boolean;
  allowDelete: boolean;
};

type AdminClassCapabilities = {
  canCreate: boolean;
  canDelete: boolean;
  canRead: boolean;
  canUpdate: boolean;
};

type AdminClassPermissionField = "readPermissions" | "createPermissions" | "updatePermissions" | "deletePermissions";

type AdminOption = {
  value: string;
  label: string;
  description?: string;
};

type AdminAnimalTypeCharacteristicFormState = {
  characteristicId: string;
  key: string;
  label: string;
  selected: boolean;
  dataType: CharacteristicDataType;
  required: boolean;
  showInCard: boolean;
  displayOrder: string;
  optionCount: number;
};

type AdminAnimalCharacteristicDefinition = {
  characteristicId: string;
  key: string;
  label: string;
  dataType: CharacteristicDataType;
  required: boolean;
  options: AdminOption[];
};

type AdminAnimalTypeFormOption = {
  value: string;
  label: string;
  characteristics: AdminAnimalCharacteristicDefinition[];
};

type AdminAnimalCharacteristicValueState = {
  text: string;
  number: string;
  date: string;
  boolean: boolean;
  optionId: string;
};

type AdminAnimalMediaItem = {
  id: string;
  kind: MediaKind;
  fileName: string;
  contentType: string;
  storageKey: string;
  url: string;
  createdAt: string;
};

type UserAdminFormState = {
  classId: "users";
  mode: Extract<AdminMode, "create" | "edit">;
  title: string;
  description: string;
  submitLabel: string;
  values: {
    name: string;
    email: string;
    password: string;
    groupIds: string[];
  };
  groupOptions: AdminOption[];
};

type GroupAdminFormState = {
  classId: "groups";
  mode: Extract<AdminMode, "create" | "edit">;
  title: string;
  description: string;
  submitLabel: string;
  values: {
    name: string;
    identifier: string;
    roleIds: string[];
  };
  roleOptions: AdminOption[];
};

type RoleAdminFormState = {
  classId: "roles";
  mode: Extract<AdminMode, "create" | "edit">;
  title: string;
  description: string;
  submitLabel: string;
  values: {
    name: string;
    permissionKeys: string[];
  };
  permissionOptions: AdminOption[];
};

type CharacteristicAdminFormState = {
  classId: "characteristics";
  mode: Extract<AdminMode, "create" | "edit">;
  title: string;
  description: string;
  submitLabel: string;
  values: {
    dataType: CharacteristicDataType;
    isFilterable: boolean;
    key: string;
    label: string;
    optionsText: string;
  };
};

type AnimalTypeAdminFormState = {
  classId: "animalTypes";
  mode: Extract<AdminMode, "create" | "edit">;
  title: string;
  description: string;
  submitLabel: string;
  values: {
    name: string;
  };
  characteristics: AdminAnimalTypeCharacteristicFormState[];
};

type AnimalAdminFormState = {
  classId: "animals";
  mode: Extract<AdminMode, "create" | "edit">;
  title: string;
  description: string;
  submitLabel: string;
  values: {
    identifier: string;
    name: string;
    description: string;
    availability: Availability;
    animalTypeId: string;
  };
  animalTypes: AdminAnimalTypeFormOption[];
  characteristicValues: Record<string, AdminAnimalCharacteristicValueState>;
};

type CarouselEntryAdminFormState = {
  classId: "carouselEntries";
  mode: Extract<AdminMode, "create" | "edit">;
  title: string;
  description: string;
  submitLabel: string;
  values: {
    animalId: string;
    animalMediaId: string;
    description: string;
    displayOrder: string;
  };
  animalOptions: AdminOption[];
  mediaOptionsByAnimalId: Record<string, AdminOption[]>;
};

type AdminClassAdminFormState = {
  classId: "adminClasses";
  mode: Extract<AdminMode, "edit">;
  title: string;
  description: string;
  submitLabel: string;
  values: {
    identifier: string;
    label: string;
    description: string;
    allowCreate: boolean;
    allowDelete: boolean;
    readPermissions: AdminPermissionScope[];
    createPermissions: AdminPermissionScope[];
    updatePermissions: AdminPermissionScope[];
    deletePermissions: AdminPermissionScope[];
  };
};

type AdminFormState =
  | UserAdminFormState
  | GroupAdminFormState
  | RoleAdminFormState
  | CharacteristicAdminFormState
  | AnimalTypeAdminFormState
  | AnimalAdminFormState
  | CarouselEntryAdminFormState
  | AdminClassAdminFormState;

type MutationResult = {
  id: string;
};

export type {
  AdminAction,
  AdminAnimalCharacteristicDefinition,
  AdminAnimalCharacteristicValueState,
  AdminAnimalMediaItem,
  AdminAnimalTypeCharacteristicFormState,
  AdminAnimalTypeFormOption,
  AdminClassAdminFormState,
  AdminClassCapabilities,
  AdminClassDefinition,
  AdminClassPermissionField,
  AdminClassId,
  AdminFormState,
  AdminMode,
  AdminOption,
  AdminPermissionScope,
  AdminSession,
  AnimalAdminFormState,
  AnimalTypeAdminFormState,
  CarouselEntryAdminFormState,
  CharacteristicAdminFormState,
  GroupAdminFormState,
  MutationResult,
  RoleAdminFormState,
  UserAdminFormState,
};
