# Gemini API Key Setup (Fix 403 / Invalid / Expired)

When AI Master Fill or other Gemini features fail with errors like:

- **403 Forbidden** — "Requests from referer &lt;empty&gt; are blocked" (`API_KEY_HTTP_REFERRER_BLOCKED`)
- **400 Bad Request** — "API Key not found" or "API key expired. Please renew the API key."

follow these steps.

---

## 1. Create a key that works from the server

The app calls Gemini **from your server** (Node.js), not from the browser. Server requests have **no HTTP referer**, so:

- Do **not** restrict the key to "HTTP referrers" (websites). That will block server-side calls.
- Either leave **Application restrictions** as **None**, or restrict by **IP addresses** (your server/VPS IP) if you want to lock the key to your host.

### In Google AI Studio / Cloud Console

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) or [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an API key (or use an existing one).
3. Edit the key:
   - **Application restrictions**: choose **None** (recommended for server use), or **IP addresses** and add your server IP(s).
   - Do **not** use "HTTP referrers" for keys used by this app.
4. Save. If the key was restricted to referrers before, create a **new** key with the above settings and use that.

---

## 2. Use a valid, non-expired key

- If you see "API key expired" or "API Key not found", create a **new** key in AI Studio / Cloud Console and replace the old one.
- Keys can be revoked or expire; renew or rotate as needed.

---

## 3. Where to set the key in this project

- **Admin UI**: **Admin → Settings → AI** — set the Gemini API key there (stored in DB, optionally encrypted).
- **Environment**: In `.env` set:
  - `GEMINI_API_KEY=your_key_here`  
  or  
  - `GOOGLE_GENERATIVE_AI_API_KEY=your_key_here`

The app uses **DB (AI Settings) first**, then falls back to these env vars. Ensure the key you configure is the one with **no referrer restriction** (or IP-only) and is **valid and not expired**.

---

## 4. Optional: use OpenAI instead

If you prefer not to fix the Gemini key, you can use OpenAI for AI fill:

- Set `OPENAI_API_KEY` in `.env` and set **AI_PROVIDER=openai** (or choose OpenAI in Admin → AI Settings).
- The app will fall back to OpenAI when Gemini fails (if the other provider’s key is configured).

---

## Summary

| Error | Cause | Fix |
|-------|--------|-----|
| 403, referer &lt;empty&gt; blocked | Key restricted to HTTP referrers | Use a key with **None** or **IP** restriction; see step 1. |
| 400, API Key not found / expired | Invalid or expired key | Create a new key and set it in AI Settings or `.env`. |

See [AI_BLUEPRINT.md](./AI_BLUEPRINT.md) for how AI is used in the app.
