/**
 * Shared helpers for picking a UI element and turning it into a chat
 * quote. The same code runs against the generated prototype (inside a
 * same-origin frame) and against MuseVibe's own workspace, so it avoids
 * realm-bound checks and only reads plain DOM properties.
 */

/** A rectangle in CSS pixels, either viewport or frame space. */
export interface PickBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Name an element the way a developer would: id first, then the accessible
 * label, then classes. Tailwind utility classes are noise on MuseVibe's own
 * UI, so callers there pass includeClasses = false.
 */
export function describeElement(
  el: Element,
  includeClasses = true,
): { label: string; text: string } {
  const tag = el.tagName.toLowerCase();
  const aria = (el.getAttribute("aria-label") || "").trim();
  const id = (el as HTMLElement).id;
  const raw = (el as HTMLElement).className;
  const classes =
    includeClasses && typeof raw === "string"
      ? raw.split(/\s+/).filter(Boolean).slice(0, 2)
      : [];
  const label = id
    ? `${tag}#${id}`
    : aria
      ? `${tag}[${aria}]`
      : classes.length
        ? `${tag}.${classes.join(".")}`
        : tag;
  // Only the element's own text: a wrapper's whole subtree would bury the
  // actual component in the quote. Buttons and links are the exception,
  // their label usually lives in child spans.
  const own = Array.from(el.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent || "")
    .join(" ");
  let source = own.trim();
  if (!source) {
    const interactive = el.matches("button, a, [role='button'], [role='link']");
    if (el.children.length === 0 || (interactive && el.children.length <= 6)) {
      // innerText keeps a space between sibling spans; textContent would
      // glue "TRD" and "Technical Requirements Document" together.
      source =
        (el as HTMLElement).innerText || (el.textContent || "").trim();
    }
  }
  let text = ((source || "").trim().replace(/\s+/g, " ") || "").slice(0, 120);
  // The accessible name already carries the text, so quoting it again just
  // repeats itself.
  if (aria && text && aria.toLowerCase().includes(text.toLowerCase())) {
    text = "";
  }
  return { label, text };
}

export function boxOf(el: Element): PickBox {
  const rect = el.getBoundingClientRect();
  return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
}

/** A picked component (or task) pinned into the chat, never sent on its own. */
export interface ChatQuote {
  label: string;
  text: string;
  /** The user's change request; empty for bare context pins like tasks. */
  comment: string;
}

/** The quote that lands in the chat input, never sent on its own. */
export function quoteFor(label: string, text: string, comment: string): string {
  const where = text ? ` "${text}"` : "";
  const note = comment.trim() ? ` ${comment.trim()}` : "";
  return `[${label}${where}]${note}`;
}

/** One structured line per pinned quote, easy for the model to parse. */
export function quoteLine(quote: ChatQuote): string {
  const where = quote.text ? `: "${quote.text}"` : "";
  const note = quote.comment.trim() ? ` — ${quote.comment.trim()}` : "";
  return `- ${quote.label}${where}${note}`;
}
