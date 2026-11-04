import Image from "next/image";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Text } from "@astryxdesign/core/Text";

function Shot({
  src,
  alt,
  caption,
  ratio = 16 / 10,
}: {
  src: string;
  alt: string;
  caption: string;
  ratio?: number;
}) {
  return (
    <figure
      style={{
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <AspectRatio ratio={ratio}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1200px) 100vw, 1120px"
          loading="lazy"
          style={{ objectFit: "cover" }}
        />
      </AspectRatio>
      <figcaption>
        <Text type="body" color="secondary">
          {caption}
        </Text>
      </figcaption>
    </figure>
  );
}

export function DocsPanel() {
  return (
    <Shot
      src="/shots/shot-docs.jpg"
      alt="Workspace documents view showing a rendered PRD with a table of contents"
      caption="A PRD drafted from wizard answers, edited in place. Sample content shown."
    />
  );
}

export function BoardPanel() {
  return (
    <Shot
      src="/shots/shot-board.jpg"
      alt="Workspace task board with seven starter tasks in the To do column"
      caption="Starter tasks from the brief, ready to drag across the board."
    />
  );
}

export function PagesPanel() {
  return (
    <Shot
      src="/shots/shot-pages.jpg"
      alt="Design canvas showing color, typography, and spacing preview cards"
      caption="Design tokens committed on the canvas: color roles, type, and spacing."
    />
  );
}

export function WizardFigure() {
  return (
    <Shot
      src="/shots/shot-wizard.jpg"
      alt="Setup wizard questions step with answered options"
      caption="Four steps, about five minutes. Built-in questions keep it moving with no key."
    />
  );
}
