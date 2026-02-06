import { useState } from "react";

const strategies = [
  {
    name: "Cache-Aside (Lazy Loading)",
    tagline: "Most common pattern — cache only what's requested",
    flow: [
      "READ: App checks cache",
      "Miss → App reads from DB",
      "App writes result to cache (with TTL)",
      "Return to client",
      "WRITE: App writes to DB → deletes cache key (never update, always delete)",
    ],
    pros: ["Only caches data that's actually requested", "Simple to implement", "Cache failure doesn't break reads (falls back to DB)"],
    cons: ["First request for any key is always a cache miss", "Cache can become stale between write and next read (if TTL-based)"],
    bestFor: "Read-heavy workloads with unpredictable access patterns. Most general-purpose caching.",
    example: "User profile: GET /user/123 → check Redis → miss → query DB → store in Redis → return. On profile update → write DB → DELETE Redis key.",
  },
  {
    name: "Write-Through",
    tagline: "Cache is always fresh — write to both cache and DB synchronously",
    flow: [
      "WRITE: App writes to cache AND DB in the same operation",
      "Cache is always up to date",
      "READ: Always served from cache (guaranteed fresh)",
    ],
    pros: ["Cache is never stale", "Simple read path — always from cache", "Good for data that's read immediately after writing"],
    cons: ["Write latency increases (two synchronous writes)", "Caches data that might never be read (wasted memory)", "Write failures are more complex (need to handle partial failures)"],
    bestFor: "Data that's read immediately after write. User sessions, recently updated profiles displayed right away.",
    example: "User updates display name → write to DB + write to Redis simultaneously → next page load reads from Redis (always fresh).",
  },
  {
    name: "Write-Behind (Write-Back)",
    tagline: "Fastest writes — write to cache only, async flush to DB",
    flow: [
      "WRITE: App writes to cache only → returns immediately",
      "Cache asynchronously flushes to DB (batched, periodic)",
      "READ: Always from cache",
    ],
    pros: ["Fastest write latency (single cache write)", "DB writes can be batched for efficiency", "Absorbs write spikes"],
    cons: ["DATA LOSS RISK if cache crashes before flush", "Complexity of async flush logic", "Eventual consistency between cache and DB"],
    bestFor: "Write-heavy workloads where slight data loss is acceptable. Analytics counters, view counts, like counts, activity logs.",
    example: "Video view counter: each view increments Redis counter instantly. Background job flushes accumulated counts to DB every 30 seconds.",
  },
  {
    name: "Read-Through",
    tagline: "Like cache-aside but the cache fetches from DB itself",
    flow: [
      "READ: App asks cache for key",
      "Miss → cache library itself fetches from DB",
      "Cache stores and returns the result",
      "App never talks to DB directly for reads",
    ],
    pros: ["Cleaner app code — DB fetch logic is in the cache layer", "Same benefits as cache-aside"],
    cons: ["Cache library needs to know how to query your DB", "Same cold-start miss problem as cache-aside"],
    bestFor: "When using a caching framework that supports it (e.g., some ORM caches, Hibernate). Same use cases as cache-aside with cleaner abstraction.",
    example: "ORM-level cache: app calls userCache.get(123) → cache checks local store → miss → cache calls DB query internally → returns user.",
  },
];

const invalidation = [
  {
    name: "TTL (Time-to-Live)",
    how: "Set an expiry on every cache key. After TTL, key is automatically deleted.",
    tradeoff: "Simple. Eventual consistency — data can be stale up to TTL duration. Good enough for 90% of cases.",
    example: 'SET product:123 "{...}" EX 3600  → expires in 1 hour',
  },
  {
    name: "Event-Based Invalidation (CDC)",
    how: "DB change → Change Stream / Pub/Sub → consumer deletes cache key in real-time.",
    tradeoff: "Near real-time consistency. More complex infrastructure. Best for data where staleness matters.",
    example: "Spanner Change Stream detects product price update → Pub/Sub event → consumer calls DEL product:123 in Redis",
  },
  {
    name: "Active Invalidation (on write)",
    how: "App explicitly deletes cache key when it writes to DB. This is what cache-aside does.",
    tradeoff: "Simple, immediate for single-service writes. Breaks if multiple services write to the same DB.",
    example: "updateProduct(123, newData) → write to DB → DEL product:123 from Redis",
  },
];

