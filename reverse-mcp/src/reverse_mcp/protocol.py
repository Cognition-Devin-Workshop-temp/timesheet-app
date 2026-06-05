"""Shared protocol definitions for the Reverse MCP tunnel.

Defines the envelope format that wraps MCP JSON-RPC 2.0 messages as they
traverse the relay. The relay itself is semantically transparent — it never
inspects the ``payload``; it only reads the envelope fields to route frames
between registered MCP servers and connected AI agents.

Envelope wire format (JSON over WebSocket text frames):

    {
        "type": "register" | "registered" | "connect" | "connected"
              | "mcp_request" | "mcp_response" | "mcp_notification"
              | "error" | "heartbeat" | "heartbeat_ack",
        "server_id": "<string>",          # target / source server
        "channel_id": "<uuid | null>",    # per-agent session multiplexing
        "token": "<string | null>",       # auth (register / connect only)
        "payload": { ... } | null,        # MCP JSON-RPC body
        "error_message": "<string | null>" # human-readable error detail
    }
"""

from __future__ import annotations

import enum
from typing import Any

from pydantic import BaseModel


class EnvelopeType(str, enum.Enum):
    # Tunnel lifecycle
    REGISTER = "register"
    REGISTERED = "registered"
    CONNECT = "connect"
    CONNECTED = "connected"

    # MCP traffic
    MCP_REQUEST = "mcp_request"
    MCP_RESPONSE = "mcp_response"
    MCP_NOTIFICATION = "mcp_notification"

    # Control
    ERROR = "error"
    HEARTBEAT = "heartbeat"
    HEARTBEAT_ACK = "heartbeat_ack"

    # Disconnect
    DISCONNECT = "disconnect"
    DISCONNECTED = "disconnected"


class Envelope(BaseModel):
    """Wire-level frame exchanged over every WebSocket connection."""

    type: EnvelopeType
    server_id: str = ""
    channel_id: str | None = None
    token: str | None = None
    payload: dict[str, Any] | None = None
    error_message: str | None = None

    def to_json(self) -> str:
        return self.model_dump_json(exclude_none=True)

    @classmethod
    def from_json(cls, raw: str) -> Envelope:
        return cls.model_validate_json(raw)


# ---------------------------------------------------------------------------
# Convenience constructors
# ---------------------------------------------------------------------------


def make_register(server_id: str, token: str) -> Envelope:
    return Envelope(type=EnvelopeType.REGISTER, server_id=server_id, token=token)


def make_registered(server_id: str) -> Envelope:
    return Envelope(type=EnvelopeType.REGISTERED, server_id=server_id)


def make_connect(server_id: str, token: str) -> Envelope:
    return Envelope(type=EnvelopeType.CONNECT, server_id=server_id, token=token)


def make_connected(server_id: str, channel_id: str) -> Envelope:
    return Envelope(type=EnvelopeType.CONNECTED, server_id=server_id, channel_id=channel_id)


def make_mcp_request(channel_id: str, payload: dict[str, Any], server_id: str = "") -> Envelope:
    return Envelope(
        type=EnvelopeType.MCP_REQUEST,
        server_id=server_id,
        channel_id=channel_id,
        payload=payload,
    )


def make_mcp_response(channel_id: str, payload: dict[str, Any], server_id: str = "") -> Envelope:
    return Envelope(
        type=EnvelopeType.MCP_RESPONSE,
        server_id=server_id,
        channel_id=channel_id,
        payload=payload,
    )


def make_mcp_notification(
    channel_id: str, payload: dict[str, Any], server_id: str = ""
) -> Envelope:
    return Envelope(
        type=EnvelopeType.MCP_NOTIFICATION,
        server_id=server_id,
        channel_id=channel_id,
        payload=payload,
    )


def make_error(message: str, server_id: str = "", channel_id: str | None = None) -> Envelope:
    return Envelope(
        type=EnvelopeType.ERROR,
        server_id=server_id,
        channel_id=channel_id,
        error_message=message,
    )


def make_heartbeat() -> Envelope:
    return Envelope(type=EnvelopeType.HEARTBEAT)


def make_heartbeat_ack() -> Envelope:
    return Envelope(type=EnvelopeType.HEARTBEAT_ACK)


def make_disconnect(channel_id: str) -> Envelope:
    return Envelope(type=EnvelopeType.DISCONNECT, channel_id=channel_id)


def make_disconnected(channel_id: str) -> Envelope:
    return Envelope(type=EnvelopeType.DISCONNECTED, channel_id=channel_id)


# ---------------------------------------------------------------------------
# MCP JSON-RPC helpers (minimal, PoC-level)
# ---------------------------------------------------------------------------


def jsonrpc_request(method: str, id: int, params: dict[str, Any] | None = None) -> dict[str, Any]:
    msg: dict[str, Any] = {"jsonrpc": "2.0", "method": method, "id": id}
    if params is not None:
        msg["params"] = params
    return msg


def jsonrpc_response(id: int, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "result": result, "id": id}


def jsonrpc_error(id: int | None, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "error": {"code": code, "message": message}, "id": id}
