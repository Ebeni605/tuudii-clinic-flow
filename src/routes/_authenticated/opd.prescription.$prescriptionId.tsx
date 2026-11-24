import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Printer, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CLINIC, ClinicLogo } from "@/components/ClinicBrand";
import { LoadError } from "@/components/AppShell";
import { requireArea, useStaff } from "@/lib/auth";
import { canPrintPrescription, prescriptionQuery } from "@/lib/prescriptions";
import { fmtDate, fmtDateTime } from "@/lib/opd-queries";
import { supabase } from "@/integrations/supabase/client";
import { OfficialSignature } from "@/components/OfficialSignature";
import { shouldPrintPrescriptionSignature, usePrescriberSignature } from "@/lib/official-signatures";

export const Route = createFileRoute("/_authenticated/opd/prescription/$prescriptionId")({
  beforeLoad: requireArea("opd"),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(prescriptionQuery(params.prescriptionId)),
  head: () => ({ meta: [
    { title: "Prescription — Two D Medium Clinic" }, { name: "description", content: "Clinic-branded A4 prescription and authorization record." },
    { property: "og:title", content: "Prescription — Two D Medium Clinic" }, { property: "og:description", content: "Clinic-branded A4 prescription and authorization record." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: PrescriptionPage,
});

function PrescriptionPage() {
  const { prescriptionId } = Route.useParams();
  const { data: r } = useSuspenseQuery(prescriptionQuery(prescriptionId));
  const { data: me } = useStaff();
  const qc = useQueryClient();
  const showSig = !!r && shouldPrintPrescriptionSignature(r.status);
  const { data: sig } = usePrescriberSignature(r?.clinician_id, r?.signature_file_path ?? null, showSig);
  const [busy, setBusy] = useState(false);
  if (!r) return <LoadError message="Prescription not found or access unavailable." />;
  const snapshot = object(r.snapshot);
  const patient = object(snapshot["patient"]);
  const prescriber = object(snapshot["prescriber"]);
  const diagnosis = object(snapshot["diagnosis"]);
  const authorized = canPrintPrescription(r);
  const isDraft = r.status === "draft";
  const canPrint = (authorized || isDraft) && me?.id === r.clinician_id && me.roles.includes("clinician");
  const name = [patient["first_name"], patient["middle_name"], patient["last_name"]].filter(Boolean).join(" ");
  async function print(pdf = false) {
    if (!r || !canPrint) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("prescription_action", { _id: r.id, _action: pdf ? "pdf_download_requested" : "print_requested" });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["prescription", r.id] });
      await Promise.all(Array.from(document.images).map(img => img.decode().catch(() => undefined)));
      await document.fonts.ready;
      window.print();
    } catch (e) { toast.error((e as { message: string }).message); }
    finally { setBusy(false); }
  }
  return <div>
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
      <Button asChild variant="outline"><Link to="/opd/visit/$visitId" params={{ visitId: r.visit_id }}><ArrowLeft className="mr-2 h-4 w-4" />Encounter</Link></Button>
      <div className="flex flex-wrap gap-2"><Button disabled={!canPrint || busy} onClick={() => print()}><Printer className="mr-2 h-4 w-4" />Print A4</Button><Button variant="outline" disabled={!canPrint || busy} onClick={() => print(true)}><FileDown className="mr-2 h-4 w-4" />Save as PDF</Button></div>
    </div>
    <p className="no-print mb-4 text-sm text-muted-foreground">{isDraft ? "Draft copy: it prints with a DRAFT – NOT VALID FOR DISPENSING mark. Authorize it to print the official copy." : !authorized ? "Cancelled prescriptions cannot be printed." : !canPrint ? "Only the prescribing clinician may request printing." : "For a PDF, choose Save as PDF in the print dialog."}</p>
    <article className={`prescription-paper traditional-rx print-area a4-page mx-auto border bg-card p-5 text-sm shadow-sm sm:p-8 ${authorized || isDraft ? "" : "prescription-unprintable"} relative`}>
      {isDraft && <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="-rotate-30 select-none text-5xl font-bold text-destructive/20 sm:text-6xl">DRAFT – NOT VALID</span></div>}
      <table className="rx-frame w-full border-collapse"><thead><tr><td className="p-0">
        <header className="prescription-header flex items-center gap-4 pb-4">
          <ClinicLogo className="h-24 w-24 shrink-0" />
          <div className="min-w-0 flex-1 text-center"><h1 className="text-xl font-bold">Kilinika G/Galeessa Tuudii</h1><p className="mt-1 text-lg">{CLINIC.amharic}</p><p className="mt-1 text-xl font-semibold">Two D Medium Clinic</p><p className="mt-1">Tel: {text(snapshot["phones"]) || CLINIC.phones}</p>{text(snapshot["clinic_address"]) && <p>{text(snapshot["clinic_address"])}</p>}<h2 className="mt-2 text-xl font-bold">Prescription Paper</h2></div>
        </header>
        <p className="rx-running mt-1 flex flex-wrap justify-between gap-2 border-b pb-1 text-xs"><span>{r.prescription_number}</span><span>{name} · {text(patient["mrn"])}</span></p>
      </td></tr></thead><tbody><tr><td className="p-0">
        <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs"><span>{r.prescription_number} · Card: {text(patient["mrn"])}</span><span className={isDraft ? "font-bold text-destructive" : "font-semibold"}>{authorized ? "AUTHORIZED" : isDraft ? "DRAFT – NOT VALID FOR DISPENSING" : r.status.toUpperCase()}</span></div>
        <dl className="rx-patient-lines grid gap-x-4 gap-y-2 sm:grid-cols-4">
          <div className="sm:col-span-2"><Detail label="Name of patient" value={name} /></div><Detail label="Age" value={text(snapshot["age"])} /><Detail label="Sex" value={text(patient["sex"])} />
          <div className="sm:col-span-2"><Detail label="Address" value={text(patient["address"]) || [patient["region"], patient["town"]].filter(Boolean).join(" / ")} /></div><div className="sm:col-span-2"><Detail label="Phone No." value={text(patient["phone"])} /></div>
        </dl>
        <div className="my-3 flex flex-wrap justify-between gap-4"><span>Outpatient ☑</span><span>Inpatient ☐</span><span>Emergency ☐</span></div>
        <dl className="mb-4 grid gap-3 sm:grid-cols-[2fr_1fr]"><Detail label="Diagnosis" value={text(diagnosis["description"]) + (diagnosis["icd10_code"] ? ` (${text(diagnosis["icd10_code"])})` : "")} /><Detail label="Date" value={fmtDate(r.finalized_at ?? r.created_at)} /></dl>
        <table className="prescription-table rx-paper-table w-full table-fixed border-collapse"><colgroup><col className="w-[80%]" /><col className="w-[20%]" /></colgroup>
          <thead><tr><th className="text-left">Drug name, strength, dosage form, dose, frequency, duration, quantity, route of administration &amp; other information</th><th>Price<br /><span className="font-normal">(Dispenser use only)</span></th></tr></thead>
          <tbody><tr><td className="text-2xl font-bold">℞</td><td /></tr>
            {[...r.prescription_items].sort((a,b) => a.position-b.position).map(m => <tr key={m.id}><td><b>{m.position}. {m.drug_name}{m.brand_name ? ` (${m.brand_name})` : ""} {m.strength} {m.dosage_form}</b><div>{[m.dose, m.route, m.frequency, m.duration].filter(Boolean).join(" · ")}{m.quantity && ` · Quantity: ${m.quantity}`}</div>{(m.instructions || m.other_information) && <div>{[m.instructions,m.other_information].filter(Boolean).join(" — ")}</div>}</td><td /></tr>)}
            {Array.from({length: Math.max(0, 7-r.prescription_items.length)}, (_,i) => <tr className="rx-blank-row" key={`blank-${i}`}><td>&nbsp;</td><td /></tr>)}
            <tr><td className="text-right font-bold">Total price</td><td /></tr>
          </tbody>
        </table>
        {r.cancel_reason && <p className="mt-4 text-destructive"><b>Cancelled:</b> {r.cancel_reason}</p>}
        <div className="prescription-signatures mt-5 grid gap-6 sm:grid-cols-2">
          <section className="space-y-2"><h3 className="mb-3 font-bold">Prescriber’s</h3><Detail label="Full name" value={text(prescriber["full_name"])} /><Detail label="Qualification" value={text(prescriber["qualification"])} /><Detail label="Registration" value={text(prescriber["professional_registration"])} />{showSig && sig?.url ? <OfficialSignature department="opd" url={sig.url} /> : <p className="pt-3">Signature: ____________________</p>}<Detail label="Date" value={r.finalized_at ? fmtDate(r.finalized_at) : ""} /></section>
          <section className="space-y-2"><h3 className="mb-3 font-bold">Evaluator / Dispenser</h3><p>Full name: ____________________</p><p>Qualification: __________________</p><p>Registration: __________________</p><p className="pt-3">Signature: ____________________</p><p>Date: ________________________</p></section>
        </div>
        {showSig && sig === null && <p className="no-print mt-3 text-sm text-destructive">This prescriber’s signature has not been registered.</p>}
      </td></tr></tbody></table>
    </article>
    <section className="no-print mx-auto mt-6 max-w-3xl"><h2 className="mb-3 font-semibold">Authorization &amp; print history</h2><ul className="space-y-2 text-sm">{[...r.prescription_events].sort((a,b) => a.created_at.localeCompare(b.created_at)).map(e => <li key={e.id} className="border-b pb-2"><span className="capitalize">{e.action.replaceAll("_", " ")}</span> · {fmtDateTime(e.created_at)}{e.reason && <p className="break-all text-muted-foreground">{e.reason}</p>}</li>)}</ul></section>
  </div>;
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex min-w-0 gap-2"><dt className="shrink-0 font-semibold">{label}:</dt><dd className="min-w-0 flex-1 break-words border-b">{value || "—"}</dd></div>; }