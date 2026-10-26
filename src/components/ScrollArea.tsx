import type { ElementType, ReactNode } from "react";

type ScrollAreaProps = {
  children: ReactNode;
  /** Frame classes: border, radius, background, layout. */
  className?: string;
  /** Extra classes for the scrolling element. */
  viewportClassName?: string;
  /** Semantic element for the scrolling surface. */
  as?: "div" | "ul";
};

export default function ScrollArea({
  children,
  className = "",
  viewportClassName = "",
  as = "div",
}: ScrollAreaProps) {
  const Viewport = as as ElementType;

  return (
    <div className={`scroll-inset ${className}`}>
      <Viewport
        className={`scroll-surface h-full overflow-y-auto ${viewportClassName}`}
      >
        {children}
      </Viewport>
    </div>
  );
}
