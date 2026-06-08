# Git History Purge Guide

Use only after **credential rotation** is complete.

## When to purge

- Secrets or `.env` files were committed in git history
- Stage 1 removed files from HEAD but history still contains them

## Recommended tool

[`git-filter-repo`](https://github.com/newren/git-filter-repo) (preferred over `filter-branch`).

## Example — remove env backup paths

```bash
cd /home/flixcam.rent
git filter-repo --path app-nested-backup/ --invert-paths
git filter-repo --path-glob '.env*' --invert-paths
```

## After purge

1. `git push --force --all` and `git push --force --tags` (coordinate with team)
2. All collaborators must re-clone
3. Revoke any leaked keys again if purge was delayed

## Alternative

If history rewrite is too risky, treat rotation + monitoring as sufficient and archive the old remote.
