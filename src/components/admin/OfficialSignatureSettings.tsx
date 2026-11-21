import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SIGNATURE_LABELS, signatureFileProblem, useOfficialSignature, type SignatureDepartment } from "@/lib/official-signatures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateTime } from "@/lib/opd-queries";

const EXTENSION: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function OfficialSignatureSettings() {
  return (
    <section className="mt-6 border-t pt-5">
      <h2 className="text-lg font-semibold">Official document signatures</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        These controlled images appear on authorized OPD prescriptions and final verified laboratory reports. Every replacement is audited.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <SignatureCard department="opd" />
        <SignatureCard department="laboratory" />
      </div>
    </section>
  );
}

function SignatureCard({ department }: { department: SignatureDepartment }) {
  const signature = useOfficialSignature(department);
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function replace() {
    if (!file || reason.trim().length < 3) return;
    const problem = signatureFileProblem(file);
    if (problem) { toast.error(problem); return; }
    setBusy(true);
    const path = `${department}/${crypto.randomUUID()}.${EXTENSION[file.type]}`;
    const { error: uploadError } = await supabase.storage.from("clinic-signatures").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) { setBusy(false); toast.error(uploadError.message); return; }
    const { error } = await supabase.from("official_signatures").update({
      file_path: path,
      original_filename: file.name,
      content_type: file.type,
      change_reason: reason.trim(),
    }).eq("id", department);
    if (error) {
      await supabase.storage.from("clinic-signatures").remove([path]);
      setBusy(false); toast.error(error.message); return;
    }
    await qc.invalidateQueries({ queryKey: ["official-signature", department] });
    setBusy(false); setFile(null); setReason("");
    toast.success(`${SIGNATURE_LABELS[department]} replaced and recorded in the audit log`);
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{SIGNATURE_LABELS[department]}</h3>
      {signature.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading official signature…</p>}
      {signature.error && (
        <div className="mt-3 space-y-2 text-sm text-destructive" role="alert">
          <p>Could not load the official signature.</p>
          <Button size="sm" variant="outline" onClick={() => signature.refetch()}>Retry</Button>
        </div>
      )}
      {signature.data && (
        <>
          <div className="mt-3 flex min-h-24 items-center rounded-md border bg-muted/30 p-3">
            <img src={signature.data.url} alt={SIGNATURE_LABELS[department]} className="h-20 w-48 max-w-full object-contain object-left" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Version {signature.data.version} · Updated {fmtDateTime(signature.data.updated_at)}
          </p>
        </>
      )}
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${department}-signature`}>Replacement image (PNG, JPEG or WebP, maximum 2 MB)</Label>
          <Input
            key={`${department}-${signature.data?.version ?? 0}`}
            id={`${department}-signature`}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              if (selected) {
                const problem = signatureFileProblem(selected);
                if (problem) { toast.error(problem); setFile(null); event.target.value = ""; }
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${department}-signature-reason`}>Reason for replacement</Label>
          <Textarea id={`${department}-signature-reason`} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Why is the official signature being replaced?" />
        </div>
        <Button variant="outline" disabled={busy || !file || reason.trim().length < 3} onClick={replace}>
          {busy ? "Replacing…" : "Replace official signature"}
        </Button>
      </div>
    </div>
  );
}
