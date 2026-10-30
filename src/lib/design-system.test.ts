import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFallbackPageHtml,
  classifyPrototypeHref,
  fallbackPagePlan,
  resolvePrototypeFrameId,
} from "./design-system";

const FRAMES = ["design-system.html", "page-home.html", "page-settings.html", "page-settings-advanced.html"];

test("resolves exact filenames and relative/path/query/hash forms", () => {
  assert.equal(resolvePrototypeFrameId("page-settings.html", FRAMES), "page-settings.html");
  assert.equal(resolvePrototypeFrameId("./page-settings.html", FRAMES), "page-settings.html");
  assert.equal(resolvePrototypeFrameId("/page-settings.html", FRAMES), "page-settings.html");
  assert.equal(resolvePrototypeFrameId("../pages/page-settings.html", FRAMES), "page-settings.html");
  assert.equal(resolvePrototypeFrameId("page-settings.html?foo=1", FRAMES), "page-settings.html");
  assert.equal(resolvePrototypeFrameId("page-settings.html#team", FRAMES), "page-settings.html");
  assert.equal(
    resolvePrototypeFrameId("./page-settings.html?foo=1#team", FRAMES),
    "page-settings.html",
  );
  assert.equal(resolvePrototypeFrameId("page-settings", FRAMES), "page-settings.html");
});

test("matching stays exact so similar slugs never collide", () => {
  assert.equal(
    resolvePrototypeFrameId("page-settings-advanced.html", FRAMES),
    "page-settings-advanced.html",
  );
  assert.equal(resolvePrototypeFrameId("page-setting.html", FRAMES), null);
  assert.equal(resolvePrototypeFrameId("settings.html", FRAMES), null);
  assert.equal(resolvePrototypeFrameId("page-settings.htmlx", FRAMES), null);
  assert.equal(resolvePrototypeFrameId("PAGE-SETTINGS.HTML", FRAMES), null);
});

test("fragments, empties, and external hrefs never resolve", () => {
  assert.equal(classifyPrototypeHref("#team").kind, "fragment");
  assert.equal(resolvePrototypeFrameId("#team", FRAMES), null);
  assert.equal(classifyPrototypeHref("").kind, "empty");
  assert.equal(classifyPrototypeHref("?foo=1").kind, "empty");
  for (const href of [
    "https://example.com/page-settings.html",
    "http://example.com/page-settings.html",
    "//example.com/page-settings.html",
    "mailto:hello@example.com",
    "tel:+15551234567",
    "javascript:void(0)",
    "data:text/html,<p>hi</p>",
  ]) {
    assert.equal(classifyPrototypeHref(href).kind, "external", href);
    assert.equal(resolvePrototypeFrameId(href, FRAMES), null, href);
  }
});

test("unresolved internal routes resolve to null for the live notice", () => {
  assert.equal(classifyPrototypeHref("page-missing.html").kind, "candidate");
  assert.equal(resolvePrototypeFrameId("page-missing.html", FRAMES), null);
  assert.equal(resolvePrototypeFrameId("/docs/page-missing.html#top", FRAMES), null);
});

test("local page previews explain their purpose instead of inventing generic next steps", () => {
  const html = buildFallbackPageHtml({
    projectName: "Library Manager",
    idea: "A website for managing a library.",
    prd: "",
    page: {
      slug: "overview",
      title: "Overview",
      brief: "See what needs attention in the library.",
    },
    designMd: "",
    tokensCss: "",
    plan: fallbackPagePlan(),
  });

  assert.match(html, /See what needs attention in the library/);
  assert.match(html, /Use Ask Muse in the workspace chat/);
  assert.doesNotMatch(html, /Next steps|Recent activity|Ready to review|<table/);
});

test("local page previews include only planned sections and the chosen action", () => {
  const html = buildFallbackPageHtml({
    projectName: "Library Manager",
    idea: "A website for managing a library.",
    prd: "",
    page: {
      slug: "items",
      title: "Items",
      brief: "Search the library catalog.",
      sections: ["Catalog search", "Recently added books"],
      primaryAction: "Add a book",
    },
    designMd: "",
    tokensCss: "",
    plan: fallbackPagePlan(),
  });

  assert.match(html, /Catalog search/);
  assert.match(html, /Recently added books/);
  assert.match(html, /Add a book/);
  assert.doesNotMatch(html, /Next steps|Recent activity|Ready to review|<table/);
});
