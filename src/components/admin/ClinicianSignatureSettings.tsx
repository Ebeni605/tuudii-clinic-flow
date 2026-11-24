import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { signatureFileProblem, usePrescriberSignature } from "@/lib/official-signatures";
import { toast } from "sonner";

export function ClinicianSignatureSettings() {
  const rows = useQuery({ queryKey: ["signature-clinicians"], queryFn: async () => {
    const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "clinician");
    if (error) throw error;
    if (!roles.length) return [];
    const result = await supabase.from("profiles").select("id, full_name").in("id", roles.map(r => r.user_id));
    if (result.error) throw result.error;
    return result.data;
  } });
  return <section className="mt-6 border-t pt-5"><h2 className="mb-3 text-lg font-semibold">Individual OPD signatures</h2>{rows.error && <p role="alert" className="text-destructive">Could not load clinicians.</p>}<div className="grid gap-4 lg:grid-cols-2">{rows.data?.map(p => <SignatureEditor key={p.id} id={p.id} name={p.full_name} />)}</div></section>;
}

function SignatureEditor({ id, name }: { id: string; name: string }) {
  const sig = usePrescriberSignature(id, null, true);
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!file || reason.trim().length < 3) return;
    const problem = signatureFileProblem(file);
    if (problem) { toast.error(problem); return; }
    const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
    const path = `opd/${id}/${crypto.randomUUID()}.${ext}`;
    setBusy(true);
    try {
      const uploaded = await supabase.storage.from("clinic-signatures").upload(path, file, { contentType: file.type });
      if (uploaded.error) throw uploaded.error;
      const saved = await supabase.from("clinician_signatures").upsert({ clinician_id: id, file_path: path, original_filename: file.name, content_type: file.type, change_reason: reason.trim() });
      if (saved.error) { await supabase.storage.from("clinic-signatures").remove([path]); throw saved.error; }
      await qc.invalidateQueries({ queryKey: ["prescriber-signature", id] });
      setFile(null); setReason(""); toast.success("Prescriber signature saved");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="rounded-lg border p-4"><h3 className="font-semibold">{name}</h3>{sig.data && <img src={sig.data.url} alt={`${name} signature`} className="my-3 h-20 w-48 object-contain object-left" />}{sig.error && <p role="alert" className="text-destructive">Signature could not load.</p>}<div className="mt-3 space-y-3"><Label htmlFor={`signature-${id}`}>Signature image</Label><Input id={`signature-${id}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} /><Label htmlFor={`reason-${id}`}>Reason for replacement</Label><Textarea id={`reason-${id}`} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /><Button variant="outline" disabled={busy || !file || reason.trim().length < 3} onClick={save}>{busy ? "Saving…" : "Save signature"}</Button></div></div>;
}