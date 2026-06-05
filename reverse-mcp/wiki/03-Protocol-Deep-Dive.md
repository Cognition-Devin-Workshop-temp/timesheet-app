# Protocol Deep Dive

## Layers

The Reverse MCP protocol operates at two layers:

```
┌─────────────────────────────────────┐
│  MCP Layer (JSON-RPC 2.0)          │  ← Semantic: tools, resources, prompts
│  Carried inside envelope.payload    │
├─────────────────────────────────────┤
│  Tunnel Layer (Envelope)           │  ← Transport: routing, auth, lifecycle
│  WebSocket text frames              │
├─────────────────────────────────────┤
│  WebSocket / TLS / TCP              │  ← Network
└─────────────────────────────────────┘
```

The **Tunnel Layer** handles connection management and routing. The **MCP
Layer** is carried as an opaque payload. The Relay only reads the Tunnel
Layer; it never touches the MCP Layer.

---

## Envelope Format

Every WebSocket text frame carries a JSON envelope:

```json
{
  "type": "mcp_request",
  "server_id": "my-server",
  "channel_id": "a1b2c3d4e5f6",
  "token": null,
  "payload": {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "id": 42,
    "params": {
      "name": "echo",
      "arguments": {"text": "hello"}
    }
  },
  "error_message": null
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `type` | `EnvelopeType` | Message classification (see below) |
| `server_id` | `string` | Identifies which MCP server this message relates to |
| `channel_id` | `string \| null` | Unique per-agent session ID for multiplexing |
| `token` | `string \| null` | Auth token (only in `register` / `connect`) |
| `payload` | `object \| null` | Verbatim MCP JSON-RPC 2.0 message |
| `error_message` | `string \| null` | Human-readable error detail |

---

## Envelope Types

### Lifecycle Messages

| Type | Direction | Fields Used | Purpose |
|---|---|---|---|
| `register` | Tunnel → Relay | `server_id`, `token` | Register a local MCP server |
| `registered` | Relay → Tunnel | `server_id` | Confirm registration |
| `connect` | Agent → Relay | `server_id`, `token` | Request access to a server |
| `connected` | Relay → Agent | `server_id`, `channel_id` | Confirm with session ID |
| `disconnect` | Any → Relay | `channel_id` | Graceful teardown |
| `disconnected` | Relay → Any | `channel_id` | Notify counterpart of teardown |

### MCP Traffic

| Type | Direction | Fields Used | Purpose |
|---|---|---|---|
| `mcp_request` | Agent → Relay → Tunnel | `channel_id`, `payload` | JSON-RPC request |
| `mcp_response` | Tunnel → Relay → Agent | `channel_id`, `payload` | JSON-RPC response |
| `mcp_notification` | Either direction | `channel_id`, `payload` | JSON-RPC notification |

### Control

| Type | Direction | Fields Used | Purpose |
|---|---|---|---|
| `heartbeat` | Tunnel → Relay | — | Keepalive ping |
| `heartbeat_ack` | Relay → Tunnel | — | Keepalive pong |
| `error` | Any → Any | `error_message` | Error signaling |

---

## MCP JSON-RPC Mapping

The `payload` field carries standard MCP JSON-RPC 2.0 messages. Here's how
common MCP operations map:

### Initialize

```json
// Request (Agent → Server via tunnel)
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1,
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {"name": "my-agent", "version": "1.0"},
    "capabilities": {}
  }
}

// Response (Server → Agent via tunnel)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {"name": "my-server", "version": "1.0"},
    "capabilities": {"tools": {"listChanged": false}}
  }
}
```

### Tools List

```json
// Request
{"jsonrpc": "2.0", "method": "tools/list", "id": 2}

// Response
{
  "jsonrpc": "2.0", "id": 2,
  "result": {
    "tools": [
      {
        "name": "echo",
        "description": "Echoes back the provided text",
        "inputSchema": {
          "type": "object",
          "properties": {"text": {"type": "string"}},
          "required": ["text"]
        }
      }
    ]
  }
}
```

### Tool Call

```json
// Request
{
  "jsonrpc": "2.0", "method": "tools/call", "id": 3,
  "params": {"name": "echo", "arguments": {"text": "hello"}}
}

// Response
{
  "jsonrpc": "2.0", "id": 3,
  "result": {
    "content": [{"type": "text", "text": "hello"}]
  }
}
```

---

## Message Flow Example

Here's a complete `tools/call` with envelope wrapping:

**Step 1: Agent sends to Relay**

```json
{
  "type": "mcp_request",
  "server_id": "demo-server",
  "channel_id": "abc123",
  "payload": {"jsonrpc": "2.0", "method": "tools/call", "id": 3,
              "params": {"name": "echo", "arguments": {"text": "hi"}}}
}
```

**Step 2: Relay forwards to Tunnel (unchanged)**

Same frame, forwarded over the server's tunnel WebSocket.

**Step 3: Tunnel extracts `payload`, passes to MCP handler**

The handler receives:
```json
{"jsonrpc": "2.0", "method": "tools/call", "id": 3,
 "params": {"name": "echo", "arguments": {"text": "hi"}}}
```

**Step 4: Tunnel wraps response and sends to Relay**

```json
{
  "type": "mcp_response",
  "server_id": "demo-server",
  "channel_id": "abc123",
  "payload": {"jsonrpc": "2.0", "id": 3,
              "result": {"content": [{"type": "text", "text": "hi"}]}}
}
```

**Step 5: Relay routes to Agent by `channel_id`**

Same frame, forwarded to the agent's WebSocket.
