"""End-to-end integration tests — relay + tunnel + agent in-process."""

import asyncio

import pytest

from reverse_mcp.agent.client import AgentClient
from reverse_mcp.relay.server import run_relay
from reverse_mcp.tunnel.client import TunnelClient, demo_mcp_handler

SERVER_TOKEN = "test-server-token"
AGENT_TOKEN = "test-agent-token"
SERVER_ID = "test-server"


@pytest.fixture
async def relay():
    server = await run_relay("127.0.0.1", 0, SERVER_TOKEN, AGENT_TOKEN)
    # Extract the randomly assigned port
    port = server.sockets[0].getsockname()[1]
    yield server, port
    server.close()
    await server.wait_closed()


@pytest.fixture
async def tunnel(relay):
    server, port = relay
    client = TunnelClient(
        relay_url=f"ws://127.0.0.1:{port}",
        server_id=SERVER_ID,
        token=SERVER_TOKEN,
        handler=demo_mcp_handler,
        heartbeat_interval=60.0,
    )
    task = asyncio.create_task(client.run())
    await asyncio.sleep(0.3)  # let registration complete
    yield client
    client.stop()
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


@pytest.fixture
async def agent(relay, tunnel):
    _, port = relay
    client = AgentClient(
        relay_url=f"ws://127.0.0.1:{port}",
        server_id=SERVER_ID,
        token=AGENT_TOKEN,
    )
    await client.connect()
    yield client
    await client.close()


class TestEndToEnd:
    async def test_initialize(self, agent: AgentClient) -> None:
        resp = await agent.send_request(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "clientInfo": {"name": "test-agent", "version": "0.1.0"},
                "capabilities": {},
            },
        )
        result = resp["result"]
        assert result["protocolVersion"] == "2024-11-05"
        assert result["serverInfo"]["name"] == "reverse-mcp-demo"

    async def test_tools_list(self, agent: AgentClient) -> None:
        resp = await agent.send_request("tools/list")
        tools = resp["result"]["tools"]
        names = [t["name"] for t in tools]
        assert "echo" in names
        assert "system_info" in names
        assert "list_directory" in names
        assert "current_time" in names

    async def test_tool_call_echo(self, agent: AgentClient) -> None:
        resp = await agent.send_request(
            "tools/call",
            {
                "name": "echo",
                "arguments": {"text": "hello tunnel"},
            },
        )
        content = resp["result"]["content"]
        assert content[0]["text"] == "hello tunnel"

    async def test_tool_call_system_info(self, agent: AgentClient) -> None:
        resp = await agent.send_request(
            "tools/call",
            {
                "name": "system_info",
                "arguments": {},
            },
        )
        text = resp["result"]["content"][0]["text"]
        assert "platform:" in text
        assert "python:" in text

    async def test_tool_call_current_time(self, agent: AgentClient) -> None:
        resp = await agent.send_request(
            "tools/call",
            {
                "name": "current_time",
                "arguments": {},
            },
        )
        text = resp["result"]["content"][0]["text"]
        assert "T" in text  # ISO format includes T

    async def test_tool_call_list_directory(self, agent: AgentClient) -> None:
        resp = await agent.send_request(
            "tools/call",
            {
                "name": "list_directory",
                "arguments": {"path": "."},
            },
        )
        text = resp["result"]["content"][0]["text"]
        assert "pyproject.toml" in text

    async def test_unknown_method(self, agent: AgentClient) -> None:
        resp = await agent.send_request("nonexistent/method")
        assert "error" in resp
        assert resp["error"]["code"] == -32601


class TestAuthFailures:
    async def test_bad_server_token(self, relay) -> None:
        _, port = relay
        client = TunnelClient(
            relay_url=f"ws://127.0.0.1:{port}",
            server_id="bad-server",
            token="wrong-token",
            handler=demo_mcp_handler,
        )
        with pytest.raises(RuntimeError, match="Registration failed"):
            await client._connect_and_serve()

    async def test_bad_agent_token(self, relay, tunnel) -> None:
        _, port = relay
        agent = AgentClient(
            relay_url=f"ws://127.0.0.1:{port}",
            server_id=SERVER_ID,
            token="wrong-token",
        )
        with pytest.raises(RuntimeError, match="Connect failed"):
            await agent.connect()

    async def test_agent_connect_nonexistent_server(self, relay) -> None:
        _, port = relay
        agent = AgentClient(
            relay_url=f"ws://127.0.0.1:{port}",
            server_id="ghost-server",
            token=AGENT_TOKEN,
        )
        with pytest.raises(RuntimeError, match="Connect failed"):
            await agent.connect()


class TestMultipleAgents:
    async def test_two_agents_same_server(self, relay, tunnel) -> None:
        _, port = relay
        agent1 = AgentClient(f"ws://127.0.0.1:{port}", SERVER_ID, AGENT_TOKEN)
        agent2 = AgentClient(f"ws://127.0.0.1:{port}", SERVER_ID, AGENT_TOKEN)
        await agent1.connect()
        await agent2.connect()

        try:
            resp1 = await agent1.send_request(
                "tools/call",
                {
                    "name": "echo",
                    "arguments": {"text": "from agent 1"},
                },
            )
            resp2 = await agent2.send_request(
                "tools/call",
                {
                    "name": "echo",
                    "arguments": {"text": "from agent 2"},
                },
            )
            assert resp1["result"]["content"][0]["text"] == "from agent 1"
            assert resp2["result"]["content"][0]["text"] == "from agent 2"
        finally:
            await agent1.close()
            await agent2.close()
