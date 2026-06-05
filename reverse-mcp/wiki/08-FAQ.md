# FAQ

## General

### Q: What is Reverse MCP?

**A:** Reverse MCP is an architecture that lets cloud-hosted AI agents access
MCP servers running on local machines behind NAT/firewalls. It works by having
the local server connect *outbound* to a cloud relay, through which the agent
sends standard MCP requests.

### Q: Does this change the MCP protocol?

**A:** No. The MCP JSON-RPC 2.0 messages are carried verbatim inside tunnel
envelopes. From the MCP handler's perspective, it receives standard MCP
requests and sends standard MCP responses. The tunnel is transparent at the
MCP semantic layer.

### Q: Why not just use ngrok / Cloudflare Tunnel?

**A:** You absolutely can, and for some use cases that's the right choice.
Reverse MCP is purpose-built for the MCP use case with several advantages:
- No third-party dependency or account required.
- Built-in session multiplexing (multiple agents, one tunnel).
- MCP-aware envelope format (vs generic TCP/HTTP tunneling).
- Self-hosted relay gives you full control over data flow.
- Lower overhead (direct WebSocket vs HTTP tunneling).

### Q: Can multiple agents connect to the same local server?

**A:** Yes. The relay assigns a unique `channel_id` to each agent session.
All sessions share the same tunnel WebSocket. The tunnel client demultiplexes
by `channel_id`. The E2E tests verify this (`TestMultipleAgents`).

---

## Technical

### Q: What happens if the tunnel connection drops?

**A:** The tunnel client automatically reconnects after a 3-second delay.
During the reconnection window:
- Agents with active sessions receive a `disconnected` notification.
- Pending requests fail with a `ConnectionError`.
- Once the tunnel re-registers, new agent connections work normally.

### Q: What transport does the tunnel use?

**A:** WebSocket (RFC 6455). Chosen because it:
- Traverses NAT (it's an outbound HTTP upgrade).
- Is bidirectional (unlike SSE which is server-push only).
- Works through corporate proxies (HTTP-based).
- Has native TLS support (`wss://`).
- Is widely supported in every language/platform.

### Q: How does multiplexing work?

**A:** Each agent connection gets a unique `channel_id` (UUID). Every frame
includes this ID so the relay and tunnel can route messages to the correct
agent session. This is simpler than HTTP/2 stream multiplexing but effective
for the MCP use case.

### Q: What's the latency overhead?

**A:** The PoC adds one relay hop (agent → relay → tunnel). In practice this
means:
- **Same datacenter**: ~1-2ms additional latency per hop.
- **Cross-region**: Dominated by network RTT, not protocol overhead.
- **Local demo**: Negligible (loopback).

The envelope JSON parsing adds microseconds per message.

### Q: Can I use this with an existing MCP SDK?

**A:** Yes. The tunnel client's `McpHandler` is a simple async function
`(request: dict) → response: dict`. You can wire it to any MCP server
implementation. See the [Extending guide](06-Extending-the-PoC.md) for
examples including wrapping stdio-based MCP servers.

---

## Deployment

### Q: How do I deploy the relay server?

**A:** The relay is a single Python process. For production:

1. **Standalone**: `uv run rmcp-relay --host 0.0.0.0 --port 9800`
2. **Docker**: Create a Dockerfile with `uv sync && uv run rmcp-relay`
3. **Kubernetes**: Deploy as a Deployment with a LoadBalancer Service
4. **Serverless**: Not recommended (WebSocket connections are long-lived)

### Q: Can I scale the relay horizontally?

**A:** The PoC relay is single-process with in-memory state. For horizontal
scaling, you'd need shared state (Redis/NATS) to track server registrations
and channel mappings across relay pods. See the
[Architecture doc](../ARCHITECTURE.md#111-horizontal-scaling) for details.

### Q: Is this production-ready?

**A:** This is a proof-of-concept. For production, you'd need to add:
- TLS (`wss://`)
- JWT authentication
- Rate limiting
- Proper error recovery
- Observability (metrics, logging, tracing)
- Horizontal scaling

The architecture and protocol are designed to support all of these — see
[ARCHITECTURE.md](../ARCHITECTURE.md#11-production-considerations).

---

## Development

### Q: How do I run the tests?

**A:** `uv run pytest tests/ -v` — runs 23 tests covering protocol
serialization, E2E flows, auth failures, and multi-agent scenarios.

### Q: How do I add a new tool?

**A:** Add the tool schema to `DEMO_TOOLS` and the handler logic to
`_dispatch_tool()` in `tunnel/client.py`. See
[Extending the PoC](06-Extending-the-PoC.md#adding-a-new-tool-to-the-demo-server).

### Q: Can I use this with languages other than Python?

**A:** Yes. The wire protocol is JSON over WebSocket — any language with a
WebSocket client library can implement a tunnel client or agent client.
The Python PoC serves as the reference implementation.
