import { useState } from "react";

const services = [
  {
    name: "Cloud Pub/Sub",
    type: "Managed Pub/Sub Messaging",
    tagline: "Serverless event broadcast — the backbone of GCP async",
    model: "Topic → Subscriptions (each gets a copy). Push or Pull delivery.",
    delivery: "At-least-once (default). Exactly-once available (pull only, single region).",
    ordering: "Unordered by default. Per ordering-key ordering if enabled on subscription.",
    scaling: "Fully serverless — no partitions, no brokers, auto-scales",
    latency: "<100ms typical",
    retention: "Up to 31 days (if enabled). ACKed messages deleted by default.",
    replay: "Yes — Seek by timestamp or snapshot (requires retention enabled)",
    bestFor: [
      "Microservice decoupling (fan-out events)",
      "Event-driven architectures on GCP",
      "Streaming ingestion → Dataflow → BigQuery pipeline",
      "Notifications to multiple subscribers",
    ],
    notFor: [
      "Task scheduling with delays (use Cloud Tasks)",
      "Rate-limited dispatch to fragile APIs (use Cloud Tasks)",
      "Event sourcing / log replay as core pattern (use Kafka)",
      "Synchronous request-response",
    ],
    keyDetails: [
      "Max message size: 10MB",
      "Push = Pub/Sub POSTs to your HTTPS endpoint (great for Cloud Run/Functions)",
      "Pull = your code polls for messages (more control, supports exactly-once)",
      "Attribute filtering on subscriptions — subscribers only get messages matching filters",
      "DLQ configured per subscription — after N failed attempts, message → dead letter topic",
      "Ordering key + DLQ should always go together (prevents head-of-line blocking)",
    ],
    interviewTip:
      'Default choice for async communication on GCP. Say "Pub/Sub" whenever you need to decouple services or fan-out events.',
  },
  {
    name: "Cloud Tasks",
    type: "Managed Task Queue",
    tagline: "Rate-controlled work dispatch — protect your downstream services",
    model: "Queue → Tasks dispatched to a target (HTTP endpoint or App Engine)",
    delivery: "At-least-once. Deduplication by task name (within 1 hour).",
    ordering: "No ordering guarantees",
    scaling: "Serverless, auto-scales queue processing",
    latency: "Configurable — immediate or scheduled delay",
    retention: "Tasks retained until executed or expired (max 30 days)",
    replay: "No replay — tasks are consumed and gone",
    bestFor: [
      "Rate-limited API calls (e.g., 10 req/sec to third-party API)",
      "Delayed/scheduled task execution",
      "Protecting fragile downstream services from burst traffic",
      "Background work: send email, resize image, generate PDF",
    ],
    notFor: [
      "Fan-out to multiple consumers (use Pub/Sub)",
      "Event broadcasting / notifications (use Pub/Sub)",
      "Stream processing (use Dataflow)",
      "Recurring scheduled jobs (use Cloud Scheduler)",
    ],
    keyDetails: [
      "NOT Cloud Scheduler (cron). Cloud Tasks = on-demand work queue, Scheduler = recurring cron",
      "Rate limiting: configure max dispatches/sec per queue",
      "Scheduled delivery: delay a task by seconds to hours",
      "Task deduplication: assign a task name, same name within 1hr is rejected",
      "Retry config: max attempts, backoff, age limit",
      "Target: HTTP endpoint (Cloud Run, any URL) or App Engine handler",
    ],
    interviewTip:
      'Use when you hear "rate limit", "don\'t overwhelm the service", "delayed processing", or "background job with controlled throughput".',
  },
  {
    name: "Dataflow (Apache Beam)",
    type: "Managed Stream & Batch Processing",
    tagline: "Stateful processing across messages — aggregation, windowing, joins",
    model: "Pipeline: Source → Transforms → Sink. Reads from Pub/Sub, Kafka, GCS, etc.",
    delivery: "Exactly-once processing (guaranteed when reading from Pub/Sub)",
    ordering: "Handles ordering via windowing and watermarks",
    scaling: "Auto-scales workers based on backlog",
    latency: "Seconds (streaming mode) to minutes (batch mode)",
    retention: "N/A — processes data in flight, doesn't store it",
    replay: "Reprocess by replaying source (Pub/Sub seek, re-read files)",
    bestFor: [
      "Windowed aggregations (count per user per 5 min)",
      "Stream joins (combine clicks with impressions)",
      "Deduplication over time windows",
      "ETL pipelines: Pub/Sub → transform → BigQuery",
      "Sessionization of user events",
    ],
    notFor: [
      "Simple per-message transform (use Cloud Function)",
      "Routing/filtering individual messages (use Cloud Function)",
      "Task queuing (use Cloud Tasks)",
      "When a stateless function would suffice",
    ],
    keyDetails: [
      "Same Beam code works for both batch and streaming",
      "Writes to: Pub/Sub, BigQuery, Bigtable, GCS, Cloud SQL, Kafka — anything",
      "Handles late-arriving data via watermarks and allowed lateness",
      "Auto-scales workers up/down based on input backlog",
      "Unified model: batch = bounded stream, streaming = unbounded stream",
    ],
    interviewTip:
      'Only use when you need STATE across messages. If you hear "aggregate", "window", "join streams", "sessionize" → Dataflow. Simple per-message work → Cloud Function.',
  },
  {
    name: "Kafka",
    type: "Distributed Event Streaming (self-hosted)",
    tagline: "The event log — replay, event sourcing, high-throughput streaming",
    model: "Topic → Partitions → Consumer Groups. Messages stored as an immutable log on broker disks.",
    delivery: "At-least-once (default). Exactly-once with idempotent producers + transactions.",
    ordering: "Guaranteed per partition",
    scaling: "Manual — add partitions and brokers. Consumers scale up to # of partitions.",
    latency: "<10ms",
    retention: "Configurable (hours to forever). Retained by default — offset-based replay is native.",
    replay: "Native — consumers control their offset, can rewind anytime",
    bestFor: [
      "Event sourcing / immutable event log",
      "High-throughput streaming (millions/sec)",
      "Cloud-agnostic designs",
      "Replay as a core requirement",
      "Multi-datacenter replication (MirrorMaker)",
    ],
    notFor: [
      "GCP-native designs (use Pub/Sub — simpler, serverless)",
      "Small scale / serverless architectures",
      "When you don't want to manage infrastructure",
    ],
    keyDetails: [
      "NOT a Google service — open source, self-hosted (or Confluent Cloud)",
      "Data lives on broker disks — you manage the cluster",
      "Partitions are your unit of parallelism AND ordering",
      "Consumer groups: each group gets all messages, consumers within a group split partitions",
      "Google has no managed Kafka — they push Pub/Sub instead",
      "Managed options: Confluent Cloud, AWS MSK, Aiven",
    ],
    interviewTip:
      'Use when the question is cloud-agnostic, needs native replay/event sourcing, or the interviewer explicitly mentions Kafka. For GCP-specific designs, prefer Pub/Sub.',
  },
  {
    name: "Change Streams (CDC)",
    type: "Database Change Data Capture",
    tagline: "React to database writes — the bridge between DB and event world",
    model: "DB emits a stream of row-level mutations (insert/update/delete) that consumers read.",
    delivery: "At-least-once",
    ordering: "Per-row ordering guaranteed",
    scaling: "Depends on source DB scaling",
    latency: "Near real-time (seconds)",
    retention: "Varies — Spanner: 7 days, Bigtable: 7 days",
    replay: "Within retention window",
    bestFor: [
      "Cache invalidation (DB changes → update Redis)",
      "Syncing data between systems (DB → search index)",
      "Triggering workflows on data changes",
      "Building materialized views",
      "Replicating data to analytics (DB → BigQuery)",
    ],
    notFor: [
      "Primary messaging between services (use Pub/Sub)",
      "Databases without native CDC (Cloud SQL needs Debezium)",
    ],
    keyDetails: [
      "Spanner: native Change Streams → consume via Dataflow or direct API",
      "Bigtable: native Change Streams → consume via Dataflow",
      "Firestore: native triggers → Cloud Functions fire on document write",
      "Cloud SQL: NO native CDC — use Debezium + Pub/Sub as workaround",
      "BigQuery: no CDC (it's a warehouse, not operational DB)",
      "CDC is essentially the 'automatic outbox pattern'",
    ],
    interviewTip:
      'Use when interviewer asks "how do you keep the cache/search index/replica in sync with the database?" CDC + Pub/Sub is a powerful answer.',
  },
];

