"""AI Agent MCP Client — connects to the relay to reach a local MCP server.

From the agent's perspective the interaction is standard MCP over JSON-RPC
2.0.  The only difference from a direct connection is that it first sends
a ``connect`` envelope to the relay (specifying the target ``server_id``)
and then wraps every subsequent MCP message inside an ``mcp_request``
envelope.

Responses arrive as ``mcp_response`` envelopes whose ``payload`` is the
verbatim JSON-RPC response from the remote MCP server.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from typing import Any

import websockets

from reverse_mcp.protocol import (
    Envelope,
    EnvelopeType,
    jsonrpc_request,
    make_connect,
    make_mcp_request,
)

logger = logging.getLogger("rmcp.agent")


class AgentClient:
    """Async MCP client that reaches a local MCP server through the relay."""

    def __init__(self, relay_url: str, server_id: str, token: str) -> None:
        self.relay_url = relay_url
        self.server_id = server_id
        self.token = token
        self._ws: websockets.ClientConnection | None = None
        self._channel_id: str | None = None
        self._req_id = 0
        self._pending: dict[int, asyncio.Future[dict[str, Any]]] = {}
        self._reader_task: asyncio.Task[None] | None = None

    async def connect(self) -> None:
        self._ws = await websockets.connect(self.relay_url)
        await self._ws.send(make_connect(self.server_id, self.token).to_json())
        raw = await asyncio.wait_for(self._ws.recv(), timeout=10.0)
        assert isinstance(raw, str)
        ack = Envelope.from_json(raw)
        if ack.type == EnvelopeType.ERROR:
            raise RuntimeError(f"Connect failed: {ack.error_message}")
        if ack.type != EnvelopeType.CONNECTED:
            raise RuntimeError(f"Unexpected ack: {ack.type}")
        self._channel_id = ack.channel_id
        logger.info("Connected to '%s' via channel %s", self.server_id, self._channel_id)
        self._reader_task = asyncio.create_task(self._read_loop())

    async def close(self) -> None:
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
        if self._ws:
            await self._ws.close()

    async def send_request(
        self, method: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Send an MCP JSON-RPC request and await the response."""
        assert self._ws is not None and self._channel_id is not None
        self._req_id += 1
        rid = self._req_id

        payload = jsonrpc_request(method, rid, params)
        env = make_mcp_request(self._channel_id, payload, self.server_id)
        fut: asyncio.Future[dict[str, Any]] = asyncio.get_event_loop().create_future()
        self._pending[rid] = fut

        await self._ws.send(env.to_json())
        return await asyncio.wait_for(fut, timeout=30.0)

    async def _read_loop(self) -> None:
        assert self._ws is not None
        try:
            async for raw in self._ws:
                assert isinstance(raw, str)
                env = Envelope.from_json(raw)
                if env.type == EnvelopeType.MCP_RESPONSE and env.payload:
                    rid = env.payload.get("id")
                    if rid is not None and rid in self._pending:
                        self._pending.pop(rid).set_result(env.payload)
                elif env.type == EnvelopeType.ERROR:
                    logger.error("Relay error: %s", env.error_message)
                elif env.type == EnvelopeType.DISCONNECTED:
                    logger.warning("Server tunnel disconnected")
                    for fut in self._pending.values():
                        if not fut.done():
                            fut.set_exception(ConnectionError("Server tunnel lost"))
                    self._pending.clear()
                    break
        except websockets.ConnectionClosed:
            logger.info("Connection to relay closed")


# ---------------------------------------------------------------------------
# Interactive CLI agent
# ---------------------------------------------------------------------------


async def interactive_session(relay_url: str, server_id: str, token: str) -> None:
    agent = AgentClient(relay_url, server_id, token)
    await agent.connect()

    try:
        # Initialize
        resp = await agent.send_request(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "clientInfo": {"name": "rmcp-agent-cli", "version": "0.1.0"},
                "capabilities": {},
            },
        )
        server_info = resp.get("result", {}).get("serverInfo", {})
        print(
            f"\n✓ Connected to MCP server: {server_info.get('name', '?')}"
            f" v{server_info.get('version', '?')}"
        )

        # List tools
        tools_resp = await agent.send_request("tools/list")
        tools = tools_resp.get("result", {}).get("tools", [])
        print(f"✓ Available tools: {[t['name'] for t in tools]}\n")

        while True:
            line = await asyncio.get_event_loop().run_in_executor(
                None, lambda: input("tool> ").strip()
            )
            if not line or line in ("quit", "exit"):
                break

            parts = line.split(maxsplit=1)
            tool_name = parts[0]
            tool_args: dict[str, Any] = {}
            if len(parts) > 1:
                try:
                    tool_args = json.loads(parts[1])
                except json.JSONDecodeError:
                    tool_args = {"text": parts[1]}

            try:
                result = await agent.send_request(
                    "tools/call",
                    {
                        "name": tool_name,
                        "arguments": tool_args,
                    },
                )
                payload = result.get("result", result.get("error", {}))
                print(json.dumps(payload, indent=2))
            except Exception as exc:
                print(f"Error: {exc}")
    finally:
        await agent.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reverse MCP Agent Client")
    parser.add_argument("--relay", default="ws://localhost:9800", help="Relay server URL")
    parser.add_argument("--server-id", default="demo-server", help="Target server ID")
    parser.add_argument("--token", default="agent-secret", help="Agent auth token")
    args = parser.parse_args()

    fmt = "%(asctime)s [%(name)s] %(levelname)s %(message)s"
    logging.basicConfig(level=logging.INFO, format=fmt)
    asyncio.run(interactive_session(args.relay, args.server_id, args.token))


if __name__ == "__main__":
    main()
