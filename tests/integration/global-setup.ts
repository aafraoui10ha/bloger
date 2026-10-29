import { execSync } from "node:child_process";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "mysql://root@localhost:3306/bloger_test";

/** Applies migrations to the dedicated test database (create it once: CREATE DATABASE bloger_test CHARACTER SET utf8mb4). */
export default function setup() {
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: "pipe" });
}
