import GCPDatabases from "./GCPDatabases";
import Messaging from "./Messaging";
import Caching from "./Caching";

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
];
