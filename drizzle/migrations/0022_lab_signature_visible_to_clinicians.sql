DROP POLICY IF EXISTS official_signatures_department_read ON public.official_signatures;
CREATE POLICY official_signatures_department_read ON public.official_signatures FOR SELECT TO authenticated USING (
  ((id = 'opd') AND public.has_any_role(auth.uid(), ARRAY['admin','clinician']::public.app_role[]))
  OR ((id = 'laboratory') AND public.has_any_role(auth.uid(), ARRAY['admin','lab_tech','clinician']::public.app_role[])));
DROP POLICY IF EXISTS clinic_signatures_department_read ON storage.objects;
CREATE POLICY clinic_signatures_department_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'clinic-signatures' AND (
    (((storage.foldername(name))[1] = 'opd') AND public.has_any_role(auth.uid(), ARRAY['admin','clinician']::public.app_role[]))
    OR (((storage.foldername(name))[1] = 'laboratory') AND public.has_any_role(auth.uid(), ARRAY['admin','lab_tech','clinician']::public.app_role[]))));