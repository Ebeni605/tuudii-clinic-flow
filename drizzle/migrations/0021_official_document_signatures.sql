CREATE TABLE public.official_signatures (
  id text PRIMARY KEY CHECK (id IN ('opd', 'laboratory')),
  file_path text NOT NULL UNIQUE CHECK (length(file_path) <= 500),
  original_filename text NOT NULL CHECK (length(original_filename) <= 255),
  content_type text NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  change_reason text NOT NULL CHECK (length(change_reason) BETWEEN 3 AND 500),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.official_signatures TO authenticated;
GRANT ALL ON public.official_signatures TO service_role;
ALTER TABLE public.official_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY official_signatures_department_read ON public.official_signatures
FOR SELECT TO authenticated USING (
  (id = 'opd' AND public.has_any_role(auth.uid(), ARRAY['admin','clinician']::public.app_role[]))
  OR (id = 'laboratory' AND public.has_any_role(auth.uid(), ARRAY['admin','lab_tech']::public.app_role[]))
);
CREATE POLICY official_signatures_admin_update ON public.official_signatures
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.official_signature_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'The signature department cannot be changed';
  END IF;
  IF NEW.file_path NOT LIKE NEW.id || '/%' THEN
    RAISE EXCEPTION 'The signature file must be in its own department folder';
  END IF;
  IF NEW.file_path IS DISTINCT FROM OLD.file_path AND length(trim(NEW.change_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is required when replacing an official signature';
  END IF;
  NEW.version := OLD.version + 1;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER official_signature_before_update
BEFORE UPDATE ON public.official_signatures
FOR EACH ROW EXECUTE FUNCTION public.official_signature_before_update();
CREATE TRIGGER official_signatures_audit
AFTER INSERT OR UPDATE ON public.official_signatures
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

INSERT INTO public.official_signatures (id, file_path, original_filename, content_type, change_reason) VALUES
  ('opd', 'opd/initial.png', 'clinic_signature_1_transparent.png', 'image/png', 'Initial official OPD signature supplied by the clinic'),
  ('laboratory', 'laboratory/initial.png', 'clinic_signature_2_transparent.png', 'image/png', 'Initial official Laboratory signature supplied by the clinic');

CREATE POLICY clinic_signatures_department_read ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'clinic-signatures' AND (
    ((storage.foldername(name))[1] = 'opd' AND public.has_any_role(auth.uid(), ARRAY['admin','clinician']::public.app_role[]))
    OR ((storage.foldername(name))[1] = 'laboratory' AND public.has_any_role(auth.uid(), ARRAY['admin','lab_tech']::public.app_role[]))
  )
);
CREATE POLICY clinic_signatures_admin_insert ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'clinic-signatures'
  AND public.has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] IN ('opd', 'laboratory')
);
CREATE POLICY clinic_signatures_admin_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'clinic-signatures' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (
  bucket_id = 'clinic-signatures'
  AND public.has_role(auth.uid(), 'admin')
  AND (storage.foldername(name))[1] IN ('opd', 'laboratory')
);
CREATE POLICY clinic_signatures_admin_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'clinic-signatures' AND public.has_role(auth.uid(), 'admin'));