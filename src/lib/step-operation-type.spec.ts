import { describe, expect, it } from "vitest";
import {
  getStepTypeBadgeClass,
  getStepTypeLabel,
  OPERATION_TYPES,
} from "./step-operation-type";

describe("getStepTypeLabel", () => {
  it("returns 'Manual' for operationType 0", () => {
    expect(getStepTypeLabel(OPERATION_TYPES.MANUAL)).toBe("Manual");
  });

  it("returns 'Preparation' for operationType 1", () => {
    expect(getStepTypeLabel(OPERATION_TYPES.PREPARATION)).toBe("Preparation");
  });

  it("returns 'Cooking' for operationType 2", () => {
    expect(getStepTypeLabel(OPERATION_TYPES.COOKING)).toBe("Cooking");
  });

  it("returns 'Manual' as fallback for unknown operationType", () => {
    expect(getStepTypeLabel(99)).toBe("Manual");
  });
});

describe("getStepTypeBadgeClass", () => {
  it("returns 'badge-neutral' for Manual (0)", () => {
    expect(getStepTypeBadgeClass(OPERATION_TYPES.MANUAL)).toBe("badge-neutral");
  });

  it("returns 'badge-info' for Preparation (1)", () => {
    expect(getStepTypeBadgeClass(OPERATION_TYPES.PREPARATION)).toBe(
      "badge-info",
    );
  });

  it("returns 'badge-warning' for Cooking (2)", () => {
    expect(getStepTypeBadgeClass(OPERATION_TYPES.COOKING)).toBe(
      "badge-warning",
    );
  });

  it("returns 'badge-neutral' as fallback for unknown operationType", () => {
    expect(getStepTypeBadgeClass(99)).toBe("badge-neutral");
  });
});