const patterns = [
  {
    name: "Outbox Pattern",
    problem: "You need to update a DB AND publish an event atomically. If either fails independently, your system is inconsistent.",
    solution: "Write business data + the event to an 'outbox' table in the SAME DB transaction. A separate process polls the outbox and publishes to Pub/Sub. On success, marks the row as sent.",
    flow: ["Service writes to DB + outbox table (1 ACID transaction)", "Poller reads outbox table", "Poller publishes to Pub/Sub", "On ACK, marks outbox row as sent"],
    when: "DB doesn't have native CDC (e.g., Cloud SQL). Need guaranteed consistency between DB state and published events.",
    alternative: "If your DB has Change Streams (Spanner, Bigtable), use CDC instead — it's the automatic version of this pattern.",
  },
  {
    name: "Fan-out Pattern",
    problem: "One event needs to trigger multiple independent actions (email, analytics, billing, etc.)",
    solution: "Publisher sends one message to a Pub/Sub topic. Multiple subscriptions each deliver a copy to different consumer services.",
    flow: ["User signs up → API publishes 'user.created' to topic", "Subscription A → Email service sends welcome email", "Subscription B → Analytics service records signup", "Subscription C → Billing service creates account"],
    when: "Multiple services need to react to the same event independently. Services should be decoupled.",
    alternative: "If only 2-3 known services need the data and latency matters, consider direct API calls instead. Don't over-engineer.",
  },
  {
    name: "Competing Consumers",
    problem: "You have a high volume of tasks and need to distribute work across multiple workers.",
    solution: "Multiple consumer instances pull from the same Pub/Sub subscription. Each message goes to exactly one consumer.",
    flow: ["1000 image resize tasks published to topic", "Subscription with 10 consumer pods", "Each consumer picks up ~100 tasks", "Failed tasks are redelivered to another consumer"],
    when: "Work queue pattern — distribute tasks across a worker pool. Scale consumers up/down based on backlog.",
    alternative: "Cloud Tasks if you need rate limiting. Dataflow if you need stateful processing across messages.",
  },
  {
    name: "Backpressure / Rate Protection",
    problem: "Burst traffic would overwhelm a downstream service (third-party API, fragile DB, etc.)",
    solution: "Use Cloud Tasks queue with rate limiting between your service and the downstream target.",
    flow: ["Pub/Sub delivers burst of 1000 events", "Your service creates Cloud Tasks (one per event)", "Queue configured: max 10 dispatches/sec", "Downstream API receives controlled 10 req/sec"],
    when: "Downstream has rate limits, SLA requirements, or can't handle burst traffic.",
    alternative: "If downstream can auto-scale, just use Pub/Sub directly with enough consumers.",
  },
  {
    name: "Event Sourcing",
    problem: "You need a full audit trail, ability to replay history with new logic, or reconstruct state at any point in time.",
    solution: "Store every event (not current state) as an immutable log. Current state = replay of all events. Use snapshots for read performance.",
    flow: ["AccountCreated(id=1)", "Deposited($1000)", "Withdrew($300)", "Withdrew($200)", "→ Current balance: $500 (derived by replay)"],
    when: "Financial systems, compliance/audit trails, fraud detection replay, systems where 'undo' is critical.",
    alternative: "Most systems do NOT need this. Use standard CRUD unless you specifically hear 'audit trail', 'compliance', 'replay with new rules'. Interviewers are impressed when you know NOT to use it.",
  },
  {
    name: "Streaming ETL Pipeline",
    problem: "Raw events need to be transformed, enriched, and loaded into analytics/serving stores in real-time.",
    solution: "Pub/Sub → Dataflow → BigQuery/Bigtable. Dataflow handles the transformation, windowing, and exactly-once delivery.",
    flow: ["Raw clickstream → Pub/Sub (topic)", "Dataflow reads, enriches with user data, filters bots", "Windowed aggregation: clicks per page per 5min", "Write to BigQuery (analytics) + Bigtable (real-time serving)"],
    when: "Real-time analytics, dashboard feeds, ML feature pipelines, any 'transform stream before storing' scenario.",
    alternative: "If no aggregation/joins needed, skip Dataflow. Cloud Function → direct write to BigQuery works for simple per-message transforms.",
  },
];

