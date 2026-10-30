import { NextResponse } from "next/server";
import { aiGenerate } from "@/lib/ai";
import { parseDesignSystemResponse } from "@/lib/design-system";
import { fetchPublicHttpUrl } from "@/lib/safe-fetch";

const MAX_REF_CHARS = 6000;
const FETCH_TIMEOUT = 20000;

/** Strip a page down to readable text: scripts, styles, and tags go. */
function extractText(html: string): { title: string; text: string } {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, " ");
  const text = noScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REF_CHARS);
  return { title: title.slice(0, 200), text };
}

/**
 * Turn a reference link into a design system. The server fetches the page
 * (the browser never touches the URL), extracts its readable text, and the
 * model converts that into DESIGN.md plus tokens.css — the same shape the
 * wizard previews before the project is finished.
 */
export async function POST(req: Request) {
  let url = "";
  let projectName = "Untitled project";
  let idea = "";
  try {
    const body = (await req.json()) as {
      url?: unknown;
      projectName?: unknown;
      idea?: unknown;
    };
    if (typeof body.url === "string") url = body.url.trim();
    if (typeof body.projectName === "string" && body.projectName.trim()) {
      projectName = body.projectName.trim().slice(0, 120);
    }
    if (typeof body.idea === "string") idea = body.idea.trim();
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a url." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "That URL does not parse. Paste the full link including https://." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http and https links can be fetched." }, { status: 400 });
  }
  if (url.length > 2048) {
    return NextResponse.json({ error: "That link is too long. Paste a shorter page URL." }, { status: 400 });
  }

  let html = "";
  try {
    const res = await fetchPublicHttpUrl(parsed, FETCH_TIMEOUT);
    if (res.status < 200 || res.status >= 300) {
      return NextResponse.json(
        { error: `The link answered ${res.status}. Check it opens in a browser, or paste DESIGN.md text instead.` },
        { status: 422 },
      );
    }
    if (!/text|html/i.test(res.contentType)) {
      return NextResponse.json(
        { error: "That link is not a page (it looks like a file). Link a visible page, or paste DESIGN.md text instead." },
        { status: 422 },
      );
    }
    html = res.body;
  } catch {
    return NextResponse.json({ error: "The link could not be fetched. Check the address, or paste DESIGN.md text instead." }, { status: 422 });
  }

  const { title, text } = extractText(html);
  if (text.length < 200) {
    return NextResponse.json(
      { error: "That page has almost no readable text (it may render with JavaScript). Paste DESIGN.md text instead." },
      { status: 422 },
    );
  }

  const { buildDesignSystemPrompt } = await import("@/lib/design-system");
  const result = await aiGenerate(
    "design-system",
    buildDesignSystemPrompt(text, title, projectName, idea),
  );
  const parsedSystem = parseDesignSystemResponse(result.text);
  if (result.source === "local" || !parsedSystem || (!parsedSystem.designMd && !parsedSystem.tokensCss)) {
    return NextResponse.json(
      { error: "The model is unavailable, so the link could not be converted. Pick a template or paste DESIGN.md text instead." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    name: parsedSystem.name,
    designMd: parsedSystem.designMd,
    tokensCss: parsedSystem.tokensCss,
    source: result.source,
    refTitle: title,
  });
}
