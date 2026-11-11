import { describe, expect, it } from "vitest";
import { locateEvidence } from "../resume";
import { excerptFor } from "../store";

const paragraphs = [
  { id: "s1.0", text: "73-year-old male with type 2 diabetes mellitus and chronic kidney disease." },
  { id: "s2.0", text: "1. Type 2 diabetes mellitus with diabetic chronic kidney disease. A1c 7.2%." },
];
let n = 0;
const id = () => `t${(n += 1)}`;

describe("locateEvidence", () => {
  it("finds each saved snippet again, with exact offsets", () => {
    const links = locateEvidence(paragraphs, "E11.22", "diabetic chronic kidney disease … A1c 7.2%", id);
    expect(links.map((l) => [l.paragraphId, paragraphs[1].text.slice(l.start, l.end)])).toEqual([
      ["s2.0", "diabetic chronic kidney disease"],
      ["s2.0", "A1c 7.2%"],
    ]);
  });

  it("drops a snippet the note no longer contains", () => {
    expect(locateEvidence(paragraphs, "E11.22", "diabetic retinopathy", id)).toEqual([]);
  });

  it("round-trips with excerptFor", () => {
    const links = locateEvidence(paragraphs, "E11.22", "diabetic chronic kidney disease … A1c 7.2%", id);
    expect(excerptFor(links, "E11.22")).toBe("diabetic chronic kidney disease … A1c 7.2%");
  });
});
