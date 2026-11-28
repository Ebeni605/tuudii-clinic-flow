CREATE OR REPLACE FUNCTION public.prescription_action(_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r prescriptions; s profiles;
BEGIN
 IF NOT public.has_role(auth.uid(),'clinician') THEN RAISE EXCEPTION 'Only an approved OPD clinician can authorize prescriptions'; END IF;
 SELECT * INTO r FROM prescriptions WHERE id=_id FOR UPDATE;
 IF r.id IS NULL OR r.clinician_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the prescribing clinician can authorize this prescription'; END IF;
 IF _action='finalized' THEN
 IF r.status<>'draft' THEN RAISE EXCEPTION 'Only drafts can be finalized'; END IF;
 SELECT * INTO s FROM profiles WHERE id=auth.uid();
 IF nullif(btrim(s.qualification),'') IS NULL THEN RAISE EXCEPTION 'Ask the administrator to confirm your qualification'; END IF;
 IF r.diagnosis_id IS NULL OR NOT EXISTS(SELECT 1 FROM diagnoses WHERE id=r.diagnosis_id AND consultation_id=r.consultation_id) THEN RAISE EXCEPTION 'Select a documented encounter diagnosis'; END IF;
 IF NOT EXISTS(SELECT 1 FROM prescription_items WHERE prescription_id=r.id) OR EXISTS(SELECT 1 FROM prescription_items WHERE prescription_id=r.id AND (btrim(dose)='' OR btrim(route)='' OR btrim(frequency)='' OR btrim(duration)='' OR btrim(quantity)='')) THEN RAISE EXCEPTION 'Enter dose, route, frequency, duration and quantity for every medicine'; END IF;
 IF EXISTS(SELECT 1 FROM visits v JOIN patients p ON p.id=v.patient_id WHERE v.id=r.visit_id AND (v.status IN ('waiting','cancelled','no_show') OR p.archived)) THEN RAISE EXCEPTION 'This encounter is not valid for prescribing'; END IF;
 UPDATE prescriptions SET status='finalized',finalized_at=now(),updated_at=now(),snapshot=public.prescription_snapshot(r.visit_id,r.diagnosis_id,r.clinician_id) WHERE id=r.id;
 ELSIF _action='cancelled' THEN
 IF r.status='cancelled' OR length(btrim(coalesce(_reason,''))) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'Enter a cancellation or correction reason (3–2000 characters)'; END IF;
 UPDATE prescriptions SET status='cancelled',cancel_reason=btrim(_reason),cancelled_at=now(),updated_at=now() WHERE id=r.id;
 ELSIF _action IN ('print_requested','pdf_download_requested') THEN
 IF r.status='cancelled' THEN RAISE EXCEPTION 'Cancelled prescriptions cannot be printed'; END IF;
 IF r.status='draft' THEN UPDATE prescriptions SET print_count=print_count+1,updated_at=now() WHERE id=r.id;
 ELSE UPDATE prescriptions SET status='printed',print_count=print_count+1,updated_at=now() WHERE id=r.id; END IF;
 ELSE RAISE EXCEPTION 'Invalid prescription action'; END IF;
 INSERT INTO prescription_events(prescription_id,actor_id,action,reason) VALUES(r.id,auth.uid(),_action,_reason);
END $function$;