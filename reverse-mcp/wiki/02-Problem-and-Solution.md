# Problem & Solution

## The Standard MCP Model

In the standard Model Context Protocol setup, the AI Agent acts as a **client**
and connects directly to the MCP Server:

```
AI Agent ────────────▶ MCP Server
(client)               (known host:port)
```

This works when the MCP server has a **public IP** or is reachable from the
agent's network.

## Where It Breaks Down

Real-world developer workflows often look like this:

```
┌──────── CLOUD ────────┐     ┌────── LOCAL (NAT) ──────┐
│                       │     │                          │
│   AI Agent            │  ✘  │   MCP Server             │
│   (hosted LLM)        │─────│   (developer laptop)     │
│                       │     │   - local files           │
└───────────────────────┘     │   - local databases       │
                              │   - local CLI tools       │
                              │   - IDE state             │
                              └──────────────────────────┘

    ✘ = No route! Agent cannot reach the local server.
```

**Why?**

- The developer's laptop has a **private IP** behind NAT/firewall.
- There's **no inbound port forwarding** configured (and configuring it is
  often prohibited by corporate policy).
- The AI Agent in the cloud has **no way to initiate a TCP connection** to the
  local machine.

## Common Workarounds (and Their Problems)

| Approach | Problem |
|---|---|
| Port forwarding | Requires router access; security risk; not allowed in enterprises |
| VPN | Heavy setup; exposes entire network; not always available |
| ngrok / Cloudflare Tunnel | Third-party dependency; potential data exposure; cost |
| Deploy MCP server to cloud | Loses access to local resources (the whole point) |

## The Reverse MCP Solution

**Invert the connection direction:**

```
┌──────── CLOUD ────────────────────────────────────────┐
│                                                       │
│   AI Agent ──WS──▶ Relay Server ◀══WS══ Tunnel Client │
│                    (rendezvous)        │              │
└────────────────────────────────────────│──────────────┘
                                         │ outbound
                                         │ (NAT-friendly)
┌────────────────────────────────────────│──────────────┐
│   LOCAL (behind NAT)                   │              │
│                                        ▼              │
│                                  Tunnel Client        │
│                                  + MCP Server         │
│                                  (local resources)    │
└───────────────────────────────────────────────────────┘
```

### How it works:

1. The **local MCP server** (wrapped in a Tunnel Client) makes an **outbound
   WebSocket connection** to the cloud Relay. Outbound connections always
   traverse NAT.

2. The cloud **Relay Server** holds this tunnel open and registers the server
   by ID.

3. When an **AI Agent** wants to reach the local server, it connects to the
   **same Relay** and specifies the target server ID.

4. The Relay **brokers all MCP traffic** bidirectionally through the
   established tunnel.

### Result:

- **No inbound ports** needed on the local machine.
- **No VPN or third-party tunnels** required.
- The MCP protocol is **completely preserved** — the agent and server exchange
  standard JSON-RPC 2.0 messages as if directly connected.
- **Multiple agents** can share the same tunnel simultaneously.
