import { useState } from "react";

const sections = [
  {
    id: "cap",
    title: "CAP Theorem",
    icon: "🔺",
    subsections: [
      {
        title: "The Real Choice: CP vs AP",
        content: [
          {
            term: "CAP Theorem",
            detail: "During a network partition, choose Consistency (reject requests rather than return stale data) or Availability (keep serving, might be stale). Partition tolerance is mandatory — networks WILL fail.",
            usage: "When network is healthy (99.9% of the time), you can have all three. CAP only applies during partitions. The real daily tradeoff is latency vs consistency.",
            gotcha: "Don't just recite CAP. Say: 'For this component, consistency matters more because [reason], so I'd choose CP like Spanner.' Show judgment."
          },
          {
            term: "CP (Consistency + Partition Tolerance)",
            detail: "During partition, system refuses to serve rather than return stale data. Writes/reads may fail or block.",
            usage: "Banking, inventory ('is this the last item?'), anything where stale reads cause real damage. Example: Spanner.",
            gotcha: "CP doesn't mean 'always unavailable.' It means unavailable ONLY during the rare partition event."
          },
          {
            term: "AP (Availability + Partition Tolerance)",
            detail: "During partition, system keeps serving but might return stale data. All nodes respond, even if disconnected from each other.",
            usage: "Social feeds, view counts, recommendations, DNS. Slightly stale is fine. Example: Cassandra, Bigtable (multi-region).",
            gotcha: "AP systems eventually converge once the partition heals. 'Eventual' usually means milliseconds to seconds."
          }
        ]
      }
    ]
  },
  {
    id: "models",
    title: "Consistency Models",
    icon: "📊",
    subsections: [
      {
        title: "From Strongest to Weakest",
        content: [
          {
            term: "Strong (Linearizable) Consistency",
            detail: "Every read sees the most recent write, globally. As if there's one copy of the data. All nodes agree instantly.",
            usage: "Money, inventory, unique constraints (username uniqueness), leader election. Where stale = real damage.",
            gotcha: "Higher latency — must coordinate across nodes before confirming write. GCP: Spanner (default), Firestore multi-region."
          },
          {
            term: "Eventual Consistency",
            detail: "After a write, replicas converge eventually (typically ms to seconds). Reads might be stale during that window.",
            usage: "Social feeds, view counts, user profiles (other users seeing your update), recommendations, DNS.",
            gotcha: "This is your DEFAULT. Start here, upgrade to strong only for specific components. GCP: Bigtable cross-region, Cloud SQL read replicas, Memorystore replicas."
          },
          {
            term: "Read-Your-Own-Writes (RYOW)",
            detail: "After YOU write, YOUR reads see that write immediately. Other users might still see stale data briefly.",
            usage: "User updates profile → they see the change instantly. Other users seeing old profile for a few seconds is fine.",
            gotcha: "Common practical middle ground. The posting user needs RYOW, followers can have eventual consistency."
          }
        ]
      },
      {
        title: "Implementing Read-Your-Own-Writes",
        content: [
          {
            term: "Option 1: Use Spanner (just works)",
            detail: "Spanner provides strong consistency by default. Every read from any node sees the latest write. No special handling needed.",
            usage: "If your data is in Spanner, RYOW is free. This is Spanner's biggest selling point.",
            gotcha: "Interview move: 'Spanner gives me strong consistency out of the box via TrueTime, so RYOW isn't a separate concern.'"
          },
          {
            term: "Option 2: Route reads to primary",
            detail: "After a user writes, route their reads to the PRIMARY for the next few seconds (not a read replica).",
            usage: "When using Cloud SQL or any DB with read replicas. Simple, guaranteed fresh reads for that user.",
            gotcha: "Increases load on primary. Only route the writing user, not all users."
          },
          {
            term: "Option 3: Cache the write",
            detail: "Write to DB + write to Redis cache. Subsequent reads check cache first → cache has fresh value.",
            usage: "Works well when you already have a caching layer. Fast reads.",
            gotcha: "Must handle cache invalidation. Standard cache-aside pattern with write-through for the writing user."
          },
          {
            term: "Option 4: Version/commit token",
            detail: "Write returns a version number. Client sends it with subsequent reads. Replica checks if it's caught up to that version.",
            usage: "Sophisticated approach used by some distributed DBs. Replica can wait briefly or redirect if not caught up.",
            gotcha: "More complex to implement. Spanner's TrueTime timestamps serve this purpose internally."
          }
        ]
      }
    ]
  },
  {
    id: "consensus",
    title: "Consensus (Raft/Paxos)",
    icon: "🤝",
    subsections: [
      {
        title: "What Consensus Solves",
        content: [
          {
            term: "The Problem",
            detail: "5 database replicas. A write comes in. How do all replicas agree on the same order of writes, even if 1-2 crash? That's consensus.",
            usage: "Foundation of: strongly consistent replication, leader election, distributed locks. Every CP system uses consensus under the hood.",
            gotcha: "You won't implement this in an interview. Know what it does, which systems use it, and the majority rule."
          }
        ]
      },
      {
        title: "Raft (the one to know)",
        content: [
          {
            term: "Three Roles",
            detail: "Leader: accepts all writes, replicates to followers. Follower: receives writes from leader, responds to reads. Candidate: a follower trying to become leader during an election.",
            usage: "At any time, exactly ONE leader. All writes flow through the leader. This simplicity is Raft's key insight.",
            gotcha: "Single leader can be a bottleneck. That's why systems shard data — each shard gets its own Raft group (Multi-Raft)."
          },
          {
            term: "Normal Operation (Happy Path)",
            detail: "Leader receives write → appends to its log → sends to all Followers → when MAJORITY (3 of 5) acknowledge → write is COMMITTED → leader tells followers to apply it.",
            usage: "Majority rule: with 5 nodes, need 3 to agree. If 2 crash, remaining 3 still form majority → system works.",
            gotcha: "If 3 crash → system stops accepting writes (but NEVER returns wrong data). This is the CP guarantee."
          },
          {
            term: "Leader Failure & Election",
            detail: "Followers stop receiving heartbeats → after random timeout (150-300ms) a follower becomes Candidate → votes for itself, asks others to vote → gets majority → becomes new Leader.",
            usage: "Random timeout prevents all nodes from starting elections simultaneously (split vote problem).",
            gotcha: "Election takes ~150-300ms. During election, no writes accepted. Short unavailability window."
          }
        ]
      },
      {
        title: "Paxos vs Raft",
        content: [
          {
            term: "Paxos",
            detail: "Original consensus algorithm. Any node can propose (no single leader). More flexible but much harder to understand and implement correctly.",
            usage: "Spanner (internally), Chubby (Google's lock service), Megastore.",
            gotcha: "Lamport's original paper was so hard to understand that 'Paxos Made Simple' was needed. Raft exists because Paxos was too complex."
          },
          {
            term: "Raft",
            detail: "Designed to be understandable. Always has a single leader. Separates consensus into 3 independent sub-problems: leader election, log replication, safety.",
            usage: "etcd (Kubernetes), CockroachDB, Consul, TiDB, Kafka (KRaft).",
            gotcha: "Interview: 'Raft and Paxos provide equivalent guarantees. Raft is easier to reason about due to its single-leader design.'"
          },
          {
            term: "Multi-Raft / Multi-Paxos (Scaling Pattern)",
            detail: "Data is sharded. Each shard runs its OWN consensus group. Shard A has its own 5-node Raft group, Shard B has another. This is how consensus scales horizontally.",
            usage: "Spanner: each split has its own Paxos group. CockroachDB: each range has its own Raft group.",
            gotcha: "Interview for Spanner: 'Each split uses Paxos for intra-split consensus. TrueTime provides globally consistent timestamps across splits.'"
          }
        ]
      }
    ]
  },
  {
    id: "locking",
    title: "Distributed Locking",
    icon: "🔒",
    subsections: [
      {
        title: "When & Why",
        content: [
          {
            term: "The Problem",
            detail: "Two servers try to process the same job, or two users buy the last item. Without coordination, both succeed → duplicate processing or overselling.",
            usage: "Exactly-once job processing, preventing overselling, coordinating access to an external rate-limited API.",
            gotcha: "First ask: can I make it IDEMPOTENT instead? If processing the same event twice produces the same result, no lock needed."
          }
        ]
      },
      {
        title: "Locking Options (Google / GCP Lens)",
        content: [
          {
            term: "Option 1: Spanner Transactions (preferred)",
            detail: "If the resource is in Spanner, just use ACID transactions. Two services buy the last item? One transaction commits, the other aborts. The database IS the lock.",
            usage: "Inventory, payments, any write conflict on Spanner data. No external lock service needed.",
            gotcha: "Interview: 'I'd use Spanner's serializable transactions for this. The DB handles mutual exclusion natively.'"
          },
          {
            term: "Option 2: Spanner Lock Table",
            detail: "Create a `locks` table. INSERT with unique constraint to acquire. DELETE to release. Spanner's strong consistency guarantees exactly one winner.",
            usage: "When you need to coordinate something NOT in a single Spanner transaction (cross-service coordination).",
            gotcha: "Add a TTL column and a cleanup job for crash safety — if holder dies, lock eventually gets cleaned up."
          },
          {
            term: "Option 3: etcd Lease (on GKE)",
            detail: "etcd is already in your GKE cluster (Kubernetes uses it). Create a lease-based lock — automatically releases if holder crashes (lease expires).",
            usage: "Leader election for background jobs on Kubernetes. Kubernetes controllers use this internally.",
            gotcha: "Don't use for high-throughput locking — etcd is designed for low-frequency coordination."
          },
          {
            term: "Option 4: Memorystore / Redis Lock",
            detail: "SET key NX EX 30 (set if not exists, expire in 30s). Fast, simple. But has edge cases: GC pause can cause two holders.",
            usage: "Deduplication, rate limiting, best-effort mutual exclusion where speed matters more than perfection.",
            gotcha: "NOT safe for financial transactions. The GC pause problem: holder pauses → lock expires → second holder acquires → first resumes → both think they have the lock."
          },
          {
            term: "Google Internal: Chubby",
            detail: "Google's distributed lock service built on Paxos. Used by Bigtable, GFS, MapReduce. Coarse-grained locks held for hours/days (e.g., 'who is master server').",
            usage: "Not available on GCP. Mentioned here so you know the Google context. ZooKeeper is the open-source equivalent.",
            gotcha: "Chubby uses sequencers (fencing tokens) to prevent the GC pause problem. The resource rejects operations with stale tokens."
          }
        ]
      },
      {
        title: "Decision Framework",
        content: [
          {
            term: "Step 1: Can I make it idempotent?",
            detail: "If processing the same event twice produces the same result → no lock needed. Use a deduplication key in the DB.",
            usage: "Most event processing can be made idempotent. Always try this first.",
            gotcha: "Example: INSERT ... ON CONFLICT DO NOTHING with a unique event_id. Second processing is a harmless no-op."
          },
          {
            term: "Step 2: Can the DB handle it?",
            detail: "If the conflict is on DB rows, use DB transactions. Spanner serializable transactions handle concurrent writes natively.",
            usage: "Inventory, payments, counter updates — anything where the conflicting resource lives in the DB.",
            gotcha: "This is the most common and most correct answer in interviews. Don't reach for external locks when the DB suffices."
          },
          {
            term: "Step 3: Need external coordination?",
            detail: "If coordinating across services or for non-DB resources → etcd lease (on K8s) or Spanner lock table.",
            usage: "Leader election, singleton background jobs, coordinating access to external APIs.",
            gotcha: "Always include a TTL/lease mechanism. If the holder crashes, the lock must eventually release."
          }
        ]
      }
    ]
  },
  {
    id: "leader",
    title: "Leader Election",
    icon: "👑",
    subsections: [
      {
        title: "Pattern",
        content: [
          {
            term: "The Problem",
            detail: "Background job (e.g., 'aggregate metrics every minute') runs on 5 replicas. All 5 run it → 5x duplicate work. Need exactly ONE leader.",
            usage: "Singleton tasks: cron jobs, cache warming, partition assignment, primary/standby failover.",
            gotcha: "If the task can be partitioned across workers (each handles a shard), do that instead. Leader election is for true singletons."
          },
          {
            term: "How It Works",
            detail: "All nodes try to acquire a lock/lease. One wins → becomes leader → does the work → periodically renews lease. Leader crashes → lease expires → another node acquires → becomes new leader.",
            usage: "On GKE: use Kubernetes Lease objects. On GCP without K8s: Spanner lock row with TTL.",
            gotcha: "Lease renewal must happen BEFORE expiry. If leader is slow (GC pause) and lease expires, another takes over → brief moment of two leaders (fencing tokens solve this)."
          },
          {
            term: "Fencing Tokens",
            detail: "Each time a lock is acquired, a monotonically increasing number (fencing token) is attached. The resource (DB, API) rejects operations with an old token number.",
            usage: "Prevents the 'two leaders' problem. Even if old leader resumes after lease expiry, its operations are rejected because it has a stale token.",
            gotcha: "This is how Chubby (Google) and ZooKeeper handle the GC pause problem. Mention this in interviews to show depth."
          }
        ]
      }
    ]
  },
  {
    id: "examples",
    title: "Interview Examples",
    icon: "💡",
    subsections: [
      {
        title: "Spotting Consistency Requirements",
        content: [
          {
            term: "Ticket Booking (concerts, flights)",
            detail: "Two users try to book the last seat simultaneously. Strong consistency on inventory — Spanner transaction: read + decrement atomically. One wins, one gets 'sold out.'",
            usage: "CP requirement for inventory. Rest of system (browsing events, user profiles) can be eventually consistent.",
            gotcha: "Say: 'I'd use Spanner serializable transactions for the booking. The read and decrement happen atomically — no overselling possible.'"
          },
          {
            term: "Social Media Feed",
            detail: "User posts → followers see it. Eventual consistency is fine — 2 second delay to followers is acceptable. BUT the posting user needs RYOW.",
            usage: "Route posting user's reads to primary for a few seconds. Followers read from replicas (eventual consistency).",
            gotcha: "Say: 'Feed reads are eventually consistent from replicas. For the author, I'd use read-your-own-writes by routing to primary briefly.'"
          },
          {
            term: "Collaborative Editor (Google Docs)",
            detail: "Multiple users editing simultaneously. Strong consistency = every keystroke waits for consensus = terrible latency. Locking = only one person types at a time = unusable.",
            usage: "Use CRDTs or Operational Transformation. Each client edits locally (instant), syncs with server, conflicts resolved algorithmically.",
            gotcha: "Say: 'Neither strong nor eventual consistency alone works here. I'd use CRDTs for conflict-free concurrent editing without locking.'"
          },
          {
            term: "Distributed Cron Scheduler",
            detail: "Multiple servers, job X should run exactly once per interval. Without coordination → duplicate execution.",
            usage: "Leader election via etcd lease (on GKE) or Spanner lock row. One server becomes scheduler leader, runs jobs. If it dies, another takes over.",
            gotcha: "Alternative: make jobs idempotent + use distributed queue (Cloud Tasks with dedup). Often simpler than leader election."
          },
          {
            term: "Payment Processing",
            detail: "User pays $100. Network glitch → retry → must NOT charge twice.",
            usage: "Idempotency key: client generates unique payment_id, sends with request. Server checks: already processed this payment_id? → return cached result. First time? → process + store result.",
            gotcha: "Say: 'I'd make payments idempotent using a client-generated idempotency key stored in Spanner. Retries are safe because duplicate payment_ids are rejected.'"
          },
          {
            term: "Username Registration (Uniqueness)",
            detail: "Two users try to register 'noam123' at the same time. Exactly one must win.",
            usage: "Strong consistency required. Spanner unique constraint: INSERT fails for the second user. Or: conditional insert (INSERT ... WHERE NOT EXISTS).",
            gotcha: "This is a linearizability requirement. Eventual consistency would allow both to register the same username briefly."
          }
        ]
      }
    ]
  }
];

