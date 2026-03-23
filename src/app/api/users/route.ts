import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: {
      email: "asc",
    },
    select: {
      createdAt: true,
      email: true,
      id: true,
      name: true,
      updatedAt: true,
    },
  });

  return Response.json(
    { users },
    {
      status: 200,
    },
  );
}
