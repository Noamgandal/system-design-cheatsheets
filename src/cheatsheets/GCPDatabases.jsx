import { useState } from "react";

// ─── TAB 1: DATABASE PICKER ───
const databases = [
  {
    name: "Spanner", type: "Relational (NewSQL)", tagline: "Global ACID at scale",
    model: "Tables with schema, SQL", consistency: "Strong (external consistency)",
    scaling: "Horizontal (auto-sharding via splits)", scope: "Global / Multi-region",
    latency: { read: "5–20ms", write: "100–200ms" },
    bestFor: ["Global financial ledgers", "Inventory / supply chain", "User accounts needing strong consistency", "Gaming leaderboards (global)"],
    notFor: ["High-throughput analytics (use BigQuery)", "Simple regional apps (use Cloud SQL)", "Massive write-heavy logging (use Bigtable)"],
    cost: "$$$ — expensive per node, justified for global ACID",
    keyDesign: "Primary key (can be composite). Avoid monotonically increasing keys → hot spots. Use UUIDs or hash prefixes. Interleave child tables for co-location.",
    gotchas: ["Monotonic keys (auto-increment, timestamps) → hot spots", "Writes are slower due to TrueTime + 2PC", "Expensive for small workloads", "Interleaved tables help with parent-child locality"],
    interviewTip: 'Use when interviewer says "globally consistent", "ACID at scale", or "financial transactions across regions".',
  },
  {
    name: "Bigtable", type: "Wide-column NoSQL", tagline: "Petabyte-scale, sub-10ms, write-optimized beast",
    model: "Row key → Column families → Columns → Timestamped cells",
    consistency: "Strong (single-region), Eventual (multi-region)",
    scaling: "Horizontal (add nodes)", scope: "Single region (multi-region with replication)",
    latency: { read: "<10ms", write: "<10ms" },
    bestFor: ["Time-series (IoT sensors, metrics, logs)", "Analytics pipelines (Hadoop/Beam/Spark)", "High-throughput ingestion (ad clicks, events)", "ML feature stores"],
    notFor: ["< 10TB data (overkill, use Firestore)", "Multi-row transactions", "SQL queries / joins", "Small datasets with complex queries"],
    cost: "$$ — pay per node (not serverless). Cost-effective at scale (>10TB)",
    keyDesign: "Row key is your ONLY index. Lexicographic sort. Design for your read pattern. Reverse domain, hash prefix, or composite keys. Prefer tall/narrow tables over wide rows.",
    gotchas: ["Timestamp as row key PREFIX → hot spot", "No secondary indexes", "Single-row transactions only", "NOT serverless — you provision nodes", "Wide rows can't be split across nodes — keep rows bounded"],
    interviewTip: 'Use when you hear "billions of events", "time-series", "write-heavy", "low-latency at petabyte scale".',
  },
  {
    name: "BigQuery", type: "Columnar Data Warehouse (OLAP)", tagline: "Cheapest storage, most expensive queries",
    model: "SQL tables (columnar storage, Capacitor format)",
    consistency: "Strong (snapshot isolation)", scaling: "Serverless auto-scale",
    scope: "Multi-region",
    latency: { read: "Seconds to minutes", write: "Streaming: seconds" },
    bestFor: ["BI dashboards & reporting", "Ad-hoc SQL analytics over huge datasets", "ML training data (BigQuery ML)", "Data lake / long-term storage"],
    notFor: ["Real-time serving (<100ms reads)", "OLTP / transactional workloads", "Point lookups by key", "Frequent small queries (cost adds up)"],
    cost: "$ storage (~$0.02/GB/mo) but $$$ per query ($5/TB scanned). Partition + cluster to reduce cost.",
    keyDesign: "No row key. Partition by date, cluster by frequently filtered columns. Data loaded from GCS or via streaming insert or Dataflow.",
    gotchas: ["SELECT * is expensive — select specific columns", "Streaming inserts cost more than batch loads", "Not for real-time serving", "UPDATE/DELETE possible but expensive (rewrites partitions)"],
    interviewTip: 'Use for "analytics", "BI", "offline processing", "data warehouse".',
  },
  {
    name: "Cloud SQL", type: "Managed Relational (MySQL/PG)", tagline: "Simple, familiar, regional",
    model: "Standard SQL tables, schemas, joins, transactions",
    consistency: "Strong (single region)", scaling: "Vertical + read replicas",
    scope: "Regional (cross-region read replicas)",
    latency: { read: "1–5ms", write: "2–10ms" },
    bestFor: ["Standard web app backends", "CMS / e-commerce (moderate scale)", "Lift-and-shift from on-prem", "Simple CRUD apps"],
    notFor: ["Global consistency (use Spanner)", "Horizontal write scaling (use Spanner)", "Petabyte-scale data", "Time-series at scale"],
    cost: "$ — cheapest relational option",
    keyDesign: "Standard primary keys, indexes, foreign keys. Standard B-tree indexing.",
    gotchas: ["Does NOT auto-scale horizontally", "Max ~10TB practical limit", "Cross-region writes not supported", "No automatic sharding"],
    interviewTip: 'Use for "simple relational needs", "moderate scale". If interviewer pushes global scale → upgrade to Spanner.',
  },
  {
    name: "Firestore", type: "Document NoSQL (serverless)", tagline: "Flexible schema, real-time sync",
    model: "Collections → Documents (JSON-like) → Subcollections",
    consistency: "Strong", scaling: "Serverless auto-scale", scope: "Multi-region",
    latency: { read: "<10ms", write: "<10ms" },
    bestFor: ["Mobile / web app backends", "Real-time sync (chat, collab)", "User profiles, product catalogs", "Serverless architectures"],
    notFor: ["> few TB (use Bigtable)", "Complex joins / analytics", "Heavy writes on single documents", "Relational data with complex queries"],
    cost: "$ — pay per read/write/storage",
    keyDesign: "Document IDs (auto or custom). Embedded docs for read-together data (<1MB). Subcollections when data is queried independently.",
    gotchas: ["Limited queries vs SQL (no joins)", "Hot documents → bottleneck", "Embedded: 1 read but 1MB limit. Subcollections: 1+N reads but no size limit", "Composite indexes needed for multi-field queries"],
    interviewTip: 'Use for "mobile backend", "real-time sync", "serverless", "flexible schema at moderate scale".',
  },
  {
    name: "Memorystore", type: "In-memory (Redis)", tagline: "Sub-millisecond cache layer",
    model: "Key-value (Redis data structures: strings, hashes, sorted sets, lists)",
    consistency: "Eventual (cache layer)", scaling: "Vertical / Redis Cluster (hash-based sharding across 16K hash slots)",
    scope: "Regional",
    latency: { read: "<1ms", write: "<1ms" },
    bestFor: ["Caching layer", "Rate limiting", "Leaderboards (sorted sets)", "Pub/sub real-time relay", "Session management"],
    notFor: ["Persistent primary storage", "Large datasets (memory is expensive)", "Complex queries", "Cross-region replication"],
    cost: "$$ — memory is expensive per GB, small amounts used",
    keyDesign: "Simple string keys with prefixes: 'session:{userId}', 'cache:product:{id}'. Has built-in Pub/Sub for real-time relay.",
    gotchas: ["Data lost on restart unless persistence configured", "Memory is expensive — cache only hot data", "Not a primary database", "Redis Cluster uses hash-based sharding (not range)"],
    interviewTip: 'Almost always part of your design as cache. Mention for "reduce DB load", "sessions", "rate limiting", "leaderboards".',
  },
];

