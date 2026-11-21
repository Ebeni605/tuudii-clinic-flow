import { describe, expect, it } from "vitest";
import { shouldPrintLaboratorySignature, shouldPrintPrescriptionSignature, signatureFileProblem } from "./official-signatures";

describe("official document signatures", () => {
  it("appears on finalized and reprinted prescriptions, never on drafts or cancelled prescriptions", () => {
    expect(shouldPrintPrescriptionSignature("finalized")).toBe(true);
    expect(shouldPrintPrescriptionSignature("printed")).toBe(true);
    expect(shouldPrintPrescriptionSignature("draft")).toBe(false);
    expect(shouldPrintPrescriptionSignature("cancelled")).toBe(false);
  });

  it("appears only on a final laboratory report with at least one verified result", () => {
    expect(shouldPrintLaboratorySignature(0, 2)).toBe(true);
    expect(shouldPrintLaboratorySignature(1, 2)).toBe(false);
    expect(shouldPrintLaboratorySignature(0, 0)).toBe(false);
  });

  it("accepts only PNG, JPEG or WebP images no larger than 2 MB", () => {
    expect(signatureFileProblem({ type: "image/png", size: 52_000 })).toBeNull();
    expect(signatureFileProblem({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
    expect(signatureFileProblem({ type: "image/webp", size: 30_000 })).toBeNull();
    expect(signatureFileProblem({ type: "image/gif", size: 30_000 })).toMatch(/PNG, JPEG or WebP/);
    expect(signatureFileProblem({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB or smaller/);
  });
});
