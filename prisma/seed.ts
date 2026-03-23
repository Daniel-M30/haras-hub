import { prisma } from "@/src/lib/prisma";
import { parseDateInputValue } from "@/src/lib/date";
import bcrypt from "bcryptjs";

const adminClassDefinitions = [
  {
    identifier: "users",
    label: "Usuarios",
    description: "Contas cadastradas",
    readPermissions: ["admin", "manage", "get"],
    createPermissions: ["admin", "manage", "create"],
    updatePermissions: ["admin", "manage", "update"],
    deletePermissions: ["admin", "manage", "delete"],
    allowCreate: true,
    allowDelete: true,
  },
  {
    identifier: "groups",
    label: "Grupos",
    description: "Perfis e equipes",
    readPermissions: ["admin", "manage", "get"],
    createPermissions: ["admin", "manage", "create"],
    updatePermissions: ["admin", "manage", "update"],
    deletePermissions: ["admin", "manage", "delete"],
    allowCreate: true,
    allowDelete: true,
  },
  {
    identifier: "roles",
    label: "Papeis",
    description: "Conjuntos de permissao",
    readPermissions: ["admin", "manage", "get"],
    createPermissions: ["admin", "manage", "create"],
    updatePermissions: ["admin", "manage", "update"],
    deletePermissions: ["admin", "manage", "delete"],
    allowCreate: true,
    allowDelete: true,
  },
  {
    identifier: "characteristics",
    label: "Caracteristicas",
    description: "Campos dinamicos do catalogo",
    readPermissions: ["admin", "manage", "get"],
    createPermissions: ["admin", "manage", "create"],
    updatePermissions: ["admin", "manage", "update"],
    deletePermissions: ["admin", "manage", "delete"],
    allowCreate: true,
    allowDelete: true,
  },
  {
    identifier: "animalTypes",
    label: "Tipos de animal",
    description: "Estruturas do catalogo",
    readPermissions: ["admin", "manage", "get"],
    createPermissions: ["admin", "manage", "create"],
    updatePermissions: ["admin", "manage", "update"],
    deletePermissions: ["admin", "manage", "delete"],
    allowCreate: true,
    allowDelete: true,
  },
  {
    identifier: "animals",
    label: "Animais",
    description: "Itens disponiveis no catalogo",
    readPermissions: ["admin", "manage", "get"],
    createPermissions: ["admin", "manage", "create"],
    updatePermissions: ["admin", "manage", "update"],
    deletePermissions: ["admin", "manage", "delete"],
    allowCreate: true,
    allowDelete: true,
  },
  {
    identifier: "carouselEntries",
    label: "Carrossel",
    description: "Destaques da pagina inicial",
    readPermissions: ["admin", "manage", "get"],
    createPermissions: ["admin", "manage", "create"],
    updatePermissions: ["admin", "manage", "update"],
    deletePermissions: ["admin", "manage", "delete"],
    allowCreate: true,
    allowDelete: true,
  },
  {
    identifier: "adminClasses",
    label: "Classes administrativas",
    description: "Configuracao das permissoes de cada classe do painel",
    readPermissions: ["admin", "manage", "get"],
    createPermissions: ["admin", "manage", "create"],
    updatePermissions: ["admin", "manage", "update"],
    deletePermissions: ["admin", "manage", "delete"],
    allowCreate: false,
    allowDelete: false,
  },
] as const;

function buildPermissionKey(identifier: string, scope: string) {
  return `${identifier}:${scope}`;
}

function collectPermissionKeys() {
  return [...new Set(
    adminClassDefinitions.flatMap(item =>
      [
        ...item.readPermissions,
        ...item.createPermissions,
        ...item.updatePermissions,
        ...item.deletePermissions,
      ].map(scope => buildPermissionKey(item.identifier, scope)),
    ),
  )];
}

const permissions = collectPermissionKeys();

