// Point the app's Prisma client at the isolated test database before any import.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "mysql://root@localhost:3306/bloger_test";
process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
