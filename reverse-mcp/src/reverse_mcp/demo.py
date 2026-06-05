"""End-to-end demo — spins up all three components in a single process.

Demonstrates the full Reverse MCP flow:
  1. Starts the relay server on localhost:9800
  2. Starts a tunnel client with a demo MCP server that registers as "demo-server"
  3. Runs an agent that connects through the relay and exercises MCP tools
"""

from __future__ import annotations

import asyncio
import json
import logging

from reverse_mcp.agent.client import AgentClient
from reverse_mcp.relay.server import run_relay
from reverse_mcp.tunnel.client import TunnelClient, demo_mcp_handler

logger = logging.getLogger("rmcp.demo")

SERVER_TOKEN = "server-secret"
AGENT_TOKEN = "agent-secret"
RELAY_HOST = "127.0.0.1"
RELAY_PORT = 9800
RELAY_URL = f"ws://{RELAY_HOST}:{RELAY_PORT}"
SERVER_ID = "demo-server"


async def run_demo() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    )

    # 1. Start relay
    print("=" * 60)
    print(" Reverse MCP — End-to-End Demo")
    print("=" * 60)
    print()

    print("[1/3] Starting relay server…")
    relay = await run_relay(RELAY_HOST, RELAY_PORT, SERVER_TOKEN, AGENT_TOKEN)

    # 2. Start tunnel client (runs in background)
    print("[2/3] Starting tunnel client (demo MCP server)…")
    tunnel = TunnelClient(
        relay_url=RELAY_URL,
        server_id=SERVER_ID,
        token=SERVER_TOKEN,
        handler=demo_mcp_handler,
    )
    tunnel_task = asyncio.create_task(tunnel.run())
    await asyncio.sleep(0.5)  # let it register

    # 3. Agent session
    print("[3/3] Agent connecting through relay…")
    print()
    agent = AgentClient(RELAY_URL, SERVER_ID, AGENT_TOKEN)
    await agent.connect()

    try:
        # Initialize
        init_resp = await agent.send_request(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "clientInfo": {"name": "rmcp-demo-agent", "version": "0.1.0"},
                "capabilities": {},
            },
        )
        server_info = init_resp.get("result", {}).get("serverInfo", {})
        print(
            f"  ✓ MCP initialized — server: {server_info.get('name')} v{server_info.get('version')}"
        )

        # List tools
        tools_resp = await agent.send_request("tools/list")
        tools = tools_resp.get("result", {}).get("tools", [])
        tool_names = [t["name"] for t in tools]
        print(f"  ✓ Tools available: {tool_names}")
        print()

        # Call each tool
        demos = [
            ("echo", {"text": "Hello from the cloud agent!"}),
            ("system_info", {}),
            ("current_time", {}),
            ("list_directory", {"path": "."}),
        ]

        for tool_name, tool_args in demos:
            print(f"  → tools/call  name={tool_name!r}  args={tool_args}")
            resp = await agent.send_request(
                "tools/call",
                {
                    "name": tool_name,
                    "arguments": tool_args,
                },
            )
            result = resp.get("result", resp.get("error", {}))
            print(f"    ← {json.dumps(result, indent=6)}")
            print()

        print("=" * 60)
        print(" Demo complete — all MCP tool calls traversed the reverse tunnel")
        print("=" * 60)

    finally:
        await agent.close()
        tunnel.stop()
        tunnel_task.cancel()
        try:
            await tunnel_task
        except asyncio.CancelledError:
            pass
        relay.close()
        await relay.wait_closed()


def main() -> None:
    asyncio.run(run_demo())


if __name__ == "__main__":
    main()