const decisionTree = [
  { q: "Need global ACID transactions?", a: "→ Spanner" },
  { q: "Write-heavy, petabyte-scale, time-series?", a: "→ Bigtable" },
  { q: "Offline analytics / BI / SQL over huge data?", a: "→ BigQuery" },
  { q: "Simple relational, moderate scale?", a: "→ Cloud SQL" },
  { q: "Mobile/web, flexible schema, real-time sync?", a: "→ Firestore" },
  { q: "Sub-ms cache / sessions / rate-limiting?", a: "→ Memorystore" },
  { q: "Hash-based sharding, flexible schema, globally distributed?", a: "→ MongoDB Atlas / DynamoDB / Cassandra" },
];

// ─── TAB 2: INDEXING ───
const indexingCards = [
  {
    section: "How Indexes Work",
    items: [
      { term: "B-tree Index (the default)", detail: "Separate data structure mapping column values → row locations. Like a book index: 'noam@gmail.com → row 47,293'. Lookups are O(log n) — even with 1 billion rows, ~30 comparisons.", usage: "Created automatically on primary keys. Create manually on columns you WHERE/JOIN/ORDER BY frequently.", gotcha: "Every INSERT/UPDATE/DELETE must update the index too. More indexes = slower writes. Fundamental tradeoff: faster reads vs slower writes." },
      { term: "Primary Index", detail: "Built on the primary key. The table data IS physically sorted by this key. In Spanner, the PK determines which split (shard) the row lives on.", usage: "Every table has one. It's the main way the DB organizes and finds rows.", gotcha: "In Spanner/Bigtable, the primary key choice is critical — it determines physical data distribution across nodes." },
      { term: "Secondary Index", detail: "Index on any non-PK column. Separate data structure that maps the indexed column → primary key. Requires a second lookup: find PK in index → fetch full row from base table.", usage: "CREATE INDEX idx_email ON Users(email). Now WHERE email = 'x' is fast instead of a full table scan.", gotcha: "Secondary indexes live on DIFFERENT nodes than the base table in distributed DBs like Spanner. That second lookup can cross the network." },
    ]
  },
  {
    section: "Composite & Covering Indexes",
    items: [
      { term: "Composite Index (multi-column)", detail: "Index on multiple columns: CREATE INDEX idx ON Orders(user_id, created_at). Sorted first by user_id, then by created_at within each user.", usage: "Efficient for queries that filter on both columns, or just the first column.", gotcha: "The PREFIX RULE: index on (A, B, C) serves queries on (A), (A,B), (A,B,C) — but NOT (B) or (C) alone. Left-to-right, like a phone book sorted by last name then first name." },
      { term: "Covering Index", detail: "Index that contains ALL columns the query needs. The DB never touches the base table — answers entirely from the index. Data is duplicated in the index.", usage: "CREATE INDEX idx ON Orders(user_id) STORING (amount). Query 'SELECT amount WHERE user_id=123' reads only the index — one lookup instead of two.", gotcha: "Tradeoff: faster reads but more storage (duplicated data) and slightly slower writes. Only STORE columns your hot queries need — don't duplicate the entire table." },
      { term: "When NOT to Index", detail: "Low-cardinality columns (boolean, gender) — not selective enough. Tables with heavy writes and few reads. Very small tables (full scan is fast anyway).", usage: "An index on a column with only 2 distinct values barely helps — you still scan half the table.", gotcha: "Every index slows writes. A table with 10 indexes means every INSERT updates 10 separate data structures." },
    ]
  },
];

