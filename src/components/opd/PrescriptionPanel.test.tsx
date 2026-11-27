import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyMedicine } from "@/lib/prescriptions";
import { PrescriptionPanel } from "./PrescriptionPanel";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), track: vi.fn(), invalidate: vi.fn(), history: [] as unknown[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("@/lib/auth", () => ({ useStaff: () => ({ data: { id: "fictional-clinician", roles: ["clinician"] } }) }));
vi.mock("@/components/AppShell", () => ({ LoadError: () => null, PageLoading: () => null }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@tanstack/react-query", async importOriginal => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQueryClient: () => ({ invalidateQueries: mocks.invalidate }), useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === "prescriptions" ? mocks.history : queryKey[0] === "prescriber" ? { qualification: "FICTIONAL", professional_registration: "TEST-ONLY" } : [],
    isLoading: false, isPending: false,
  }) };
});

function mount() {
  render(<PrescriptionPanel visitId="fictional-visit" patientId="fictional-patient" clinicianId="fictional-clinician" validEncounter />);
}
function openNew() {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "New prescription" }));
}
function readyDraft() {
  mocks.history = [{
    id: "fictional-prescription", patient_id: "fictional-patient", visit_id: "fictional-visit", clinician_id: "fictional-clinician",
    prescription_number: "TEST-ONLY", diagnosis_id: "fictional-diagnosis", status: "draft", created_at: "2026-11-27T12:00:00Z",
    prescription_items: [{ ...emptyMedicine(), position: 1, drug_name: "Fictional sensitive medicine", dose: "1", route: "Oral", frequency: "Once", duration: "1 day", quantity: "1" }],
  }];
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Edit draft" }));
}
async function authorize() {
  fireEvent.click(screen.getByRole("button", { name: "Authorize prescription" }));
  const confirm = await screen.findByRole("button", { name: "Confirm authorization" });
  await act(async () => { fireEvent.click(confirm); });
}

describe("privacy-conscious prescription action analytics", () => {
  beforeEach(() => {
    mocks.history = [];
    mocks.rpc.mockReset(); mocks.track.mockReset(); mocks.invalidate.mockReset();
    mocks.rpc.mockResolvedValue({ data: "fictional-saved-id", error: null });
    mocks.invalidate.mockResolvedValue(undefined);
    window.__lovableEvents = { track: mocks.track };
  });
  afterEach(() => { cleanup(); delete window.__lovableEvents; });

  it("tracks a successful draft save with only categorical intent and no clinical fields or identifiers", async () => {
    openNew();
    fireEvent.change(screen.getByLabelText("Generic drug name", { exact: false }), { target: { value: "Fictional sensitive medicine" } });
    fireEvent.click(screen.getByRole("button", { name: "Save prescription" }));
    await waitFor(() => expect(mocks.track.mock.calls).toEqual([["project.prescription_draft_saved", { intent: "draft" }]]));
    expect(mocks.rpc).toHaveBeenCalledWith("save_prescription", expect.objectContaining({ _visit_id: "fictional-visit" }));
  });

  it("tracks missing medicine validation once without sending entered values", () => {
    openNew();
    fireEvent.click(screen.getByRole("button", { name: "Save prescription" }));
    expect(mocks.track.mock.calls).toEqual([["project.prescription_validation_failed", { stage: "draft", reason: "missing_drug_name" }]]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("tracks authorization only after the authorization action succeeds, without the signature or identity", async () => {
    readyDraft(); await authorize();
    await waitFor(() => expect(mocks.track.mock.calls).toEqual([
      ["project.prescription_draft_saved", { intent: "authorization" }], ["project.prescription_authorized", {}],
    ]));
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "prescription_action", { _id: "fictional-saved-id", _action: "finalized" });
  });

  it("counts a persisted draft but never an authorized signature when authorization validation fails", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: "fictional-saved-id", error: null }).mockResolvedValueOnce({ error: { code: "P0001", message: "Fictional patient details must not be collected" } });
    readyDraft(); await authorize();
    await waitFor(() => expect(mocks.track.mock.calls).toEqual([
      ["project.prescription_draft_saved", { intent: "authorization" }],
      ["project.prescription_validation_failed", { stage: "authorization", reason: "server_validation" }],
    ]));
  });

  it("tracks server-side draft validation without collecting raw error messages", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23514", message: "Fictional confidential error" } });
    readyDraft(); fireEvent.click(screen.getByRole("button", { name: "Save prescription" }));
    await waitFor(() => expect(mocks.track.mock.calls).toEqual([["project.prescription_validation_failed", { stage: "draft", reason: "server_validation" }]]));
  });

  it("does not miscount a connection failure as validation or a successful save", async () => {
    mocks.rpc.mockRejectedValue(new Error("Fictional private network details"));
    readyDraft(); fireEvent.click(screen.getByRole("button", { name: "Save prescription" }));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("still saves when the analytics runtime is absent", async () => {
    delete window.__lovableEvents;
    readyDraft(); fireEvent.click(screen.getByRole("button", { name: "Save prescription" }));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.track).not.toHaveBeenCalled();
  });
});