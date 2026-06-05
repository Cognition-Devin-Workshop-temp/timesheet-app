# Reverse MCP — Architectural Specification

> **Version:** 0.1.0 (PoC)
> **Status:** Draft
> **Author:** Devin / Cognition AI
> **Date:** 2026-06-05

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Design Goals & Constraints](#2-design-goals--constraints)
3. [System Overview](#3-system-overview)
4. [Component Architecture](#4-component-architecture)
5. [Wire Protocol](#5-wire-protocol)
6. [Connection Lifecycle](#6-connection-lifecycle)
7. [Multiplexing Model](#7-multiplexing-model)
8. [Security Model](#8-security-model)
9. [Failure Modes & Resilience](#9-failure-modes--resilience)
10. [Sequence Diagrams](#10-sequence-diagrams)
11. [Production Considerations](#11-production-considerations)
12. [PoC Scope & Limitations](#12-poc-scope--limitations)

---

## 1. Problem Statement

In the standard Model Context Protocol (MCP) architecture, the **AI Agent**
acts as a client that initiates a TCP/SSE/WebSocket connection to a **known,
publicly accessible MCP Server**.

This model breaks down when:

- The MCP Server runs **locally** (developer laptop, on-prem machine) behind
  NAT/firewall, with no public IP or inbound port forwarding.
- The AI Agent runs in the **cloud** (hosted LLM platform, remote orchestration
  engine) and therefore cannot initiate a direct inbound connection to the local
  server.

**Real-world examples:**

| MCP Server Location | Provides Access To | Why It Must Be Local |
|---|---|---|
| Developer laptop | Local files, Git repos, IDE state | Privacy, performance |
| On-prem database host | Production/staging databases | Security policy |
| CI runner | Build artifacts, test results | Ephemeral environment |
| IoT gateway | Sensor data, device control | Physical network isolation |

The Reverse MCP architecture solves this by **inverting the connection
direction** without altering the semantic contract of the Model Context
Protocol.

---

## 2. Design Goals & Constraints

### Must Have (PoC)

- **NAT traversal**: The local MCP server initiates all connections outbound;
  no inbound ports required.
- **Semantic transparency**: The relay never inspects or transforms MCP
  payloads. From the agent's and server's perspectives, they exchange standard
  MCP JSON-RPC 2.0 messages.
- **Session multiplexing**: Multiple AI agents can connect to the same local
  MCP server simultaneously via distinct channels.
- **Authentication**: Token-based auth for both server registration and agent
  connection.
- **Automatic reconnection**: The tunnel client reconnects on transient
  failures.

### Should Have (Production)

- TLS (`wss://`) for all connections.
- Token rotation / JWT-based auth with expiry.
- Rate limiting and back-pressure.
- Observability (metrics, structured logging, tracing).
- Horizontal relay scaling (stateless relay + Redis/NATS for state).

### Out of Scope (PoC)

- End-to-end encryption (payload-level).
- Multi-relay federation.
- OAuth2 / OIDC integration.
- Admin dashboard / management API.

---

## 3. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLOUD  (Public)                            │
│                                                                     │
│  ┌──────────────┐         ┌─────────────────┐                       │
│  │  AI Agent 1  │────WS──▶│                 │                       │
│  └──────────────┘         │                 │                       │
│                           │  Relay Server   │                       │
│  ┌──────────────┐         │  (Rendezvous)   │                       │
│  │  AI Agent 2  │────WS──▶│                 │                       │
│  └──────────────┘         │                 │                       │
│                           └────────▲────────┘                       │
│                                    │                                │
└────────────────────────────────────│────────────────────────────────┘
                                     │  outbound WS
                        ┌────────────┘  (NAT-friendly)
                        │
┌───────────────────────│─────────────────────────────────────────────┐
│                LOCAL  │ (Behind NAT / Firewall)                     │
│                       │                                             │
│              ┌────────┴─────────┐                                   │
│              │  Tunnel Client   │                                   │
│              │  ┌─────────────┐ │                                   │
│              │  │ MCP Server  │ │  local files, DBs, CLIs, etc.     │
│              │  └─────────────┘ │                                   │
│              └──────────────────┘                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key insight**: The tunnel client (local) makes the **outbound** WebSocket
connection to the relay (cloud). This traverses NAT/firewall because outbound
connections are almost universally permitted. Once established, the WebSocket
is **bidirectional**, allowing the relay to push agent requests down to the
tunnel and receive responses back.

---

## 4. Component Architecture

### 4.1 Relay Server

**Role**: Cloud-hosted rendezvous point. Accepts and manages two classes of
WebSocket connections.

```
RelayServer
├── _servers: dict[server_id → RegisteredServer]
│   └── RegisteredServer
│       ├── server_id: str
│       ├── ws: WebSocket (tunnel connection)
│       └── agent_channels: dict[channel_id → WebSocket]
├── _agent_to_server: dict[channel_id → server_id]
├── handle_connection(ws)     # entry point
├── _handle_server(ws, env)   # server registration + message loop
├── _handle_agent(ws, env)    # agent connection + message loop
├── _route_from_server(...)   # server → agent routing
└── _route_from_agent(...)    # agent → server routing
```

**Responsibilities:**

1. Accept `register` handshakes from tunnel clients; validate token; store
   the WebSocket mapping.
2. Accept `connect` handshakes from agents; validate token; verify the
   requested `server_id` exists; assign a `channel_id`.
3. Route `mcp_request` frames from agents to the correct server tunnel
   (stamping the `channel_id`).
4. Route `mcp_response` frames from servers to the correct agent WebSocket
   (by `channel_id`).
5. Handle disconnections gracefully — notify counterparts.

### 4.2 Tunnel Client

**Role**: Runs alongside (or wraps) the local MCP server. Initiates the
outbound connection and bridges the tunnel to local MCP handling.

```
TunnelClient
├── relay_url: str
├── server_id: str
├── token: str
├── handler: McpHandler        # pluggable: (request) → response
├── run()                      # connect + register + message loop
├── _connect_and_serve()       # single connection attempt
├── _handle_frame(ws, frame)   # dispatch MCP request to handler
└── _heartbeat_loop(ws)        # keepalive
```

**McpHandler interface:**

```python
McpHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]
```

Any async function that accepts a JSON-RPC request dict and returns a JSON-RPC
response dict. The built-in `demo_mcp_handler` implements:

- `initialize` — capability negotiation
- `tools/list` — enumerate available tools
- `tools/call` — execute a tool (`echo`, `system_info`, `list_directory`,
  `current_time`)

### 4.3 Agent Client

**Role**: Standard MCP client that reaches the local server through the relay.

```
AgentClient
├── relay_url: str
├── server_id: str
├── token: str
├── connect()                  # handshake + start reader
├── send_request(method, params) → response
├── close()
└── _read_loop()               # demux responses by JSON-RPC id
```

The agent sends standard MCP JSON-RPC requests. The only addition to a
"normal" MCP client is the initial `connect` envelope and the envelope
wrapping around each request/response.

---

## 5. Wire Protocol

### 5.1 Envelope Format

Every WebSocket text frame carries a JSON envelope:

```json
{
  "type": "<EnvelopeType>",
  "server_id": "<string>",
  "channel_id": "<uuid | null>",
  "token": "<string | null>",
  "payload": { "jsonrpc": "2.0", ... } | null,
  "error_message": "<string | null>"
}
```

### 5.2 Envelope Types

| Type | Direction | Purpose |
|---|---|---|
| `register` | Tunnel → Relay | Server registration handshake |
| `registered` | Relay → Tunnel | Registration acknowledgement |
| `connect` | Agent → Relay | Agent connection request |
| `connected` | Relay → Agent | Connection ack with `channel_id` |
| `mcp_request` | Agent → Relay → Tunnel | MCP JSON-RPC request |
| `mcp_response` | Tunnel → Relay → Agent | MCP JSON-RPC response |
| `mcp_notification` | Either direction | MCP JSON-RPC notification |
| `error` | Any → Any | Error signaling |
| `heartbeat` | Tunnel → Relay | Keepalive ping |
| `heartbeat_ack` | Relay → Tunnel | Keepalive pong |
| `disconnect` | Any | Graceful channel teardown |
| `disconnected` | Relay → Tunnel/Agent | Channel gone notification |

### 5.3 Payload Transparency

The `payload` field contains a **verbatim MCP JSON-RPC 2.0 message**. The
relay MUST NOT inspect, modify, or validate its contents. This ensures:

- Forward compatibility with future MCP protocol versions.
- Zero coupling between the tunnel layer and the MCP semantic layer.
- The ability to tunnel any JSON-RPC protocol, not just MCP.

---

## 6. Connection Lifecycle

### 6.1 Server Registration

```
Tunnel Client                         Relay Server
    │                                      │
    │──── WS connect ────────────────────▶│
    │                                      │
    │──── register(server_id, token) ────▶│
    │                                      │ validate token
    │                                      │ store server mapping
    │◀──── registered(server_id) ─────────│
    │                                      │
    │  ◀═══ persistent tunnel ═══▶        │
```

### 6.2 Agent Connection

```
Agent Client                          Relay Server
    │                                      │
    │──── WS connect ────────────────────▶│
    │                                      │
    │──── connect(server_id, token) ─────▶│
    │                                      │ validate token
    │                                      │ verify server exists
    │                                      │ assign channel_id
    │◀──── connected(server_id, ch_id) ──│
    │                                      │
    │  ◀═══ session channel ═══▶          │
```

### 6.3 MCP Request/Response

```
Agent              Relay              Tunnel             Local MCP
  │                  │                  │                    │
  │─ mcp_request ──▶│                  │                    │
  │  (ch_id, payload)│                  │                    │
  │                  │─ mcp_request ──▶│                    │
  │                  │  (ch_id, payload)│                    │
  │                  │                  │── handler(req) ──▶│
  │                  │                  │                    │
  │                  │                  │◀── response ──────│
  │                  │◀─ mcp_response ─│                    │
  │                  │  (ch_id, payload)│                    │
  │◀─ mcp_response ─│                  │                    │
  │  (ch_id, payload)│                  │                    │
```

---

## 7. Multiplexing Model

The relay supports **N agents → 1 server tunnel** multiplexing:

```
Agent A (ch_id=aaa) ──┐
                      ├──▶ Relay ══════▶ Tunnel (server_id=S1)
Agent B (ch_id=bbb) ──┘
```

**Demultiplexing** is achieved via the `channel_id` field:

1. When the relay forwards a request to the tunnel, it stamps the
   `channel_id`.
2. When the tunnel sends a response, it includes the same `channel_id`.
3. The relay uses `channel_id` to look up the correct agent WebSocket.

This design means the tunnel client sees requests tagged with channel IDs
but doesn't need to maintain per-agent state — the MCP handler is stateless
per request (for the PoC). A production implementation could maintain
per-channel session state for features like MCP resource subscriptions.

---

## 8. Security Model

### 8.1 Authentication (PoC)

The PoC uses **pre-shared tokens**:

- `server_token`: Presented by tunnel clients during `register`.
- `agent_token`: Presented by AI agents during `connect`.

Both are validated by the relay. Mismatched tokens result in an `error`
envelope and immediate WebSocket closure.

### 8.2 Production Recommendations

| Layer | Mechanism |
|---|---|
| Transport | TLS (`wss://`) — mandatory for production |
| Server auth | JWT with short TTL; relay validates signature + claims |
| Agent auth | JWT or API key; relay validates and extracts `allowed_servers` claim |
| Authorization | Per-server ACL: which agent identities may connect to which server IDs |
| Payload encryption | Optional E2E encryption (relay cannot read payloads) |
| Rate limiting | Per-connection and per-server-id rate limits on the relay |

### 8.3 Threat Model

| Threat | Mitigation |
|---|---|
| Unauthorized server registration | Token validation; unique server_id enforcement |
| Unauthorized agent access | Token validation; server ACLs |
| Replay attacks | JWT expiry + nonce (production) |
| Relay compromise | E2E encryption of payloads (production) |
| DoS on relay | Rate limiting, connection limits, IP allowlisting |
| Tunnel hijacking | TLS + mutual auth (mTLS for high-security) |

---

## 9. Failure Modes & Resilience

### 9.1 Tunnel Disconnection

- The tunnel client implements **automatic reconnection** with a 3-second
  backoff.
- On server tunnel loss, the relay sends `disconnected` to all agents on
  that server's channels.
- Agents receive a `ConnectionError` for any pending requests.

### 9.2 Agent Disconnection

- The relay removes the channel from the server's `agent_channels` map.
- The relay sends `disconnected` to the tunnel so it can clean up any
  per-channel state.

### 9.3 Relay Restart

- All connections are lost. Both tunnel clients and agents must reconnect.
- The tunnel client's reconnection loop handles this transparently.
- Agents must re-establish their sessions (re-initialize MCP).

### 9.4 Heartbeats

- The tunnel client sends periodic `heartbeat` frames (default: 30s).
- The relay responds with `heartbeat_ack`.
- If no heartbeat is received within 2× the interval, the relay may
  consider the tunnel stale and close it (not implemented in PoC).

---

## 10. Sequence Diagrams

### Full Session Lifecycle

```
┌────────┐     ┌───────┐     ┌────────┐     ┌───────────┐
│ Agent  │     │ Relay │     │ Tunnel │     │ MCP Server│
└───┬────┘     └───┬───┘     └───┬────┘     └─────┬─────┘
    │              │             │                 │
    │              │  ①  WS connect (outbound)     │
    │              │◀────────────│                 │
    │              │             │                 │
    │              │  ②  register(sid, token)      │
    │              │◀────────────│                 │
    │              │             │                 │
    │              │  ③  registered(sid)           │
    │              │────────────▶│                 │
    │              │             │                 │
    │  ④  WS connect            │                 │
    │─────────────▶│             │                 │
    │              │             │                 │
    │  ⑤  connect(sid, token)   │                 │
    │─────────────▶│             │                 │
    │              │             │                 │
    │  ⑥  connected(sid, ch_id) │                 │
    │◀─────────────│             │                 │
    │              │             │                 │
    │  ⑦  mcp_request(initialize)                 │
    │─────────────▶│────────────▶│────────────────▶│
    │              │             │                 │
    │  ⑧  mcp_response(serverInfo)                │
    │◀─────────────│◀────────────│◀────────────────│
    │              │             │                 │
    │  ⑨  mcp_request(tools/call)                 │
    │─────────────▶│────────────▶│────────────────▶│
    │              │             │                 │
    │  ⑩  mcp_response(result)  │                 │
    │◀─────────────│◀────────────│◀────────────────│
    │              │             │                 │
```

---

## 11. Production Considerations

### 11.1 Horizontal Scaling

The PoC relay is a single-process, in-memory router. For production:

```
                    ┌── Relay Pod A ──┐
LB / Ingress ──────┼── Relay Pod B ──┼──── Redis/NATS (shared state)
                    └── Relay Pod C ──┘
```

- Server registrations and channel mappings stored in Redis.
- Relay pods are stateless; any pod can route any message by looking up
  the target WebSocket via shared state.
- Sticky sessions (by `server_id` for tunnels, `channel_id` for agents)
  reduce cross-pod hops.

### 11.2 Observability

| Signal | Implementation |
|---|---|
| Metrics | Prometheus: connections, messages/sec, latency histograms |
| Logging | Structured JSON logs with `server_id`, `channel_id`, `method` |
| Tracing | OpenTelemetry spans: agent→relay→tunnel→handler round-trip |
| Health | `/healthz` endpoint on relay; tunnel heartbeat monitoring |

### 11.3 Transport Alternatives

While the PoC uses WebSocket, production deployments could consider:

| Transport | Pros | Cons |
|---|---|---|
| WebSocket | Universal, NAT-friendly, HTTP-upgradable | No built-in multiplexing |
| HTTP/2 SSE + POST | Works through strict proxies | Half-duplex per stream |
| gRPC streaming | Strong typing, built-in multiplexing | Requires HTTP/2 |
| QUIC | UDP-based, 0-RTT, multiplexed | Emerging support |

### 11.4 Configuration Management

Production deployments should support:

- **Environment variables** for all config (relay URL, tokens, server ID).
- **Config file** (TOML/YAML) for complex setups.
- **Service discovery** for relay endpoints (DNS SRV, Consul, etc.).
- **Graceful shutdown** with drain periods for in-flight requests.

---

## 12. PoC Scope & Limitations

### What the PoC Demonstrates

- Complete NAT-traversal tunnel: local server → cloud relay ← cloud agent.
- MCP semantic transparency: `initialize`, `tools/list`, `tools/call` all
  work through the tunnel with zero modification.
- Agent session multiplexing: multiple agents share one tunnel.
- Token-based authentication for both server and agent roles.
- Automatic reconnection on the tunnel client.
- Heartbeat keepalive mechanism.
- 23 passing tests covering protocol, E2E flows, auth failures, and
  multi-agent scenarios.

### What the PoC Does NOT Cover

- TLS / encrypted transport (uses `ws://` not `wss://`).
- JWT / OAuth authentication.
- Resource subscriptions (`resources/subscribe`).
- Prompt listing (`prompts/list`, `prompts/get`).
- Server-initiated notifications.
- Horizontal relay scaling.
- Production deployment manifests (Docker, K8s).
- Load testing / benchmarking.

### Extending the PoC

To add a new local MCP tool:

1. Add the tool schema to `DEMO_TOOLS` in `tunnel/client.py`.
2. Add the handler case in `_dispatch_tool()`.
3. Restart the tunnel client.

To replace the demo handler with a real MCP server:

```python
from reverse_mcp.tunnel.client import TunnelClient

async def my_handler(request: dict) -> dict:
    # Your real MCP server logic here
    ...

client = TunnelClient(
    relay_url="wss://relay.example.com",
    server_id="my-server",
    token="...",
    handler=my_handler,
)
await client.run()
```
