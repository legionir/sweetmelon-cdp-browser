# Sweetmelon CDP Browser

An Android app, built on [Sweetmelon](https://github.com/legionir/sweetmelon) `v2.6.0`, that shows and controls a
remote Chromium run by [cdp-browser-emulator](https://github.com/legionir/cdp-browser-emulator), reached through
[ws-cf-tunnel](https://github.com/legionir/ws-cf-tunnel).

```
WebView (www/)  ──http/ws──▶  127.0.0.1:<port> on the phone
                                   │ SSH direct-tcpip (dartssh2)
                                   ▼
                      TunnelSocket  ──wss /connect──▶ Cloudflare Worker ⇄ agent ⇄ sshd ──▶ gateway 127.0.0.1:3000
```

No port is opened on the server: the emulator stays on loopback and is only reachable through SSH inside the tunnel.

## Layout

| Path | What |
|---|---|
| `lib/tunnel/tunnel_socket.dart` | ws-cf-tunnel client as an `SSHSocket` (bearer auth, `fin` half-close, readable HTTP errors) |
| `lib/tunnel/cdp_forwarder.dart` | SSH session + local listener, reconnect with backoff, listener survives reconnects |
| `lib/plugins/cdp_tunnel_plugin.dart` | Sweetmelon bridge plugin `cdpTunnel` (`connect`, `disconnect`, `status`, event `cdpTunnel.state`) |
| `assets/www/` | Phase 1 UI: settings form (kept in `secureStorage`) + the emulator's own UI in an iframe |
| `tool/e2e/harness.js` | Local hub + sshd + fake gateway for tests |
| `docs/server-setup.md` | What must run on the server |

The Sweetmelon "Action" build cannot host custom Dart plugins, so this repo is a normal Flutter shell that
depends on Sweetmelon as a package (see the core's "Package" mode).

## Run and test

```bash
flutter pub get
flutter analyze
(cd tool/e2e && npm install)
node tool/e2e/harness.js > /tmp/e2e.json &
E2E_CONFIG=/tmp/e2e.json flutter test      # without E2E_CONFIG the end-to-end tests are skipped
flutter run                                # enter the settings in the app
```

Settings (`TUNNEL_URL`, `AUTH_TOKEN`, `SERVER_ID`, SSH user and password) are typed in the app and stored with
`secureStorage`. Optional defaults: see `.env.example`.

## Notes

- `dartssh2` is pinned to 4.1.0 with a `pointycastle` override: 2.x does not compile on current Flutter.
- The tunnel is dropped when Android suspends the app; a foreground service is not part of phase 1.
- Phase 2 (own screencast client for `/ws/browser`) is not started.