const rolePermissions = {
  admin: permissions,
  catalog_manager: [
    buildPermissionKey("animals", "manage"),
    buildPermissionKey("animalTypes", "manage"),
    buildPermissionKey("characteristics", "manage"),
    buildPermissionKey("carouselEntries", "manage"),
  ],
  sales: [buildPermissionKey("animals", "get")],
} as const;

const groups = [
  { identifier: "admin", name: "Administrador", roleName: "admin" },
  { identifier: "catalog_manager", name: "Gerenciador de Catalogo", roleName: "catalog_manager" },
  { identifier: "sales", name: "Comercial", roleName: "sales" },
] as const;

const users = [
  {
    email: "admin@catalog.com",
    groupIdentifier: "admin",
    name: "Admin",
    password: "admin123",
  },
  {
    email: "catalogo@harashub.com",
    groupIdentifier: "catalog_manager",
    name: "Equipe Catalogo",
    password: "catalogo123",
  },
  {
    email: "comercial@harashub.com",
    groupIdentifier: "sales",
    name: "Equipe Comercial",
    password: "comercial123",
  },
] as const;

const characteristicDefinitions = [
  { key: "coat", label: "Pelagem", options: ["Alazao", "Castanho", "Tordilho"], isFilterable: true, dataType: "select" },
  { key: "birthDate", label: "Data de nascimento", options: [], isFilterable: false, dataType: "date" },
  { key: "registry", label: "Registro", options: [], isFilterable: false, dataType: "text" },
  { key: "champion", label: "Premiado", options: [], isFilterable: true, dataType: "boolean" },
  { key: "origin", label: "Origem", options: [], isFilterable: false, dataType: "text" },
  { key: "gait", label: "Andamento", options: ["Marcha batida", "Marcha picada", "Trote"], isFilterable: true, dataType: "select" },
] as const;

const animalTypeDefinitions = [
  {
    characteristics: [
      { key: "coat", dataType: "select", displayOrder: 1, required: true, showInCard: true },
      { key: "birthDate", dataType: "date", displayOrder: 2, required: true, showInCard: true },
      { key: "registry", dataType: "text", displayOrder: 3, required: true, showInCard: false },
      { key: "champion", dataType: "boolean", displayOrder: 4, required: false, showInCard: false },
      { key: "origin", dataType: "text", displayOrder: 5, required: false, showInCard: false },
      { key: "gait", dataType: "select", displayOrder: 6, required: false, showInCard: true },
    ],
    name: "Garanhao",
  },
  {
    characteristics: [
      { key: "coat", dataType: "select", displayOrder: 1, required: true, showInCard: true },
      { key: "birthDate", dataType: "date", displayOrder: 2, required: true, showInCard: true },
      { key: "registry", dataType: "text", displayOrder: 3, required: true, showInCard: false },
      { key: "origin", dataType: "text", displayOrder: 4, required: false, showInCard: false },
      { key: "champion", dataType: "boolean", displayOrder: 5, required: false, showInCard: true },
    ],
    name: "Matriz",
  },
  {
    characteristics: [
      { key: "coat", dataType: "select", displayOrder: 1, required: true, showInCard: true },
      { key: "birthDate", dataType: "date", displayOrder: 2, required: true, showInCard: true },
      { key: "origin", dataType: "text", displayOrder: 3, required: false, showInCard: false },
      { key: "gait", dataType: "select", displayOrder: 4, required: false, showInCard: true },
    ],
    name: "Potro",
  },
] as const;