// ─── TAB 3: SHARDING & KEY DESIGN ───
const shardingCards = [
  {
    section: "Sharding Strategies",
    items: [
      { term: "Range-Based Sharding", detail: "Split data by key ranges. Keys A-M → node 1, N-Z → node 2. Adjacent keys are co-located. Used by Spanner (splits) and Bigtable (tablets).", usage: "Range queries are efficient: WHERE timestamp BETWEEN X AND Y hits one or few nodes.", gotcha: "Hotspot risk: monotonically increasing keys (timestamp, auto-increment) send ALL new writes to the last node. One node is crushed, others idle." },
      { term: "Hash-Based Sharding", detail: "Hash the key, mod by number of nodes: hash(user_id) % 4 = node assignment. Data is evenly distributed regardless of key pattern.", usage: "Used by MongoDB (hashed shard key), DynamoDB, Cassandra, Redis Cluster (16K hash slots). Even distribution, no hotspots from sequential keys.", gotcha: "Range queries are useless — hash scattered adjacent keys across all nodes. WHERE user_id BETWEEN 100 AND 200 hits ALL nodes." },
      { term: "When to Use Which", detail: "Need range queries on the key? → Range sharding with careful key design. Don't need range queries? → Hash sharding for automatic even distribution. Can't avoid sequential keys? → Hash sharding.", usage: "Interview: 'I'd use range sharding with a composite key (user_id, timestamp) to avoid hotspots while enabling time-range queries per user.'", gotcha: "You can combine them: hash prefix for distribution + range suffix for ordering. E.g., hash(user_id) + timestamp." },
    ]
  },
  {
    section: "Key Design Per Database",
    items: [
      { term: "Spanner Keys", detail: "PK determines physical split location. BAD: PRIMARY KEY (auto_id) or (timestamp) — all inserts hit last split. GOOD: PRIMARY KEY (user_id, timestamp) or (uuid) — writes spread.", usage: "Interleaved tables: child rows physically co-located with parent. Orders INTERLEAVE IN PARENT Users → user + their orders = one local read.", gotcha: "Spanner supports bit-reversed sequences as built-in feature to avoid hotspots with sequential IDs." },
      { term: "Bigtable Row Keys", detail: "Row key is your ONLY index. No secondary indexes, no SQL, no joins. Lexicographic (alphabetical) sort. BAD: '2024-01-15#event' (timestamp prefix = hotspot). GOOD: 'com.youtube#event' (reversed domain) or 'a3f2#timestamp' (hash prefix).", usage: "Prefer tall/narrow: one row per event. Wide rows (many columns per row) can't be split across nodes and hit the ~100MB row limit.", gotcha: "Strings sort lexicographically: 'apple' < 'banana'. That's why timestamp prefixes cluster — all recent writes are alphabetically adjacent." },
      { term: "BigQuery Partitioning", detail: "Not sharded traditionally. Partition by date column (prunes entire days from scans). Cluster by frequently filtered columns (sorts data within partitions). Google handles physical layout.", usage: "Data loaded from GCS (batch), streaming insert API (real-time), or Dataflow pipelines. Partitioning/clustering applies to BQ's native storage.", gotcha: "External tables (query data in GCS directly) are cheaper storage but slower queries. Loaded tables (into BQ native format) are faster." },
      { term: "MongoDB Shard Keys", detail: "Hash-based or range-based per collection. Hashed shard key: db.collection.createIndex({userId: 'hashed'}). Automatic even distribution. Range shard key: good for range queries but risk hotspots.", usage: "Common choice when you need hash-based sharding with flexible document schema. Not a GCP native service but relevant for comparison.", gotcha: "Once you choose a shard key, you can't change it without migrating. Choose carefully based on your query patterns." },
    ]
  },
];