const faqs = [
  {
    q: "When do I use Pub/Sub vs Cloud Tasks?",
    a: "Pub/Sub = 'something happened, whoever cares can react' (broadcast). Cloud Tasks = 'do this specific job at this controlled rate' (directed work). Pub/Sub for events, Cloud Tasks for jobs.",
  },
  {
    q: "When do I use Pub/Sub vs Kafka?",
    a: "On GCP → Pub/Sub (serverless, native). Cloud-agnostic or need native event sourcing/replay → Kafka. Pub/Sub CAN replay with Seek, but Kafka's offset-based replay is more natural.",
  },
  {
    q: "When do I need Dataflow vs a Cloud Function?",
    a: "Cloud Function = stateless, per-message processing (filter, transform, route). Dataflow = stateful, cross-message processing (aggregate, window, join, sessionize).",
  },
  {
    q: "How do I handle duplicate messages?",
    a: "Design consumers to be idempotent. Use message_id or a business key to deduplicate. Options: check DB before processing (SELECT before INSERT), use upserts, or enable exactly-once on Pub/Sub (pull only, single region, higher latency).",
  },
  {
    q: "How do I keep my cache in sync with the database?",
    a: "CDC (Change Streams) → Pub/Sub → cache update service. Works for Spanner, Bigtable, Firestore natively. For Cloud SQL, use Debezium → Pub/Sub.",
  },
  {
    q: "How do I guarantee DB write + event publish are atomic?",
    a: "Outbox Pattern (write both to same DB in one transaction, poll & publish separately) or CDC (DB emits changes automatically). Never rely on 'write DB then publish' — either can fail independently.",
  },
  {
    q: "What is push vs pull in Pub/Sub?",
    a: "Pull = your code polls for messages (more control, supports exactly-once). Push = Pub/Sub sends HTTP POST to your endpoint (great for serverless — Cloud Run/Functions, but no exactly-once).",
  },
  {
    q: "What is Cloud Scheduler vs Cloud Tasks?",
    a: "Cloud Scheduler = cron ('run this every 5 minutes'). Cloud Tasks = on-demand work queue ('do this job now, at controlled rate'). Different tools for different problems.",
  },
];

