import { useState } from "react";

const databases = [
  {
    name: "Spanner",
    type: "Relational (NewSQL)",
    tagline: "Global ACID at scale",
    model: "Tables with schema, SQL",
    consistency: "Strong (external consistency)",
    scaling: "Horizontal (auto-sharding)",
    scope: "Global / Multi-region",
    latency: { read: "5–20ms", write: "100–200ms" },
    throughput: "Moderate (optimized for consistency over raw speed)",
    bestFor: [
      "Global financial ledgers",
      "Inventory / supply chain",
      "User accounts needing strong consistency",
      "Gaming leaderboards (global)",
    ],
    notFor: [
      "High-throughput analytics (use BigQuery)",
      "Simple regional apps (use Cloud SQL)",
      "Massive write-heavy logging (use Bigtable)",
    ],
    sla: "99.999% (multi-region)",
    cost: "$$$ — expensive per node, justified for global ACID",
    keyDesign:
      "Primary key (can be composite). Avoid monotonically increasing keys → hot spots. Use UUIDs or hash prefixes.",
    rowExample: {
      description: "User accounts table",
      headers: ["UserId (PK)", "Email", "Name", "Balance", "Region"],
      rows: [
        ["a3f8-...", "noam@g.com", "Noam", "$1,200.50", "us-east1"],
        ["b7c2-...", "rita@ms.com", "Rita", "$3,400.00", "eu-west1"],
      ],
    },
    gotchas: [
      "Monotonic keys (auto-increment, timestamps) → hot spots",
      "Writes are slower due to TrueTime + 2PC",
      "Expensive for small workloads",
      "Interleaved tables help with parent-child locality",
    ],
    interviewTip:
      'Use when interviewer says "globally consistent", "ACID at scale", or "financial transactions across regions".',
  },
  {
    name: "Bigtable",
    type: "Wide-column NoSQL",
    tagline: "Petabyte-scale, sub-10ms, write-optimized beast",
    model: "Row key → Column families → Column qualifiers → Timestamped cells",
    consistency: "Strong (single-region), Eventual (multi-region)",
    scaling: "Horizontal (add nodes)",
    scope: "Single region (multi-region with replication)",
    latency: { read: "<10ms", write: "<10ms" },
    throughput: "Millions of rows/sec read & write",
    bestFor: [
      "Time-series (IoT sensors, metrics, logs)",
      "Analytics pipelines (Hadoop/Beam/Spark)",
      "High-throughput ingestion (ad clicks, events)",
      "ML feature stores",
    ],
    notFor: [
      "< 10TB data (overkill, use Firestore)",
      "Multi-row transactions",
      "SQL queries / joins",
      "Small datasets with complex queries",
    ],
    sla: "99.999% (replicated)",
    cost: "$$ — pay per node (not serverless). Cost-effective at scale (>10TB)",
    keyDesign:
      "Row key is your ONLY index. Lexicographic sort. Design for your read pattern. Reverse domain, hash prefix, or composite keys.",
    rowExample: {
      description: "Metrics time-series (reversed domain + metric + time bucket)",
      headers: [
        "Row Key",
        "cf:cpu_usage",
        "cf:mem_usage",
        "cf:disk_io",
      ],
      rows: [
        ["com.google.search#cpu#2025-W05", "72.3 @t1", "84.1 @t1", "120MB/s @t1"],
        ["com.google.search#cpu#2025-W05", "68.9 @t2", "81.0 @t2", "115MB/s @t2"],
        ["com.google.maps#cpu#2025-W05", "45.2 @t1", "62.0 @t1", "90MB/s @t1"],
      ],
    },
    gotchas: [
      "Timestamp as row key PREFIX → hot spot (all writes go to same tablet)",
      "No secondary indexes (must design row key carefully or use materialized views)",
      "Single-row transactions only",
      "NOT serverless — you provision nodes",
      "Capacitor is BigQuery's format, NOT Bigtable's. Bigtable uses SSTable (LSM-tree)",
    ],
    interviewTip:
      'Use when you hear "billions of events", "time-series", "write-heavy", "low-latency at petabyte scale". Think of it as your log/metrics/events dump.',
  },
  {
    name: "BigQuery",
    type: "Columnar Data Warehouse (OLAP)",
    tagline: "Cheapest storage, most expensive queries — analytics powerhouse",
    model: "SQL tables (columnar storage, Capacitor format)",
    consistency: "Strong (snapshot isolation)",
    scaling: "Serverless auto-scale",
    scope: "Multi-region",
    latency: { read: "Seconds to minutes (batch)", write: "Streaming: seconds" },
    throughput: "Handles petabytes per query, not meant for point lookups",
    bestFor: [
      "BI dashboards & reporting",
      "Ad-hoc SQL analytics over huge datasets",
      "ML training data (BigQuery ML)",
      "Data lake / long-term storage",
      "Log analysis (when latency doesn't matter)",
    ],
    notFor: [
      "Real-time serving (<100ms reads)",
      "OLTP / transactional workloads",
      "Point lookups by key",
      "Frequent small queries (cost adds up)",
    ],
    sla: "99.99%",
    cost: "$ storage (very cheap ~$0.02/GB/mo) but $$$ per query ($5/TB scanned). Use partitioning + clustering to reduce cost.",
    keyDesign:
      "No row key. Design around partitioning (usually by date) and clustering (frequently filtered columns) to minimize bytes scanned.",
    rowExample: {
      description: "Event analytics table (partitioned by date, clustered by event_type)",
      headers: ["event_date (PARTITION)", "event_type (CLUSTER)", "user_id", "country", "payload"],
      rows: [
        ["2025-02-06", "page_view", "u-123", "IL", "{url: '/home'}"],
        ["2025-02-06", "purchase", "u-456", "US", "{item: 'widget', $: 29.99}"],
      ],
    },
    gotchas: [
      "SELECT * is expensive — always select specific columns",
      "Streaming inserts cost more than batch loads",
      "Not for real-time serving",
      "Partition by date + cluster by high-cardinality columns to save $$$",
      "Capacitor format = columnar storage (this is BigQuery's, not Bigtable's)",
    ],
    interviewTip:
      'Use when interviewer asks for "analytics", "BI", "offline processing", "data warehouse", or "cheapest long-term storage with SQL".',
  },
  {
    name: "Cloud SQL",
    type: "Managed Relational (MySQL/PostgreSQL/SQL Server)",
    tagline: "Simple, familiar, regional relational DB",
    model: "Standard SQL tables, schemas, joins, transactions",
    consistency: "Strong (single region)",
    scaling: "Vertical (bigger machine) + read replicas",
    scope: "Regional (cross-region read replicas available)",
    latency: { read: "1–5ms", write: "2–10ms" },
    throughput: "Moderate (not designed for massive scale)",
    bestFor: [
      "Standard web app backends",
      "CMS / e-commerce (moderate scale)",
      "Lift-and-shift from on-prem MySQL/PostgreSQL",
      "Simple CRUD apps",
    ],
    notFor: [
      "Global consistency (use Spanner)",
      "Horizontal write scaling (use Spanner)",
      "Petabyte-scale data (use Bigtable/BigQuery)",
      "Time-series at scale",
    ],
    sla: "99.95% (HA config)",
    cost: "$ — cheapest relational option for small-medium workloads",
    keyDesign: "Standard primary keys, indexes, foreign keys. Nothing special.",
    rowExample: {
      description: "Simple user profiles table",
      headers: ["id (PK)", "username", "email", "created_at"],
      rows: [
        ["1", "noam_dev", "noam@g.com", "2025-01-15"],
        ["2", "rita_eng", "rita@ms.com", "2025-02-01"],
      ],
    },
    gotchas: [
      "Does NOT auto-scale horizontally — you must manually resize",
      "Max ~10TB practical limit",
      "Cross-region writes not supported (only read replicas)",
      "Not suitable for massive scale — that's Spanner's job",
    ],
    interviewTip:
      'Use for "simple relational needs", "moderate scale", "PostgreSQL compatibility". If interviewer pushes on global scale → upgrade to Spanner.',
  },
  {
    name: "Firestore",
    type: "Document NoSQL (serverless)",
    tagline: "Flexible schema, real-time sync, auto-scaling",
    model: "Collections → Documents (JSON-like) → Subcollections",
    consistency: "Strong",
    scaling: "Serverless auto-scale",
    scope: "Multi-region",
    latency: { read: "<10ms", write: "<10ms" },
    throughput: "High (auto-scales), but watch for hot spots on single documents",
    bestFor: [
      "Mobile / web app backends",
      "Real-time sync (chat, collaborative apps)",
      "User profiles, product catalogs",
      "Serverless architectures",
      "Flexible/evolving schemas",
    ],
    notFor: [
      "> few TB (use Bigtable)",
      "Complex joins / analytics (use BigQuery)",
      "Heavy write throughput on single documents",
      "Relational data with complex queries",
    ],
    sla: "99.999% (multi-region)",
    cost: "$ — pay per read/write/storage. Cheap for small-medium, can get expensive at high read/write volume.",
    keyDesign: "Document IDs (auto-generated or custom). Design subcollections for query patterns.",
    rowExample: {
      description: "User profile document in 'users' collection",
      headers: ["Document Path", "Fields"],
      rows: [
        ["users/noam_123", '{ name: "Noam", age: 28, city: "Tel Aviv", interests: ["AI", "yoga"] }'],
        ["users/noam_123/orders/ord_1", '{ item: "keyboard", price: 89.99, status: "shipped" }'],
      ],
    },
    gotchas: [
      "Limited query capabilities vs SQL (no joins, limited aggregations)",
      "Hot documents (single doc written by many clients) → bottleneck",
      "Reads of large collections can be expensive",
      "Composite indexes needed for multi-field queries",
    ],
    interviewTip:
      'Use for "mobile backend", "real-time sync", "serverless", "flexible schema at moderate scale". Predecessor was Datastore.',
  },
  {
    name: "Memorystore",
    type: "In-memory (Redis / Memcached)",
    tagline: "Sub-millisecond cache layer",
    model: "Key-value (Redis data structures: strings, hashes, lists, sorted sets)",
    consistency: "N/A (cache layer, eventual)",
    scaling: "Vertical (Redis) / Horizontal (Memcached, Redis Cluster)",
    scope: "Regional",
    latency: { read: "<1ms", write: "<1ms" },
    throughput: "Very high (100K+ ops/sec per node)",
    bestFor: [
      "Caching layer (DB query results, session data)",
      "Rate limiting",
      "Leaderboards (Redis sorted sets)",
      "Pub/sub messaging",
      "Session management",
    ],
    notFor: [
      "Persistent primary storage",
      "Large datasets (memory is expensive)",
      "Complex queries",
      "Cross-region replication",
    ],
    sla: "99.9%",
    cost: "$$ — memory is expensive per GB, but you use small amounts",
    keyDesign: "Simple string keys. Use prefixes for namespacing: 'session:{userId}', 'cache:product:{id}'",
    rowExample: {
      description: "Session cache + leaderboard examples",
      headers: ["Key", "Value / Structure"],
      rows: [
        ["session:u-123", '{ token: "abc", expires: 1707264000 }'],
        ["leaderboard:game1 (sorted set)", "{ noam: 2500, rita: 3100, dan: 1800 }"],
        ["ratelimit:api:u-123", "47 (TTL: 60s)"],
      ],
    },
    gotchas: [
      "Data lost on restart unless persistence is configured (Redis)",
      "Memory is expensive — cache only hot data",
      "Not a primary database",
      "Eviction policies matter (LRU, LFU, etc.)",
    ],
    interviewTip:
      'Almost always part of your design as a caching layer. Mention it for "reduce DB load", "session storage", "rate limiting", "leaderboards".',
  },
];

