import { useState } from "react";

const sections = [
  {
    id: "rest",
    title: "REST Fundamentals",
    icon: "🌐",
    subsections: [
      {
        title: "HTTP Methods",
        content: [
          {
            term: "GET /resource/{id}",
            detail: "Read. No side effects. Idempotent (calling 10x = same as 1x). Never use GET to mutate data.",
            usage: "GET /users/123 → returns user object. GET /events?city=NYC&limit=20 → filtered list.",
            gotcha: "If you catch yourself writing GET /deleteUser/123 — stop. That's what DELETE is for."
          },
          {
            term: "POST /resource",
            detail: "Create. NOT idempotent — calling twice creates two resources. This is why idempotency keys exist.",
            usage: "POST /orders with body { items: [...], total: 100 } → creates order, returns 201 Created.",
            gotcha: "POST is the only non-idempotent method. Any time you POST something important (payments, bookings), add an idempotency key."
          },
          {
            term: "PUT /resource/{id}",
            detail: "Full replace. Idempotent — sending the same PUT 10 times produces the same final state. Replaces the ENTIRE resource.",
            usage: "PUT /users/123 with full user object → replaces all fields. Missing fields get nulled.",
            gotcha: "PUT vs PATCH: PUT replaces everything, PATCH updates specific fields. Interview default: use PUT for updates unless asked."
          },
          {
            term: "DELETE /resource/{id}",
            detail: "Remove. Idempotent — deleting twice = still deleted. Second call returns 404 or 204.",
            usage: "DELETE /bookings/456 → cancels booking. Returns 204 No Content.",
            gotcha: "Soft delete (mark as deleted, don't remove row) is common in production for audit trails. Mention if relevant."
          }
        ]
      },
      {
        title: "Where Data Goes",
        content: [
          {
            term: "Path Params → identify the resource",
            detail: "/users/123 — the '123' is a path param. Always used for resource IDs. Part of the URL structure.",
            usage: "/events/{event_id}/bookings/{booking_id} — nested resources show hierarchy.",
            gotcha: "Path params are required. They identify WHICH thing. If it's optional, it's a query param."
          },
          {
            term: "Query Params → filter / modify",
            detail: "Optional key-value pairs after '?'. Used for filtering, sorting, pagination.",
            usage: "/events?city=NYC&date=2024-01-01&sort=price&limit=20",
            gotcha: "Never put sensitive data in query params — they show up in logs and browser history."
          },
          {
            term: "Request Body → the payload",
            detail: "JSON data sent with POST/PUT/PATCH. Contains the actual data for creating or updating resources.",
            usage: "POST /orders body: { \"items\": [...], \"total\": 100, \"currency\": \"USD\" }",
            gotcha: "GET requests should NOT have a body (some servers ignore it). Data for GET goes in query params."
          },
          {
            term: "Headers → metadata",
            detail: "Key-value metadata on every request. Authorization, Content-Type, Idempotency-Key, Accept-Version.",
            usage: "Authorization: Bearer <jwt> | Content-Type: application/json | Idempotency-Key: uuid-here",
            gotcha: "Custom headers use X- prefix by convention (X-Request-ID, X-Correlation-ID) though this convention is technically deprecated."
          }
        ]
      }
    ]
  },
  {
    id: "idempotency",
    title: "Idempotency",
    icon: "🔄",
    subsections: [
      {
        title: "The Pattern",
        content: [
          {
            term: "The Problem",
            detail: "User clicks 'Pay $100.' Network glitch. Client retries. Without protection → user charged $200. Any non-idempotent operation (POST) risks duplicates on retry.",
            usage: "Payments, bookings, order creation, account registration — anything where duplicates cause real damage.",
            gotcha: "GET, PUT, DELETE are naturally idempotent. POST is the dangerous one. Focus idempotency protection on POST endpoints."
          },
          {
            term: "Idempotency Key Pattern",
            detail: "Client generates a UUID before the request. Sends it in header: Idempotency-Key: abc-123. Server checks: seen this key before? Yes → return cached response. No → process + store key and response.",
            usage: "Stripe, Google Pay, and most payment APIs use this exact pattern. The key is usually a UUID v4.",
            gotcha: "Interview one-liner: 'I'd use an idempotency key to make retries safe.' One sentence, big points."
          },
          {
            term: "Where Keys Are Stored",
            detail: "In the APP's database (not the gateway). The payment_id IS the idempotency key. INSERT INTO payments (payment_id, amount) ON CONFLICT DO NOTHING. Second insert = harmless no-op.",
            usage: "The key becomes the primary key or a unique column of the resource being created. Lives in your service's Spanner/DB.",
            gotcha: "Some systems also cache keys in Redis for fast lookups, but the DB unique constraint is the source of truth."
          }
        ]
      },
      {
        title: "Method Idempotency Reference",
        content: [
          {
            term: "Naturally Idempotent: GET, PUT, DELETE",
            detail: "GET: reading never changes state. PUT: replacing with same data = same result. DELETE: deleting twice = still deleted.",
            usage: "No special handling needed for retries on these methods.",
            gotcha: "DELETE is idempotent in outcome (resource stays deleted) but may return different status codes (200 first time, 404 on retry)."
          },
          {
            term: "NOT Idempotent: POST",
            detail: "Each POST can create a new resource. POST /orders twice = two orders. Must add explicit idempotency protection.",
            usage: "Always protect POST endpoints that create important resources (payments, bookings, accounts).",
            gotcha: "PATCH is a gray area — 'set balance = 100' is idempotent, 'increment balance += 10' is NOT. Design your PATCH to be idempotent when possible."
          }
        ]
      }
    ]
  },
  {
    id: "pagination",
    title: "Pagination",
    icon: "📄",
    subsections: [
      {
        title: "Offset vs Cursor",
        content: [
          {
            term: "Offset-Based (Simple)",
            detail: "GET /events?offset=20&limit=10 → returns items 21-30. Client says 'skip 20, give me 10.' Easy to understand.",
            usage: "Admin dashboards, small datasets, simple CRUD apps. Fine for most interviews unless scale is a concern.",
            gotcha: "Problems at scale: (1) OFFSET 1000000 means DB scans past 1M rows — slow. (2) If data changes while paginating, items shift — duplicates or missed items."
          },
          {
            term: "Cursor-Based (Scalable)",
            detail: "GET /events?cursor=eyJpZCI6IkMifQ&limit=10. Cursor is base64-encoded last-seen ID. Server does WHERE id > 'C' LIMIT 10. Fast index seek regardless of depth.",
            usage: "Feeds, timelines, large datasets, real-time data. Use when interviewer cares about scale.",
            gotcha: "Cursor is opaque — client can't tamper with it or assume its format. You can change from ID-based to timestamp-based cursor without breaking clients."
          },
          {
            term: "How Cursor Works Concretely",
            detail: "Request 1: GET /events?limit=3 → returns [A, B, C] + next_cursor='eyJpZCI6IkMifQ'. Request 2: GET /events?limit=3&cursor=... → server decodes cursor → WHERE id > 'C' LIMIT 3 → returns [D, E, F].",
            usage: "Response always includes next_cursor (or null if no more pages). Client just passes the token back.",
            gotcha: "Interview default: 'I'd use cursor-based pagination, returning a next_cursor token in each response.' That's usually enough."
          }
        ]
      }
    ]
  },
  {
    id: "ratelimit",
    title: "Rate Limiting",
    icon: "🚦",
    subsections: [
      {
        title: "Why & Where",
        content: [
          {
            term: "Purpose",
            detail: "Prevent abuse, protect resources, enforce pricing tiers (free = 100 req/min, paid = 10K req/min). Without it, one bad client can take down your service.",
            usage: "Every public API needs rate limiting. Internal APIs too, for protection against runaway jobs.",
            gotcha: "Lives in API Gateway or middleware, BEFORE the request hits your backend. Returns 429 Too Many Requests + Retry-After header."
          },
          {
            term: "GCP Built-in vs Custom",
            detail: "GCP API Gateway and Apigee have built-in rate limiting — configure rules like '100 req/min per API key' in config. No code needed for basic cases.",
            usage: "Use built-in for standard per-client limits. Build custom for tiered pricing, per-endpoint limits, or usage-based billing.",
            gotcha: "Interview: 'In practice I'd use the gateway's built-in rate limiting. If we need custom tiers, I'd implement token bucket with Redis counters.'"
          },
          {
            term: "Where to Store Counters",
            detail: "Redis (Memorystore on GCP). Rate limiting needs sub-millisecond reads/writes. Approximate correctness is fine — letting 101 through instead of 100 is acceptable.",
            usage: "All gateway instances share the same Redis counters. Key per client: rate:user-123 → token count.",
            gotcha: "This is the RIGHT use case for Redis — speed matters more than perfection. Unlike distributed locking, no edge case causes real damage here."
          }
        ]
      },
      {
        title: "Algorithms (Know Two, Compare Them)",
        content: [
          {
            term: "Token Bucket ⭐ (most common)",
            detail: "Bucket holds N tokens (e.g., 10). Tokens refill at fixed rate (1/sec). Each request costs 1 token. Empty bucket → 429. Key property: ALLOWS BURSTS up to bucket size.",
            usage: "Used by Stripe, AWS, most production APIs. Accommodates bursty real-world traffic. Simple to implement with Redis: store token count + last refill time.",
            gotcha: "Interview: 'I'd use token bucket — it allows short bursts which fits real API patterns, and state lives in Redis so all gateway instances share counters.'"
          },
          {
            term: "Sliding Window (precise)",
            detail: "Track timestamps of each request in the last N seconds. New request → count requests in window → if count > limit → reject.",
            usage: "When you need precision — no burst loophole. Used when strict enforcement matters.",
            gotcha: "Downside: must store all timestamps per client — more memory. Compare with token bucket: 'Token bucket allows bursts, sliding window is strict.'"
          },
          {
            term: "Fixed Window (simplest, has a flaw)",
            detail: "Divide time into 1-min windows. Count requests per window. Simple counter reset each minute.",
            usage: "Quick to implement for non-critical rate limiting.",
            gotcha: "Boundary flaw: 100 requests at 0:59 + 100 at 1:01 = 200 in 2 seconds, even though limit is 100/min. Mention this flaw to show depth."
          }
        ]
      }
    ]
  },
  {
    id: "versioning",
    title: "Versioning & Errors",
    icon: "🏷️",
    subsections: [
      {
        title: "API Versioning",
        content: [
          {
            term: "URL Versioning (default choice)",
            detail: "/v1/users/123 and /v2/users/123. Version is in the URL path. Gateway routes /v1/* to old deployment, /v2/* to new deployment.",
            usage: "Google APIs, Stripe, most major APIs use this. Simple, explicit, easy to test (just change the URL).",
            gotcha: "The version is HARDCODED in the client's source code (app or service), not typed by users. Old app installs call /v1, new installs call /v2."
          },
          {
            term: "Who Routes Versions?",
            detail: "The API Gateway, not the LB. Versioning is an API concern — 'which contract does this client expect?' Gateway handles auth, rate limiting, AND version routing.",
            usage: "Gateway routes /v1/users → v1 service deployment, /v2/users → v2 deployment. Different code, different containers.",
            gotcha: "Eventually deprecate old versions. Give clients months of warning. Monitor traffic to v1 — when it drops to zero, shut it down."
          },
          {
            term: "Header Versioning (alternative)",
            detail: "Accept-Version: v2 in request header. Cleaner URLs but harder to test — can't just paste URL in browser.",
            usage: "Some APIs prefer this. Less common in practice.",
            gotcha: "Interview default: URL versioning. Say it, explain the gateway routing, move on."
          }
        ]
      },
      {
        title: "HTTP Status Codes",
        content: [
          {
            term: "Success: 200, 201, 202, 204",
            detail: "200 OK (general success). 201 Created (POST created a resource). 202 Accepted (async task started). 204 No Content (DELETE success, nothing to return).",
            usage: "POST → 201. DELETE → 204. GET → 200. Async operation → 202 with task ID.",
            gotcha: "202 is the key one for async patterns — 'I accepted your request but haven't finished processing it yet.'"
          },
          {
            term: "Client Errors: 400, 401, 403, 404, 409, 429",
            detail: "400 Bad Request (invalid data). 401 Unauthorized (no/invalid auth token). 403 Forbidden (authenticated but not authorized). 404 Not Found. 409 Conflict (duplicate username). 429 Rate Limited.",
            usage: "401 vs 403: 401 = 'who are you?' (auth failed). 403 = 'I know who you are, but you can't do this' (authz failed).",
            gotcha: "409 Conflict is great for 'seats sold out' or 'username taken' — it means the request is valid but conflicts with current state."
          },
          {
            term: "Server Error: 500, 503",
            detail: "500 Internal Server Error (something broke). 503 Service Unavailable (overloaded or in maintenance).",
            usage: "Client should retry on 503 (temporary). 500 may or may not be retryable.",
            gotcha: "Consistent error body: { error: { code: 'INSUFFICIENT_BALANCE', message: 'Balance too low', details: {...} } }. Machine-readable code + human message."
          }
        ]
      }
    ]
  },
  {
    id: "async",
    title: "Async Patterns",
    icon: "⏳",
    subsections: [
      {
        title: "Polling vs Webhooks",
        content: [
          {
            term: "Polling — Client Keeps Asking",
            detail: "POST /reports → 202 { task_id: 't-99' }. Client polls GET /reports/t-99/status every N seconds. Eventually gets { status: 'complete', url: '...' }.",
            usage: "Browser/mobile clients — they can't expose a callback URL. Simple internal tools. Any client-facing async operation.",
            gotcha: "Pros: dead simple, no firewall issues, stateless, works for any client. Cons: wasted requests (90% return 'still processing'), latency gap between completion and next poll."
          },
          {
            term: "Webhooks — Server Calls Client",
            detail: "Client registers a callback URL. Server POSTs to that URL when the task completes. 'Web' + 'hook' = HTTP callback triggered by an event.",
            usage: "ONLY works server-to-server — the client must expose a public HTTP endpoint. Used for cross-company integrations: Stripe, GitHub, Twilio webhooks.",
            gotcha: "Pros: zero wasted requests, instant notification. Cons: client must be a server (not browser/phone), needs retry logic if callback fails, harder to debug."
          },
          {
            term: "Pub/Sub — Webhooks Done Right (Internal)",
            detail: "Instead of raw HTTP callbacks between your services, use Cloud Pub/Sub. Backend publishes 'report done' → subscriber services receive it. Built-in retry, dead-letter queue, at-least-once delivery.",
            usage: "Internal service-to-service async communication. Strictly better than raw webhooks within your own system.",
            gotcha: "Raw webhooks for CROSS-COMPANY (Stripe can't publish to your Pub/Sub). Pub/Sub for INTERNAL. Never build raw webhooks between your own services."
          }
        ]
      },
      {
        title: "Real-Time to Mobile/Browser",
        content: [
          {
            term: "The Relay Layer Pattern",
            detail: "Phone ←WebSocket→ Notification Service ←Pub/Sub→ Backend. Phone maintains persistent WebSocket. Backend publishes events to Pub/Sub. Notification service relays to the phone instantly.",
            usage: "Push notifications, real-time chat, live dashboards. How WhatsApp, Slack, Gmail push updates to your phone.",
            gotcha: "Phone never exposes a URL. It maintains an OUTBOUND WebSocket connection. The relay layer pushes DOWN that connection. This is the production answer for 'how to notify mobile clients in real time.'"
          },
          {
            term: "When to Use What",
            detail: "Browser/mobile waiting for async task → Polling (simple) or WebSocket (real-time). Service-to-service internal → Pub/Sub. Cross-company integration → Webhooks.",
            usage: "Interview: 'For user-facing, I'd use polling with exponential backoff. For service-to-service, Cloud Pub/Sub. For external partner notifications, webhooks with retry.'",
            gotcha: "If interviewer pushes on real-time mobile: describe the WebSocket relay pattern. Shows depth beyond basic polling."
          }
        ]
      }
    ]
  },
  {
    id: "design",
    title: "Interview Framework",
    icon: "💡",
    subsections: [
      {
        title: "Steps to Design an API",
        content: [
          {
            term: "Step 1: List Resources (Nouns)",
            detail: "Identify the entities: Users, Orders, Events, Bookings, Products. These become your URL paths.",
            usage: "Ticket system: Events, Bookings, Users, Venues, Payments.",
            gotcha: "Resources are NOUNS, not verbs. /createUser is wrong. POST /users is right."
          },
          {
            term: "Step 2: Define Endpoints",
            detail: "For each resource: POST (create), GET (read one), GET (list with filters), PUT (update), DELETE (remove). Not every resource needs all five.",
            usage: "POST /events (create), GET /events?city=NYC (list), GET /events/{id} (details), POST /events/{id}/bookings (book).",
            gotcha: "Nested resources show hierarchy: /events/{id}/bookings means 'bookings belonging to this event.'"
          },
          {
            term: "Step 3: Define Key Request/Response Shapes",
            detail: "For the 2-3 most important endpoints, sketch the JSON. Don't do all of them — just the ones with interesting fields.",
            usage: "POST /bookings → body: { event_id, seats, tier } → response: { booking_id, status, total_price }",
            gotcha: "Don't over-detail. Show you know what fields matter, then move on."
          },
          {
            term: "Step 4: Call Out Cross-Cutting Concerns",
            detail: "This is where you score points. Mention: idempotency keys on POST, cursor pagination on list endpoints, rate limiting at gateway, auth via JWT.",
            usage: "'POST /bookings uses an idempotency key. List endpoints use cursor pagination. All endpoints go through gateway for auth and rate limiting.'",
            gotcha: "One sentence per concern. Shows you know the patterns without going deep on each. Interviewer will ask follow-ups on what interests them."
          }
        ]
      },
      {
        title: "Example: Ticket Booking System API",
        content: [
          {
            term: "Endpoints",
            detail: "POST /events (admin creates). GET /events?city=NYC&date=... (search). GET /events/{id} (details + available seats). POST /events/{id}/bookings (book tickets). GET /bookings/{id} (booking details). DELETE /bookings/{id} (cancel).",
            usage: "Clean resource hierarchy: events contain bookings. Search uses query params. Booking is the key mutation.",
            gotcha: "Notice: no /bookTicket or /cancelBooking endpoints. RESTful = resources + HTTP methods."
          },
          {
            term: "POST /events/{id}/bookings — The Key Endpoint",
            detail: "Headers: Idempotency-Key: uuid. Body: { seats: 2, tier: 'VIP' }. Success: 201 { booking_id, status: 'confirmed', total }. Sold out: 409 Conflict { error: { code: 'SEATS_UNAVAILABLE' } }.",
            usage: "Idempotency key prevents double-booking on retry. Spanner transaction ensures atomic seat check + decrement. 409 for business logic conflicts.",
            gotcha: "This one endpoint demonstrates: idempotency, proper status codes, error format, and ties to the DB consistency model. Great interview answer."
          },
          {
            term: "Cross-Cutting Concerns",
            detail: "Auth: JWT via gateway. Rate limit: 100 req/min free tier, 10K paid, enforced at gateway. Pagination: cursor-based on GET /events. Versioning: /v1/ prefix, gateway routes.",
            usage: "State these as bullet points after defining endpoints. Shows you see the full picture.",
            gotcha: "Interviewer often asks about one of these as a follow-up. Being ready to go deep on any of them is the goal."
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
        borderLeftColor: open ? "#60a5fa" : "#252540",
      }}
      onClick={() => hasExtra && setOpen(!open)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 15, fontFamily: "'JetBrains Mono', monospace" }}>
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

export default function APIDesignCheatsheet() {
  const [activeSection, setActiveSection] = useState("rest");
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
          🌐 API Design
        </h1>
        <p style={{ color: "#666", fontSize: 14, margin: "0 0 20px 0" }}>
          System Design Interview — REST, Idempotency, Pagination, Rate Limiting, Async, Interview Framework
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
                color: activeSection === s.id ? "#60a5fa" : "#666",
                border: activeSection === s.id ? "1px solid #60a5fa33" : "1px solid transparent",
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