const animals = [
  {
    animalTypeName: "Garanhao",
    availability: "available",
    description:
      "Reprodutor de andamento firme, genealogia consistente e temperamento equilibrado para pistas e reproducoes selecionadas.",
    identifier: "atlas-do-vale",
    name: "Atlas do Vale",
    values: {
      birthDate: "2019-02-10",
      champion: true,
      coat: "Castanho",
      gait: "Marcha batida",
      origin: "Haras do Vale - MG",
      registry: "HV-ATLAS-001",
    },
  },
  {
    animalTypeName: "Garanhao",
    availability: "available",
    description:
      "Animal com excelente aprumo, boa resposta em treinamento e forte potencial para coberturas dirigidas.",
    identifier: "orion-imperial",
    name: "Orion Imperial",
    values: {
      birthDate: "2020-01-08",
      champion: false,
      coat: "Tordilho",
      gait: "Marcha picada",
      origin: "Fazenda Imperial - SP",
      registry: "FI-ORION-014",
    },
  },
  {
    animalTypeName: "Matriz",
    availability: "available",
    description:
      "Matriz de linhagem funcional, boa fertilidade e historico consistente de potros com bom desenvolvimento.",
    identifier: "safira-da-serra",
    name: "Safira da Serra",
    values: {
      birthDate: "2017-03-02",
      champion: true,
      coat: "Alazao",
      origin: "Serra Azul - GO",
      registry: "SAF-0092",
    },
  },
  {
    animalTypeName: "Matriz",
    availability: "unavailable",
    description:
      "Matriz reservada para acasalamento interno, com sangue forte e comportamento muito regular no manejo.",
    identifier: "lua-morena",
    name: "Lua Morena",
    values: {
      birthDate: "2018-02-20",
      champion: false,
      coat: "Castanho",
      origin: "Haras Morena - BA",
      registry: "HM-LUA-118",
    },
  },
  {
    animalTypeName: "Potro",
    availability: "available",
    description:
      "Potro jovem com movimentacao expressiva, boa adaptacao ao manejo e perspectiva interessante para doma futura.",
    identifier: "ventania-do-norte",
    name: "Ventania do Norte",
    values: {
      birthDate: "2023-08-15",
      coat: "Tordilho",
      gait: "Trote",
      origin: "Norte dos Gerais - MG",
    },
  },
  {
    animalTypeName: "Potro",
    availability: "available",
    description:
      "Potra com boa conformacao, perfil manso e evolucao consistente no trabalho de base.",
    identifier: "jade-real",
    name: "Jade Real",
    values: {
      birthDate: "2024-10-01",
      coat: "Alazao",
      gait: "Marcha batida",
      origin: "Haras Real - PR",
    },
  },
] as const;

const carouselEntries = [
  {
    animalIdentifier: "atlas-do-vale",
    description: "Destaque de reproducao com andamento firme e genealogia consistente.",
    displayOrder: 1,
  },
  {
    animalIdentifier: "safira-da-serra",
    description: "Matriz funcional com historico regular de crias e linhagem confiavel.",
    displayOrder: 2,
  },
  {
    animalIdentifier: "ventania-do-norte",
    description: "Potro jovem com movimentacao expressiva e perspectiva de evolucao.",
    displayOrder: 3,
  },
] as const;

async function ensureGroupRole(groupId: string, roleId: string) {
  const existingGroupRole = await prisma.groupRole.findFirst({
    where: {
      groupId,
      roleId,
    },
  });

  if (!existingGroupRole) {
    await prisma.groupRole.create({
      data: {
        groupId,
        roleId,
      },
    });
  }
}

async function ensureRolePermission(roleId: string, permissionId: string) {
  const existingRolePermission = await prisma.rolePermission.findFirst({
    where: {
      permissionId,
      roleId,
    },
  });

  if (!existingRolePermission) {
    await prisma.rolePermission.create({
      data: {
        permissionId,
        roleId,
      },
    });
  }
}

async function ensureUserGroup(userId: string, groupId: string) {
  const existingUserGroup = await prisma.userGroup.findFirst({
    where: {
      groupId,
      userId,
    },
  });

  if (!existingUserGroup) {
    await prisma.userGroup.create({
      data: {
        groupId,
        userId,
      },
    });
  }
}

