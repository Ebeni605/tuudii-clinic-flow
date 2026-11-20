import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadError, PageHeader, PageLoading, RequireArea } from "@/components/AppShell";
import { PrescriptionPanel } from "@/components/opd/PrescriptionPanel";
import { requireArea } from "@/lib/auth";
import { consultQuery, visitQuery } from "@/lib/opd-queries";
import { patientName, useServices } from "@/lib/data";
import { ageFromDob } from "@/lib/workflow";

export const Route = createFileRoute("/_authenticated/opd/write-prescription/$visitId")({
  beforeLoad: requireArea("opd"),
  head: () => ({ meta: [{ title: "Write Prescription — Two D Medium Clinic" }, { name: "description", content: "Write, save and print a prescription for an OPD patient." }, { property: "og:title", content: "Write Prescription — Two D Medium Clinic" }, { property: "og:description", content: "Write, save and print a prescription for an OPD patient." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <RequireArea area="opd"><WritePrescription /></RequireArea>,
});

function WritePrescription() {
  const { visitId } = Route.useParams();
  const { data: services } = useServices();
  const { data: visit, isLoading, error, refetch } = useQuery(visitQuery(visitId));
  const { data: consult } = useQuery(consultQuery(visitId));
  if (isLoading) return <PageLoading />;
  if (error) return <LoadError message="Could not load this patient." onRetry={() => refetch()} />;
  if (!visit) return <LoadError message="This visit was not found." />;
  const p = visit.patients;
  const age = ageFromDob(p.date_of_birth ?? null, new Date(), p.dob_estimated ?? false);
  const svc = services?.find((s) => s.key === visit.service_key)?.name ?? visit.service_key;
  const fields: [string, string][] = [["Patient", patientName(p)], ["Card number", p.mrn], ["Sex", p.sex], ["Age", age ?? "—"], ["Phone", p.phone ?? "—"], ["Service", svc]];
  return (
    <div className="max-w-6xl">
      <PageHeader title="Write prescription" subtitle="Patient details are filled in automatically from Reception." />
      <div className="mb-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild><Link to="/opd"><ArrowLeft className="mr-1 h-4 w-4" />OPD patient list</Link></Button>
        <Button variant="outline" size="sm" asChild><Link to="/opd/visit/$visitId" params={{ visitId }}>Open full visit</Link></Button>
      </div>
      <Card className="mb-4"><CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        {fields.map(([k, v]) => <div key={k}><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium capitalize">{v}</div></div>)}
        {p.allergies && <div className="col-span-full rounded bg-destructive/10 px-2 py-1 text-sm text-destructive">Allergies: {p.allergies}</div>}
      </CardContent></Card>
      <PrescriptionPanel visitId={visitId} patientId={p.id} clinicianId={consult?.clinician_id ?? null}
        validEncounter={!!consult && !p.archived && !["waiting", "cancelled", "no_show"].includes(visit.status)} />
    </div>
  );
}