const stampedeProblems = [
  {
    name: "Stampede on ONE Key",
    description: "A single popular cache key expires (or was never cached). 1000 concurrent requests for that same key all see a cache miss and all hit the DB simultaneously.",
    alsoCalledAs: "Cache stampede, thundering herd, dog-pile effect",
    solutions: [
      {
        name: "Locking (Mutex per key)",
        how: "First request acquires a Redis lock (SETNX) on that specific key, fetches from DB, populates cache, releases lock. All other requests wait briefly and retry the cache.",
        flow: "Req 1: SETNX lock:product:123 → acquired ✓ → fetch DB → SET cache → DEL lock\nReq 2-1000: SETNX fails → sleep 50ms → retry cache → HIT ✓",
        when: "Cold start (key never cached before). After hard TTL expiry. Data where you can't serve stale values (account balance, last-item inventory).",
      },
      {
        name: "Stale-While-Revalidate",
        how: "Store two TTLs: soft (data is 'stale but usable') and hard (data is gone). After soft TTL, serve stale data to everyone while ONE background thread refreshes from DB.",
        flow: "Key has soft TTL=60s, hard TTL=120s\nAt t=65s (past soft, before hard):\n  All 1000 requests: cache HIT → get stale data instantly (zero latency)\n  First request ALSO triggers async background refresh\n  Background job: fetch DB → update cache\n  Next requests get fresh data",
        when: "Almost always preferred over locking. Works whenever slight staleness (seconds) is acceptable. Most read-heavy systems.",
      },
    ],
  },
  {
    name: "Mass Expiry (Many Keys at Once)",
    description: "1000 different keys all expire at the same time (e.g., after a deploy, cache flush, or bulk load with identical TTLs). DB gets hit with 1000 different queries simultaneously.",
    alsoCalledAs: "Cache avalanche",
    solutions: [
      {
        name: "Staggered TTL (Jitter)",
        how: "When writing to cache, add random jitter to the TTL so keys expire at different times instead of all at once.",
        flow: "Without jitter: all keys TTL=3600 → all expire at same second → DB spike\nWith jitter: TTL = 3600 + random(-300, +300)\n  key A: 3412s, key B: 3791s, key C: 3544s\n  → expirations spread across ~10 min window → steady trickle to DB",
        when: "Always. There's no reason NOT to add jitter. Especially critical after bulk cache loads, deploys, or restarts.",
      },
      {
        name: "Cache Warming",
        how: "Proactively populate cache before traffic hits. On deploy, background job pre-loads hot keys from DB.",
        flow: "Deploy new version → background job loads top 1000 products into Redis → then open traffic",
        when: "After deploys, restarts, or cache flushes. When you know which keys will be hot.",
      },
    ],
  },
];

const layers = [
  {
    name: "CDN (Cloud CDN / Cloudflare)",
    where: "Edge servers globally distributed, closest to user",
    what: "Static assets (images, JS, CSS, video), public API responses identical for all users",
    notWhat: "Per-user data, authenticated responses, real-time changing data",
    latency: "~1-50ms (edge proximity)",
    control: "Cache-Control headers: public/private, max-age, no-store, no-cache",
    note: "CDN is NOT an API Gateway. CDN = cache content at edge. API GW = routing, auth, rate limiting. Separate concerns, sometimes co-located.",
  },
  {
    name: "API Gateway Cache",
    where: "At the gateway layer, before requests reach app servers",
    what: "Public API responses that are the same for all callers (GET /products/popular)",
    notWhat: "Per-user endpoints, POST/PUT/DELETE, responses varying by auth",
    latency: "~1-5ms",
    control: "Gateway-specific config. Usually keyed by URL + query params.",
    note: "Optional layer. Not all architectures use gateway-level caching. Most caching happens in Redis.",
  },
  {
    name: "In-Process Cache (App-level)",
    where: "In memory on each app server instance (HashMap, LRU cache in your code)",
    what: "Config, feature flags, hot reference data (country codes, currency rates), extremely hot product data",
    notWhat: "Per-user data, frequently changing data, anything where consistency across pods matters",
    latency: "Nanoseconds (local memory read)",
    control: "App code — simple Map/LRU with short TTL. Each pod has its own copy.",
    note: "10 pods = 10 independent caches that can diverge. Only use for data that's OK to be slightly different across instances.",
  },
  {
    name: "Redis / Memorystore (Shared Cache)",
    where: "Centralized in-memory store, shared across all app instances",
    what: "User sessions, user profiles, shopping carts, leaderboards, rate limit counters, DB query results",
    notWhat: "Large blobs (use GCS), data that changes every ms (diminishing returns)",
    latency: "~1ms (network round-trip)",
    control: "TTL per key, eviction policies (LRU, LFU, etc.)",
    note: "This is your primary caching layer in most designs. Mention this in every interview.",
  },
];