function ExpandableCard({ item }) {
  const [open, setOpen] = useState(false);
  const hasExtra = item.usage || item.gotcha;

  return (
    <div
      style={{
        background: "#12121f",
        border: "1px solid #252540",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 8,
        cursor: hasExtra ? "pointer" : "default",
        transition: "border-color 0.2s",
        borderLeftWidth: 3,
        borderLeftColor: open ? "#a78bfa" : "#252540",
      }}
      onClick={() => hasExtra && setOpen(!open)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 20, fontFamily: "'JetBrains Mono', monospace" }}>
            {item.term}
          </span>
          <p style={{ color: "#d1d5db", fontSize: 19, margin: "6px 0 0 0", lineHeight: 1.7 }}>
            {item.detail}
          </p>
        </div>
        {hasExtra && (
          <span style={{ color: "#6b7280", fontSize: 16, marginLeft: 8, flexShrink: 0 }}>
            {open ? "▼" : "▶"}
          </span>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #252540" }}>
          {item.usage && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#4ade80", fontSize: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>When / Why</span>
              <p style={{ color: "#d1d5db", fontSize: 19, margin: "4px 0 0 0", lineHeight: 1.7 }}>{item.usage}</p>
            </div>
          )}
          {item.gotcha && (
            <div>
              <span style={{ color: "#fbbf24", fontSize: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Gotcha / Interview Tip</span>
              <p style={{ color: "#d1d5db", fontSize: 19, margin: "4px 0 0 0", lineHeight: 1.7 }}>{item.gotcha}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConsistencyCheatsheet() {
  const [activeSection, setActiveSection] = useState("cap");
  const current = sections.find(s => s.id === activeSection);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a14",
      color: "#f1f5f9",
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: "20px 16px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#fff",
          margin: "0 0 4px 0",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          🔒 Consistency & Coordination
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 18, margin: "0 0 20px 0" }}>
          Google L6 System Design — CAP, Consensus, Locking, Leader Election, Interview Patterns
        </p>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 24,
          borderBottom: "1px solid #1a1a2e",
          paddingBottom: 12,
        }}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                background: activeSection === s.id ? "#1a1a30" : "transparent",
                color: activeSection === s.id ? "#a78bfa" : "#9ca3af",
                border: activeSection === s.id ? "1px solid #a78bfa33" : "1px solid transparent",
                borderRadius: 6,
                padding: "10px 16px",
                fontSize: 17,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {s.icon} {s.title}
            </button>
          ))}
        </div>

        {current && current.subsections.map((sub, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <h3 style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#9ca3af",
              margin: "0 0 12px 0",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {sub.title}
            </h3>
            {sub.content.map((item, j) => (
              <ExpandableCard key={j} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
