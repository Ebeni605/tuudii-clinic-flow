CREATE TABLE public.clinician_signatures (
 clinician_id uuid PRIMARY KEY REFERENCES public.profiles(id),
 file_path text NOT NULL UNIQUE,
 original_filename text NOT NULL,
 content_type text NOT NULL CHECK (content_type IN ('image/png','image/jpeg','image/webp')),
 change_reason text NOT NULL CHECK (length(btrim(change_reason)) BETWEEN 3 AND 500),
 version integer NOT NULL DEFAULT 1,
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clinician_signatures TO authenticated;
GRANT ALL ON public.clinician_signatures TO service_role;
ALTER TABLE public.clinician_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinician_signatures_read ON public.clinician_signatures FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','clinician']::public.app_role[]));
CREATE POLICY clinician_signatures_admin_insert ON public.clinician_signatures FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY clinician_signatures_admin_update ON public.clinician_signatures FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.clinician_signature_before() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=NEW.clinician_id AND role='clinician') THEN RAISE EXCEPTION 'Signature must belong to an OPD clinician'; END IF;
 IF TG_OP='UPDATE' AND NEW.clinician_id<>OLD.clinician_id THEN RAISE EXCEPTION 'Signature owner cannot change'; END IF;
 IF NEW.file_path NOT LIKE 'opd/' || NEW.clinician_id::text || '/%' THEN RAISE EXCEPTION 'Use the clinician signature folder'; END IF;
 IF TG_OP='UPDATE' THEN NEW.version:=OLD.version+1; END IF;
 NEW.updated_by:=auth.uid(); NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER clinician_signature_before BEFORE INSERT OR UPDATE ON public.clinician_signatures FOR EACH ROW EXECUTE FUNCTION public.clinician_signature_before();
CREATE TRIGGER clinician_signatures_audit AFTER INSERT OR UPDATE ON public.clinician_signatures FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
ALTER TABLE public.prescriptions ADD COLUMN signature_file_path text;
CREATE FUNCTION public.prescription_signature_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF OLD.status='draft' AND NEW.status='finalized' THEN
 SELECT file_path INTO NEW.signature_file_path FROM public.clinician_signatures WHERE clinician_id=NEW.clinician_id;
 ELSIF OLD.status<>'draft' THEN NEW.signature_file_path:=OLD.signature_file_path;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prescription_signature_snapshot BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.prescription_signature_snapshot();
REVOKE ALL ON FUNCTION public.clinician_signature_before(), public.prescription_signature_snapshot() FROM PUBLIC, anon;
COMMENT ON COLUMN public.prescriptions.signature_file_path IS 'Immutable signature file selected at authorization; historical rows may use the original clinician signature.';