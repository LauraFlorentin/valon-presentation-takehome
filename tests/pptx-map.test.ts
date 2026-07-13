import { describe, expect, it } from "vitest";
import { mapSlideToSpec, type WordmarkPaths } from "../lib/pptx-map";
import type { Slide } from "../lib/types";

const marks: WordmarkPaths = { light: "/L.svg", dark: "/D.svg" };

describe("mapSlideToSpec", () => {
  it("maps a title slide: white background, serif heading first, subheading, gold accent", () => {
    const slide: Slide = {
      id: "s1",
      layout: "title",
      heading: "Q3 Servicing Review",
      subheading: "What we shipped and what it saved",
      bullets: [],
    };

    const spec = mapSlideToSpec(slide, marks);

    expect(spec.background).toBe("FFFFFF");
    expect(spec.texts[0].text).toBe("Q3 Servicing Review");
    expect(spec.texts[0].fontFace).toBe("Georgia");
    expect(spec.texts.some((t) => t.text === "What we shipped and what it saved")).toBe(true);
    expect(spec.shapes.some((s) => s.fill === "E19614")).toBe(true);
  });

  it("maps a content slide without imageData: bullets present, only the wordmark image", () => {
    const slide: Slide = {
      id: "s2",
      layout: "content",
      heading: "Cost per loan",
      bullets: ["Servicing cost down 12%", "Zero-touch payoffs at 41%", "Call volume flat"],
    };

    const spec = mapSlideToSpec(slide, marks);

    const bulletTexts = spec.texts.filter((t) => t.bullet === true);
    expect(bulletTexts).toHaveLength(3);
    expect(bulletTexts.map((t) => t.text)).toEqual([
      "Servicing cost down 12%",
      "Zero-touch payoffs at 41%",
      "Call volume flat",
    ]);
    expect(spec.images).toHaveLength(1);
    expect(spec.images[0].path).toBe("/L.svg");
    expect(spec.images.some((img) => img.isData)).toBe(false);
  });

  it("adds a data image on content slides with imageData; section slides go espresso with the dark wordmark", () => {
    const contentSlide: Slide = {
      id: "s3",
      layout: "content",
      heading: "Portfolio growth",
      bullets: ["Loans serviced up 18%"],
      imageData: "data:image/png;base64,x",
    };

    const contentSpec = mapSlideToSpec(contentSlide, marks);

    expect(contentSpec.images).toHaveLength(2);
    const dataImage = contentSpec.images.find((img) => img.isData);
    expect(dataImage).toBeDefined();
    expect(dataImage?.path).toBe("data:image/png;base64,x");

    const sectionSlide: Slide = {
      id: "s4",
      layout: "section",
      heading: "What comes next",
      bullets: [],
    };

    const sectionSpec = mapSlideToSpec(sectionSlide, marks);

    expect(sectionSpec.background).toBe("231810");
    expect(sectionSpec.images).toHaveLength(1);
    expect(sectionSpec.images[0].path).toBe("/D.svg");
  });
});
