## Supabase Setup

pnpm add @nuxtjs/supabase
pnpm prisma generate
pnpm prisma migrate dev --name init_schema --create-only
pnpm prisma migrate dev

## Nuxt.js + Prisma ORM + Prisma Postgres Setup (pnpm)

pnpm prisma db push - for schema update

## Eslint setup

pnpm eslint . --fix

## Vector Embedding length change

ALTER TABLE "Product" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "Product" ADD COLUMN "embedding" vector(768);

## Prerequisites

- Node.js 20.19+
- pnpm installed (`npm install -g pnpm`)
- TypeScript 5.4.0+

---

## 1. Nuxt প্রজেক্ট তৈরি করুন

```bash
pnpm dlx nuxi@latest init hello-prisma
cd hello-prisma
```

---

## 2. Dependencies ইনস্টল করুন

```bash
pnpm add @prisma/client @prisma/adapter-pg pg dotenv
pnpm add -D prisma @types/pg tsx
```

---

## 3. Prisma Initialize করুন

```bash
pnpm dlx prisma init --output ./generated
```

এটি তৈরি করবে:

- `prisma/schema.prisma`
- `prisma.config.ts`
- `.env`

---

## 4. Prisma Postgres Database তৈরি করুন

```bash
pnpm dlx create-db
```

> ⚠️ এই কমান্ড একটি `postgres://...` connection string রিটার্ন করবে।  
> সেটি `.env` ফাইলে আপডেট করুন:

```text
DATABASE_URL="postgres://..."
```

---

## 5. `prisma/schema.prisma` আপডেট করুন

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated"
}

datasource db {
  provider = "postgresql"
  # ✅ url এখানে নেই — prisma.config.ts-এ আছে
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
}
```

---

## 6. `prisma.config.ts` তৈরি করুন

```typescript
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx ./prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

---

## 7. Prisma Client তৈরি করুন

`server/utils/db.ts` ফাইল তৈরি করুন:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client"; // ✅ /client সহ

const prismaClientSingleton = () => {
  const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter: pool });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

> Nuxt স্বয়ংক্রিয়ভাবে `server/utils/` থেকে export import করে, তাই সব API route-এ `prisma` auto-available।

---

## 8. API Routes তৈরি করুন

**`server/api/users.get.ts`** — সব user fetch করুন:

```typescript
export default defineEventHandler(async () => {
  try {
    const users = await prisma.user.findMany({
      include: { posts: true },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch users",
    });
  }
});
```

**`server/api/users.post.ts`** — নতুন user তৈরি করুন:

```typescript
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ name: string; email: string }>(event);

    if (!body.email) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email is required",
      });
    }

    const user = await prisma.user.create({
      data: { name: body.name, email: body.email },
    });

    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create user",
    });
  }
});
```

---

## 9. `app.vue` আপডেট করুন

```html
<template>
  <div>
    <h1>Users</h1>
    <ul v-if="users?.length">
      <li v-for="user in users" :key="user.id">
        {{ user.name }} ({{ user.email }})
      </li>
    </ul>
    <p v-else>No users yet.</p>
  </div>
</template>

<script setup>
  const { data: users } = await useFetch("/api/users");
</script>
```

---

## 10. `package.json` Scripts আপডেট করুন

```json
{
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "prisma generate && nuxt prepare",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:test": "tsx scripts/test-database.ts"
  }
}
```

---

## 11. Test Script তৈরি করুন

`scripts/test-database.ts`:

```typescript
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

async function testDatabase() {
  console.log("🔍 Testing Prisma Postgres connection...\n");
  try {
    console.log("✅ Connected to database!");

    const newUser = await prisma.user.create({
      data: { email: "demo@example.com", name: "Demo User" },
    });
    console.log("✅ Created user:", newUser);

    const allUsers = await prisma.user.findMany();
    console.log(`✅ Found ${allUsers.length} user(s)`);

    console.log("\n🎉 All tests passed!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testDatabase();
```

---

## 12. Database Schema Push ও Client Generate করুন

```bash
pnpm dlx prisma db push
pnpm dlx prisma generate
```

---

## 13. Setup Test করুন

```bash
pnpm run db:test
```

---

## 14. Development Server চালু করুন

```bash
pnpm run dev
```

`http://localhost:3000` খুলুন।

---

## ❌ সাধারণ ভুল যা করবেন না

| ভুল                                             | সঠিক                                                           |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `provider = "prisma-client-js"`                 | `provider = "prisma-client"`                                   |
| `import { PrismaClient } from '@prisma/client'` | `import { PrismaClient } from '../../prisma/generated/client'` |
| `url = env("DATABASE_URL")` datasource-এ        | শুধু `prisma.config.ts`-এ রাখুন                                |
| `DATABASE_URL="prisma+postgres://..."`          | `DATABASE_URL="postgres://..."`                                |
| `new PrismaClient()` (adapter ছাড়া)            | `new PrismaClient({ adapter: pool })`                          |