const redisStructures = [
  { structure: "String", command: "GET / SET", useCase: "Basic key-value caching", example: 'SET user:123:profile \'{"name":"Noam"}\' EX 3600' },
  { structure: "Hash", command: "HGET / HSET", useCase: "Partial field updates without fetching whole object", example: 'HSET user:123 name "Noam" age 28\nHGET user:123 name → "Noam"' },
  { structure: "Sorted Set", command: "ZADD / ZREVRANGE", useCase: "Leaderboards, rankings, priority queues", example: 'ZADD leaderboard 3100 "rita" 2500 "noam"\nZREVRANGE leaderboard 0 9 → top 10' },
  { structure: "List", command: "LPUSH / LRANGE", useCase: "Recent activity feeds, notification queues", example: 'LPUSH user:123:feed "new post from rita"\nLRANGE user:123:feed 0 19 → last 20 items' },
  { structure: "Set", command: "SADD / SISMEMBER", useCase: "Unique membership checks, online users, dedup", example: 'SADD online_users "noam"\nSISMEMBER online_users "noam" → 1 (true)' },
  { structure: "HyperLogLog", command: "PFADD / PFCOUNT", useCase: "Approximate unique counts (visitors, events). ~12KB per counter regardless of cardinality.", example: 'PFADD page:/home "user1" "user2" "user1"\nPFCOUNT page:/home → 2' },
];

const faqs = [
  { q: "Cache-aside vs write-through — when do I pick which?", a: "Cache-aside is the default for most read-heavy systems. Use write-through when the data is read immediately after every write (e.g., profile update → immediate page reload showing new data)." },
  { q: "Why DELETE the cache key on write instead of UPDATE?", a: "Two concurrent writes can race: Write A sets cache, then Write B sets cache, but Write A actually committed to DB last. Now cache has B's data but DB has A's. DELETE is idempotent and safe — the next read will re-populate from the DB source of truth." },
  { q: "How do I keep cache in sync with DB?", a: "Three options in order of complexity: (1) TTL — accept eventual staleness. (2) Active invalidation — delete key on write. (3) CDC — Change Streams push DB changes to invalidate cache in near-real-time. Most systems use #1 or #2." },
  { q: "When should I NOT use a cache?", a: "When writes are as frequent as reads (cache is constantly invalidated). When data is unique per request (no reuse). When strong consistency is required and staleness is unacceptable. When the DB is already fast enough." },
  { q: "What's the difference between CDN caching and Redis caching?", a: "CDN = edge caching by URL, for content served identically to all users (static files, public pages). Redis = application-level caching by custom keys, for per-user or computed data. Different layers solving different problems." },
  { q: "How do I size my Redis cache?", a: "Estimate hot working set (not total data). Use LRU eviction — Redis automatically evicts least-recently-used keys when memory is full. Monitor hit rate — if it drops below ~90%, you need more memory or your TTLs are wrong." },
  { q: "What eviction policy should I use?", a: "allkeys-lru (evict least recently used from ALL keys) is the safe default for caching. Use volatile-lru if some keys should never be evicted (no TTL = permanent). Use allkeys-lfu if access patterns are skewed (some keys accessed way more than others)." },
  { q: "Leaderboard — why Redis sorted set instead of DB?", a: "Redis sorted set maintains sort order in memory. ZADD is O(log N), ZREVRANGE top-K is O(K+log N). The DB would need ORDER BY + LIMIT on every read, which is much slower at scale. Redis IS the primary data structure for the leaderboard, not a cache of a DB query." },
];

