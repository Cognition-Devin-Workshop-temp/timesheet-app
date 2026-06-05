# Reverse MCP Wiki

Welcome to the Reverse MCP documentation. This wiki explains the architecture,
protocol, and components of the Reverse MCP system — a NAT-traversal tunnel
that allows cloud-hosted AI agents to access local MCP servers behind
firewalls.

---

## Pages

| # | Page | Description |
|---|---|---|
| 1 | [Home](01-Home.md) | This page — overview and navigation |
| 2 | [Problem & Solution](02-Problem-and-Solution.md) | Why Reverse MCP exists |
| 3 | [Protocol Deep Dive](03-Protocol-Deep-Dive.md) | Wire format, envelope types, JSON-RPC mapping |
| 4 | [Component Guide](04-Component-Guide.md) | Relay, Tunnel Client, Agent Client internals |
| 5 | [Getting Started](05-Getting-Started.md) | Setup, running the demo, running components |
| 6 | [Extending the PoC](06-Extending-the-PoC.md) | Adding tools, custom handlers, production path |
| 7 | [Security & Threat Model](07-Security.md) | Auth, TLS, threat analysis |
| 8 | [FAQ](08-FAQ.md) | Common questions answered |

---

## Architecture at a Glance

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│  AI Agent   │──WS──▶│ Relay Server │◀──WS──│  Tunnel Client  │
│  (cloud)    │       │  (cloud)     │       │  + MCP Server   │
│             │       │              │       │  (local / NAT)  │
└─────────────┘       └──────────────┘       └─────────────────┘
```

1. The **Tunnel Client** (local) initiates an outbound WebSocket to the
   **Relay Server** (cloud). This traverses NAT because it's an outbound
   connection.

2. The **AI Agent** (cloud) connects to the same **Relay Server** and
   specifies which local server it wants to reach.

3. The Relay **brokers MCP JSON-RPC messages** bidirectionally through the
   tunnel. It never inspects the MCP payloads — it's a pure transport layer.

---

## Key Design Principles

- **Connection inversion**: The local server connects *out*, not the agent
  connecting *in*. NAT is traversed without port forwarding.

- **Semantic transparency**: MCP JSON-RPC 2.0 messages are tunneled verbatim.
  The relay is protocol-agnostic at the payload level.

- **Session multiplexing**: Multiple agents share a single tunnel via
  `channel_id`-tagged envelopes.

- **Pluggable MCP handler**: The tunnel client accepts any async function
  `(request) → response` as the MCP backend.
