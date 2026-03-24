import "dotenv/config";
import { prisma } from "@/src/lib/prisma";

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
  return [
    ...new Set(
      adminClassDefinitions.flatMap((item) =>
        [...item.readPermissions, ...item.createPermissions, ...item.updatePermissions, ...item.deletePermissions].map((scope) =>
          buildPermissionKey(item.identifier, scope),
        ),
      ),
    ),
  ];
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

const adminUserDefinition = {
  email: "admin@catalog.com",
  groupIdentifier: "admin",
  name: "Admin",
} as const;

function getAdminPasswordHash() {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!passwordHash) {
    throw new Error("ADMIN_PASSWORD_HASH nao definido. Configure o hash bcrypt do usuario admin no arquivo .env.");
  }

  return passwordHash;
}

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
  const adminPasswordHash = getAdminPasswordHash();

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

  const adminUser = await prisma.user.upsert({
    where: { email: adminUserDefinition.email },
    update: {
      name: adminUserDefinition.name,
      password: adminPasswordHash,
    },
    create: {
      email: adminUserDefinition.email,
      name: adminUserDefinition.name,
      password: adminPasswordHash,
    },
    select: { id: true },
  });

  const adminGroup = groupMap.get(adminUserDefinition.groupIdentifier);

  if (adminGroup) {
    await ensureUserGroup(adminUser.id, adminGroup.id);
  }

  console.log("RBAC seeded for deploy");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
