import type { Deck, Slide } from "./types";

/**
 * Pure mapping from deck slides to a declarative PPTX spec, consumed by
 * app/api/export/route.ts and unit-tested directly. Styling follows the
 * valon-brand skill §3 (hex values carry no "#", one gold accent per slide,
 * wordmark bottom-right on non-cover slides).
 */

// Brand tokens (pptx hex format: no leading #)
const ESPRESSO = "231810";
const GOLD = "E19614";
const CREAM = "F8F6F3";
const WHITE = "FFFFFF";
const MUTED = "827057";

const SERIF = "Georgia";
const SANS = "Aptos";

// 16:9 deck grid in inches
export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;
const MARGIN = 0.6;

export type PptxTextSpec = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontFace: string;
  fontSize: number;
  color: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  bullet?: boolean;
  lineSpacing?: number;
};

export type PptxImageSpec = {
  path: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Set when the image is a data URL rather than a file path. */
  isData?: boolean;
};

export type PptxShapeSpec = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
};

export type PptxSlideSpec = {
  background: string;
  texts: PptxTextSpec[];
  images: PptxImageSpec[];
  /** Rectangles only — used for the single gold accent rule. */
  shapes: PptxShapeSpec[];
};

export type WordmarkPaths = {
  /** Wordmark for light backgrounds. */
  light: string;
  /** Wordmark for espresso backgrounds. */
  dark: string;
};

function wordmark(path: string): PptxImageSpec {
  // Skill: 0.7–1.0" wide, 0.3" margin, bottom-right. Source SVG is 399:96.
  const w = 0.9;
  const h = w * (96 / 399);
  return {
    path,
    x: SLIDE_W - w - 0.3,
    y: SLIDE_H - h - 0.3,
    w,
    h,
  };
}

function goldRule(x: number, y: number, w: number): PptxShapeSpec {
  return { x, y, w, h: 0.045, fill: GOLD };
}

function mapTitleSlide(slide: Slide, marks: WordmarkPaths): PptxSlideSpec {
  const texts: PptxTextSpec[] = [
    {
      text: slide.heading,
      x: MARGIN,
      y: 2.5,
      w: SLIDE_W - MARGIN * 2,
      h: 1.9,
      fontFace: SERIF,
      fontSize: 48,
      color: ESPRESSO,
      bold: false,
      align: "left",
      valign: "bottom",
    },
  ];

  if (slide.subheading) {
    texts.push({
      text: slide.subheading,
      x: MARGIN,
      y: 4.55,
      w: SLIDE_W - MARGIN * 2,
      h: 0.7,
      fontFace: SANS,
      fontSize: 18,
      color: MUTED,
      align: "left",
      valign: "top",
    });
  }

  return {
    background: WHITE,
    texts,
    images: [
      {
        path: marks.light,
        x: MARGIN,
        y: SLIDE_H - 0.85,
        w: 1.3,
        h: 1.3 * (96 / 399),
      },
    ],
    shapes: [goldRule(MARGIN, 2.3, 1.6)],
  };
}

function mapContentSlide(slide: Slide, marks: WordmarkPaths): PptxSlideSpec {
  const hasImage = Boolean(slide.imageData);
  const textWidth = hasImage ? 7.1 : SLIDE_W - MARGIN * 2;

  const texts: PptxTextSpec[] = [
    {
      text: slide.heading,
      x: MARGIN,
      y: 0.55,
      w: SLIDE_W - MARGIN * 2,
      h: 0.9,
      fontFace: SERIF,
      fontSize: 36, // brand skill: display serif titles 36–60pt
      color: ESPRESSO,
      align: "left",
      valign: "middle",
    },
  ];

  // Compress spacing when the deck carries more bullets than the 2–5 the
  // prompt asks for, so nothing runs off the 7.5" slide or into the wordmark.
  const spacing = Math.min(0.95, 4.6 / Math.max(1, slide.bullets.length));

  for (const [index, bullet] of slide.bullets.entries()) {
    texts.push({
      text: bullet,
      x: MARGIN + 0.1,
      y: 2.0 + index * spacing,
      w: textWidth,
      h: Math.min(0.9, spacing),
      fontFace: SANS,
      fontSize: 16,
      color: ESPRESSO,
      bullet: true,
      align: "left",
      valign: "top",
      lineSpacing: 22,
    });
  }

  const images: PptxImageSpec[] = [wordmark(marks.light)];

  if (hasImage && slide.imageData) {
    images.push({
      path: slide.imageData,
      isData: true,
      x: 8.3,
      y: 1.9,
      w: 4.4,
      h: 4.4,
    });
  }

  return {
    background: WHITE,
    texts,
    images,
    shapes: [goldRule(MARGIN, 1.62, 1.1)],
  };
}

function mapSectionSlide(slide: Slide, marks: WordmarkPaths): PptxSlideSpec {
  return {
    background: ESPRESSO,
    texts: [
      {
        text: slide.heading,
        x: MARGIN + 0.4,
        y: 2.6,
        w: SLIDE_W - (MARGIN + 0.4) * 2,
        h: 2.3,
        fontFace: SERIF,
        fontSize: 40,
        color: CREAM,
        align: "left",
        valign: "middle",
      },
    ],
    images: [wordmark(marks.dark)],
    shapes: [goldRule(MARGIN + 0.4, 2.35, 1.6)],
  };
}

export function mapSlideToSpec(slide: Slide, marks: WordmarkPaths): PptxSlideSpec {
  switch (slide.layout) {
    case "title":
      return mapTitleSlide(slide, marks);
    case "section":
      return mapSectionSlide(slide, marks);
    case "content":
    default:
      return mapContentSlide(slide, marks);
  }
}

export function mapDeckToSpecs(
  deck: Pick<Deck, "slides">,
  marks: WordmarkPaths
): PptxSlideSpec[] {
  return deck.slides.map((slide) => mapSlideToSpec(slide, marks));
}
