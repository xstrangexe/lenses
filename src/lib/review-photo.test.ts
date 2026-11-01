import { describe, expect, it } from "vitest";
import { fitWithin, reviewPhotoPath } from "./review-photo";

describe("fitWithin", () => {
  it("scales a wide photo down so its longest side is the limit", () => {
    expect(fitWithin(4000, 3000, 1200)).toEqual({ width: 1200, height: 900 });
  });

  it("scales a tall photo down the same way", () => {
    expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 });
  });

  it("never scales a small photo up", () => {
    expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 });
  });

  it("keeps whole pixels", () => {
    const { width, height } = fitWithin(3001, 2003, 1200);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
    expect(Math.max(width, height)).toBe(1200);
  });
});

describe("reviewPhotoPath", () => {
  it("puts the photo in the order's own folder", () => {
    const path = reviewPhotoPath("TOKEN", "abc");
    expect(path).toBe("TOKEN/abc.jpg");
  });
});