// ─── TAB 4: REPLICATION ───
const replicationCards = [
  {
    section: "Replication Strategies",
    items: [
      { term: "Primary-Replica (Leader-Follower)", detail: "One primary handles all writes. Replicas receive copies. Reads can go to either. Can't scale writes this way (one primary), but can scale reads by adding replicas.", usage: "Cloud SQL default pattern. 90% reads, 10% writes → add read replicas behind internal LB to absorb read traffic.", gotcha: "Hit write scaling limits? Single-primary won't cut it → need Spanner (shards writes across splits) or Bigtable." },
      { term: "Synchronous Replication", detail: "Primary waits for replica(s) to confirm before telling client 'write successful.' Replicas always up to date. Strong consistency.", usage: "Spanner uses this via Paxos — write isn't confirmed until majority of replicas acknowledge. No data loss on failover.", gotcha: "Slower writes — waiting for network round trip. Cross-region = 50-200ms added. If replica is down, writes can block." },
      { term: "Asynchronous Replication", detail: "Primary confirms immediately, replicates in background. Fast writes. But replicas lag behind — reads from replica may be stale. If primary crashes before replicating, that write is LOST.", usage: "Cloud SQL read replicas, Bigtable cross-cluster, Memorystore HA. Good for read scaling where slight staleness is acceptable.", gotcha: "The danger: on failover, promoted replica might be behind. Any unreplicated writes from the old primary are lost forever." },
    ]
  },
  {
    section: "Failover & Per-Database",
    items: [
      { term: "Failover Process", detail: "Primary dies → system detects (heartbeat timeout, seconds) → replica promoted to new primary → clients redirected. With async replication, promoted replica may have lost recent writes.", usage: "Spanner avoids data loss: Paxos means majority always has latest data. Cloud SQL HA: automatic failover within same region.", gotcha: "Interview: 'Spanner's synchronous Paxos replication means failover never loses data. For Cloud SQL, async replicas may lose recent writes on failover.'" },
      { term: "How Each DB Does It", detail: "Spanner: sync Paxos, majority acknowledges before commit. Cloud SQL: async by default, sync for HA within region. Bigtable: async across clusters, eventual between clusters. Memorystore: async primary→replica.", usage: "Know which is sync vs async — it directly determines consistency and data loss risk.", gotcha: "Read-your-own-writes pattern: after a user writes, route THEIR reads to primary for a few seconds to avoid seeing stale data from replica." },
    ]
  },
];

// ─── TAB 5: SCHEMA DESIGN ───
const schemaCards = [
  {
    section: "Normalize vs Denormalize",
    items: [
      { term: "Normalized (split tables, no duplication)", detail: "Users table + Orders table + Items table. Joined at query time. Change user name in ONE place. Easy to update, data always consistent.", usage: "Use when: data changes frequently, many-to-many relationships, consistency > read speed, you have Spanner/Cloud SQL (handles joins).", gotcha: "Cost: queries need JOINs across tables — expensive at scale, especially across shards." },
      { term: "Denormalized (bundled, duplicated data)", detail: "Each order document embeds user_name, product details, everything. One read gets all data — no joins needed.", usage: "Use when: read-heavy/write-light, always access data together, using Bigtable/Firestore (no joins available), latency > storage cost.", gotcha: "Writes are expensive: changing Noam's name means updating EVERY document that embedded it. 500 orders = 500 writes. Risk of inconsistency if update fails halfway." },
      { term: "Interview Pattern", detail: "Start normalized, denormalize specific hot read paths. 'I'd normalize the core data model, then denormalize the hot read path — e.g., cache user's order count on the user record to avoid a COUNT query.'", usage: "This shows you understand both approaches and make deliberate tradeoffs.", gotcha: "Denormalize = move complexity from read time to write time. If you read 100x more than write, that's a good trade." },
    ]
  },
  {
    section: "Per-Database Patterns",
    items: [
      { term: "Spanner — Interleaved Tables", detail: "Child rows physically stored next to parent. Users and their Orders on the same split. 'Get user + all orders' = one sequential local read instead of cross-node join.", usage: "CREATE TABLE Orders (...) INTERLEAVE IN PARENT Users. The PK of the child MUST start with the parent's PK: (user_id, order_id).", gotcha: "Best of both worlds: normalized schema (relational integrity, foreign keys) with physical co-location (fast reads). Spanner-specific feature." },
      { term: "Bigtable — Tall vs Wide", detail: "Tall/narrow: one row per event. Row key 'user123#2024-01-15T12:00' with a few columns per row. Wide: one row per user, add columns over time — row grows unbounded.", usage: "Prefer tall: rows distribute evenly, can be split across nodes, efficient prefix scans. Wide only for bounded data (e.g., one row per sensor per hour).", gotcha: "Wide rows can't be split across nodes and hit ~100MB limit. One massive row = one node handles all reads/writes for it. Tall rows spread naturally." },
      { term: "Firestore — Embedded vs Subcollections", detail: "Embedded: one document has everything {name, orders: [...]}. One read, but 1MB doc limit, and updates rewrite entire doc. Subcollections: users/noam/orders/order1. Each order is independent — 1+N reads but no size limit.", usage: "Embed when: always read together AND bounded size (<1MB). Subcollections when: queried independently OR unbounded growth.", gotcha: "Subcollections = 1 + N reads (one per user doc + one per order doc). N=50 orders means 51 reads. That's the tradeoff for flexibility." },
    ]
  },
];