function ServiceCard({ svc, isExpanded, onToggle }) {
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 12, overflow: "hidden" }}>
      <div
        onClick={onToggle}
        style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, borderBottom: isExpanded ? "1px solid #2a2a4a" : "none" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{svc.name}</span>
            <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, background: "#2a2a4a", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{svc.type}</span>
          </div>
          <div style={{ fontSize: 14, color: "#64748b", fontStyle: "italic" }}>{svc.tagline}</div>
        </div>
        <span style={{ color: "#64748b", fontSize: 14, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}>▼</span>
      </div>

      {isExpanded && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
            {[
              ["Model", svc.model],
              ["Delivery", svc.delivery],
              ["Ordering", svc.ordering],
              ["Scaling", svc.scaling],
              ["Latency", svc.latency],
              ["Retention", svc.retention],
              ["Replay", svc.replay],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "#0f0f23", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.4 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>✓ Best for</div>
              {svc.bestFor.map((item, i) => (<div key={i} style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4, paddingLeft: 6 }}>• {item}</div>))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>✗ Not for</div>
              {svc.notFor.map((item, i) => (<div key={i} style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4, paddingLeft: 6 }}>• {item}</div>))}
            </div>
          </div>

          <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>📌 Key Details</div>
            {svc.keyDetails.map((item, i) => (<div key={i} style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 4, paddingLeft: 6 }}>• {item}</div>))}
          </div>

          <div style={{ background: "#0f1c0f", borderRadius: 6, padding: "12px 14px", border: "1px solid #153b15" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🎯 Interview Trigger</div>
            <div style={{ fontSize: 14, color: "#86efac", lineHeight: 1.5, fontStyle: "italic" }}>{svc.interviewTip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern, isExpanded, onToggle }) {
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 12, overflow: "hidden" }}>
      <div
        onClick={onToggle}
        style={{ padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, borderBottom: isExpanded ? "1px solid #2a2a4a" : "none" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{pattern.name}</span>
          <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{pattern.problem}</div>
        </div>
        <span style={{ color: "#64748b", fontSize: 14, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}>▼</span>
      </div>

      {isExpanded && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Solution</div>
            <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>{pattern.solution}</div>
          </div>

          <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Flow</div>
            {pattern.flow.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", minWidth: 20 }}>{i + 1}.</span>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>{step}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>When to use</div>
              <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>{pattern.when}</div>
            </div>
            <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Alternative</div>
              <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>{pattern.alternative}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagingCheatSheet() {
  const [expandedServices, setExpandedServices] = useState(new Set([0]));
  const [expandedPatterns, setExpandedPatterns] = useState(new Set([0]));
  const [expandedFaqs, setExpandedFaqs] = useState(new Set());
  const [showComparison, setShowComparison] = useState(true);
  const [showDecision, setShowDecision] = useState(true);

  const toggleService = (i) => { setExpandedServices((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; }); };
  const togglePattern = (i) => { setExpandedPatterns((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; }); };
  const toggleFaq = (i) => { setExpandedFaqs((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; }); };

  const expandAllSvc = () => setExpandedServices(new Set(services.map((_, i) => i)));
  const collapseAllSvc = () => setExpandedServices(new Set());
  const expandAllPat = () => setExpandedPatterns(new Set(patterns.map((_, i) => i)));
  const collapseAllPat = () => setExpandedPatterns(new Set());

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f23", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "16px 12px" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          Messaging & Queues Cheat Sheet
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>System Design Interview Reference — Google L6</p>

        {/* Decision Tree */}
        <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 20, overflow: "hidden" }}>
          <div onClick={() => setShowDecision(!showDecision)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#fbbf24" }}>⚡ Quick Decision Tree</span>
            <span style={{ color: "#64748b", transform: showDecision ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
          </div>
          {showDecision && (
            <div style={{ padding: "0 16px 14px" }}>
              {[
                ['"Broadcast event to multiple services"', "→ Pub/Sub"],
                ['"Do this job at controlled rate"', "→ Tasks"],
                ['"Aggregate / window / join stream"', "→ Dataflow"],
                ['"React to database row changes"', "→ CDC"],
                ['"Need event sourcing / replay"', "→ Kafka"],
                ['"Run this every 5 minutes"', "→ Scheduler"],
                ['"Simple per-message transform"', "→ Function"],
              ].map(([q, a], i) => (
                <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 0", borderBottom: i < 6 ? "1px solid #1a1a3e" : "none", fontSize: 15 }}>
                  <span style={{ color: "#94a3b8", flex: "1 1 200px", minWidth: 0 }}>{q}</span>
                  <span style={{ color: "#22c55e", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Services Section */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>Services</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={expandAllSvc} style={{ background: "#2a2a4a", color: "#94a3b8", border: "none", padding: "5px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>Expand All</button>
            <button onClick={collapseAllSvc} style={{ background: "#2a2a4a", color: "#94a3b8", border: "none", padding: "5px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>Collapse All</button>
          </div>
        </div>
        {services.map((svc, i) => (<ServiceCard key={svc.name} svc={svc} isExpanded={expandedServices.has(i)} onToggle={() => toggleService(i)} />))}

        {/* Comparison Table */}
        <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", padding: "14px 12px", marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div onClick={() => setShowComparison(!showComparison)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>Side-by-Side Comparison</h2>
            <span style={{ color: "#64748b", transform: showComparison ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
          </div>
          {showComparison && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 12, minWidth: 500 }}>
              <thead>
                <tr>
                  {["", "Pub/Sub", "Tasks", "Dataflow", "Kafka", "CDC"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#818cf8", borderBottom: "2px solid #2a2a4a", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Pattern", "Fan-out", "Work queue", "Stream", "Event log", "DB→events"],
                  ["Consumers", "Multi subs", "One target", "Pipeline", "Groups", "Reader"],
                  ["Ordering", "Per key", "None", "Windowed", "Per part.", "Per row"],
                  ["Delivery", "At-least", "At-least", "Exactly", "At-least", "At-least"],
                  ["Replay", "Seek", "No", "Via src", "Native", "Window"],
                  ["Managed", "Serverless", "Serverless", "Serverless", "Self-host", "DB-native"],
                  ["Rate limit", "No", "Yes ✓", "Auto", "Consumer", "N/A"],
                  ["Delay", "No", "Yes ✓", "No", "No", "No"],
                ].map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "5px 8px", color: j === 0 ? "#64748b" : "#cbd5e1", borderBottom: "1px solid #1a1a3e", fontFamily: j === 0 ? "inherit" : "'JetBrains Mono', monospace", fontWeight: j === 0 ? 600 : 400, fontSize: 10, whiteSpace: "nowrap" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Patterns Section */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>Patterns</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={expandAllPat} style={{ background: "#2a2a4a", color: "#94a3b8", border: "none", padding: "5px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>Expand All</button>
            <button onClick={collapseAllPat} style={{ background: "#2a2a4a", color: "#94a3b8", border: "none", padding: "5px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>Collapse All</button>
          </div>
        </div>
        {patterns.map((p, i) => (<PatternCard key={p.name} pattern={p} isExpanded={expandedPatterns.has(i)} onToggle={() => togglePattern(i)} />))}

        {/* FAQ Section */}
        <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, marginTop: 8 }}>Common Interview Q&A</h2>
        {faqs.map((faq, i) => (
          <div key={i} style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 10, overflow: "hidden" }}>
            <div onClick={() => toggleFaq(i)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", flex: 1 }}>{faq.q}</span>
              <span style={{ color: "#64748b", fontSize: 14, transform: expandedFaqs.has(i) ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}>▼</span>
            </div>
            {expandedFaqs.has(i) && (
              <div style={{ padding: "0 16px 14px" }}>
                <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{faq.a}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
