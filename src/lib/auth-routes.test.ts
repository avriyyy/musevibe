import { test } from "node:test";
import assert from "node:assert/strict";
import { getPostAuthDestination, isAuthEntryRoute, isPublicAuthRoute, safeReturnTo, signInUrl } from "./auth-routes";

test("only auth and recovery pages are public", () => {
  assert.equal(isPublicAuthRoute("/sign-in"), true);
  assert.equal(isPublicAuthRoute("/register"), true);
  assert.equal(isPublicAuthRoute("/forgot-password"), true);
  assert.equal(isPublicAuthRoute("/reset-password"), true);
  assert.equal(isPublicAuthRoute("/projects"), false);
  assert.equal(isPublicAuthRoute("/project/abc"), false);
  assert.equal(isPublicAuthRoute("/form-wizard"), false);
});

test("auth entry pages can be left automatically after a session is established", () => {
  assert.equal(isAuthEntryRoute("/sign-in"), true);
  assert.equal(isAuthEntryRoute("/register"), true);
  assert.equal(isAuthEntryRoute("/forgot-password"), false);
});

test("post-auth destinations accept only safe local paths", () => {
  assert.equal(safeReturnTo("/projects?tab=recent"), "/projects?tab=recent");
  assert.equal(safeReturnTo("https://evil.example"), "/");
  assert.equal(safeReturnTo("//evil.example"), "/");
  assert.equal(safeReturnTo("/\\\\evil.example"), "/");
  assert.equal(getPostAuthDestination("?next=%2Fproject%2Fabc"), "/project/abc");
  assert.equal(signInUrl("/projects"), "/sign-in?next=%2Fprojects");
});