// ─── TAB 6: TRANSACTIONS ───
const txnCards = [
  {
    section: "ACID & Transaction Scope",
    items: [
      { term: "ACID (what it means)", detail: "Atomicity: all or nothing — debit A AND credit B, or neither. Consistency: invariants hold (total money unchanged). Isolation: concurrent transactions don't interfere. Durability: committed data survives crashes.", usage: "The foundation of any financial, inventory, or correctness-critical system.", gotcha: "Interview: don't recite ACID. Just say 'I need ACID transactions here because partial state (debited but not credited) would be unacceptable.'" },
      { term: "Single-Row vs Multi-Row", detail: "Single-row: update one row atomically. Every DB supports this. Multi-row: update multiple rows atomically (debit A + credit B). Requires coordination — locks, 2PC, consensus. Much more expensive.", usage: "Spanner: supports multi-row AND cross-shard globally. Cloud SQL: multi-row within same instance. Bigtable: single-row ONLY. Firestore: up to 500 docs per transaction.", gotcha: "If Bigtable is in your design and you need multi-row transactions → that's a signal to use Spanner for that part of the system." },
      { term: "Spanner Cross-Shard Transactions (2PC)", detail: "Account A on shard 1 (us-east), account B on shard 2 (eu-west). Phase 1 (Prepare): coordinator asks both shards 'can you do this?', both lock rows and say 'yes'. Phase 2 (Commit): coordinator says 'commit', both apply and release locks. Either said no → abort, both rollback.", usage: "This is why Spanner writes are 100-200ms — locks held across network round trips between regions.", gotcha: "TrueTime (GPS-synchronized clocks) gives globally ordered timestamps — enables strong consistency without extra locking on reads. Just know: 'Spanner uses TrueTime for globally consistent transaction ordering.'" },
    ]
  },
  {
    section: "Practical Patterns",
    items: [
      { term: "Prefer Idempotency Over Transactions", detail: "If you can make the operation produce the same result when called multiple times, you don't need complex distributed transactions. INSERT ON CONFLICT DO NOTHING, dedup by event_id.", usage: "Interview: 'I'd make this operation idempotent so retries are safe' is better than 'I'd add a distributed transaction.'", gotcha: "Transactions = coordination overhead. Idempotency = no coordination. Always prefer idempotent design when possible." },
      { term: "Isolation Levels (if asked)", detail: "Serializable: strongest, as if transactions ran one at a time. Spanner default. Snapshot: each txn sees consistent snapshot at start time. Read Committed: PostgreSQL default, can see other committed writes mid-transaction.", usage: "Don't volunteer this. If asked: 'Spanner defaults to serializable. For read-heavy paths, read-only transactions use snapshot isolation — no locks, don't block writes.'", gotcha: "This is too deep for most L6 interviews. Only mention if the interviewer specifically asks about isolation." },
    ]
  },
];

