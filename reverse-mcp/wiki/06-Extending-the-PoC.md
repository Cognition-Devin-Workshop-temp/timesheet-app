# Extending the PoC

This page covers how to build on top of the Reverse MCP PoC for your own
use cases.

---

## Adding a New Tool to the Demo Server

### Step 1: Define the Tool Schema

In `src/reverse_mcp/tunnel/client.py`, add an entry to `DEMO_TOOLS`:

```python
DEMO_TOOLS = [
    # ... existing tools ...
    {
        "name": "read_file",
        "description": "Reads the contents of a local file",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Absolute path to the file"
                }
            },
            "required": ["path"],
        },
    },
]
```

### Step 2: Implement the Handler

Add a case in the `_dispatch_tool()` function:

```python
async def _dispatch_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    # ... existing cases ...

    if name == "read_file":
        path = args.get("path", "")
        try:
            with open(path, "r") as f:
                content = f.read(10_000)  # cap at 10KB
            return {"content": [{"type": "text", "text": content}]}
        except OSError as exc:
            return {
                "content": [{"type": "text", "text": f"Error: {exc}"}],
                "isError": True,
            }
```

### Step 3: Test It

Restart the tunnel client and call from the agent:

```
tool> read_file {"path": "/etc/hostname"}
```

---

## Using a Custom MCP Handler

The tunnel client accepts any async function matching `McpHandler`:

```python
from typing import Any

async def my_handler(request: dict[str, Any]) -> dict[str, Any]:
    """Your custom MCP server implementation."""
    method = request.get("method", "")
    req_id = request.get("id")
    params = request.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {"name": "my-custom-server", "version": "1.0"},
                "capabilities": {"tools": {"listChanged": False}},
            },
        }

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": [
                # your tool definitions
            ]},
        }

    if method == "tools/call":
        # dispatch to your tools
        ...

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Unknown: {method}"},
    }
```

Then wire it up:

```python
from reverse_mcp.tunnel.client import TunnelClient

client = TunnelClient(
    relay_url="ws://relay.example.com:9800",
    server_id="my-custom-server",
    token="my-secret",
    handler=my_handler,
)

import asyncio
asyncio.run(client.run())
```

---

## Wrapping an Existing MCP Server

If you have an existing MCP server that speaks JSON-RPC over stdio, you can
create a bridge handler:

```python
import asyncio
import json

class StdioMcpBridge:
    def __init__(self, command: list[str]):
        self.command = command
        self.process: asyncio.subprocess.Process | None = None

    async def start(self):
        self.process = await asyncio.create_subprocess_exec(
            *self.command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
        )

    async def handle(self, request: dict) -> dict:
        assert self.process and self.process.stdin and self.process.stdout
        # Send request
        data = json.dumps(request) + "\n"
        self.process.stdin.write(data.encode())
        await self.process.stdin.drain()
        # Read response
        line = await self.process.stdout.readline()
        return json.loads(line)

# Usage:
bridge = StdioMcpBridge(["node", "my-mcp-server.js"])
await bridge.start()

client = TunnelClient(
    relay_url="ws://relay.example.com:9800",
    server_id="my-node-server",
    token="secret",
    handler=bridge.handle,
)
```

---

## Using the Agent Programmatically

```python
from reverse_mcp.agent.client import AgentClient

async def main():
    agent = AgentClient(
        relay_url="ws://relay.example.com:9800",
        server_id="my-server",
        token="agent-secret",
    )
    await agent.connect()

    # Initialize
    await agent.send_request("initialize", {
        "protocolVersion": "2024-11-05",
        "clientInfo": {"name": "my-app", "version": "1.0"},
        "capabilities": {},
    })

    # List tools
    tools_resp = await agent.send_request("tools/list")
    tools = tools_resp["result"]["tools"]

    # Call a tool
    result = await agent.send_request("tools/call", {
        "name": "echo",
        "arguments": {"text": "hello from my app"},
    })

    print(result["result"]["content"][0]["text"])
    await agent.close()
```

---

## Production Upgrade Path

### 1. Add TLS

Replace `ws://` with `wss://` and configure certificates:

```python
import ssl

ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ssl_ctx.load_cert_chain("cert.pem", "key.pem")

# In relay:
await websockets.serve(handler, host, port, ssl=ssl_ctx)

# In tunnel/agent:
async with websockets.connect(url, ssl=ssl_ctx) as ws:
    ...
```

### 2. Replace Token Auth with JWT

```python
import jwt

def validate_token(token: str, secret: str) -> dict:
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"])
        if claims["exp"] < time.time():
            raise ValueError("Token expired")
        return claims
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")
```

### 3. Add Persistent State (Redis)

Replace in-memory dicts with Redis for horizontal scaling:

```python
import redis.asyncio as redis

class RedisRegistry:
    def __init__(self, redis_url: str):
        self.r = redis.from_url(redis_url)

    async def register_server(self, server_id: str, relay_pod_id: str):
        await self.r.hset("servers", server_id, relay_pod_id)

    async def get_server_pod(self, server_id: str) -> str | None:
        return await self.r.hget("servers", server_id)
```

### 4. Add Observability

```python
from prometheus_client import Counter, Histogram

MESSAGES_TOTAL = Counter("rmcp_messages_total", "Total messages", ["type", "direction"])
LATENCY = Histogram("rmcp_request_latency_seconds", "Request latency")

# In routing:
MESSAGES_TOTAL.labels(type="mcp_request", direction="agent_to_server").inc()
with LATENCY.time():
    await route_request(...)
```
