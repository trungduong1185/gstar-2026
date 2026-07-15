import { prisma } from "@/lib/prisma";

export type AdminUserPublic = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toPublic(user: { id: string; username: string; displayName: string; email: string; role: string; active: boolean; lastLoginAt: Date | null; createdAt: Date; updatedAt: Date }): AdminUserPublic {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export async function listUsers() {
  const users = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return users.map(toPublic);
}

export async function findUserByCredentials(username: string) {
  return prisma.adminUser.findUnique({ where: { username } });
}

export async function createUser(data: { username: string; displayName: string; email: string; password: string; role?: string }) {
  const user = await prisma.adminUser.create({
    data: {
      username: data.username.trim(),
      displayName: data.displayName.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash: data.password,
      role: data.role || "admin"
    }
  });
  return toPublic(user);
}

export async function updateUser(id: string, data: { displayName?: string; email?: string; passwordHash?: string | null; role?: string; active?: boolean }) {
  const update: Record<string, unknown> = {};
  if (data.displayName !== undefined) update.displayName = data.displayName.trim();
  if (data.email !== undefined) update.email = data.email.trim().toLowerCase();
  if (data.passwordHash !== undefined && data.passwordHash !== null) update.passwordHash = data.passwordHash;
  if (data.role !== undefined) update.role = data.role;
  if (data.active !== undefined) update.active = data.active;
  const user = await prisma.adminUser.update({ where: { id }, data: update });
  return toPublic(user);
}

export async function deleteUser(id: string) {
  await prisma.adminUser.delete({ where: { id } });
}

export async function touchLastLogin(id: string) {
  await prisma.adminUser.update({ where: { id }, data: { lastLoginAt: new Date() } });
}

export async function userCount() {
  return prisma.adminUser.count();
}
