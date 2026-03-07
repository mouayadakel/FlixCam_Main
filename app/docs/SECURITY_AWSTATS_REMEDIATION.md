# AWStats / htpasswd remediation (2026-03-01)

## What was committed by mistake

- **`.awstats-htpasswd`** – htpasswd file with a SHA-512 crypt hash for `flixcam.rent`. Hashes can be brute-forced; this is a secret and must not be in the repo.
- **`awstats/*.txt`** – AWStats analytics data containing visitor IPs (PII/GDPR), API paths, CUIDs in URLs, and error patterns. This is VPS runtime data and must not be in source control.

## What was done in the repo

1. **`.gitignore`** – Added:
   - `.awstats-htpasswd`
   - `awstats/`
2. **Git index** – Removed these files from tracking with `git rm --cached` so they are no longer part of future commits. Local copies on disk are unchanged.

## What you must do

### 1. Rotate the AWStats password (required)

The hash is still in git history and may be brute-forced.

1. On the VPS, generate a new password and htpasswd entry, e.g.:
   ```bash
   htpasswd -c -B .awstats-htpasswd flixcam.rent
   ```
   (Use `-B` for bcrypt; if your stack only supports crypt, use your usual htpasswd command.)
2. Replace the server’s `.awstats-htpasswd` with the new file and restart the web server if needed.
3. Do **not** commit the new `.awstats-htpasswd`; it is now ignored.

### 2. Purge sensitive files from git history (recommended)

Removing the files from the index only stops them from future commits. Old commits still contain the password hash and analytics data. To remove them from history:

**Option A – git-filter-repo (recommended)**

```bash
# Install: pip install git-filter-repo (or brew install git-filter-repo)
git filter-repo --path .awstats-htpasswd --invert-paths
git filter-repo --path awstats --invert-paths
```

Then force-push (coordinate with your team; everyone will need to re-clone or rebase):

```bash
git push --force-with-lease
```

**Option B – BFG Repo-Cleaner**

```bash
# Install BFG, then:
bfg --delete-files .awstats-htpasswd
bfg --delete-folders awstats
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force-with-lease
```

After a history rewrite, any clone that already pulled the old history should be re-cloned or follow the repo’s documented recovery steps.

### 3. Keep AWStats data off the repo

- Generate and store `.awstats-htpasswd` only on the server (or in a secrets manager); never add it to the repo.
- Keep AWStats data files (e.g. `awstats/*.txt`) only on the VPS or in a separate, access-controlled analytics store; do not commit them.
