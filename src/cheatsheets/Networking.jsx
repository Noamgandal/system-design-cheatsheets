import { useState } from "react";

const sections = [
  {
    id: "lb",
    title: "Load Balancers",
    icon: "⚖️",
    subsections: [
      {
        title: "L4 vs L7",
        content: [
          {
            term: "L4 (Transport Layer)",
            detail: "Routes by IP + port only. Can't read HTTP content. Faster, cheaper.",
            usage: "Internal service-to-service, non-HTTP traffic (DB connections, raw TCP), when you only need to distribute load.",
            gotcha: "Can't do content-based routing, A/B testing, or SSL termination that reads headers."
          },
          {
            term: "L7 (Application Layer)",
            detail: "Reads full HTTP request: URL path, headers, cookies, body. Can route based on content.",
            usage: "User-facing traffic, path-based routing (/api → backend, /static → CDN origin), SSL termination.",
            gotcha: "Slower than L4 (must parse HTTP). This is what you mean when you draw 'Load Balancer' in interviews."
          }
        ]
      },
      {
        title: "GCP Load Balancers",
        content: [
          {
            term: "Global HTTP(S) LB",
            detail: "L7, single anycast IP, routes to nearest healthy backend globally. Integrates with Cloud CDN.",
            usage: "Default for user-facing web services.",
            gotcha: "Anycast = one IP that network routes to nearest edge. Mention this, skip DNS details."
          },
          {
            term: "Regional LB",
            detail: "Stays within one region. L4 or L7.",
            usage: "When backend is regional (Cloud SQL) or for internal service-to-service traffic.",
            gotcha: "Not for global users — they'd all hit one region."
          },
          {
            term: "Internal LB",
            detail: "Not internet-facing. VPC-only. Typically L4.",
            usage: "API Gateway → Internal LB → backend microservices. After L7 routing is done, just distribute load.",
            gotcha: "Usually L4 since smart routing already happened at the edge."
          }
        ]
      },
      {
        title: "Key LB Concepts",
        content: [
          {
            term: "SSL/TLS Termination",
            detail: "LB decrypts HTTPS → reads request → forwards plain HTTP to backends → re-encrypts response to client.",
            usage: "Always terminate at LB. Offloads CPU-intensive decryption from backend servers, centralizes certificate management.",
            gotcha: "Internal traffic is unencrypted — fine within trusted network (VPC). Say 'TLS terminates at the LB' and move on."
          },
          {
            term: "Health Checks",
            detail: "LB pings backends periodically. Unhealthy → removed from rotation.",
            usage: "Critical for availability. Backend crashes → LB detects in seconds → stops routing to it.",
            gotcha: "Configure timeout carefully — too aggressive = false positives during GC pauses."
          },
          {
            term: "Connection Draining",
            detail: "When removing a backend (deploy, scale-down), finish existing requests before killing instance.",
            usage: "Zero-downtime deploys. LB stops sending NEW requests but lets in-flight requests complete.",
            gotcha: "Set a timeout — don't wait forever for slow requests."
          }
        ]
      }
    ]
  },
  {
    id: "gw",
    title: "API Gateway",
    icon: "🚪",
    subsections: [
      {
        title: "Gateway vs LB — What Gateway Adds",
        content: [
          {
            term: "Authentication",
            detail: "Validates JWT or API key in Authorization header. Extracts user identity (user_id, roles). LB has zero awareness of this.",
            usage: "Every request is authenticated at the edge before reaching backend services.",
            gotcha: "Gateway reads the JWT payload — no DB lookup needed (stateless verification via signature)."
          },
          {
            term: "Coarse Authorization",
            detail: "Matches endpoint + HTTP method against required roles/scopes from JWT payload.",
            usage: "'DELETE /users/* requires role admin' — small config, not a big data problem.",
            gotcha: "Fine-grained authZ (can user X access resource Y?) stays in the backend service, not the gateway."
          },
          {
            term: "Rate Limiting (per client)",
            detail: "Free tier = 100 req/min, enterprise = 10K req/min. Gateway tracks per API key.",
            usage: "Protect backends from abuse, enforce billing tiers.",
            gotcha: "LB doesn't know about tiers or clients — it just distributes traffic."
          },
          {
            term: "API Versioning",
            detail: "Routes /v1/users → old service, /v2/users → new service.",
            usage: "Backward compatibility during migrations. Clients choose which version to call.",
            gotcha: "This is YOUR API version, not a software version."
          },
          {
            term: "Request/Response Transformation",
            detail: "Modify request before forwarding: strip headers, inject X-User-ID after auth, reshape response before sending to client.",
            usage: "Backend doesn't re-validate JWT — gateway already injected the user identity as a trusted header.",
            gotcha: "LB forwards requests as-is. Gateway understands your API semantics."
          },
          {
            term: "Canary / A/B Testing",
            detail: "Route 5% traffic to new version by weight, header, or cookie. Monitor error rates before increasing.",
            usage: "Gradual rollout of new service versions.",
            gotcha: "LB can do basic weight splitting. Gateway does smart routing (by user ID, header, cookie)."
          }
        ]
      },
      {
        title: "Interview One-Liner",
        content: [
          {
            term: "LB vs Gateway",
            detail: "LB sees HTTP requests. Gateway understands your API's semantics (who's calling, what they're allowed to do, which version).",
            usage: "In practice: Global LB handles traffic distribution + SSL → Gateway handles auth, rate limiting, routing, transformation.",
            gotcha: "They're complementary, not competing. Draw both in your architecture."
          }
        ]
      }
    ]
  },
  {
    id: "auth",
    title: "Auth: JWT vs API Key",
    icon: "🔐",
    subsections: [
      {
        title: "Two Authentication Methods",
        content: [
          {
            term: "JWT (JSON Web Token)",
            detail: "Self-contained token: {header}.{payload}.{signature}. Payload contains user_id, role, expiry. Server verifies signature — no DB lookup needed.",
            usage: "User authentication. User logs in → gets JWT → sends it with every request. Stateless = scales well.",
            gotcha: "Can't be revoked individually (until expiry). Keep TTL short (1 hour), use refresh tokens."
          },
          {
            term: "API Key",
            detail: "Long random string (sk-abc123...). Server looks it up in DB to find owner and permissions.",
            usage: "Application/service authentication. Stripe API key identifies YOUR APP, not a specific end-user inside it.",
            gotcha: "Requires DB lookup per request. Simple to implement, easy to revoke individually."
          },
          {
            term: "Key Difference",
            detail: "JWT authenticates the USER. API Key authenticates the APPLICATION.",
            usage: "Often used together: API key identifies the partner app + JWT identifies the specific user on whose behalf it's calling.",
            gotcha: "Don't use API keys for user auth at scale — you'd need one per user per session, which is what JWT solves."
          }
        ]
      }
    ]
  },
  {
    id: "headers",
    title: "HTTP Essentials",
    icon: "📋",
    subsections: [
      {
        title: "Headers, Cookies, TLS",
        content: [
          {
            term: "HTTP Headers",
            detail: "Key-value metadata on every request/response. Examples: Authorization (JWT), Content-Type (json), X-Forwarded-For (real client IP injected by LB), X-Request-ID (tracing).",
            usage: "Auth, content negotiation, tracing, rate-limit metadata.",
            gotcha: "X-Forwarded-For is critical — backend only sees LB's IP without it."
          },
          {
            term: "Cookies",
            detail: "Server tells browser to store a value and send it back on every subsequent request. Used for session IDs, auth tokens.",
            usage: "Session management, sticky session routing (LB reads session cookie to route to same server).",
            gotcha: "Browser-specific. For service-to-service, use Authorization header instead."
          },
          {
            term: "TLS/SSL",
            detail: "Encryption that makes HTTPS work. Client and server do a handshake → establish encrypted channel. 'S' in HTTPS = TLS.",
            usage: "All external traffic must be HTTPS. Terminate at LB, internal traffic can be plain HTTP within VPC.",
            gotcha: "TLS handshake is CPU-intensive — that's why you terminate at the LB, not at each backend."
          }
        ]
      }
    ]
  },
  {
    id: "ws",
    title: "WebSockets",
    icon: "🔌",
    subsections: [
      {
        title: "What & When",
        content: [
          {
            term: "WebSocket",
            detail: "Persistent bidirectional TCP connection. Unlike HTTP (request → response → done), stays open — both sides send data anytime.",
            usage: "Real-time chat, live dashboards, multiplayer games, collaborative editing, notifications, stock tickers.",
            gotcha: "Stateful — each connection is pinned to one server. This is the core scaling challenge."
          },
          {
            term: "Why Not HTTP Polling?",
            detail: "Polling: client asks 'any updates?' every N seconds. 99% of polls return nothing. Wastes bandwidth, adds latency, crushes servers at scale.",
            usage: "WebSocket eliminates polling entirely — server pushes data the instant it's available.",
            gotcha: "WebSockets use more server memory (open connection per client) but far less total load than polling."
          }
        ]
      },
      {
        title: "Scaling Pattern: Redis Pub/Sub",
        content: [
          {
            term: "The Problem",
            detail: "User A on WS-Server-1 sends message to User B on WS-Server-2. Server-1 has A's socket, Server-2 has B's socket. How does the message cross servers?",
            usage: "Any multi-server WebSocket deployment faces this.",
            gotcha: "Sticky sessions DON'T solve this — they keep a user on one server, but don't help deliver messages across servers."
          },
          {
            term: "Redis Pub/Sub (the solution)",
            detail: "Redis has built-in Pub/Sub: PUBLISH to a channel, all SUBSCRIBERs receive instantly. Fire-and-forget, sub-millisecond, in-memory. When User B connects to Server-2, Server-2 runs SUBSCRIBE user:B. When Server-1 needs to reach B, it runs PUBLISH user:B 'message'. Redis pushes it to Server-2 instantly.",
            usage: "Cross-server real-time message relay. Every WS server subscribes to channels for its connected users.",
            gotcha: "NOT the same as Cloud Pub/Sub. Redis Pub/Sub has NO persistence — if nobody is subscribed, message is lost."
          },
          {
            term: "Why Not DB Polling Instead?",
            detail: "Server-2 could poll DB every 100ms for new messages. But: 99% of polls return nothing, millions of wasted queries, up to 100ms latency.",
            usage: "Redis Pub/Sub is push-based (instant delivery). DB is pull-based (must ask for data). Real-time needs push.",
            gotcha: "You still write to DB for persistence — Redis Pub/Sub is only for instant relay to online users."
          },
          {
            term: "Why Not Cloud Pub/Sub?",
            detail: "Cloud Pub/Sub: 10-100ms latency, separate managed service, costs per message. Redis Pub/Sub: <1ms, already in your stack, free with your Redis instance.",
            usage: "Cloud Pub/Sub for microservice events (order placed, user signed up). Redis Pub/Sub for real-time user-facing relay.",
            gotcha: "Cloud Pub/Sub persists messages (good for reliability). Redis Pub/Sub doesn't (fine because DB handles persistence)."
          }
        ]
      },
      {
        title: "Connection Lifecycle",
        content: [
          {
            term: "Client Disconnects (tunnel, crash)",
            detail: "TCP connection breaks. Server detects via heartbeat (ping every 30s, no pong = dead). Server cleans up: UNSUBSCRIBE from Redis channels for that user.",
            usage: "Client comes back → creates NEW WebSocket to LB → LB routes to ANY server → new server SUBSCRIBEs to user's channels → client fetches missed messages from DB.",
            gotcha: "WebSocket connections are NOT resumed. Always a fresh connection. App layer handles catching up via DB."
          },
          {
            term: "Server Crashes",
            detail: "All connections on that server die instantly. Clients detect socket error → reconnect to LB → routed to healthy servers. LB health check marks dead server, stops routing to it.",
            usage: "Redis subscriptions from dead server just disappear. New servers re-subscribe for reconnecting users.",
            gotcha: "Nothing is lost — messages are in DB. Only in-flight messages during the crash moment might need retry."
          },
          {
            term: "Sticky Sessions — When Needed?",
            detail: "For pure WebSocket: NOT needed. TCP connection naturally stays on one server once established.",
            usage: "Only needed when framework does multi-step HTTP handshake before upgrading to WebSocket (some libraries do this).",
            gotcha: "Interview answer: 'WebSocket connections are inherently persistent on one server. The scaling challenge is cross-server delivery, solved by Redis Pub/Sub.'"
          }
        ]
      },
      {
        title: "Full Architecture",
        content: [
          {
            term: "Complete Flow (Chat Example)",
            detail: "User A → WS-Server-1 → (1) Write to DB + (2) PUBLISH user:B on Redis → Redis pushes to WS-Server-2 (subscribed to user:B) → Server-2 pushes down B's WebSocket → User B sees message.",
            usage: "DB = persistence + offline delivery. Redis Pub/Sub = real-time cross-server relay. WebSocket = real-time client push.",
            gotcha: "WS server is a thin relay — receive, persist, publish. No important state in memory."
          },
          {
            term: "Redis Pub/Sub vs Cloud Pub/Sub",
            detail: "Redis: <1ms, fire-and-forget, no persistence, built into Redis, free. Cloud: 10-100ms, persistent (31 days), managed service, costs per message.",
            usage: "Redis Pub/Sub for real-time user relay. Cloud Pub/Sub for reliable async microservice events.",
            gotcha: "They complement each other. Different tools for different problems."
          }
        ]
      }
    ]
  },
  {
    id: "protocols",
    title: "gRPC vs REST",
    icon: "🔄",
    subsections: [
      {
        title: "When to Use Which",
        content: [
          {
            term: "REST (HTTP/JSON)",
            detail: "Human-readable, easy to debug (curl it), huge ecosystem, widely understood.",
            usage: "External/public APIs, mobile/web clients, anything user-facing.",
            gotcha: "Verbose (JSON text), no streaming (standard HTTP), no strict typing."
          },
          {
            term: "gRPC (HTTP/2 + Protocol Buffers)",
            detail: "Binary protocol — smaller payloads, faster serialization. Strongly typed via .proto definitions. Supports bidirectional streaming.",
            usage: "Internal service-to-service, high-throughput internal APIs, streaming data between microservices.",
            gotcha: "Hard to debug (binary), poor browser support, overkill for simple CRUD APIs."
          },
          {
            term: "Interview Rule",
            detail: "External → REST. Internal microservice-to-microservice → gRPC.",
            usage: "Mention the tradeoff and you'll score points. Most Google internal services use gRPC (Stubby).",
            gotcha: "Don't pick gRPC for a public API. Don't use REST for high-throughput internal pipelines."
          }
        ]
      }
    ]
  },
  {
    id: "dns",
    title: "DNS & Routing",
    icon: "🌐",
    subsections: [
      {
        title: "How Users Reach Your System",
        content: [
          {
            term: "DNS Resolution",
            detail: "User types app.google.com → DNS resolves to an IP address → that IP is your load balancer.",
            usage: "Google Global LB uses anycast: single IP, network routes to nearest edge location automatically.",
            gotcha: "Don't go deep on DNS in interviews. Say 'anycast IP routes to nearest edge' and move on."
          },
          {
            term: "Full Request Path",
            detail: "DNS → Global L7 LB (TLS termination, path routing) → API Gateway (auth, rate limit, versioning) → Internal L4 LB → Backend Service → DB/Cache",
            usage: "Draw this in every system design. The exact layers may vary but this is the standard pattern.",
            gotcha: "Not every system needs all layers. Small systems: LB + service. Large systems: all of the above."
          }
        ]
      }
    ]
  },
  {
    id: "decisions",
    title: "Decision Trees",
    icon: "🌳",
    subsections: [
      {
        title: "Quick Decisions",
        content: [
          {
            term: "LB Type?",
            detail: "User-facing global → Global HTTP(S) LB (L7). Internal service-to-service → Internal Regional LB (L4). Non-HTTP traffic → Network LB (L4).",
            usage: "",
            gotcha: ""
          },
          {
            term: "Auth Method?",
            detail: "End-user authentication → JWT. External developer/app access → API Key. Service-to-service → JWT or mTLS.",
            usage: "",
            gotcha: ""
          },
          {
            term: "API Protocol?",
            detail: "Public/external → REST. Internal high-throughput → gRPC. Real-time bidirectional → WebSocket.",
            usage: "",
            gotcha: ""
          },
          {
            term: "Real-time Delivery?",
            detail: "Cross-server relay → Redis Pub/Sub. Message persistence → Database. Async microservice events → Cloud Pub/Sub. Client push → WebSocket.",
            usage: "",
            gotcha: ""
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
        background: "#1a1a2e",
        border: "1px solid #2a2a4a",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 8,
        cursor: hasExtra ? "pointer" : "default",
        transition: "border-color 0.2s",
        borderLeftWidth: 3,
        borderLeftColor: open ? "#00d2ff" : "#2a2a4a",
      }}
      onClick={() => hasExtra && setOpen(!open)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <span style={{ color: "#00d2ff", fontWeight: 700, fontSize: 17, fontFamily: "'JetBrains Mono', monospace" }}>
            {item.term}
          </span>
          <p style={{ color: "#c8c8e0", fontSize: 17, margin: "6px 0 0 0", lineHeight: 1.7 }}>
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
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #2a2a4a" }}>
          {item.usage && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: "#4ade80", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>When / Why</span>
              <p style={{ color: "#a0a0c0", fontSize: 17, margin: "4px 0 0 0", lineHeight: 1.7 }}>{item.usage}</p>
            </div>
          )}
          {item.gotcha && (
            <div>
              <span style={{ color: "#f59e0b", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Gotcha / Interview Tip</span>
              <p style={{ color: "#a0a0c0", fontSize: 17, margin: "4px 0 0 0", lineHeight: 1.7 }}>{item.gotcha}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NetworkingCheatsheet() {
  const [activeSection, setActiveSection] = useState("lb");
  const current = sections.find(s => s.id === activeSection);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d1a",
      color: "#e0e0f0",
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: "20px 16px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          color: "#fff",
          margin: "0 0 4px 0",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          ⚡ Networking & LB Cheatsheet
        </h1>
        <p style={{ color: "#666", fontSize: 16, margin: "0 0 20px 0" }}>
          Google L6 System Design — Load Balancing, Gateways, Auth, WebSockets, Protocols
        </p>

        {/* Tab navigation */}
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
                background: activeSection === s.id ? "#1a1a3e" : "transparent",
                color: activeSection === s.id ? "#00d2ff" : "#666",
                border: activeSection === s.id ? "1px solid #00d2ff33" : "1px solid transparent",
                borderRadius: 6,
                padding: "10px 16px",
                fontSize: 15,
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

        {/* Content */}
        {current && current.subsections.map((sub, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <h3 style={{
              fontSize: 19,
              fontWeight: 700,
              color: "#8888aa",
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
