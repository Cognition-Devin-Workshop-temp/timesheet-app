# Reverse MCP

**NAT-traversal tunnel for local MCP servers accessed by cloud AI agents.**

In standard MCP, the agent connects *to* the server. But when the MCP server
is behind NAT (developer laptop, on-prem host) and the agent is in the cloud,
there is no route in. Reverse MCP flips the connection: the local server dials
*out* to a cloud relay, and the agent connects to that same relay — the relay
brokers MCP traffic bidirectionally through the tunnel.

```
Cloud Agent ──WS──▶ Relay Server ◀══WS══ Tunnel Client (local MCP server)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design specification.

---

## Quick Start

Requires Python ≥ 3.12 and [uv](https://docs.astral.sh/uv/).

```bash
# Install dependencies
uv sync

# Run the end-to-end demo (relay + tunnel + agent in one process)
uv run rmcp-demo
```

### Run Components Separately

**Terminal 1 — Relay Server:**

```bash
uv run rmcp-relay --host 0.0.0.0 --port 9800 \
  --server-token my-server-secret \
  --agent-token my-agent-secret
```

**Terminal 2 — Tunnel Client (local MCP server):**

```bash
uv run rmcp-tunnel --relay ws://localhost:9800 \
  --server-id my-server \
  --token my-server-secret
```

**Terminal 3 — Agent Client (interactive CLI):**

```bash
uv run rmcp-agent --relay ws://localhost:9800 \
  --server-id my-server \
  --token my-agent-secret
```

Then type tool commands at the `tool>` prompt:

```
tool> echo {"text": "hello through the tunnel!"}
tool> system_info
tool> current_time
tool> list_directory {"path": "/tmp"}
```

---

## Available Demo Tools

| Tool | Description |
|---|---|
| `echo` | Echoes back the provided text |
| `system_info` | Returns local platform, Python version, hostname |
| `current_time` | Returns current ISO-8601 timestamp |
| `list_directory` | Lists files in a local directory |

---

## Project Structure

```
src/reverse_mcp/
├── protocol.py          # Envelope format, JSON-RPC helpers
├── relay/
│   └── server.py        # Rendezvous/relay server
├── tunnel/
│   └── client.py        # Tunnel client + demo MCP server
├── agent/
│   └── client.py        # Agent MCP client
└── demo.py              # All-in-one E2E demo

tests/
├── test_protocol.py     # Envelope serialization tests
└── test_e2e.py          # Integration tests (relay + tunnel + agent)
```

---

## Tests

```bash
uv run pytest tests/ -v
```

---

## Lint

```bash
uv run ruff check src/ tests/
uv run ruff format --check src/ tests/
```

---

## Architecture

The full architectural specification is in [ARCHITECTURE.md](ARCHITECTURE.md),
covering:

- Wire protocol (envelope format, message types)
- Connection lifecycle (registration, agent connect, request/response flow)
- Multiplexing model (N agents → 1 tunnel)
- Security model (PoC tokens + production recommendations)
- Failure modes & resilience (reconnection, heartbeats)
- Production considerations (horizontal scaling, observability, transport alternatives)

---

## License

MIT
