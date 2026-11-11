import { describe, expect, it } from "vitest";
import { safeNextPath } from "../redirects";

describe("safeNextPath", () => {
  it("accepts same-origin paths", () => {
    expect(safeNextPath("/admin/charts")).toBe("/admin/charts");
    expect(safeNextPath("/practice?difficulty=2")).toBe("/practice?difficulty=2");
  });

  it("rejects anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "evil", "", null, undefined, 42, "/\nfoo"]) {
      expect(safeNextPath(bad, "/")).toBe("/");
    }
  });
});
