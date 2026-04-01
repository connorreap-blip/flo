import type { WorkspaceTemplate } from "./index";

export const systemArchitectureTemplate: WorkspaceTemplate = {
  id: "system-architecture",
  name: "System Architecture Map",
  description: "Lay out the system boundary, core services, and the references that explain how each layer fits together.",
  category: "Architecture",
  goal: "Document a service architecture that makes ownership, data flow, and dependencies obvious to an implementing agent.",
  viewport: { x: 10, y: 10, zoom: 0.74 },
  cards: [
    {
      id: "arch-system",
      type: "project",
      title: "B2B analytics platform",
      body: "Map ingestion, query, and delivery layers so feature work starts from an accurate system model.",
      position: { x: 420, y: 80 },
      collapsed: false,
      hasDoc: true,
      docContent:
        "<h2>System boundary</h2><p>The platform ingests product events, normalizes them into warehouse tables, and serves account-scoped dashboards plus scheduled alerts.</p>",
    },
    {
      id: "arch-ingest",
      type: "process",
      title: "Ingestion pipeline",
      body: "Collectors validate schemas, batch events, and route failures into replay queues.",
      position: { x: 120, y: 280 },
      collapsed: false,
      hasDoc: true,
      docContent:
        "<h2>Responsibilities</h2><ul><li>Schema validation</li><li>Dead-letter replay</li><li>Per-tenant rate limiting</li></ul>",
    },
    {
      id: "arch-api",
      type: "process",
      title: "Query API and auth",
      body: "Serves dashboards and enforces workspace-scoped permissions for every metric request.",
      position: { x: 420, y: 280 },
      collapsed: false,
      hasDoc: true,
      docContent:
        "<h2>Interfaces</h2><p>GraphQL gateway handles chart queries, saved reports, and alert configuration mutations.</p>",
    },
    {
      id: "arch-worker",
      type: "process",
      title: "Background jobs",
      body: "Materializes aggregates, backfills late events, and dispatches scheduled notifications.",
      position: { x: 720, y: 280 },
      collapsed: false,
      hasDoc: false,
      docContent: "",
    },
    {
      id: "arch-data",
      type: "reference",
      title: "Data model reference",
      body: "Warehouse tables, event contracts, and retention windows for each dataset.",
      position: { x: 120, y: 500 },
      collapsed: false,
      hasDoc: true,
      docContent:
        "<h2>Primary entities</h2><p>workspace, actor, session, event, metric rollup, and delivery log. Retain raw events for 30 days and aggregates for 18 months.</p>",
    },
    {
      id: "arch-runtime",
      type: "reference",
      title: "Runtime and deployment constraints",
      body: "Latency budgets, queue guarantees, and region placement requirements.",
      position: { x: 720, y: 500 },
      collapsed: false,
      hasDoc: true,
      docContent:
        "<h2>Constraints</h2><ul><li>P95 dashboard query under 400ms.</li><li>Alert delivery retries for 24 hours.</li><li>EU tenants remain in-region.</li></ul>",
    },
  ],
  edges: [
    { id: "arch-h1", source: "arch-system", target: "arch-ingest", edgeType: "hierarchy" },
    { id: "arch-h2", source: "arch-system", target: "arch-api", edgeType: "hierarchy" },
    { id: "arch-f1", source: "arch-ingest", target: "arch-api", edgeType: "flow" },
    { id: "arch-f2", source: "arch-api", target: "arch-worker", edgeType: "flow" },
    {
      id: "arch-r1",
      source: "arch-ingest",
      target: "arch-data",
      edgeType: "reference",
      referenceScope: "full",
    },
    {
      id: "arch-r2",
      source: "arch-worker",
      target: "arch-runtime",
      edgeType: "reference",
      referenceScope: "summary",
    },
  ],
};
