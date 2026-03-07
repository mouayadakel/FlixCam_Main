# Cursor "Codex Open AI" Download Troubleshooting

If you **can't download Codex Open AI** (or Cursor models) inside Cursor IDE, the issue is almost always **network or Cursor app connectivity**, not this project. Use this checklist.

**Environment:** macOS, no VPN.

---

## 1. Network / DNS (most common)

- **`getaddrinfo ENOTFOUND api2.cursor.sh`** → Cursor can’t resolve or reach its backend.
- **`read ETIMEDOUT` / `net::ERR_FAILED`** → Timeouts or blocked requests.

**Do this (macOS):**

1. **Flush DNS and test**
   ```bash
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   nslookup api2.cursor.sh
   ping -c 3 api2.cursor.sh
   ```
   If `nslookup` or `ping` fails, change DNS: **System Settings → Wi‑Fi → (your network) → Details → DNS** — add `1.1.1.1` (Cloudflare) or `8.8.8.8` (Google), then Apply.

2. **Proxy / firewall (no VPN in use)**
   - **System Settings → Network → (your connection) → Details → Proxies** — ensure nothing is blocking HTTPS.
   - **System Settings → Network → Firewall** — if enabled, ensure Cursor (or “Cursor”) is allowed.

3. **General connectivity**
   ```bash
   curl -I https://api2.cursor.sh
   ```
   Should return HTTP headers (e.g. 200/4xx), not “could not resolve host”.  
   **Note:** If `nslookup` works but `ping` times out, that’s normal (many hosts block ICMP). Use `curl` above to test real HTTPS.

---

## 2. Local service (Cursor internal)

- **`ECONNREFUSED 127.0.0.1:3845`** → A local Cursor service (e.g. on port 3845) isn’t running or is stuck.

**Do this (macOS):**

1. **Quit Cursor completely** — **Cmd+Q** (not just closing the window), then reopen and retry the download.
2. If it persists: **clear Cursor caches** then restart:
   ```bash
   # Quit Cursor first (Cmd+Q), then:
   rm -rf ~/Library/Application\ Support/Cursor/Cache
   rm -rf ~/Library/Application\ Support/Cursor/CachedData
   # Optional, only if you're okay re-logging in:
   # rm -rf ~/Library/Application\ Support/Cursor/GPUCache
   ```
   Reopen Cursor and retry the Codex download.
3. **Update Cursor** — **Cursor → Check for Updates** (or Help → Check for Updates). Install and retry.

---

## 3. Extension host / stability

- Logs showing **extension host unresponsive** or **listener/working copy LEAK** can coincide with failed downloads.

**Do this:**

1. Disable non-essential extensions, then retry the Codex download.
2. Restart Cursor and try again.

---

## 4. Telemetry (optional, doesn’t block download)

- **`OTLPExporterError: Trace spans collection is not enabled`** is a telemetry/config message. It does **not** prevent model download. You can ignore it or adjust Cursor telemetry in settings.

---

## 5. If `curl https://api2.cursor.sh` works but download still fails

If Terminal gets **HTTP/2 200** and "Welcome to Cursor" from `curl`, your network and DNS are fine. The issue is almost certainly **inside Cursor** (local service, cache, or app sandbox). Do this:

1. **Quit Cursor completely** — **Cmd+Q** (not just closing the window). Wait a few seconds.
2. **Clear Cursor caches** (see section 2) — remove `Cache` and `CachedData` from `~/Library/Application Support/Cursor/`.
3. **Reopen Cursor** and try the Codex download again.
4. **Update Cursor** to the latest version if you haven’t recently.
5. If it still fails, try on a **different network** (e.g. phone hotspot) to rule out anything specific to your Wi‑Fi; if it works there, something on your usual network may be affecting the app differently than `curl`.

---

## 6. Quick order of operations (macOS, no VPN)

1. **Verify DNS:** run `nslookup api2.cursor.sh` and `ping -c 3 api2.cursor.sh` in Terminal. If either fails, add DNS 1.1.1.1 or 8.8.8.8 in System Settings → Wi‑Fi → Details → DNS.
2. **Quit Cursor fully** (Cmd+Q), reopen, retry the Codex download.
3. **Update Cursor** (Cursor → Check for Updates), then retry.
4. **Clear caches** (see section 2) and retry.
5. If still failing: disable non-essential extensions and retry.

---

## Note about this project (FlixCam)

This repo uses **OpenAI** and **Gemini** via **API keys** (e.g. `OPENAI_API_KEY`, `GEMINI_API_KEY` in `.env`). That is separate from Cursor’s “Codex Open AI” download. Fixing the Cursor download does not require changing any FlixCam code or env vars.
