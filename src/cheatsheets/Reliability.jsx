import { useState } from "react";

const sections = [
  {
    id: "reliability",
    title: "Reliability",
    icon: "🛡️",
    subsections: [
      {
        title: "Retry & Failure Handling",
        content: [
          {
            term: "Retry with Exponential Backoff + Jitter",
            detail: "Request fails → wait 1s → retry → wait 2s → retry → wait 4s → give up. Add random jitter so 1000 clients don't all retry at the same moment and crush the server. Cap max delay at 30-60s.",
            usage: "Every network call between services. Google client libraries default to ~3 retries with backoff. Config: max_retries=3, initial_delay=1s, max_delay=30s.",
            gotcha: "Only retry RETRYABLE errors: 503, 429, timeouts. Don't retry 400/404/403 — they'll fail the same way. This distinction shows you understand the pattern."
          },
          {
            term: "Circuit Breaker",
            detail: "After N consecutive failures to Service B, STOP calling B entirely (circuit 'open'). Return fallback/error instantly — no network call. After 30s, try ONE probe request ('half-open'). Success → close circuit, resume. Fail → stay open.",
            usage: "On calls to any external or critical dependency. Prevents cascading failure: B is down → A keeps calling → A's threads block → A dies too. Circuit breaker breaks this chain.",
            gotcha: "Different from retries: retries are per-request ('try again'), circuit breaker is across ALL requests ('stop trying entirely'). They complement each other. Frameworks: Resilience4j (Java), Polly (.NET), Istio (infra-level)."
          },
          {
            term: "Timeouts",
            detail: "Every network call needs a timeout. No timeout = thread hangs forever waiting for a dead service, consuming resources until your service dies. Set aggressive timeouts.",
            usage: "Internal service calls: 500ms-1s. External API calls: 2-5s. Database queries: 5-10s. Combined with retries: timeout at 500ms, retry 3x, then circuit-break.",
            gotcha: "A missing timeout is a production incident waiting to happen. 'I'd set a 500ms timeout on internal calls with 3 retries' — shows operational maturity."
          },
          {
            term: "Idempotent Retries",
            detail: "Make operations produce the same result when called multiple times. Then retries are always safe — no risk of duplicate charges, double bookings, or duplicate processing.",
            usage: "Payments: use idempotency key. DB writes: INSERT ON CONFLICT DO NOTHING. Event processing: dedup by event_id. If idempotent, you can retry aggressively without fear.",
            gotcha: "Always prefer idempotency over distributed locking. 'I'd make this operation idempotent so retries are safe' is better than 'I'd add a distributed lock.'"
          }
        ]
      },
      {
        title: "Isolation & Degradation",
        content: [
          {
            term: "Bulkhead (Isolated Resource Pools)",
            detail: "Give each dependency its own thread/connection pool. If Service B is slow and its 20 threads all block, calls to Service C still work fine — they use a separate pool. One failure can't consume all resources.",
            usage: "Any service calling multiple downstream dependencies. Named after ship compartments — a breach in one doesn't flood the whole ship.",
            gotcha: "The concept is isolation, thread pools are the typical mechanism. 'I'd isolate calls to each dependency with separate connection pools' — that's the bulkhead pattern."
          },
          {
            term: "Graceful Degradation",
            detail: "When a non-critical dependency fails, serve a reduced experience instead of an error page. Recommendation service down? Show trending items. Profile pictures down? Show default avatar.",
            usage: "Any user-facing feature that depends on non-essential services. The core experience works, extras are best-effort.",
            gotcha: "Interview: 'If the recommendation service is unavailable, we degrade gracefully and show popular items.' Shows you think about user experience during failures."
          },
          {
            term: "Connection Draining",
            detail: "When removing a server (deploy, scale-down), finish in-flight requests before killing the instance. LB stops sending NEW requests, but existing ones complete. Enables zero-downtime deploys.",
            usage: "Every deployment. K8s does this with preStop hooks + terminationGracePeriodSeconds. LB health check marks instance as draining.",
            gotcha: "Without draining: deploy kills pod → 50 in-flight requests get 502 errors. With draining: pod finishes those 50, then shuts down cleanly."
          },
          {
            term: "Load Shedding",
            detail: "When overloaded, intentionally reject excess requests (return 503) to protect the system. Better to serve 80% of users well than 100% of users poorly (or crash entirely).",
            usage: "During traffic spikes that exceed capacity. Prioritize: reject low-priority requests first (analytics), keep critical ones (payments).",
            gotcha: "Different from rate limiting: rate limiting is per-client ('you're sending too much'). Load shedding is global ('the whole system is overloaded')."
          }
        ]
      },
      {
        title: "Health & Deployment",
        content: [
          {
            term: "Liveness Probe",
            detail: "K8s periodically calls GET /healthz on your container. Returns 200 → alive. Fails → K8s kills and restarts the container. Catches: deadlocked process, crashed runtime, unrecoverable state.",
            usage: "Simple check: 'can I respond at all?' Usually just return 200. Don't check dependencies here — if DB is down, restarting your pod won't fix it.",
            gotcha: "Common mistake: making liveness check DB connectivity. DB goes down → all pods fail liveness → K8s restarts ALL pods → stampede when DB recovers. Don't do this."
          },
          {
            term: "Readiness Probe",
            detail: "K8s calls GET /healthz/ready. Returns 200 → send traffic. Returns 503 → stop sending traffic (but don't kill the pod). YOUR application code defines what 'ready' means.",
            usage: "Check: cache warmed? DB connected? Config loaded? The app decides. K8s acts on the result. A service can be alive but not ready (still starting up).",
            gotcha: "Readiness IS application-defined. You write the /healthz/ready endpoint logic. K8s just polls it and routes traffic accordingly."
          },
          {
            term: "Canary / Rolling Deploys",
            detail: "Canary: deploy new version to 5% of traffic. Monitor errors. Gradually increase to 100%. Rolling: replace pods one at a time, always keeping capacity. Blue-green: run both versions, switch traffic atomically.",
            usage: "Every production deployment. Canary is safest for risky changes. Rolling is default for most K8s deployments.",
            gotcha: "Interview: 'I'd do a canary deploy — 5% traffic to the new version, monitor error rates and p99 latency, then gradually roll out.' Shows operational maturity."
          }
        ]
      }
    ]
  },
  {
    id: "security",
    title: "Security & Auth",
    icon: "🔐",
    subsections: [
      {
        title: "Authentication (Who Are You?)",
        content: [
          {
            term: "JWT (User Auth — Stateless)",
            detail: "User logs in → server creates token with {user_id, role, expiry} signed with a secret → client sends token with every request → server verifies signature, no DB lookup needed. Self-contained and stateless.",
            usage: "User-facing APIs. Mobile/web apps. Scales well because no session DB. Keep TTL short (1 hour), use refresh tokens for re-auth.",
            gotcha: "Can't revoke individual tokens (until they expire). For immediate revocation, maintain a short blacklist in Redis. Trade-off: stateless simplicity vs revocation difficulty."
          },
          {
            term: "API Key (App/Service Auth — DB Lookup)",
            detail: "Long random string (sk-abc123...). Server looks it up in DB to find which app/organization it belongs to and what permissions it has. Simple to implement, easy to revoke individually.",
            usage: "Third-party developers calling your API. Stripe's API key identifies YOUR APP, not a specific end-user. Often combined with JWT: API key = which app, JWT = which user.",
            gotcha: "API key authenticates the APPLICATION. JWT authenticates the USER. Different concerns. 'The API key identifies the partner app, the JWT identifies the specific user on whose behalf it's calling.'"
          },
          {
            term: "OAuth 2.0 (Delegated Auth — 'Sign in with Google')",
            detail: "Your app redirects user to Google → user logs in at Google → Google redirects back with an authorization code → your backend exchanges code for access token → you call Google APIs on user's behalf. You never see the user's password.",
            usage: "'Sign in with Google/GitHub/Facebook'. Also used for granting limited API access ('this app can read my calendar but not my email').",
            gotcha: "You won't design OAuth in an interview. Just know the redirect flow exists and say 'auth via OAuth 2.0 with Google as identity provider.' That's enough."
          }
        ]
      },
      {
        title: "Service-to-Service Security",
        content: [
          {
            term: "TLS (Server Identity Only)",
            detail: "Client connects → server shows its certificate → client verifies 'yes, this is really that server.' Client stays anonymous at the TLS level. This is every HTTPS website.",
            usage: "All external traffic. TLS termination at the LB — LB decrypts, forwards plain HTTP internally within the trusted VPC.",
            gotcha: "TLS = 'I trust the server.' One-directional identity verification."
          },
          {
            term: "mTLS (Mutual — Both Sides Prove Identity)",
            detail: "Server shows its cert AND client shows its cert. Both verify each other at the transport level. Service B now knows 'this caller is Service A, not a compromised pod.' Authentication at the network layer.",
            usage: "Zero-trust networking: don't trust the network even internally. Required for: regulated industries (finance, healthcare), multi-tenant environments, large orgs. Istio service mesh handles it automatically on GKE.",
            gotcha: "Only mention if asked about security. 'Internal service-to-service uses mTLS via service mesh — zero-trust, we don't rely on network perimeter alone.' Senior answer."
          },
          {
            term: "IAM Service Accounts (Least Privilege)",
            detail: "Each service runs with its own GCP service account. Give minimum permissions: payments service gets spanner.readWrite on payments DB, nothing else. No shared 'god' accounts.",
            usage: "Every GCP service needs IAM roles. Cloud Run → service account → IAM role → resource access. Principle of least privilege.",
            gotcha: "Interview: 'Each service has its own service account with minimal IAM roles. The order service can read inventory but can't modify user data.' Shows security awareness."
          },
          {
            term: "Secrets Management",
            detail: "Store API keys, DB passwords, certificates in Secret Manager (GCP) or Vault (HashiCorp). Never in code, environment variables, or config files committed to git.",
            usage: "Every secret your services need. Services fetch secrets at startup or use mounted volumes in K8s.",
            gotcha: "If an interviewer sees you hardcode a DB password in a design diagram, it's a red flag. 'Credentials stored in Secret Manager, rotated automatically.'"
          }
        ]
      },
      {
        title: "Client Security",
        content: [
          {
            term: "CORS (Browser Cross-Origin Requests)",
            detail: "Browser at app.com calls api.app.com. Browser sends preflight OPTIONS request. The API SERVER responds with 'Access-Control-Allow-Origin: app.com' — yes, you're allowed. Without this header, browser blocks the request.",
            usage: "Only relevant for browser clients (not mobile, not service-to-service). The API decides who's allowed, the browser enforces it.",
            gotcha: "Prevents evil.com from calling your API using your user's cookies. The API server configures which origins are allowed. One sentence in interviews: 'API returns CORS headers for our frontend domain.'"
          },
          {
            term: "Input Validation & SQL Injection",
            detail: "Never trust client input. Validate on the server. Use parameterized queries (not string concatenation) to prevent SQL injection. Sanitize HTML to prevent XSS.",
            usage: "Every endpoint that accepts user input. Parameterized: WHERE id = ? with binding. Never: WHERE id = ' + userInput.",
            gotcha: "Mention briefly if designing user-facing APIs. 'All inputs validated server-side, queries parameterized.' Shows security hygiene."
          }
        ]
      }
    ]
  },
  {
    id: "observability",
    title: "Observability",
    icon: "📊",
    subsections: [
      {
        title: "Three Pillars",
        content: [
          {
            term: "Logs (Discrete Events)",
            detail: "Individual event records: 'User 123 created order 456 at 12:03:01.' Structured logs (JSON) are searchable and parseable. Include: timestamp, service name, request ID, severity, message.",
            usage: "Debugging specific requests. 'What happened to order 456?' Search by request_id across all services. GCP: Cloud Logging.",
            gotcha: "Always use STRUCTURED logs (JSON key-value), not free-text. Always include a correlation/request ID so you can trace one request across all services."
          },
          {
            term: "Metrics (Aggregated Numbers Over Time)",
            detail: "Counters and gauges tracked continuously: request rate, error rate, latency percentiles (p50/p95/p99), CPU/memory usage, queue depth, connection pool usage.",
            usage: "Dashboards, alerting, capacity planning. 'Is the system healthy right now?' 'Are we trending toward a problem?' GCP: Cloud Monitoring.",
            gotcha: "The RED method — three key metrics per service: Rate (requests/sec), Errors (error rate %), Duration (latency p99). Cover these and you're solid."
          },
          {
            term: "Traces (Request Path Across Services)",
            detail: "Follow one request across the entire call chain: Gateway → Auth → Order Service → Payment → DB. Each hop is a 'span' with timing. The full set of spans is a 'trace.' Correlation ID links them.",
            usage: "Debugging latency: 'This request took 3s — which service was slow?' Trace shows Payment took 2.8s of the 3s. GCP: Cloud Trace.",
            gotcha: "Correlation ID (X-Request-ID) is generated at the edge (gateway) and propagated through every service call. Every log entry includes it. This ties logs + traces together."
          }
        ]
      },
      {
        title: "SLOs & Error Budgets",
        content: [
          {
            term: "SLI → SLO → SLA (The Hierarchy)",
            detail: "SLI (indicator): the metric you measure — '99.2% of requests under 200ms.' SLO (objective): your internal target — 'we aim for 99.9% under 200ms.' SLA (agreement): customer contract — 'if we fail 99.5%, we refund credits.'",
            usage: "SLO is stricter than SLA (internal bar higher than customer promise). Set SLOs on the metrics users actually care about: latency, availability, correctness.",
            gotcha: "Don't say 'five nines' (99.999%) casually — that's 5 minutes downtime per YEAR. 99.9% (three nines) = 43 minutes/month. Know what the numbers mean."
          },
          {
            term: "Error Budget",
            detail: "SLO is 99.9% uptime → error budget is 0.1% downtime per month (~43 minutes). Budget remaining → ship features fast, take risks. Budget exhausted → freeze deployments, focus on reliability.",
            usage: "Bridges the tension between 'ship fast' (product) and 'don't break things' (SRE). Quantifies how much risk you can take.",
            gotcha: "Interview: 'We'd set an SLO of 99.9% availability with an error budget that gates feature releases. If we burn the budget, we freeze deploys and fix reliability.'"
          },
          {
            term: "Alerting on Burn Rate",
            detail: "Don't alert on raw thresholds ('latency > 500ms'). Alert on SLO burn rate: 'at the current error rate, we'll exhaust our monthly error budget in 6 hours.' This captures severity and urgency together.",
            usage: "A brief spike might not matter (plenty of budget left). A sustained elevation is urgent (burning budget fast). Burn rate captures this nuance.",
            gotcha: "Multi-window burn rate: fast burn (consuming 5% budget/hour → page immediately) vs slow burn (consuming 0.5% budget/hour → ticket, investigate tomorrow)."
          }
        ]
      },
      {
        title: "Patterns & Practices",
        content: [
          {
            term: "Golden Signals (Google SRE)",
            detail: "Four metrics to monitor for every service: Latency (how long requests take), Traffic (requests per second), Errors (% of failed requests), Saturation (how full is the system — CPU, memory, queue depth).",
            usage: "Dashboard per service with these four. If all four are healthy, the service is healthy. If any degrades, investigate.",
            gotcha: "Google SRE book coined these. Equivalent to the RED method (Rate, Errors, Duration) + saturation. Mentioning 'golden signals' shows you've read the SRE book."
          },
          {
            term: "Distributed Tracing Implementation",
            detail: "Gateway generates X-Request-ID → passes in header to every downstream call → each service logs it and passes it further → all logs/spans tagged with the same ID → searchable end-to-end.",
            usage: "W3C TraceContext is the standard header format. OpenTelemetry is the standard library for instrumentation. GCP Cloud Trace integrates with OpenTelemetry.",
            gotcha: "Interview: 'All services propagate correlation IDs via W3C TraceContext headers. We use OpenTelemetry for instrumentation, exporting to Cloud Trace.'"
          },
          {
            term: "Dashboards & On-Call",
            detail: "Tier 1 dashboard: golden signals per service. Tier 2: deep-dive dashboards (DB query latency, cache hit rates, queue lag). Runbooks: for each alert, a documented procedure of what to check and how to mitigate.",
            usage: "On-call rotation with escalation. Alert fires → on-call checks runbook → mitigates or escalates. Post-mortem after incidents: blameless, focus on systemic fixes.",
            gotcha: "Interview: 'Each service has a golden signals dashboard. Alerts are based on SLO burn rate with runbooks for each alert type. Post-mortems are blameless.' Shows operational maturity."
          }
        ]
      }
    ]
  },
  {
    id: "compute",
    title: "Compute & Processing",
    icon: "⚙️",
    subsections: [
      {
        title: "GCP Compute Options",
        content: [
          {
            term: "Cloud Run (Default Choice)",
            detail: "Run a container, auto-scales 0→N based on traffic, pay only when handling requests. Fully managed, no cluster to maintain. Supports HTTP, gRPC, WebSockets, and background jobs.",
            usage: "Stateless APIs, microservices, webhooks, async workers. 'If it fits in a container and is stateless, use Cloud Run.' This is your interview default.",
            gotcha: "Scales to zero = no cost when idle. Cold start latency (~200ms) when scaling from zero. For latency-sensitive services, set min instances=1."
          },
          {
            term: "GKE (Full Kubernetes)",
            detail: "Managed Kubernetes cluster. You control everything: pod scheduling, service mesh, persistent volumes, custom networking, GPU scheduling. More power, more operational overhead.",
            usage: "Complex microservices needing: service mesh (Istio), stateful workloads, custom scheduling, GPU workloads, or when you need K8s-specific features (CRDs, operators).",
            gotcha: "Interview: don't say GKE unless you need K8s features. 'I'd use Cloud Run for the API services. For the ML inference pipeline with GPU requirements, GKE.'"
          },
          {
            term: "Cloud Functions (Simplest)",
            detail: "Write a function, triggered by an event (Pub/Sub message, GCS file upload, HTTP request). No container to build. Auto-scales. Limited to 60 minutes runtime.",
            usage: "Simple event-driven tasks: 'when a file is uploaded to GCS, generate a thumbnail.' 'When a Pub/Sub message arrives, send a notification.'",
            gotcha: "Use for glue code and simple triggers. For anything more complex, Cloud Run gives you container flexibility with similar scaling."
          },
          {
            term: "Compute Engine (VMs — Rarely)",
            detail: "Raw virtual machines. Full OS control. You manage everything: patching, scaling, monitoring. Maximum flexibility, maximum operational burden.",
            usage: "Legacy apps that can't be containerized. Software that requires specific OS/kernel configurations. License-bound software.",
            gotcha: "Almost never the right answer in interviews. If you say 'Compute Engine,' you better have a specific reason why containers don't work."
          }
        ]
      },
      {
        title: "Batch vs Stream Processing",
        content: [
          {
            term: "Batch Processing",
            detail: "Process accumulated data periodically. Collect events → run job every hour/day → produce output. High throughput, high latency. Process data at rest.",
            usage: "Daily reports, ETL pipelines, ML training, log aggregation, billing calculation. 'Every night, aggregate yesterday's events into BigQuery.'",
            gotcha: "GCP: Dataflow (batch mode), BigQuery scheduled queries, Cloud Run Jobs. Interview: 'Daily aggregation runs as a Dataflow batch job triggered by Cloud Scheduler.'"
          },
          {
            term: "Stream Processing",
            detail: "Process data as it arrives, continuously. Each event processed within milliseconds/seconds of occurring. Low latency, lower throughput per-event. Process data in motion.",
            usage: "Real-time dashboards, fraud detection, live recommendations, alerting on log events. 'Each transaction is scored for fraud in real-time.'",
            gotcha: "GCP: Dataflow (streaming mode), or Flink on GKE. NOT WebSockets — stream processing pulls from Pub/Sub/Kafka via gRPC streaming pull. Interview: 'Real-time fraud scoring via Dataflow streaming from Pub/Sub.'"
          },
          {
            term: "Lambda Architecture (Both)",
            detail: "Run batch AND stream in parallel. Stream layer gives fast approximate results. Batch layer gives slower but exact results. Batch periodically corrects the stream's approximations.",
            usage: "Real-time dashboard (stream) + accurate daily report (batch). View count: stream gives 'approximately 1.2M views now', batch gives exact count nightly.",
            gotcha: "Complex to maintain (two code paths). Modern alternative: Kappa architecture — single stream processing pipeline that replays from the source when corrections needed. Dataflow supports both."
          }
        ]
      },
      {
        title: "Processing Patterns",
        content: [
          {
            term: "Fan-Out / Fan-In",
            detail: "Fan-out: one event triggers many parallel tasks (upload photo → generate 5 thumbnail sizes in parallel). Fan-in: collect all parallel results → combine into one response (search 10 shards → merge results).",
            usage: "Image processing, parallel search, map-reduce patterns. Pub/Sub naturally fans out to multiple subscribers.",
            gotcha: "Interview: 'Photo upload publishes to Pub/Sub, which fans out to thumbnail, metadata extraction, and ML tagging services in parallel.'"
          },
          {
            term: "Dead Letter Queue (DLQ)",
            detail: "Messages that fail processing after N retries go to a special 'dead letter' queue instead of being lost. Engineers investigate and reprocess later. Prevents poison messages from blocking the pipeline.",
            usage: "Every Pub/Sub subscription should have a DLQ configured. 'If a message fails 5 times, it goes to the DLQ for manual investigation.'",
            gotcha: "Without DLQ: one bad message blocks the entire queue forever (Pub/Sub keeps redelivering it). With DLQ: bad message is parked, pipeline continues."
          },
          {
            term: "Backpressure",
            detail: "When a consumer can't keep up with the producer's rate, it signals the producer to slow down. Without backpressure, the consumer's queue grows unbounded → OOM → crash.",
            usage: "Stream processing: Dataflow automatically handles backpressure by scaling workers. Pub/Sub: unacked messages accumulate → signal to add more consumers.",
            gotcha: "Interview: 'If the processing service can't keep up, Pub/Sub accumulates messages and we auto-scale consumers based on queue depth.' Shows you think about overload."
          },
          {
            term: "Exactly-Once vs At-Least-Once",
            detail: "At-least-once: message delivered one or more times (may have duplicates). Exactly-once: message delivered exactly once (no duplicates). True exactly-once is very hard and expensive.",
            usage: "Most systems use at-least-once + idempotent consumers. Pub/Sub guarantees at-least-once. Dataflow offers exactly-once within the pipeline.",
            gotcha: "Interview: 'Pub/Sub gives at-least-once delivery. I'd make consumers idempotent using a dedup key in Spanner, achieving effectively exactly-once semantics.' This is the standard production pattern."
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
        borderLeftColor: open ? "#f472b6" : "#252540",
      }}
      onClick={() => hasExtra && setOpen(!open)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <span style={{ color: "#f472b6", fontWeight: 700, fontSize: 15, fontFamily: "'JetBrains Mono', monospace" }}>
            {item.term}
          </span>
          <p style={{ color: "#c8c8e0", fontSize: 15, margin: "6px 0 0 0", lineHeight: 1.6 }}>
            {item.detail}
          </p>
        </div>
        {hasExtra && (
          <span style={{ color: "#555", fontSize: 14, marginLeft: 8, flexShrink: 0 }}>
            {open ? "▼" : "▶"}
          </span>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #252540" }}>
          {item.usage && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>When / Example</span>
              <p style={{ color: "#a0a0c0", fontSize: 15, margin: "4px 0 0 0", lineHeight: 1.6 }}>{item.usage}</p>
            </div>
          )}
          {item.gotcha && (
            <div>
              <span style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Gotcha / Interview Tip</span>
              <p style={{ color: "#a0a0c0", fontSize: 15, margin: "4px 0 0 0", lineHeight: 1.6 }}>{item.gotcha}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReliabilityCheatsheet() {
  const [activeSection, setActiveSection] = useState("reliability");
  const current = sections.find(s => s.id === activeSection);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a14",
      color: "#e0e0f0",
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: "20px 16px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#fff",
          margin: "0 0 4px 0",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          🛡️ Reliability, Security, Observability & Compute
        </h1>
        <p style={{ color: "#666", fontSize: 14, margin: "0 0 20px 0" }}>
          System Design Interview — Failure Handling, Auth, Monitoring, Processing Patterns
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
                color: activeSection === s.id ? "#f472b6" : "#666",
                border: activeSection === s.id ? "1px solid #f472b633" : "1px solid transparent",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 14,
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
              fontSize: 17,
              fontWeight: 700,
              color: "#7878a0",
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
