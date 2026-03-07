# Why the structure is the same (FlixCamFinal 3 / FlixCam_Main)

## Why it looks the same as before

**The zip file is built the same way every time.**

When you (or someone) creates **FlixCamFinal 3.zip** on a Mac:

1. The zip has a **top-level folder** named `FlixCamFinal 3`.
2. Inside it are:
   - **Another folder** also named `FlixCamFinal 3` (the real Next.js project)
   - **__MACOSX** (macOS metadata, not needed on the server)

So when you extract the zip in `public_html`, you get:

```
public_html/
  FlixCamFinal 3/           ← outer folder (from zip root)
    FlixCamFinal 3/        ← real app (package.json, src/, prisma/, etc.)
    __MACOSX/              ← junk, safe to delete
  FlixCamFinal 3.zip       ← the archive (should not live here)
```

That’s why the structure is “the same as before”: the same zip layout produces the same directory layout every time.

---

## What you have now

| Item | What it is |
|------|------------|
| **FlixCamFinal 3** | Outer folder from the zip. |
| **FlixCamFinal 3/FlixCamFinal 3** | **Actual app** (Next.js, Prisma, src, etc.). This is the one to run. |
| **FlixCamFinal 3/__MACOSX** | macOS junk. Can be removed. |
| **FlixCamFinal 3.zip** | Archive. Should be moved out of `public_html` (e.g. to `~/backups`). |
| **FlixCam_Main** | Separate folder, root-owned, only `docs` + `scripts`. Not the full app. |
| **Flixcam_main** | No longer present (old renamed project). |
| **flixcamfinal** | Symlink no longer present. |

So the **live app** you should use is: **`FlixCamFinal 3/FlixCamFinal 3`**.

---

## How to get a clean structure (one main app, no space in name)

Do this so you have a single, clearly named app folder (e.g. `Flixcam_main`) and no duplicate layout.

1. **Rename the inner project to a name without a space** (e.g. `Flixcam_main`):

   ```bash
   cd /home/flixcam/public_html
   mv "FlixCamFinal 3/FlixCamFinal 3" "Flixcam_main"
   ```

2. **Remove the outer folder and junk:**

   ```bash
   rm -rf "FlixCamFinal 3/__MACOSX"
   rmdir "FlixCamFinal 3" 2>/dev/null || true   # only if empty
   ```
   If `FlixCamFinal 3` is not empty after moving the inner folder, remove the rest and then the folder:
   ```bash
   rm -rf "FlixCamFinal 3"
   ```

3. **Recreate the symlink** (optional, for a short path):

   ```bash
   ln -s Flixcam_main flixcamfinal
   ```

4. **Move the zip out of the web root:**

   ```bash
   mkdir -p ~/backups
   mv "FlixCamFinal 3.zip" ~/backups/
   ```

5. **Use the clean path for PM2 and backups:**

   - App root: `/home/flixcam/public_html/Flixcam_main`
   - Or: `/home/flixcam/public_html/flixcamfinal` (if you recreated the symlink)

After this, you’ll have one main app at **Flixcam_main** (or **flixcamfinal** → Flixcam_main) and the “same as before” nested structure only until you change it as above.
