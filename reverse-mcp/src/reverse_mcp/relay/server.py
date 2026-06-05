"""Rendezvous / Relay Server.

Accepts two classes of WebSocket connections:

1. **MCP Server tunnels** — local MCP servers behind NAT dial out to the
   relay and ``register`` with a ``server_id`` + ``token``.  The relay keeps
   the WebSocket open as a persistent tunnel.

2. **AI Agent sessions** — cloud-hosted agents ``connect`` to the relay
   requesting a particular ``server_id``.  The relay assigns a unique
   ``channel_id`` and begins forwarding MCP traffic bi-directionally.

Multiplexing: many agents may share the same server tunnel.  Each agent
session is identified by a ``channel_id`` inside the envelope so the
tunnel client can demux and route to the correct local handler context.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import uuid
from dataclasses import dataclass, field

import websockets
from websockets.asyncio.server import Server, ServerConnection

from reverse_mcp.protocol import (
    Envelope,
    EnvelopeType,
    make_connected,
    make_disconnected,
    make_error,
    make_heartbeat_ack,
    make_registered,
)

logger = logging.getLogger("rmcp.relay")


@dataclass
class RegisteredServer:
    server_id: str
    ws: ServerConnection
    agent_channels: dict[str, ServerConnection] = field(default_factory=dict)


class RelayServer:
    """Core relay logic — stateful registry of servers and agents."""

    def __init__(self, server_token: str, agent_token: str) -> None:
        self._server_token = server_token
        self._agent_token = agent_token
        self._servers: dict[str, RegisteredServer] = {}
        self._agent_to_server: dict[str, str] = {}

    async def handle_connection(self, ws: ServerConnection) -> None:
        """Entry-point handler for every new WebSocket connection."""
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=10.0)
            assert isinstance(raw, str)
            env = Envelope.from_json(raw)
        except Exception:
            logger.warning("Bad handshake frame — closing")
            await ws.close(1008, "Invalid handshake")
            return

        if env.type == EnvelopeType.REGISTER:
            await self._handle_server(ws, env)
        elif env.type == EnvelopeType.CONNECT:
            await self._handle_agent(ws, env)
        else:
            await ws.send(make_error("Expected register or connect").to_json())
            await ws.close(1008, "Bad handshake type")

    # ------------------------------------------------------------------
    # Server-side tunnel
    # ------------------------------------------------------------------

    async def _handle_server(self, ws: ServerConnection, env: Envelope) -> None:
        sid = env.server_id
        if env.token != self._server_token:
            await ws.send(make_error("Authentication failed", sid).to_json())
            await ws.close(1008, "Auth failed")
            return

        if sid in self._servers:
            await ws.send(make_error(f"Server '{sid}' already registered", sid).to_json())
            await ws.close(1008, "Duplicate server_id")
            return

        reg = RegisteredServer(server_id=sid, ws=ws)
        self._servers[sid] = reg
        logger.info("Server registered: %s", sid)
        await ws.send(make_registered(sid).to_json())

        try:
            async for raw_msg in ws:
                assert isinstance(raw_msg, str)
                frame = Envelope.from_json(raw_msg)
                await self._route_from_server(reg, frame)
        except websockets.ConnectionClosed:
            logger.info("Server tunnel closed: %s", sid)
        finally:
            # Notify all agents connected to this server
            for ch_id, agent_ws in list(reg.agent_channels.items()):
                try:
                    await agent_ws.send(make_disconnected(ch_id).to_json())
                except Exception:
                    pass
                self._agent_to_server.pop(ch_id, None)
            self._servers.pop(sid, None)
            logger.info("Server deregistered: %s", sid)

    async def _route_from_server(self, reg: RegisteredServer, frame: Envelope) -> None:
        """Route a frame coming from a server tunnel to the correct agent."""
        if frame.type == EnvelopeType.HEARTBEAT:
            await reg.ws.send(make_heartbeat_ack().to_json())
            return

        if frame.channel_id and frame.channel_id in reg.agent_channels:
            agent_ws = reg.agent_channels[frame.channel_id]
            try:
                await agent_ws.send(frame.to_json())
            except websockets.ConnectionClosed:
                logger.warning("Agent channel %s gone — cleaning up", frame.channel_id)
                reg.agent_channels.pop(frame.channel_id, None)
                self._agent_to_server.pop(frame.channel_id, None)
        else:
            logger.warning("No agent for channel %s — dropping frame", frame.channel_id)

    # ------------------------------------------------------------------
    # Agent-side connections
    # ------------------------------------------------------------------

    async def _handle_agent(self, ws: ServerConnection, env: Envelope) -> None:
        sid = env.server_id
        if env.token != self._agent_token:
            await ws.send(make_error("Authentication failed", sid).to_json())
            await ws.close(1008, "Auth failed")
            return

        if sid not in self._servers:
            await ws.send(make_error(f"Server '{sid}' not found", sid).to_json())
            await ws.close(1008, "Server not found")
            return

        channel_id = uuid.uuid4().hex
        reg = self._servers[sid]
        reg.agent_channels[channel_id] = ws
        self._agent_to_server[channel_id] = sid
        logger.info("Agent connected to '%s' via channel %s", sid, channel_id)
        await ws.send(make_connected(sid, channel_id).to_json())

        try:
            async for raw_msg in ws:
                assert isinstance(raw_msg, str)
                frame = Envelope.from_json(raw_msg)
                await self._route_from_agent(reg, frame, channel_id)
        except websockets.ConnectionClosed:
            logger.info("Agent channel %s disconnected", channel_id)
        finally:
            reg.agent_channels.pop(channel_id, None)
            self._agent_to_server.pop(channel_id, None)
            # Inform the tunnel server about the disconnection
            try:
                await reg.ws.send(make_disconnected(channel_id).to_json())
            except Exception:
                pass

    async def _route_from_agent(
        self, reg: RegisteredServer, frame: Envelope, channel_id: str
    ) -> None:
        """Route a frame from an agent to the server tunnel."""
        if frame.type == EnvelopeType.HEARTBEAT:
            # Agent heartbeats are answered directly by the relay
            await reg.agent_channels[channel_id].send(make_heartbeat_ack().to_json())
            return

        # Stamp the channel_id so the tunnel client can demux
        frame.channel_id = channel_id
        frame.server_id = reg.server_id
        try:
            await reg.ws.send(frame.to_json())
        except websockets.ConnectionClosed:
            agent_ws = reg.agent_channels.get(channel_id)
            if agent_ws:
                await agent_ws.send(
                    make_error("Server tunnel lost", reg.server_id, channel_id).to_json()
                )


async def run_relay(host: str, port: int, server_token: str, agent_token: str) -> Server:
    relay = RelayServer(server_token=server_token, agent_token=agent_token)
    server = await websockets.serve(relay.handle_connection, host, port)
    logger.info("Relay listening on ws://%s:%d", host, port)
    return server


def main() -> None:
    parser = argparse.ArgumentParser(description="Reverse MCP Relay Server")
    parser.add_argument("--host", default="0.0.0.0", help="Bind address")
    parser.add_argument("--port", type=int, default=9800, help="Bind port")
    parser.add_argument("--server-token", default="server-secret", help="Server auth token")
    parser.add_argument("--agent-token", default="agent-secret", help="Agent auth token")
    args = parser.parse_args()

    fmt = "%(asctime)s [%(name)s] %(levelname)s %(message)s"
    logging.basicConfig(level=logging.INFO, format=fmt)

    async def _run() -> None:
        server = await run_relay(args.host, args.port, args.server_token, args.agent_token)
        await server.serve_forever()

    asyncio.run(_run())


if __name__ == "__main__":
    main()
