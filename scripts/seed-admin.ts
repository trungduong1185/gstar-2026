import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || process.env.DASHBOARD_USER || "";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@newturing.ai";
  const password = process.env.SEED_ADMIN_PASSWORD || process.env.DASHBOARD_PASSWORD || "";
  const displayName = process.env.SEED_ADMIN_NAME || "Administrator";

  if (!username || !password) {
    throw new Error("SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD are required for the initial admin user.");
  }
  if (password.length < 8) throw new Error("The initial admin password must be at least 8 characters.");

  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    console.log(`Skipping seed — ${existing} admin user(s) already exist.`);
    process.exit(0);
  }

  const hash = await hashPassword(password);
  await prisma.adminUser.create({
    data: { username, displayName, email, passwordHash: hash, role: "superadmin", active: true }
  });

  console.log("Admin user created:");
  console.log(`  Username: ${username}`);
  console.log(`  Email:    ${email}`);
  console.log("  Password: supplied through environment; not printed");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
