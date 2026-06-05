"""Tunnel Client — wraps a local MCP server and dials out to the relay.

The tunnel client:

1. Establishes an outbound WebSocket to the relay server.
2. Sends a ``register`` envelope with its ``server_id`` + auth token.
3. Listens for inbound ``mcp_request`` envelopes from agents (multiplexed
   by ``channel_id``).
4. Dispatches each request to the local MCP handler, collects the
   JSON-RPC response, and sends it back through the tunnel as an
   ``mcp_response`` envelope.

The local MCP handler is pluggable — callers supply an ``McpHandler``
callable that maps a JSON-RPC request dict to a JSON-RPC response dict.
A built-in demo handler (``demo_mcp_handler``) is included for testing.
"""

from __future__ import annotations

import argparse
import asyncio
import datetime
import logging
import os
import platform
from typing import Any, Awaitable, Callable

import websockets

from reverse_mcp.protocol import (
    Envelope,
    EnvelopeType,
    jsonrpc_error,
    jsonrpc_response,
    make_heartbeat,
    make_mcp_response,
    make_register,
)

logger = logging.getLogger("rmcp.tunnel")

McpHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


# ---------------------------------------------------------------------------
# Built-in demo MCP server
# ---------------------------------------------------------------------------

DEMO_TOOLS = [
    {
        "name": "echo",
        "description": "Echoes back the provided text",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string", "description": "Text to echo"}},
            "required": ["text"],
        },
    },
    {
        "name": "system_info",
        "description": "Returns information about the local system",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_directory",
        "description": "Lists files in a directory on the local machine",
        "inputSchema": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Directory path"}},
            "required": ["path"],
        },
    },
    {
        "name": "current_time",
        "description": "Returns the current local time",
        "inputSchema": {"type": "object", "properties": {}},
    },
]

SERVER_INFO = {
    "name": "reverse-mcp-demo",
    "version": "0.1.0",
}

CAPABILITIES = {
    "tools": {"listChanged": False},
}


async def demo_mcp_handler(request: dict[str, Any]) -> dict[str, Any]:
    """Minimal MCP server that handles initialize, tools/list, and tools/call."""
    method = request.get("method", "")
    req_id = request.get("id")
    params = request.get("params", {})

    if method == "initialize":
        return jsonrpc_response(
            req_id,
            {
                "protocolVersion": "2024-11-05",
                "serverInfo": SERVER_INFO,
                "capabilities": CAPABILITIES,
            },
        )

    if method == "notifications/initialized":
        return jsonrpc_response(req_id, None)

    if method == "tools/list":
        return jsonrpc_response(req_id, {"tools": DEMO_TOOLS})

    if method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})
        result = await _dispatch_tool(tool_name, tool_args)
        return jsonrpc_response(req_id, result)

    return jsonrpc_error(req_id, -32601, f"Method not found: {method}")


async def _dispatch_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    if name == "echo":
        text = args.get("text", "")
        return {"content": [{"type": "text", "text": text}]}

    if name == "system_info":
        info = {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "hostname": platform.node(),
            "cwd": os.getcwd(),
        }
        text = "\n".join(f"{k}: {v}" for k, v in info.items())
        return {"content": [{"type": "text", "text": text}]}

    if name == "list_directory":
        path = args.get("path", ".")
        try:
            entries = os.listdir(path)
            text = "\n".join(entries[:50])  # cap at 50 for PoC
            return {"content": [{"type": "text", "text": text}]}
        except OSError as exc:
            return {"content": [{"type": "text", "text": f"Error: {exc}"}], "isError": True}

    if name == "current_time":
        now = datetime.datetime.now().isoformat()
        return {"content": [{"type": "text", "text": now}]}

    return {"content": [{"type": "text", "text": f"Unknown tool: {name}"}], "isError": True}


# ---------------------------------------------------------------------------
# Tunnel client core
# ---------------------------------------------------------------------------


