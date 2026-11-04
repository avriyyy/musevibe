import { test } from "node:test";
import assert from "node:assert/strict";
import { getPostAuthDestination, isAuthEntryRoute, isPublicAuthRoute, safeReturnTo, signInUrl } from "./auth-routes";

test("landing, auth, and recovery pages are public", () => {
  assert.equal(isPublicAuthRoute("/"), true);
  assert.equal(isPublicAuthRoute("/sign-in"), true);
  assert.equal(isPublicAuthRoute("/register"), true);
  assert.equal(isPublicAuthRoute("/forgot-password"), true);
  assert.equal(isPublicAuthRoute("/reset-password"), true);
  assert.equal(isPublicAuthRoute("/projects"), false);
  assert.equal(isPublicAuthRoute("/profile"), false);
  assert.equal(isPublicAuthRoute("/settings"), false);
  assert.equal(isPublicAuthRoute("/ide"), false);
});

test("wizard and workspaces require a session; guests stop at landing and auth", () => {
  assert.equal(isPublicAuthRoute("/form-wizard"), false);
  assert.equal(isPublicAuthRoute("/project/abc"), false);
  assert.equal(isPublicAuthRoute("/project/a/b"), false);
  assert.equal(isPublicAuthRoute("/projects"), false);
  assert.equal(isPublicAuthRoute("/project"), false);
  assert.equal(isPublicAuthRoute("/login"), true);
  assert.equal(isPublicAuthRoute("/account"), true);
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

test("signed-in users land in the app, not on the marketing page", () => {
  assert.equal(getPostAuthDestination(""), "/projects");
  assert.equal(getPostAuthDestination("?next=%2Fnew"), "/new");
  assert.equal(getPostAuthDestination("?next=https%3A%2F%2Fevil.example"), "/");
});

test("the new-project composer requires a session", () => {
  assert.equal(isPublicAuthRoute("/new"), false);
});
