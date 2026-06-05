# Security & Threat Model

## Authentication in the PoC

The PoC uses **pre-shared tokens** — simple strings validated during the
handshake:

| Role | Token Config | When Validated |
|---|---|---|
| MCP Server (Tunnel) | `--server-token` / `--token` | During `register` handshake |
| AI Agent | `--agent-token` / `--token` | During `connect` handshake |

Both are checked by the Relay. A mismatch results in:
1. An `error` envelope sent to the client.
2. Immediate WebSocket closure with code `1008`.

---

## Connection Security Layers

```
┌──────────────────────────────────────────────────────┐
│  Layer 4: Payload Encryption (not in PoC)           │
│  E2E encryption so relay can't read MCP payloads     │
├──────────────────────────────────────────────────────┤
│  Layer 3: Authorization                              │
│  Which agents can access which servers (ACLs)        │
├──────────────────────────────────────────────────────┤
│  Layer 2: Authentication                             │
│  Token validation (PoC) / JWT+mTLS (production)      │
├──────────────────────────────────────────────────────┤
│  Layer 1: Transport Encryption                       │
│  TLS (wss://) — not in PoC, mandatory for production │
└──────────────────────────────────────────────────────┘
```

---

## Threat Model

### Threats & Mitigations

| # | Threat | Impact | PoC Mitigation | Production Mitigation |
|---|---|---|---|---|
| T1 | Unauthorized server registration | Attacker registers a malicious server with a legitimate server_id | Token validation; unique server_id enforcement | JWT with claims; mTLS |
| T2 | Unauthorized agent access | Attacker connects as an agent to access a private server | Token validation | JWT with `allowed_servers` claim; ACLs |
| T3 | Token theft / replay | Stolen token used to impersonate server or agent | — | JWT with short TTL + nonce; token rotation |
| T4 | Eavesdropping on tunnel | Man-in-the-middle reads MCP traffic | — | TLS (`wss://`); certificate pinning |
| T5 | Relay compromise | Compromised relay reads all traffic | — | E2E payload encryption; mutual TLS |
| T6 | DoS on relay | Flood of connections exhausts relay resources | — | Rate limiting; connection limits; IP allowlisting |
| T7 | Server impersonation | Attacker claims an existing server_id | Duplicate server_id rejection | Signed registration tokens tied to server_id |
| T8 | Tunnel hijacking | Attacker takes over an established tunnel | WebSocket is persistent + authenticated | TLS + periodic re-authentication |

### Trust Boundaries

```
┌─────────────────────────────────────────────────────┐
│  TRUSTED: Local Machine                             │
│  - Tunnel Client has full access to local resources │
│  - MCP handler runs with local user privileges      │
├─────────────────────────────────────────────────────┤
│  SEMI-TRUSTED: Relay Server                         │
│  - Sees envelope metadata (server_id, channel_id)   │
│  - Can read MCP payloads (unless E2E encrypted)     │
│  - Cannot access local resources directly           │
├─────────────────────────────────────────────────────┤
│  UNTRUSTED: Network                                 │
│  - Traffic may be intercepted without TLS           │
│  - WebSocket frames are plaintext without TLS       │
├─────────────────────────────────────────────────────┤
│  SEMI-TRUSTED: AI Agent                             │
│  - Authenticated to the relay                       │
│  - Can only access servers it's authorized for      │
│  - Cannot bypass the tunnel to access local network │
└─────────────────────────────────────────────────────┘
```

---

## Production Security Recommendations

### 1. Transport Layer (Mandatory)

- **Always use `wss://`** (WebSocket over TLS) in production.
- Use valid certificates from a trusted CA (Let's Encrypt, etc.).
- Configure minimum TLS 1.2, prefer TLS 1.3.

### 2. Authentication (Strongly Recommended)

- Replace pre-shared tokens with **JWT** (JSON Web Tokens).
- Include claims: `server_id`, `role` (server/agent), `exp` (expiry),
  `allowed_servers` (for agents).
- Sign with RS256 (asymmetric) for better key management.
- Implement token refresh to handle expiry gracefully.

### 3. Authorization (Recommended)

- Implement **per-server ACLs**: define which agent identities may connect
  to which server IDs.
- Store ACLs in a database or config file on the relay.
- Validate on every `connect` handshake.

### 4. Payload Encryption (High Security)

For environments where the relay should not see MCP content:

- Implement **end-to-end encryption** using a shared secret between agent
  and server (negotiated out-of-band).
- The relay becomes a pure byte forwarder — it cannot decrypt payloads.
- Consider NaCl/libsodium for symmetric encryption.

### 5. Operational Security

- **Rate limiting**: Max connections per IP, per server_id, per time window.
- **Logging**: Log all auth events (success and failure) with source IPs.
- **Monitoring**: Alert on unusual patterns (many failed auths, sudden
  connection spikes).
- **Network segmentation**: Run the relay in a DMZ with minimal attack
  surface.
