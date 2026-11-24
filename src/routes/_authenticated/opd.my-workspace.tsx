import { createFileRoute } from "@tanstack/react-router";
import { requireArea } from "@/lib/auth";
import { OpdDashboard } from "./opd.index";

export const Route = createFileRoute("/_authenticated/opd/my-workspace")({
  beforeLoad: requireArea("opd"),
  head: () => ({ meta: [
    { title: "My OPD Workspace — Two D Medium Clinic" },
    { name: "description", content: "Individual clinician encounters, waiting patients and prescription access at Two D Medium Clinic." },
    { property: "og:title", content: "My OPD Workspace — Two D Medium Clinic" },
    { property: "og:description", content: "Individual clinician encounters, waiting patients and prescription access at Two D Medium Clinic." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <OpdDashboard personal />,
});