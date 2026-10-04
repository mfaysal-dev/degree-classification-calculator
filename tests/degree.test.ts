import { describe, expect, it } from "vitest";
import { applyRounding, classify, degreeResult, markNeeded, weightedAverage } from "@/lib/degree";

const m = (credits: number, mark: number) => ({ credits, mark });

describe("weightedAverage", () => {
  it("weights by credits", () => {
    // (40*72 + 20*58 + 60*65) / 120 = 66.1666…
    expect(weightedAverage([m(40, 72), m(20, 58), m(60, 65)])).toBeCloseTo(66.1667, 4);
  });
  it("skips empty or invalid rows", () => {
    expect(weightedAverage([m(20, 60), m(0, 90), m(20, NaN), m(20, 120)])).toBe(60);
    expect(weightedAverage([])).toBeNull();
  });
});

describe("classify boundaries", () => {
  it.each([
    [100, "First"], [70, "First"], [69.99, "Upper second (2:1)"], [60, "Upper second (2:1)"],
    [59.9, "Lower second (2:2)"], [50, "Lower second (2:2)"], [40, "Third"], [39.9, "Fail"], [0, "Fail"],
  ])("%s → %s", (mark, name) => {
    expect(classify(mark).name).toBe(name);
  });
});

describe("rounding", () => {
  it("whole: 69.5 → 70, 69.49 → 69", () => {
    expect(applyRounding(69.5, "whole")).toBe(70);
    expect(applyRounding(69.49, "whole")).toBe(69);
  });
  it("1dp: 59.95 → 60, 59.94 → 59.9", () => {
    expect(applyRounding(59.95, "1dp")).toBe(60);
    expect(applyRounding(59.94, "1dp")).toBe(59.9);
  });
  it("ignores float noise", () => {
    expect(applyRounding(69.49999999999999, "whole")).toBe(70); // really 69.5
  });
});

describe("degreeResult", () => {
  const y2 = [m(120, 62)];
  const y3 = [m(120, 71)];
  it("30:70 → 68.3, a 2:1 on the First borderline", () => {
    const r = degreeResult(y2, y3, [30, 70])!;
    expect(r.overall).toBeCloseTo(68.3, 5);
    expect(r.classification).toBe("Upper second (2:1)");
    expect(r.borderlineFor).toBe("First");
  });
  it("final year only → First", () => {
    expect(degreeResult([], y3, [0, 100])!.short).toBe("1st");
  });
  it("1:2 weighting gives the same as 33.3:66.7", () => {
    expect(degreeResult(y2, y3, [1, 2])!.overall).toBeCloseTo(68, 5);
  });
  it("whole-number rounding lifts 69.5 to a First", () => {
    const r = degreeResult([m(120, 69)], [m(120, 70)], [50, 50], { rounding: "whole" })!;
    expect(r.overall).toBe(69.5);
    expect(r.classification).toBe("First");
    expect(r.borderlineFor).toBeNull();
  });
  it("no rounding keeps 69.5 a 2:1", () => {
    expect(degreeResult([m(120, 69)], [m(120, 70)], [50, 50])!.short).toBe("2:1");
  });
  it("not borderline when far from the boundary", () => {
    expect(degreeResult([m(120, 63)], [m(120, 64)], [50, 50])!.borderlineFor).toBeNull();
  });
  it("returns null when a weighted year is missing", () => {
    expect(degreeResult([], y3, [30, 70])).toBeNull();
  });
  it("rejects zero weights", () => {
    expect(() => degreeResult(y2, y3, [0, 0])).toThrow(RangeError);
  });
});

describe("markNeeded", () => {
  it("works out the average needed on the remaining credits", () => {
    // Year 2 avg 62, weights 30:70, 60 of 120 final credits done at 66.
    // Need 70 overall → final avg (70*100 - 62*30)/70 = 73.43; x = (73.43*120 - 3960)/60 = 80.86 → 80.9
    const r = markNeeded([m(120, 62)], [m(60, 66)], 120, [30, 70], 70);
    expect(r).toEqual({ status: "needed", mark: 80.9 });
    const check = degreeResult([m(120, 62)], [m(60, 66), m(60, 80.9)], [30, 70])!;
    expect(check.overall).toBeGreaterThanOrEqual(70);
  });
  it("reports impossible targets", () => {
    expect(markNeeded([m(120, 45)], [m(100, 50)], 120, [50, 50], 70).status).toBe("impossible");
  });
  it("reports a target already secured", () => {
    expect(markNeeded([m(120, 75)], [m(100, 75)], 120, [30, 70], 40)).toEqual({ status: "secured" });
  });
  it("no credits left", () => {
    expect(markNeeded([m(120, 60)], [m(120, 60)], 120, [30, 70], 70)).toEqual({ status: "no-credits-left" });
  });
});
