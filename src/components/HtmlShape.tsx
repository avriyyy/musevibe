"use client";

/**
 * A tldraw shape that renders a live HTML preview inside the canvas. The HTML
 * comes from the project's prototype.html file; the shape only carries a copy
 * so the drawing (position, size) persists with the snapshot.
 */

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLShape,
} from "tldraw";

declare module "@tldraw/tlschema" {
  export interface TLGlobalShapePropsMap {
    "html-prototype": { html: string; w: number; h: number };
  }
}

export type HtmlPrototypeShape = TLShape<"html-prototype">;

export class HtmlPrototypeShapeUtil extends BaseBoxShapeUtil<HtmlPrototypeShape> {
  static override type = "html-prototype" as const;

  static override props = {
    html: T.string,
    w: T.number,
    h: T.number,
  };

  override getDefaultProps(): HtmlPrototypeShape["props"] {
    return { html: "", w: 960, h: 640 };
  }

  override component(shape: HtmlPrototypeShape) {
    return (
      <HTMLContainer>
        <iframe
          title="App prototype preview"
          srcDoc={shape.props.html}
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

  override getIndicatorPath(shape: HtmlPrototypeShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