// ─── TAB 7: INTERVIEW Q&A ───
const interviewQA = [
  {
    section: "Database Selection",
    items: [
      { q: "We need to store user transactions globally with ACID guarantees. What DB?", a: "Spanner. It's the only DB that provides global ACID with multi-row, cross-shard transactions. PK with user_id prefix (not timestamp) to avoid hotspots. Interleave transaction_items under transactions for co-located reads." },
      { q: "We're ingesting 1 million events/sec from IoT sensors. What DB?", a: "Bigtable. Write-optimized, sub-10ms latency, scales linearly with nodes. Row key: hash(sensor_id)#timestamp to spread writes. Tall/narrow: one row per event. For analytics over this data, route to BigQuery via Dataflow." },
      { q: "We need a dashboard showing last 30 days of analytics. What DB?", a: "BigQuery. Partition by date (prune old partitions), cluster by the dimensions you filter most. Load data from GCS daily or stream via API. Cheap storage, SQL-native, handles petabytes." },
      { q: "It's a small e-commerce app, ~1000 users. What DB?", a: "Cloud SQL (PostgreSQL). Simple relational, standard indexes, ACID transactions. Don't over-engineer. If it grows → migrate to Spanner later." },
    ]
  },
  {
    section: "Indexing & Performance",
    items: [
      { q: "This query is slow: SELECT * FROM Orders WHERE user_id = 123 AND created_at > '2024-01-01'", a: "Create a composite index: CREATE INDEX idx ON Orders(user_id, created_at). The prefix rule means this index serves both (user_id) and (user_id, created_at) queries. If you also need amount in the result, make it covering: STORING (amount)." },
      { q: "Should we add an index on the 'is_active' boolean column?", a: "Probably not. Low cardinality — only 2 values, so the index isn't selective. You'd still scan ~50% of the table. Better to combine it in a composite index: (is_active, created_at) if you frequently query active users by date." },
      { q: "Why are our writes getting slow?", a: "Check how many indexes the table has. Each index is updated on every write. 10 indexes = 10 extra writes. Also check for hotspots: monotonically increasing PK in Spanner/Bigtable sends all writes to one node." },
    ]
  },
  {
    section: "Sharding & Scaling",
    items: [
      { q: "Our Cloud SQL is maxing out. How do we scale?", a: "First: add read replicas for read scaling. If writes are the bottleneck, Cloud SQL can't shard automatically. Options: (1) vertical scaling (bigger machine), (2) migrate to Spanner for horizontal write scaling, (3) application-level sharding (painful, avoid if possible)." },
      { q: "We're seeing hotspots on our Spanner table.", a: "The PK is likely monotonically increasing (timestamp or auto-increment). Fix: add a high-cardinality prefix like user_id or use UUIDs. If you must query by timestamp, use user_id as first PK column: PRIMARY KEY (user_id, timestamp)." },
      { q: "Why not always use hash-based sharding?", a: "Hash sharding kills range queries. If you need 'all orders from January' and keys are hashed, you scan every shard. Range sharding keeps adjacent keys together — great for time-range queries. Choose based on your access pattern." },
    ]
  },
  {
    section: "Replication & Consistency",
    items: [
      { q: "User updates their profile but still sees the old version. Why?", a: "Classic read-your-own-writes issue. The write went to primary, but the read hit a stale replica. Fix: after a user writes, route their reads to primary for a few seconds. Or use Spanner (always strongly consistent)." },
      { q: "What happens if our primary DB goes down?", a: "Depends on replication type. Spanner (sync Paxos): failover with zero data loss — majority of replicas always have latest data. Cloud SQL async: promoted replica may be behind — recent writes could be lost. This is the fundamental sync vs async tradeoff." },
      { q: "How does Spanner maintain strong consistency across regions?", a: "Paxos consensus per split — writes confirmed only when majority of replicas acknowledge. TrueTime (GPS clocks) provides globally ordered timestamps. Read-only transactions use snapshots — no locks needed, don't block writes." },
    ]
  },
  {
    section: "Schema & Transactions",
    items: [
      { q: "Should we normalize or denormalize our data?", a: "Start normalized, denormalize specific hot paths. Normalize: data changes often, many-to-many, strong consistency needed. Denormalize: read-heavy, always access together, using NoSQL (no joins). 'I'd denormalize the product listing page (read-heavy) but keep the order processing path normalized (consistency-critical).'" },
      { q: "We need to transfer money between two accounts atomically.", a: "Spanner multi-row transaction: read both balances, verify sufficient funds, debit A, credit B — all in one transaction. If accounts are on different shards, Spanner handles cross-shard 2PC automatically. This is Spanner's killer feature." },
      { q: "Bigtable only supports single-row transactions. How do we handle consistency?", a: "Design around it: make each row self-contained (denormalize). For cross-row consistency, make operations idempotent + use at-least-once delivery from Pub/Sub. If you truly need multi-row ACID, that component should be on Spanner, not Bigtable." },
    ]
  },
];

// ─── COMPONENTS ───

function ExpandableCard({ item }) {
  const [open, setOpen] = useState(false);
  const hasExtra = item.usage || item.gotcha;
  return (
    <div onClick={() => hasExtra && setOpen(!open)} style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8, padding: "14px 16px", marginBottom: 8, cursor: hasExtra ? "pointer" : "default", borderLeftWidth: 3, borderLeftColor: open ? "#818cf8" : "#2a2a4a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: "#818cf8", fontWeight: 700, fontSize: 17, fontFamily: "'JetBrains Mono', monospace" }}>{item.term}</span>
          <p style={{ color: "#d1d5db", fontSize: 17, margin: "6px 0 0 0", lineHeight: 1.6 }}>{item.detail}</p>
        </div>
        {hasExtra && <span style={{ color: "#9ca3af", fontSize: 14, marginLeft: 8, flexShrink: 0 }}>{open ? "▼" : "▶"}</span>}
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a4a" }}>
          {item.usage && <div style={{ marginBottom: 8 }}><span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>When / Example</span><p style={{ color: "#d1d5db", fontSize: 17, margin: "6px 0 0 0", lineHeight: 1.6 }}>{item.usage}</p></div>}
          {item.gotcha && <div><span style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Gotcha / Interview Tip</span><p style={{ color: "#d1d5db", fontSize: 17, margin: "6px 0 0 0", lineHeight: 1.6 }}>{item.gotcha}</p></div>}
        </div>
      )}
    </div>
  );
}