const decisionTree = [
  { question: "Need global ACID transactions?", answer: "→ Spanner" },
  { question: "Write-heavy, petabyte-scale, time-series?", answer: "→ Bigtable" },
  { question: "Offline analytics / BI / SQL over huge data?", answer: "→ BigQuery" },
  { question: "Simple relational, moderate scale?", answer: "→ Cloud SQL" },
  { question: "Mobile/web, flexible schema, real-time sync?", answer: "→ Firestore" },
  { question: "Sub-ms cache / sessions / rate-limiting?", answer: "→ Memorystore" },
];

function DBCard({ db, isExpanded, onToggle }) {
  const latencyColor = (val) => {
    if (val.includes("<1")) return "#22c55e";
    if (val.includes("<10") || val.includes("1–5") || val.includes("2–10") || val.includes("5–20")) return "#86efac";
    if (val.includes("100")) return "#fbbf24";
    if (val.includes("Seconds")) return "#f87171";
    return "#94a3b8";
  };

  return (
    <div
      style={{
        background: "#1a1a2e",
        borderRadius: 10,
        border: "1px solid #2a2a4a",
        marginBottom: 12,
        overflow: "hidden",
        transition: "all 0.2s",
      }}
    >
      {/* Header - always visible */}
      <div
        onClick={onToggle}
        style={{
          padding: "12px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          borderBottom: isExpanded ? "1px solid #2a2a4a" : "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>
              {db.name}
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "3px 8px",
                borderRadius: 4,
                background: "#2a2a4a",
                color: "#94a3b8",
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "nowrap",
              }}
            >
              {db.type}
            </span>
          </div>
          <div style={{ fontSize: 16, color: "#64748b", fontStyle: "italic" }}>{db.tagline}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: "right", fontSize: 13 }}>
            <div>
              <span style={{ color: "#64748b" }}>R: </span>
              <span style={{ color: latencyColor(db.latency.read), fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {db.latency.read}
              </span>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>W: </span>
              <span style={{ color: latencyColor(db.latency.write), fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {db.latency.write}
              </span>
            </div>
          </div>
          <span style={{ color: "#64748b", fontSize: 14, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
            ▼
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: "12px 14px" }}>
          {/* Quick specs grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {[
              ["Data Model", db.model],
              ["Consistency", db.consistency],
              ["Scaling", db.scaling],
              ["Scope", db.scope],
              ["SLA", db.sla],
              ["Cost", db.cost],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "#0f0f23", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.6 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Best for / Not for */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                ✓ Best for
              </div>
              {db.bestFor.map((item, i) => (
                <div key={i} style={{ fontSize: 16, color: "#94a3b8", marginBottom: 4, paddingLeft: 6 }}>
                  • {item}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                ✗ Not for
              </div>
              {db.notFor.map((item, i) => (
                <div key={i} style={{ fontSize: 16, color: "#94a3b8", marginBottom: 4, paddingLeft: 6 }}>
                  • {item}
                </div>
              ))}
            </div>
          </div>

          {/* Key Design */}
          <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              🔑 Key / Schema Design
            </div>
            <div style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.6 }}>{db.keyDesign}</div>
          </div>

          {/* Row Example */}
          <div style={{ background: "#0f0f23", borderRadius: 6, padding: "10px 12px", marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              📋 Example: {db.rowExample.description}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 400 }}>
              <thead>
                <tr>
                  {db.rowExample.headers.map((h, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: "left",
                        padding: "5px 8px",
                        color: "#818cf8",
                        borderBottom: "1px solid #2a2a4a",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        fontSize: 10,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {db.rowExample.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        style={{
                          padding: "5px 8px",
                          color: "#94a3b8",
                          borderBottom: "1px solid #1a1a2e",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gotchas */}
          <div style={{ background: "#1c0f0f", borderRadius: 6, padding: "12px 14px", marginBottom: 12, border: "1px solid #3b1515" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              ⚠️ Gotchas & Pitfalls
            </div>
            {db.gotchas.map((item, i) => (
              <div key={i} style={{ fontSize: 16, color: "#fca5a5", marginBottom: 4 }}>
                • {item}
              </div>
            ))}
          </div>

          {/* Interview Tip */}
          <div style={{ background: "#0f1c0f", borderRadius: 6, padding: "12px 14px", border: "1px solid #153b15" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              🎯 Interview Trigger
            </div>
            <div style={{ fontSize: 16, color: "#86efac", lineHeight: 1.6, fontStyle: "italic" }}>{db.interviewTip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GCPDatabaseCheatSheet() {
  const [expandedCards, setExpandedCards] = useState(new Set([0]));
  const [showDecisionTree, setShowDecisionTree] = useState(true);

  const toggleCard = (index) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const expandAll = () => setExpandedCards(new Set(databases.map((_, i) => i)));
  const collapseAll = () => setExpandedCards(new Set());

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f23",
        color: "#e2e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        padding: "16px 12px",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          GCP Database Cheat Sheet
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
          System Design Interview Reference — Google L6
        </p>

        {/* Quick Decision Tree */}
        <div
          style={{
            background: "#1a1a2e",
            borderRadius: 12,
            border: "1px solid #2a2a4a",
            marginBottom: 24,
            overflow: "hidden",
          }}
        >
          <div
            onClick={() => setShowDecisionTree(!showDecisionTree)}
            style={{
              padding: "14px 20px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 15, color: "#fbbf24" }}>⚡ Quick Decision Tree</span>
            <span style={{ color: "#64748b", transform: showDecisionTree ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
          </div>
          {showDecisionTree && (
            <div style={{ padding: "0 16px 14px" }}>
              {decisionTree.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "10px 0",
                    borderBottom: i < decisionTree.length - 1 ? "1px solid #1a1a3e" : "none",
                    fontSize: 15,
                  }}
                >
                  <span style={{ color: "#94a3b8", flex: "1 1 200px", minWidth: 0 }}>{item.question}</span>
                  <span style={{ color: "#22c55e", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
                    {item.answer}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={expandAll}
            style={{
              background: "#2a2a4a",
              color: "#94a3b8",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            style={{
              background: "#2a2a4a",
              color: "#94a3b8",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Collapse All
          </button>
        </div>

        {/* DB Cards */}
        {databases.map((db, i) => (
          <DBCard key={db.name} db={db} isExpanded={expandedCards.has(i)} onToggle={() => toggleCard(i)} />
        ))}

        {/* Comparison Table */}
        <div
          style={{
            background: "#1a1a2e",
            borderRadius: 10,
            border: "1px solid #2a2a4a",
            padding: "14px 12px",
            marginTop: 8,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
            Side-by-Side Comparison
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 600 }}>
            <thead>
              <tr>
                {["", "Spanner", "Bigtable", "BigQuery", "Cloud SQL", "Firestore", "Memorystore"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      color: "#818cf8",
                      borderBottom: "2px solid #2a2a4a",
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: "nowrap",
                      fontSize: 10,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Type", "Relational", "Wide-column", "Columnar DW", "Relational", "Document", "In-memory"],
                ["SQL?", "✓", "✗", "✓", "✓", "✗ (GQL)", "✗"],
                ["ACID?", "✓ (global)", "Row-level", "Snapshot", "✓", "✓", "✗"],
                ["Scale", "Horizontal", "Horizontal", "Serverless", "Vertical", "Serverless", "Vertical"],
                ["Read", "5–20ms", "<10ms", "Seconds", "1–5ms", "<10ms", "<1ms"],
                ["Write", "100–200ms", "<10ms", "Seconds", "2–10ms", "<10ms", "<1ms"],
                ["Best size", ">1TB", ">10TB", "PB+", "<10TB", "<TB", "GBs"],
                ["Cost", "$$$", "$$", "$ store/$$$ query", "$", "$–$$", "$$ (memory)"],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      style={{
                        padding: "5px 8px",
                        color: j === 0 ? "#64748b" : "#cbd5e1",
                        borderBottom: "1px solid #1a1a3e",
                        fontFamily: j === 0 ? "inherit" : "'JetBrains Mono', monospace",
                        fontWeight: j === 0 ? 600 : 400,
                        fontSize: 10,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
