import { describe, expect, it } from "vitest";
import { belongsInClinicianWorkspace } from "./opd-workspace";

describe("individual OPD workspace", () => {
  it("includes the clinician's own visits and the shared unassigned waiting queue, not another clinician's encounters", () => {
    expect(belongsInClinicianWorkspace({ assigned_clinician_id: "nuriya", status: "in_consultation" }, "nuriya")).toBe(true);
    expect(belongsInClinicianWorkspace({ assigned_clinician_id: null, status: "waiting" }, "nuriya")).toBe(true);
    expect(belongsInClinicianWorkspace({ assigned_clinician_id: "ahmed", status: "in_consultation" }, "nuriya")).toBe(false);
    expect(belongsInClinicianWorkspace({ assigned_clinician_id: "ahmed", status: "waiting" }, "nuriya")).toBe(false);
  });
});