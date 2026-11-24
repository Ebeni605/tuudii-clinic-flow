import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SignatureDepartment = "opd" | "laboratory";
export const SIGNATURE_LABELS: Record<SignatureDepartment, string> = {
  opd: "OPD Clinician Signature",
  laboratory: "Laboratory Technician Signature",
};

export const officialSignatureQuery = (department: SignatureDepartment) => queryOptions({
  queryKey: ["official-signature", department],
  queryFn: async () => {
    const { data, error } = await supabase.from("official_signatures").select("*").eq("id", department).single();
    if (error) throw error;
    const { data: signed, error: signedError } = await supabase.storage
      .from("clinic-signatures")
      .createSignedUrl(data.file_path, 5 * 60);
    if (signedError) throw signedError;
    return { ...data, url: signed.signedUrl };
  },
  // Refresh before the short-lived private download address expires.
  staleTime: 4 * 60 * 1000,
});

export function useOfficialSignature(department: SignatureDepartment, enabled = true) {
  return useQuery({ ...officialSignatureQuery(department), enabled });
}

export function prescriberSignaturePath(snapshotPath: string | null, currentPath: string | null) {
  return snapshotPath || currentPath;
}

export function usePrescriberSignature(clinicianId: string | undefined, snapshotPath: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["prescriber-signature", clinicianId, snapshotPath],
    enabled: enabled && !!clinicianId,
    staleTime: 4 * 60 * 1000,
    queryFn: async () => {
      if (!clinicianId) return null;
      const { data, error } = await supabase.from("clinician_signatures").select("file_path").eq("clinician_id", clinicianId).maybeSingle();
      if (error) throw error;
      const path = prescriberSignaturePath(snapshotPath, data?.file_path ?? null);
      if (!path) return null;
      const { data: signed, error: signedError } = await supabase.storage.from("clinic-signatures").createSignedUrl(path, 300);
      if (signedError) throw signedError;
      return { url: signed.signedUrl };
    },
  });
}

export function shouldPrintPrescriptionSignature(status: string) {
  return status === "finalized" || status === "printed";
}

export function shouldPrintLaboratorySignature(pendingCount: number, verifiedCount: number) {
  return pendingCount === 0 && verifiedCount > 0;
}

export function signatureFileProblem(file: { type: string; size: number }) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return "Choose a PNG, JPEG or WebP image.";
  if (file.size > 2 * 1024 * 1024) return "The signature image must be 2 MB or smaller.";
  if (file.size === 0) return "The selected image is empty.";
  return null;
}
