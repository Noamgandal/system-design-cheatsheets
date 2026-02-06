import GCPDatabases from "./GCPDatabases";
import Messaging from "./Messaging";
import Caching from "./Caching";
import Networking from "./Networking";
import Consistency from "./Consistency";
import APIDesign from "./APIDesign";
import Reliability from "./Reliability";

export const cheatsheets = [
  {
    id: "gcp-databases",
    label: "GCP Databases",
    component: GCPDatabases,
  },
  {
    id: "messaging",
    label: "Messaging",
    component: Messaging,
  },
  {
    id: "caching",
    label: "Caching",
    component: Caching,
  },
  {
    id: "networking",
    label: "Networking",
    component: Networking,
  },
  {
    id: "consistency",
    label: "Consistency",
    component: Consistency,
  },
  {
    id: "api-design",
    label: "API Design",
    component: APIDesign,
  },
  {
    id: "reliability",
    label: "Reliability & Ops",
    component: Reliability,
  },
];
