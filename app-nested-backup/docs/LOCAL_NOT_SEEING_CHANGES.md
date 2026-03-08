# Why locally I don't see changes (feels like 5 days gone / checkpoint)

## What was checked (Mar 6, 2026)

- **Git:** This folder (`FlixCamFinal 3`) is on `main` at commit `5ddb07c` (Mar 6). Branch tracks `flixcam_main/main`. Working tree clean.
- **vs origin:** Local `main` is **ahead** of `origin/main` (flixCamFinal repo). So you are **not** missing commits from origin in this folder.
- **.next:** Stale build cache was removed so the next `npm run dev` or `npm run build` uses current source.

## Most likely reasons the site “looks old” locally

1. **Different database (most likely)**  
   Local uses `DATABASE_URL` from your `.env`. If that points to:
   - a local DB that was never fully seeded, or  
   - a copy that was restored from an old backup  
   then equipment, content, users, etc. will look old even though the **code** is current.

   **Check:** Compare `.env` `DATABASE_URL` with production. If they differ, different data is expected.

2. **Wrong project folder**  
   You have multiple copies (e.g. FlixCamFinal, FlixCamFinal 2, FlixCamFinal 3). If you open or run the app from another folder, you’ll see that folder’s code and data.

   **Check:** In the terminal where you run `npm run dev`, run `pwd` and confirm it’s this folder.

3. **Browser cache**  
   Old JS/CSS can make the UI look like an old version.

   **Check:** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or open the app in an incognito/private window.

4. **Dev vs production build**  
   `npm run dev` can behave slightly differently from the built site. To match production locally: `npm run build && npm start` then open http://localhost:3000.

## Remotes in this repo

- **origin** – https://github.com/mouayadakel/flixCamFinal.git  
- **flixcam_main** – https://github.com/mouayadakel/FlixCam_Main.git (main tracks this)  
- **flixcam** / **hostinger** – VPS deploy remotes  

If you usually push to **origin** (flixCamFinal), consider making `main` track `origin` so `git pull` brings those updates:

```bash
git branch --set-upstream-to=origin/main main
```

Then `git pull` will update from origin. Right now, `git pull` updates from flixcam_main.

## Port 3000 / 3001 show old app; 3002 shows new (correct cause)

**What’s going on:** Cursor IDE uses ports **3000** and **3001** for its own services (e.g. Simple Browser, internal tools). So when you open `http://localhost:3000` or `http://localhost:3001` you are **not** hitting your Next.js app — you’re hitting Cursor’s server, which can show an old or cached view.

When you run `npm run dev -- -p 3002`, your **real** Next.js app runs on port **3002**. That’s why you see the correct version (blog, new control panel, equipment) only there.

**What to do:**

- **Use port 3002 for local dev:**  
  `npm run dev:3002`  
  Then open **http://localhost:3002** in your browser (Chrome/Safari, not Cursor’s embedded browser if it’s tied to 3000/3001).

- **Or use another free port:**  
  `npm run dev -- -p 3003`  
  and open `http://localhost:3003`.

- **Don’t rely on 3000 or 3001** for this project while Cursor is open; they belong to Cursor.

**Check what’s on each port (macOS):**
```bash
lsof -i :3000 -P -n
lsof -i :3001 -P -n
lsof -i :3002 -P -n
```
You’ll see `Cursor` on 3000/3001 and `node` (Next.js) on 3002 when your app is running there.

## Quick checklist when “local doesn’t show my changes”

1. Confirm you’re in this folder: `pwd` → `.../FlixCamFinal 3`
2. Confirm code: `git log -1 --oneline` → expect `5ddb07c` or newer
3. Clear Next cache: `rm -rf .next` then run `npm run dev` or `npm run build`
4. Confirm data source: `.env` `DATABASE_URL` (local DB vs production)
5. Hard refresh or incognito when viewing the app  
6. Use **http://localhost:3002** (run `npm run dev:3002`), not 3000/3001 — see “Port 3000/3001” above
