import assert from "node:assert/strict";
import test from "node:test";
import { getDatabaseConnectionString, getRuntimeEnv } from "./runtime-env";

const DATABASE_KEYS = ["DATABASE_URL", "POSTGRES_URL", "STORAGE_DATABASE_URL"] as const;

test("server environment lookup trims configured values", () => {
  const original = process.env.MUSEVIBE_TEST_SERVER_ENV;
  process.env.MUSEVIBE_TEST_SERVER_ENV = "  pooled-value  ";
  try {
    assert.equal(getRuntimeEnv("MUSEVIBE_TEST_SERVER_ENV"), "pooled-value");
  } finally {
    if (original === undefined) delete process.env.MUSEVIBE_TEST_SERVER_ENV;
    else process.env.MUSEVIBE_TEST_SERVER_ENV = original;
  }
});

test("unset or blank values are unavailable", () => {
  const original = process.env.MUSEVIBE_TEST_SERVER_ENV;
  try {
    delete process.env.MUSEVIBE_TEST_SERVER_ENV;
    assert.equal(getRuntimeEnv("MUSEVIBE_TEST_SERVER_ENV"), undefined);
    process.env.MUSEVIBE_TEST_SERVER_ENV = "   ";
    assert.equal(getRuntimeEnv("MUSEVIBE_TEST_SERVER_ENV"), undefined);
  } finally {
    if (original === undefined) delete process.env.MUSEVIBE_TEST_SERVER_ENV;
    else process.env.MUSEVIBE_TEST_SERVER_ENV = original;
  }
});

test("Neon connection resolution prefers DATABASE_URL, then Vercel integration aliases", () => {
  const previous = Object.fromEntries(DATABASE_KEYS.map((key) => [key, process.env[key]]));
  try {
    for (const key of DATABASE_KEYS) delete process.env[key];
    assert.equal(getDatabaseConnectionString(), undefined);
    process.env.STORAGE_DATABASE_URL = " storage-url ";
    assert.equal(getDatabaseConnectionString(), "storage-url");
    process.env.POSTGRES_URL = " postgres-url ";
    assert.equal(getDatabaseConnectionString(), "postgres-url");
    process.env.DATABASE_URL = " database-url ";
    assert.equal(getDatabaseConnectionString(), "database-url");
  } finally {
    for (const key of DATABASE_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