class TunnelClient:
    def __init__(
        self,
        relay_url: str,
        server_id: str,
        token: str,
        handler: McpHandler,
        heartbeat_interval: float = 30.0,
    ) -> None:
        self.relay_url = relay_url
        self.server_id = server_id
        self.token = token
        self.handler = handler
        self.heartbeat_interval = heartbeat_interval
        self._ws: websockets.ClientConnection | None = None
        self._running = False

    async def run(self) -> None:
        """Connect to the relay and process messages until cancelled."""
        self._running = True
        while self._running:
            try:
                await self._connect_and_serve()
            except (websockets.ConnectionClosed, OSError) as exc:
                logger.warning("Connection lost (%s) — reconnecting in 3s…", exc)
                await asyncio.sleep(3.0)
            except asyncio.CancelledError:
                logger.info("Tunnel client shutting down")
                break

    async def _connect_and_serve(self) -> None:
        async with websockets.connect(self.relay_url) as ws:
            self._ws = ws
            # Register
            await ws.send(make_register(self.server_id, self.token).to_json())
            raw = await asyncio.wait_for(ws.recv(), timeout=10.0)
            assert isinstance(raw, str)
            ack = Envelope.from_json(raw)
            if ack.type == EnvelopeType.ERROR:
                raise RuntimeError(f"Registration failed: {ack.error_message}")
            if ack.type != EnvelopeType.REGISTERED:
                raise RuntimeError(f"Unexpected ack type: {ack.type}")

            logger.info("Registered as '%s' at %s", self.server_id, self.relay_url)

            # Run message loop and heartbeat concurrently
            heartbeat_task = asyncio.create_task(self._heartbeat_loop(ws))
            try:
                async for raw_msg in ws:
                    assert isinstance(raw_msg, str)
                    frame = Envelope.from_json(raw_msg)
                    asyncio.create_task(self._handle_frame(ws, frame))
            finally:
                heartbeat_task.cancel()
                try:
                    await heartbeat_task
                except asyncio.CancelledError:
                    pass

    async def _handle_frame(self, ws: websockets.ClientConnection, frame: Envelope) -> None:
        if frame.type == EnvelopeType.HEARTBEAT_ACK:
            return

        if frame.type == EnvelopeType.DISCONNECTED:
            logger.info("Agent channel %s disconnected", frame.channel_id)
            return

        if frame.type in (EnvelopeType.MCP_REQUEST, EnvelopeType.MCP_NOTIFICATION):
            if frame.payload is None:
                return
            try:
                response = await self.handler(frame.payload)
            except Exception as exc:
                logger.exception("Handler error for channel %s", frame.channel_id)
                response = jsonrpc_error(frame.payload.get("id"), -32603, f"Internal error: {exc}")
            reply = make_mcp_response(
                channel_id=frame.channel_id or "",
                payload=response,
                server_id=self.server_id,
            )
            await ws.send(reply.to_json())

    async def _heartbeat_loop(self, ws: websockets.ClientConnection) -> None:
        while True:
            await asyncio.sleep(self.heartbeat_interval)
            try:
                await ws.send(make_heartbeat().to_json())
            except websockets.ConnectionClosed:
                return

    def stop(self) -> None:
        self._running = False


def main() -> None:
    parser = argparse.ArgumentParser(description="Reverse MCP Tunnel Client")
    parser.add_argument("--relay", default="ws://localhost:9800", help="Relay server URL")
    parser.add_argument("--server-id", default="demo-server", help="Server ID to register")
    parser.add_argument("--token", default="server-secret", help="Server auth token")
    args = parser.parse_args()

    fmt = "%(asctime)s [%(name)s] %(levelname)s %(message)s"
    logging.basicConfig(level=logging.INFO, format=fmt)

    client = TunnelClient(
        relay_url=args.relay,
        server_id=args.server_id,
        token=args.token,
        handler=demo_mcp_handler,
    )
    asyncio.run(client.run())


if __name__ == "__main__":
    main()
