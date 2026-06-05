"""Unit tests for protocol envelope serialization."""

from reverse_mcp.protocol import (
    Envelope,
    EnvelopeType,
    jsonrpc_error,
    jsonrpc_request,
    jsonrpc_response,
    make_connect,
    make_connected,
    make_error,
    make_heartbeat,
    make_heartbeat_ack,
    make_mcp_request,
    make_mcp_response,
    make_register,
    make_registered,
)


class TestEnvelopeSerialization:
    def test_round_trip(self) -> None:
        env = make_register("my-server", "tok123")
        raw = env.to_json()
        restored = Envelope.from_json(raw)
        assert restored.type == EnvelopeType.REGISTER
        assert restored.server_id == "my-server"
        assert restored.token == "tok123"

    def test_registered(self) -> None:
        env = make_registered("s1")
        assert env.type == EnvelopeType.REGISTERED
        assert env.server_id == "s1"

    def test_connect(self) -> None:
        env = make_connect("s1", "agent-tok")
        assert env.type == EnvelopeType.CONNECT
        assert env.token == "agent-tok"

    def test_connected(self) -> None:
        env = make_connected("s1", "ch-001")
        assert env.type == EnvelopeType.CONNECTED
        assert env.channel_id == "ch-001"

    def test_mcp_request_envelope(self) -> None:
        payload = jsonrpc_request("tools/list", 1)
        env = make_mcp_request("ch-001", payload, "s1")
        assert env.type == EnvelopeType.MCP_REQUEST
        assert env.payload is not None
        assert env.payload["method"] == "tools/list"

    def test_mcp_response_envelope(self) -> None:
        payload = jsonrpc_response(1, {"tools": []})
        env = make_mcp_response("ch-001", payload)
        assert env.payload is not None
        assert env.payload["result"] == {"tools": []}

    def test_error_envelope(self) -> None:
        env = make_error("oops", "s1", "ch-001")
        assert env.type == EnvelopeType.ERROR
        assert env.error_message == "oops"

    def test_heartbeat(self) -> None:
        hb = make_heartbeat()
        assert hb.type == EnvelopeType.HEARTBEAT
        ack = make_heartbeat_ack()
        assert ack.type == EnvelopeType.HEARTBEAT_ACK


class TestJsonRpcHelpers:
    def test_request(self) -> None:
        req = jsonrpc_request("tools/call", 42, {"name": "echo"})
        assert req["jsonrpc"] == "2.0"
        assert req["method"] == "tools/call"
        assert req["id"] == 42
        assert req["params"] == {"name": "echo"}

    def test_request_no_params(self) -> None:
        req = jsonrpc_request("tools/list", 1)
        assert "params" not in req

    def test_response(self) -> None:
        resp = jsonrpc_response(1, {"result": "ok"})
        assert resp["id"] == 1
        assert resp["result"] == {"result": "ok"}

    def test_error(self) -> None:
        err = jsonrpc_error(1, -32601, "Not found")
        assert err["error"]["code"] == -32601
        assert err["error"]["message"] == "Not found"
