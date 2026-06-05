# Component Guide

This page details the internal architecture of each of the three components.

---

## 1. Relay Server (`relay/server.py`)

### Purpose

The Relay is the **cloud-hosted rendezvous point**. It accepts WebSocket
connections from both tunnel clients (servers) and AI agents, and routes
MCP traffic between them.

### Class: `RelayServer`

```python
class RelayServer:
    _server_token: str              # expected token for server registration
    _agent_token: str               # expected token for agent connection
    _servers: dict[str, RegisteredServer]  # server_id → registration info
    _agent_to_server: dict[str, str]       # channel_id → server_id
```

### Connection Handling Flow

```
New WebSocket connection
    │
    ▼
Read first frame (10s timeout)
    │
    ├── type == "register"  →  _handle_server()
    │       │
    │       ├── Validate token
    │       ├── Check server_id uniqueness
    │       ├── Store in _servers
    │       ├── Send "registered" ack
    │       └── Enter message loop (route server → agent)
    │
    └── type == "connect"   →  _handle_agent()
            │
            ├── Validate token
            ├── Verify server_id exists
            ├── Assign channel_id (UUID)
            ├── Store in agent_channels
            ├── Send "connected" ack
            └── Enter message loop (route agent → server)
```

### Data Model: `RegisteredServer`

```python
@dataclass
class RegisteredServer:
    server_id: str
    ws: ServerConnection                        # tunnel WebSocket
    agent_channels: dict[str, ServerConnection]  # channel_id → agent WS
```

### Routing Logic

**Agent → Server:** The relay receives an `mcp_request` from an agent,
stamps the `channel_id`, and forwards it over the server's tunnel WebSocket.

**Server → Agent:** The relay receives an `mcp_response` from the tunnel,
reads the `channel_id`, looks up the agent's WebSocket, and forwards it.

### Cleanup

- **Server disconnects:** All agent channels are notified via `disconnected`;
  the server is removed from `_servers`.
- **Agent disconnects:** The channel is removed from `agent_channels`; the
  tunnel is notified via `disconnected`.

---

## 2. Tunnel Client (`tunnel/client.py`)

### Purpose

Runs on the **local machine** alongside (or wrapping) the MCP server.
Initiates the outbound WebSocket to the relay and bridges tunnel traffic
to the local MCP handler.

### Class: `TunnelClient`

```python
class TunnelClient:
    relay_url: str
    server_id: str
    token: str
    handler: McpHandler    # async (request) → response
    heartbeat_interval: float
```

### Lifecycle

```
TunnelClient.run()
    │
    ▼
_connect_and_serve()  ◀──── retry loop (3s backoff on failure)
    │
    ├── WebSocket connect to relay_url
    ├── Send "register" envelope
    ├── Await "registered" ack
    ├── Start heartbeat task (background)
    └── Enter message loop:
        │
        ├── mcp_request  → handler(payload) → mcp_response
        ├── heartbeat_ack → ignore
        └── disconnected  → log agent departure
```

### McpHandler Interface

```python
McpHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]
```

Any async function that:
- Receives a JSON-RPC 2.0 request dict
- Returns a JSON-RPC 2.0 response dict

This makes the tunnel client **completely decoupled** from the MCP server
implementation.

### Built-in Demo Handler

The `demo_mcp_handler` implements four tools:

| Tool | What It Does |
|---|---|
| `echo` | Returns the input text |
| `system_info` | Returns platform, Python version, hostname, cwd |
| `list_directory` | Lists files in a local directory |
| `current_time` | Returns current ISO-8601 timestamp |

### Reconnection

If the WebSocket connection is lost (network blip, relay restart), the
tunnel client automatically retries after a 3-second delay. This makes
the tunnel resilient to transient failures.

### Heartbeats

A background task sends `heartbeat` frames at a configurable interval
(default: 30s). The relay responds with `heartbeat_ack`. This keeps the
WebSocket alive through proxies and load balancers that may have idle
timeouts.

---

## 3. Agent Client (`agent/client.py`)

### Purpose

The **cloud-side MCP client** that connects to the relay and sends standard
MCP requests to a local server through the tunnel.

### Class: `AgentClient`

```python
class AgentClient:
    relay_url: str
    server_id: str      # which local server to reach
    token: str
    _channel_id: str    # assigned by relay on connect
    _pending: dict[int, Future]  # request_id → response future
```

### Lifecycle

```
agent.connect()
    │
    ├── WebSocket connect to relay_url
    ├── Send "connect" envelope (server_id, token)
    ├── Await "connected" ack (get channel_id)
    └── Start _read_loop (background)

agent.send_request(method, params)
    │
    ├── Create JSON-RPC request (auto-incrementing id)
    ├── Wrap in mcp_request envelope (channel_id)
    ├── Send over WebSocket
    ├── Create Future in _pending
    └── Await response (30s timeout)

_read_loop()
    │
    ├── mcp_response → resolve matching Future by id
    ├── error        → log
    └── disconnected → reject all pending Futures
```

### Request/Response Correlation

The agent uses JSON-RPC `id` fields for correlation:

1. Each `send_request()` assigns a unique integer `id`.
2. The id is stored in `_pending` as a key mapping to an `asyncio.Future`.
3. When `_read_loop` receives an `mcp_response`, it extracts the `id` from
   the payload and resolves the corresponding Future.

This allows multiple concurrent requests to be in-flight simultaneously.

### Interactive CLI

The `main()` entry point provides a simple REPL:

```
tool> echo {"text": "hello"}
tool> system_info
tool> quit
```

Arguments can be JSON objects or plain text (auto-wrapped as `{"text": ...}`).

---

## Component Interaction Diagram

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  Agent   │          │  Relay   │          │  Tunnel  │
│  Client  │          │  Server  │          │  Client  │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │                     │  ① register(sid)    │
     │                     │◀────────────────────│
     │                     │                     │
     │                     │  ② registered(sid)  │
     │                     │────────────────────▶│
     │                     │                     │
     │  ③ connect(sid)     │                     │
     │────────────────────▶│                     │
     │                     │                     │
     │  ④ connected(ch_id) │                     │
     │◀────────────────────│                     │
     │                     │                     │
     │  ⑤ mcp_request      │                     │
     │────────────────────▶│  ⑥ mcp_request      │
     │                     │────────────────────▶│
     │                     │                     │ ⑦ handler()
     │                     │  ⑧ mcp_response     │
     │  ⑨ mcp_response     │◀────────────────────│
     │◀────────────────────│                     │
     │                     │                     │
```
