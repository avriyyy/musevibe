"use client";

/**
 * Shared shape for whiteboard artboards: an HTML document rendered live,
 * with a Figma-style frame label (title plus page slug) floating above it.
 * The label lives outside the selectable frame box, like Figma frame names.
 */

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLShape,
} from "tldraw";

declare module "@tldraw/tlschema" {
  export interface TLGlobalShapePropsMap {
    "html-prototype": {
      html: string;
      w: number;
      h: number;
      title: string;
      slug: string;
    };
  }
}

export type HtmlPrototypeShape = TLShape<"html-prototype">;

export class HtmlPrototypeShapeUtil extends BaseBoxShapeUtil<HtmlPrototypeShape> {
  static override type = "html-prototype" as const;

  static override props = {
    html: T.string,
    w: T.number,
    h: T.number,
    title: T.string,
    slug: T.string,
  };

  override getDefaultProps(): HtmlPrototypeShape["props"] {
    return { html: "", w: 960, h: 640, title: "", slug: "" };
  }

  override getIndicatorPath(shape: HtmlPrototypeShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  override component(shape: HtmlPrototypeShape) {
    const { html, title, slug } = shape.props;
    return (
      <HTMLContainer>
        {(title || slug) && (
          <div
            style={{
              position: "absolute",
              top: -30,
              left: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#e8eaed",
                fontFamily:
                  "system-ui, -apple-system, sans-serif",
              }}
            >
              {title}
            </span>
            {slug ? (
              <span
                style={{
                  fontSize: 12,
                  color: "#9aa0ae",
                  fontFamily:
                    "ui-monospace, monospace",
                }}
              >
                {slug}
              </span>
            ) : null}
          </div>
        )}
        <iframe
          title={title || "Preview"}
          srcDoc={html}
          sandbox="allow-scripts"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            borderRadius: 12,
            backgroundColor: "#ffffff",
            pointerEvents: "none",
            display: "block",
          }}
        />
      </HTMLContainer>
    );
  }
}

/** Stable identity across renders: a fresh array would recreate the store. */
export const HTML_SHAPE_UTILS = [HtmlPrototypeShapeUtil];