async function ensureAdminClassPermissionConstraints() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdminClass"
    DROP CONSTRAINT IF EXISTS "AdminClass_readPermissions_required",
    DROP CONSTRAINT IF EXISTS "AdminClass_createPermissions_required",
    DROP CONSTRAINT IF EXISTS "AdminClass_updatePermissions_required",
    DROP CONSTRAINT IF EXISTS "AdminClass_deletePermissions_required"
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AdminClass"
    ADD CONSTRAINT "AdminClass_readPermissions_required"
      CHECK ("readPermissions" @> ARRAY['admin', 'manage', 'get']::text[]),
    ADD CONSTRAINT "AdminClass_createPermissions_required"
      CHECK ("createPermissions" @> ARRAY['admin', 'manage', 'create']::text[]),
    ADD CONSTRAINT "AdminClass_updatePermissions_required"
      CHECK ("updatePermissions" @> ARRAY['admin', 'manage', 'update']::text[]),
    ADD CONSTRAINT "AdminClass_deletePermissions_required"
      CHECK ("deletePermissions" @> ARRAY['admin', 'manage', 'delete']::text[])
  `);
}

async function main() {
  await ensureAdminClassPermissionConstraints();

  for (const adminClassDefinition of adminClassDefinitions) {
    await prisma.adminClass.upsert({
      where: {
        identifier: adminClassDefinition.identifier,
      },
      update: {},
      create: {
        allowCreate: adminClassDefinition.allowCreate,
        allowDelete: adminClassDefinition.allowDelete,
        createPermissions: [...adminClassDefinition.createPermissions],
        deletePermissions: [...adminClassDefinition.deletePermissions],
        description: adminClassDefinition.description,
        identifier: adminClassDefinition.identifier,
        label: adminClassDefinition.label,
        readPermissions: [...adminClassDefinition.readPermissions],
        updatePermissions: [...adminClassDefinition.updatePermissions],
      },
    });
  }

  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();

  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  const permissionMap = new Map<string, { id: string }>();

  for (const key of permissions) {
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key },
      select: { id: true },
    });
    permissionMap.set(key, permission);
  }

  const roleMap = new Map<string, { id: string }>();

  for (const roleName of Object.keys(rolePermissions) as Array<keyof typeof rolePermissions>) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
      select: { id: true },
    });

    roleMap.set(roleName, role);

    for (const permissionKey of rolePermissions[roleName]) {
      const permission = permissionMap.get(permissionKey);

      if (permission) {
        await ensureRolePermission(role.id, permission.id);
      }
    }
  }

  const groupMap = new Map<string, { id: string }>();

  for (const groupDefinition of groups) {
    const group = await prisma.group.upsert({
      where: { identifier: groupDefinition.identifier },
      update: {
        name: groupDefinition.name,
      },
      create: {
        identifier: groupDefinition.identifier,
        name: groupDefinition.name,
      },
      select: { id: true },
    });

    groupMap.set(groupDefinition.identifier, group);

    const role = roleMap.get(groupDefinition.roleName);

    if (role) {
      await ensureGroupRole(group.id, role.id);
    }
  }

  for (const userDefinition of users) {
    const passwordHash = await bcrypt.hash(userDefinition.password, 10);
    const user = await prisma.user.upsert({
      where: { email: userDefinition.email },
      update: {
        name: userDefinition.name,
        password: passwordHash,
      },
      create: {
        email: userDefinition.email,
        name: userDefinition.name,
        password: passwordHash,
      },
      select: { id: true },
    });

    const group = groupMap.get(userDefinition.groupIdentifier);

    if (group) {
      await ensureUserGroup(user.id, group.id);
    }
  }

  await prisma.animalCharacteristicValue.deleteMany();
  await prisma.carouselEntry.deleteMany();
  await prisma.animalMedia.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.animalTypeCharacteristic.deleteMany();
  await prisma.characteristicOption.deleteMany();
  await prisma.characteristic.deleteMany();
  await prisma.animalType.deleteMany();

  const characteristicMap = new Map<string, { dataType: string; id: string; options: Map<string, { id: string }> }>();

  for (const characteristicDefinition of characteristicDefinitions) {
    const characteristic = await prisma.characteristic.create({
      data: {
        isFilterable: characteristicDefinition.isFilterable,
        dataType: characteristicDefinition.dataType,
        key: characteristicDefinition.key,
        label: characteristicDefinition.label,
      },
      select: {
        id: true,
      },
    });

    const optionMap = new Map<string, { id: string }>();

    for (const [index, optionLabel] of characteristicDefinition.options.entries()) {
      const option = await prisma.characteristicOption.create({
        data: {
          characteristicId: characteristic.id,
          displayOrder: index + 1,
          label: optionLabel,
          value: optionLabel.toLowerCase().replaceAll(" ", "_"),
        },
        select: {
          id: true,
        },
      });

      optionMap.set(optionLabel, option);
    }

    characteristicMap.set(characteristicDefinition.key, {
      dataType: characteristicDefinition.dataType,
      id: characteristic.id,
      options: optionMap,
    });
  }

  const animalTypeMap = new Map<string, { id: string }>();
  const animalMediaMap = new Map<string, { id: string }>();

  for (const animalTypeDefinition of animalTypeDefinitions) {
    const animalType = await prisma.animalType.create({
      data: {
        name: animalTypeDefinition.name,
      },
      select: {
        id: true,
      },
    });

    animalTypeMap.set(animalTypeDefinition.name, animalType);

    for (const characteristicDefinition of animalTypeDefinition.characteristics) {
      const characteristic = characteristicMap.get(characteristicDefinition.key);

      if (!characteristic) {
        continue;
      }

      await prisma.animalTypeCharacteristic.create({
        data: {
          animalTypeId: animalType.id,
          characteristicId: characteristic.id,
          dataType: characteristicDefinition.dataType,
          displayOrder: characteristicDefinition.displayOrder,
          required: characteristicDefinition.required,
          showInCard: characteristicDefinition.showInCard,
        },
      });
    }
  }

  for (const animalDefinition of animals) {
    const animalType = animalTypeMap.get(animalDefinition.animalTypeName);

    if (!animalType) {
      continue;
    }

    const animal = await prisma.animal.create({
      data: {
        animalTypeId: animalType.id,
        availability: animalDefinition.availability,
        description: animalDefinition.description,
        identifier: animalDefinition.identifier,
        name: animalDefinition.name,
      },
      select: {
        id: true,
      },
    });

    const media = await prisma.animalMedia.create({
      data: {
        animalId: animal.id,
        bucket: "local-public",
        contentType: "image/webp",
        fileName: "cavalo.webp",
        kind: "image",
        storageKey: "/images/cavalo.webp",
      },
      select: {
        id: true,
      },
    });
    animalMediaMap.set(animalDefinition.identifier, media);

    for (const [key, value] of Object.entries(animalDefinition.values)) {
      const characteristic = characteristicMap.get(key);

      if (!characteristic) {
        continue;
      }

      const data: {
        animalId: string;
        characteristicId: string;
        optionId?: string;
        valueBoolean?: boolean;
        valueDate?: Date;
        valueNumber?: number;
        valueText?: string;
      } = {
        animalId: animal.id,
        characteristicId: characteristic.id,
      };

      if (typeof value === "boolean") {
        data.valueBoolean = value;
      } else if (typeof value === "number") {
        data.valueNumber = value;
      } else if (characteristic.dataType === "date") {
        const parsedDate = parseDateInputValue(value);

        if (parsedDate) {
          data.valueDate = parsedDate;
        }
      } else {
        const option = characteristic.options.get(value);

        if (option) {
          data.optionId = option.id;
        } else {
          data.valueText = value;
        }
      }

      await prisma.animalCharacteristicValue.create({
        data,
      });
    }
  }

  for (const carouselEntryDefinition of carouselEntries) {
    const media = animalMediaMap.get(carouselEntryDefinition.animalIdentifier);

    if (!media) {
      continue;
    }

    await prisma.carouselEntry.create({
      data: {
        animalMediaId: media.id,
        description: carouselEntryDefinition.description,
        displayOrder: carouselEntryDefinition.displayOrder,
      },
    });
  }

  console.log("RBAC and catalog seeded");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
