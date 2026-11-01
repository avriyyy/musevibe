import { test } from "node:test";
import assert from "node:assert/strict";
import { authRedirectUrl } from "./redirect-url";

test("auth redirects from preview deployments use the canonical production origin", () => {
  assert.equal(
    authRedirectUrl("/sign-in?next=%2F", "https://musevibe-git-feature.vercel.app"),
    "https://musevibe.vercel.app/sign-in?next=%2F",
  );
});

test("local development keeps its own callback origin", () => {
  assert.equal(
    authRedirectUrl("/reset-password", "http://localhost:3000"),
    "http://localhost:3000/reset-password",
  );
});
