import { SIGNATURE_LABELS, type SignatureDepartment } from "@/lib/official-signatures";

export function OfficialSignature({ department, url }: { department: SignatureDepartment; url: string }) {
  const label = SIGNATURE_LABELS[department];
  return (
    <div className="official-signature mt-3 break-inside-avoid">
      <p className="text-xs font-semibold">{label}</p>
      <img
        src={url}
        alt={label}
        className="official-signature-image mt-1 h-16 w-40 max-w-full object-contain object-left"
      />
    </div>
  );
}