function DBPickerCard({ db, isExpanded, onToggle }) {
  const latencyColor = (val) => {
    if (val.includes("<1")) return "#22c55e";
    if (val.includes("<10") || val.includes("1–5") || val.includes("2–10") || val.includes("5–20")) return "#86efac";
    if (val.includes("100")) return "#fbbf24";
    if (val.includes("Seconds")) return "#f87171";
    return "#d1d5db";
  };

  return (
    <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 12, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, borderBottom: isExpanded ? "1px solid #2a2a4a" : "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", fontFamily: "'JetBrains Mono', monospace" }}>{db.name}</span>
            <span style={{ fontSize: 14, padding: "3px 8px", borderRadius: 4, background: "#2a2a4a", color: "#d1d5db", fontFamily: "'JetBrains Mono', monospace" }}>{db.type}</span>
          </div>
          <div style={{ fontSize: 17, color: "#9ca3af", fontStyle: "italic" }}>{db.tagline}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right", fontSize: 15 }}>
            <div><span style={{ color: "#9ca3af" }}>R: </span><span style={{ color: latencyColor(db.latency.read), fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{db.latency.read}</span></div>
            <div><span style={{ color: "#9ca3af" }}>W: </span><span style={{ color: latencyColor(db.latency.write), fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{db.latency.write}</span></div>
          </div>
          <span style={{ color: "#9ca3af", fontSize: 16, transform: isExpanded ? "rotate(180deg)" : "", transition: "0.2s" }}>▼</span>
        </div>
      </div>
      {isExpanded && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
            {[["Model", db.model], ["Consistency", db.consistency], ["Scaling", db.scaling], ["Scope", db.scope], ["Cost", db.cost]].map(([l, v]) => (
              <div key={l} style={{ background: "#0f0f23", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontSize: 13, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 17, color: "#d1d5db", lineHeight: 1.5 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>✓ Best for</div>
              {db.bestFor.map((s, i) => <div key={i} style={{ fontSize: 17, color: "#d1d5db", marginBottom: 4, paddingLeft: 6 }}>• {s}</div>)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>✗ Not for</div>
              {db.notFor.map((s, i) => <div key={i} style={{ fontSize: 17, color: "#d1d5db", marginBottom: 4, paddingLeft: 6 }}>• {s}</div>)}
            </div>
          </div>
          <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🔑 Key / Schema Design</div>
            <div style={{ fontSize: 17, color: "#d1d5db", lineHeight: 1.6 }}>{db.keyDesign}</div>
          </div>
          <div style={{ background: "#1c0f0f", borderRadius: 6, padding: "12px 14px", marginBottom: 12, border: "1px solid #3b1515" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>⚠️ Gotchas</div>
            {db.gotchas.map((s, i) => <div key={i} style={{ fontSize: 17, color: "#fca5a5", marginBottom: 4 }}>• {s}</div>)}
          </div>
          <div style={{ background: "#0f1c0f", borderRadius: 6, padding: "12px 14px", border: "1px solid #153b15" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🎯 Interview Trigger</div>
            <div style={{ fontSize: 17, color: "#86efac", lineHeight: 1.6, fontStyle: "italic" }}>{db.interviewTip}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function QACard({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8, padding: "14px 16px", marginBottom: 8, cursor: "pointer", borderLeftWidth: 3, borderLeftColor: open ? "#f472b6" : "#2a2a4a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ color: "#f472b6", fontWeight: 600, fontSize: 17, lineHeight: 1.6, flex: 1, minWidth: 0 }}>Q: {item.q}</span>
        <span style={{ color: "#9ca3af", fontSize: 14, marginLeft: 8, flexShrink: 0 }}>{open ? "▼" : "▶"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2a4a" }}>
          <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Answer</span>
          <p style={{ color: "#d1d5db", fontSize: 17, margin: "6px 0 0 0", lineHeight: 1.6 }}>{item.a}</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───

const tabs = [
  { id: "picker", title: "DB Picker", icon: "🗄️" },
  { id: "indexing", title: "Indexing", icon: "📇" },
  { id: "sharding", title: "Sharding", icon: "🔀" },
  { id: "replication", title: "Replication", icon: "📡" },
  { id: "schema", title: "Schema", icon: "📐" },
  { id: "txn", title: "Transactions", icon: "🔒" },
  { id: "qa", title: "Interview Q&A", icon: "💬" },
];

export default function GCPDatabaseCheatSheet() {
  const [activeTab, setActiveTab] = useState("picker");
  const [expandedDBs, setExpandedDBs] = useState(new Set([0]));

  const toggleDB = (i) => {
    setExpandedDBs(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  const renderSections = (sections) => sections.map((sec, i) => (
    <div key={i} style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#9ca3af", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>{sec.section}</h3>
      {sec.items.map((item, j) => <ExpandableCard key={j} item={item} />)}
    </div>
  ));

  const renderQA = () => interviewQA.map((sec, i) => (
    <div key={i} style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#9ca3af", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>{sec.section}</h3>
      {sec.items.map((item, j) => <QACard key={j} item={item} />)}
    </div>
  ));

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f23", color: "#f1f5f9", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "16px 12px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, color: "#fff", margin: "0 0 4px 0", fontFamily: "'JetBrains Mono', monospace" }}>
          GCP Databases — Complete Reference
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 17, margin: "0 0 20px 0" }}>
          DB Selection, Indexing, Sharding, Replication, Schema Design, Transactions, Interview Q&A
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24, borderBottom: "1px solid #2a2a4a", paddingBottom: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: activeTab === t.id ? "#2a2a4a" : "transparent",
              color: activeTab === t.id ? "#818cf8" : "#9ca3af",
              border: activeTab === t.id ? "1px solid #818cf833" : "1px solid transparent",
              borderRadius: 6, padding: "8px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {t.icon} {t.title}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "picker" && (
          <>
            {/* Decision tree */}
            <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#fbbf24", marginBottom: 10 }}>⚡ Quick Decision Tree</div>
              {decisionTree.map((item, i) => (
                <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 0", borderBottom: i < decisionTree.length - 1 ? "1px solid #1a1a3e" : "none", fontSize: 17 }}>
                  <span style={{ color: "#d1d5db", flex: "1 1 200px", minWidth: 0 }}>{item.q}</span>
                  <span style={{ color: "#22c55e", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{item.a}</span>
                </div>
              ))}
            </div>
            {/* DB cards */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setExpandedDBs(new Set(databases.map((_, i) => i)))} style={{ background: "#2a2a4a", color: "#d1d5db", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>Expand All</button>
              <button onClick={() => setExpandedDBs(new Set())} style={{ background: "#2a2a4a", color: "#d1d5db", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>Collapse All</button>
            </div>
            {databases.map((db, i) => <DBPickerCard key={db.name} db={db} isExpanded={expandedDBs.has(i)} onToggle={() => toggleDB(i)} />)}

            {/* Comparison table */}
            <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", padding: "14px 12px", marginTop: 8, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14, fontFamily: "'JetBrains Mono', monospace" }}>Side-by-Side Comparison</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr>
                  {["", "Spanner", "Bigtable", "BigQuery", "Cloud SQL", "Firestore", "Memorystore"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#818cf8", borderBottom: "2px solid #2a2a4a", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", fontSize: 13 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[
                    ["Type", "Relational", "Wide-column", "Columnar DW", "Relational", "Document", "In-memory"],
                    ["SQL?", "✓", "✗", "✓", "✓", "✗", "✗"],
                    ["ACID?", "✓ (global)", "Row-level", "Snapshot", "✓", "✓ (500 docs)", "✗"],
                    ["Sharding", "Range (splits)", "Range (tablets)", "Auto", "None", "Auto", "Hash (slots)"],
                    ["Scale", "Horizontal", "Horizontal", "Serverless", "Vertical", "Serverless", "Vertical/Cluster"],
                    ["Read", "5–20ms", "<10ms", "Seconds", "1–5ms", "<10ms", "<1ms"],
                    ["Write", "100–200ms", "<10ms", "Seconds", "2–10ms", "<10ms", "<1ms"],
                    ["Replication", "Sync (Paxos)", "Async x-cluster", "Auto", "Async replicas", "Auto", "Async"],
                    ["Best size", ">1TB", ">10TB", "PB+", "<10TB", "<TB", "GBs"],
                  ].map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => (
                      <td key={j} style={{ padding: "5px 8px", color: j === 0 ? "#9ca3af" : "#d1d5db", borderBottom: "1px solid #1a1a3e", fontFamily: j === 0 ? "inherit" : "'JetBrains Mono', monospace", fontWeight: j === 0 ? 600 : 400, fontSize: 13, whiteSpace: "nowrap" }}>{cell}</td>
                    ))}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "indexing" && renderSections(indexingCards)}
        {activeTab === "sharding" && renderSections(shardingCards)}
        {activeTab === "replication" && renderSections(replicationCards)}
        {activeTab === "schema" && renderSections(schemaCards)}
        {activeTab === "txn" && renderSections(txnCards)}
        {activeTab === "qa" && renderQA()}
      </div>
    </div>
  );
}
