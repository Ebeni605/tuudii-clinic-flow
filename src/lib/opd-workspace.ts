export function belongsInClinicianWorkspace(visit: { assigned_clinician_id: string | null; status: string }, clinicianId: string) {
  return visit.assigned_clinician_id === clinicianId || (visit.assigned_clinician_id === null && visit.status === "waiting");
}