# Getting Started

## Prerequisites

- **Python 3.12+**
- **[uv](https://docs.astral.sh/uv/)** — fast Python package manager

Install uv if you don't have it:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## Installation

```bash
# Clone the repo
git clone <repo-url>
cd reverse-mcp

# Install all dependencies (creates .venv automatically)
uv sync
```

---

## Option 1: Run the All-in-One Demo

The simplest way to see Reverse MCP in action:

```bash
uv run rmcp-demo
```

This starts all three components in a single process and runs through a
series of MCP tool calls through the tunnel:

```
============================================================
 Reverse MCP — End-to-End Demo
============================================================

[1/3] Starting relay server…
[2/3] Starting tunnel client (demo MCP server)…
[3/3] Agent connecting through relay…

  ✓ MCP initialized — server: reverse-mcp-demo v0.1.0
  ✓ Tools available: ['echo', 'system_info', 'list_directory', 'current_time']

  → tools/call  name='echo'  args={'text': 'Hello from the cloud agent!'}
    ← {"content": [{"type": "text", "text": "Hello from the cloud agent!"}]}

  → tools/call  name='system_info'  args={}
    ← {"content": [{"type": "text", "text": "platform: Linux-5.15..."}]}

  → tools/call  name='current_time'  args={}
    ← {"content": [{"type": "text", "text": "2026-06-05T09:53:08"}]}

  → tools/call  name='list_directory'  args={'path': '.'}
    ← {"content": [{"type": "text", "text": "pyproject.toml\nsrc\ntests\n..."}]}

============================================================
 Demo complete — all MCP tool calls traversed the reverse tunnel
============================================================
```

---

## Option 2: Run Components Separately

This simulates the real-world deployment where each component runs on a
different machine.

### Terminal 1 — Relay Server (the cloud)

```bash
uv run rmcp-relay \
  --host 0.0.0.0 \
  --port 9800 \
  --server-token my-server-secret \
  --agent-token my-agent-secret
```

Output:
```
2026-06-05 10:00:00 [rmcp.relay] INFO Relay listening on ws://0.0.0.0:9800
```

### Terminal 2 — Tunnel Client (the local machine)

```bash
uv run rmcp-tunnel \
  --relay ws://localhost:9800 \
  --server-id my-server \
  --token my-server-secret
```

Output:
```
2026-06-05 10:00:01 [rmcp.tunnel] INFO Registered as 'my-server' at ws://localhost:9800
```

### Terminal 3 — Agent Client (the cloud AI agent)

```bash
uv run rmcp-agent \
  --relay ws://localhost:9800 \
  --server-id my-server \
  --token my-agent-secret
```

Output:
```
✓ Connected to MCP server: reverse-mcp-demo v0.1.0
✓ Available tools: ['echo', 'system_info', 'list_directory', 'current_time']

tool>
```

Now type commands:

```
tool> echo {"text": "hello through the tunnel!"}
{
  "content": [
    {"type": "text", "text": "hello through the tunnel!"}
  ]
}

tool> system_info
{
  "content": [
    {"type": "text", "text": "platform: Linux-5.15...\npython: 3.12.8\nhostname: ..."}
  ]
}

tool> list_directory {"path": "/home"}
{
  "content": [
    {"type": "text", "text": "ubuntu"}
  ]
}

tool> quit
```

---

## CLI Reference

### `rmcp-relay`

| Flag | Default | Description |
|---|---|---|
| `--host` | `0.0.0.0` | Bind address |
| `--port` | `9800` | Bind port |
| `--server-token` | `server-secret` | Token for server registration |
| `--agent-token` | `agent-secret` | Token for agent connection |

### `rmcp-tunnel`

| Flag | Default | Description |
|---|---|---|
| `--relay` | `ws://localhost:9800` | Relay server URL |
| `--server-id` | `demo-server` | Server ID to register as |
| `--token` | `server-secret` | Server auth token |

### `rmcp-agent`

| Flag | Default | Description |
|---|---|---|
| `--relay` | `ws://localhost:9800` | Relay server URL |
| `--server-id` | `demo-server` | Target server to connect to |
| `--token` | `agent-secret` | Agent auth token |

---

## Running Tests

```bash
# All tests with verbose output
uv run pytest tests/ -v

# Just protocol tests
uv run pytest tests/test_protocol.py -v

# Just E2E integration tests
uv run pytest tests/test_e2e.py -v
```

Expected output: **23 tests, all passing.**

---

## Lint & Format

```bash
# Check for issues
uv run ruff check src/ tests/

# Check formatting
uv run ruff format --check src/ tests/

# Auto-fix lint + format
uv run ruff check --fix src/ tests/
uv run ruff format src/ tests/
```