function StrategyCard({ s, isExpanded, onToggle }) {
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 12, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, borderBottom: isExpanded ? "1px solid #2a2a4a" : "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{s.name}</span>
          <div style={{ fontSize: 14, color: "#64748b", fontStyle: "italic", marginTop: 4 }}>{s.tagline}</div>
        </div>
        <span style={{ color: "#64748b", fontSize: 14, transform: isExpanded ? "rotate(180deg)" : "", transition: "transform 0.2s", flexShrink: 0 }}>▼</span>
      </div>
      {isExpanded && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Flow</div>
            {s.flow.map((step, i) => (
              <div key={i} style={{ fontSize: 14, color: step.startsWith("READ") || step.startsWith("WRITE") ? "#fbbf24" : "#cbd5e1", marginBottom: 6, fontFamily: step.startsWith("READ") || step.startsWith("WRITE") ? "'JetBrains Mono', monospace" : "inherit", fontWeight: step.startsWith("READ") || step.startsWith("WRITE") ? 700 : 400 }}>{step}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>✓ Pros</div>
              {s.pros.map((p, i) => <div key={i} style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4, paddingLeft: 6 }}>• {p}</div>)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>✗ Cons</div>
              {s.cons.map((c, i) => <div key={i} style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4, paddingLeft: 6 }}>• {c}</div>)}
            </div>
          </div>
          <div style={{ background: "#0f1c0f", borderRadius: 6, padding: "12px 14px", border: "1px solid #153b15", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>🎯 Best For</div>
            <div style={{ fontSize: 14, color: "#86efac", lineHeight: 1.5 }}>{s.bestFor}</div>
          </div>
          <div style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Example</div>
            <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>{s.example}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StampedeCard({ problem, isExpanded, onToggle }) {
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #3b1515", marginBottom: 12, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, borderBottom: isExpanded ? "1px solid #2a2a4a" : "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fca5a5", fontFamily: "'JetBrains Mono', monospace" }}>⚠️ {problem.name}</span>
          <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>{problem.description}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Also called: {problem.alsoCalledAs}</div>
        </div>
        <span style={{ color: "#64748b", fontSize: 14, transform: isExpanded ? "rotate(180deg)" : "", transition: "transform 0.2s", flexShrink: 0 }}>▼</span>
      </div>
      {isExpanded && (
        <div style={{ padding: "12px 14px" }}>
          {problem.solutions.map((sol, i) => (
            <div key={i} style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: i < problem.solutions.length - 1 ? 12 : 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>{sol.name}</div>
              <div style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 10, lineHeight: 1.5 }}>{sol.how}</div>
              <div style={{ background: "#1a1a2e", borderRadius: 6, padding: 12, marginBottom: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#94a3b8", whiteSpace: "pre-wrap", lineHeight: 1.6, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{sol.flow}</div>
              <div style={{ fontSize: 14, color: "#fbbf24" }}><strong>When:</strong> {sol.when}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CachingCheatSheet() {
  const [expStrat, setExpStrat] = useState(new Set([0]));
  const [expStampede, setExpStampede] = useState(new Set([0]));
  const [expFaqs, setExpFaqs] = useState(new Set());
  const [showLayers, setShowLayers] = useState(true);
  const [showInvalidation, setShowInvalidation] = useState(true);
  const [showRedis, setShowRedis] = useState(true);

  const toggle = (setter, i) => () => setter((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const expandAll = (setter, arr) => () => setter(new Set(arr.map((_, i) => i)));
  const collapseAll = (setter) => () => setter(new Set());

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f23", color: "#e2e8f0", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "16px 12px" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>Caching Patterns Cheat Sheet</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>System Design Interview Reference — Google L6</p>

        {/* Caching Layers */}
        <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 20, overflow: "hidden" }}>
          <div onClick={() => setShowLayers(!showLayers)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#fbbf24" }}>🏗️ Cache Layers</span>
            <span style={{ color: "#64748b", transform: showLayers ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
          </div>
          {showLayers && (
            <div style={{ padding: "0 16px 14px" }}>
              <div style={{ background: "#0f0f23", borderRadius: 6, padding: 12, marginBottom: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#818cf8", textAlign: "center", lineHeight: 1.8, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                Client → CDN → API GW → App [in-process] → Redis → DB
              </div>
              {layers.map((l, i) => (
                <div key={i} style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: i < layers.length - 1 ? 10 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{l.name}</span>
                    <span style={{ fontSize: 13, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace" }}>{l.latency}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>{l.where}</div>
                  <div style={{ fontSize: 14, marginBottom: 6 }}><span style={{ color: "#22c55e" }}>Cache: </span><span style={{ color: "#94a3b8" }}>{l.what}</span></div>
                  <div style={{ fontSize: 14, marginBottom: 6 }}><span style={{ color: "#ef4444" }}>Don't cache: </span><span style={{ color: "#94a3b8" }}>{l.notWhat}</span></div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}><span style={{ color: "#fbbf24" }}>Controlled by: </span><span style={{ color: "#94a3b8" }}>{l.control}</span></div>
                  {l.note && <div style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", marginTop: 8 }}>💡 {l.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strategies */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>Caching Strategies</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={expandAll(setExpStrat, strategies)} style={{ background: "#2a2a4a", color: "#94a3b8", border: "none", padding: "5px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>Expand All</button>
            <button onClick={collapseAll(setExpStrat)} style={{ background: "#2a2a4a", color: "#94a3b8", border: "none", padding: "5px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>Collapse All</button>
          </div>
        </div>
        {strategies.map((s, i) => <StrategyCard key={s.name} s={s} isExpanded={expStrat.has(i)} onToggle={toggle(setExpStrat, i)} />)}

        {/* Invalidation */}
        <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 20, overflow: "hidden" }}>
          <div onClick={() => setShowInvalidation(!showInvalidation)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#f87171" }}>🗑️ Cache Invalidation</span>
            <span style={{ color: "#64748b", transform: showInvalidation ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
          </div>
          {showInvalidation && (
            <div style={{ padding: "0 16px 14px" }}>
              <div style={{ background: "#1c0f0f", borderRadius: 6, padding: 12, marginBottom: 14, border: "1px solid #3b1515" }}>
                <div style={{ fontSize: 14, color: "#fca5a5", fontWeight: 600 }}>⚠️ Golden Rule: Always DELETE the cache key on write, never UPDATE it.</div>
                <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 6 }}>Why? Two concurrent writes can race and leave stale data. DELETE is idempotent and safe — the next read re-populates from DB.</div>
              </div>
              {invalidation.map((inv, i) => (
                <div key={i} style={{ background: "#0f0f23", borderRadius: 6, padding: "12px 14px", marginBottom: i < invalidation.length - 1 ? 10 : 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>{inv.name}</div>
                  <div style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 6 }}>{inv.how}</div>
                  <div style={{ fontSize: 14, color: "#fbbf24", marginBottom: 6 }}>{inv.tradeoff}</div>
                  <div style={{ fontSize: 13, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{inv.example}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stampede Problems */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>Cache Failure Modes</h2>
        </div>
        {stampedeProblems.map((p, i) => <StampedeCard key={p.name} problem={p} isExpanded={expStampede.has(i)} onToggle={toggle(setExpStampede, i)} />)}

        {/* Redis Data Structures */}
        <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 20, padding: "14px 12px", overflow: "hidden" }}>
          <div onClick={() => setShowRedis(!showRedis)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#818cf8" }}>📦 Redis Data Structures</span>
            <span style={{ color: "#64748b", transform: showRedis ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
          </div>
          {showRedis && (
            <div style={{ marginTop: 14, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 14 }}>Redis IS the data structure. Operations are O(1) or O(log N).</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
                <thead>
                  <tr>
                    {["Structure", "Commands", "Use Case"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#818cf8", borderBottom: "2px solid #2a2a4a", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {redisStructures.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: "8px 10px", color: "#e2e8f0", borderBottom: "1px solid #1a1a3e", fontWeight: 600, fontSize: 14 }}>{r.structure}</td>
                      <td style={{ padding: "8px 10px", color: "#fbbf24", borderBottom: "1px solid #1a1a3e", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{r.command}</td>
                      <td style={{ padding: "8px 10px", color: "#94a3b8", borderBottom: "1px solid #1a1a3e", fontSize: 14 }}>{r.useCase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FAQ */}
        <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, marginTop: 8 }}>Common Interview Q&A</h2>
        {faqs.map((faq, i) => (
          <div key={i} style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid #2a2a4a", marginBottom: 10, overflow: "hidden" }}>
            <div onClick={toggle(setExpFaqs, i)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", flex: 1 }}>{faq.q}</span>
              <span style={{ color: "#64748b", fontSize: 14, transform: expFaqs.has(i) ? "rotate(180deg)" : "", transition: "transform 0.2s", flexShrink: 0 }}>▼</span>
            </div>
            {expFaqs.has(i) && <div style={{ padding: "0 16px 14px" }}><div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{faq.a}</div></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
