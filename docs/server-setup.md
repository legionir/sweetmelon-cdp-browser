# Server side

The app only needs three things on the remote machine:

1. **ws-cf-tunnel agent** registered under `SERVER_ID`, forwarding to the local sshd
   (`SSH_PORT`, default 2222 in the agent; the OpenSSH default is 22).
2. **sshd** with a user that may open port forwards (`AllowTcpForwarding yes`, the default).
3. **cdp-browser-emulator** listening on loopback:

```bash
HOST=127.0.0.1 PORT=3000 GATEWAY_TOKEN=$(openssl rand -hex 32) npm start
```

Keep `HOST=127.0.0.1`. The emulator is reached only through the SSH forward, so no port is exposed.

## Windows hosts

`@sparticuz/chromium` (the emulator's pinned browser) is a Linux build. On Windows install
Chrome or Edge and point the emulator at it:

```bat
set CHROMIUM_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
set CHROMIUM_VERSION_POLICY=warn
set HOST=127.0.0.1
set PORT=3000
npm start
```

Use `npm run doctor` first. Run it as a scheduled task or service so it survives logoff.

## Security note

The app listens on `127.0.0.1:<random port>` on the phone. Any other app on that phone can connect to it.
Set `GATEWAY_TOKEN` on the emulator and enter it in the app (advanced settings) so the UI needs it.
