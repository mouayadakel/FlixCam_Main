# Launch Checklist & Rollback (Phase 9.4)

## Pre-Launch

- [ ] All env vars set in production (NEXTAUTH_URL, APP_URL, DB, Redis, TAP, Sentry, etc.).
- [ ] Database migrations applied; schema in sync.
- [ ] HTTPS and redirect from HTTP enforced.
- [ ] Feature flags reviewed (disable experimental if needed).
- [ ] Rate limiting and security headers verified (next.config).
- [ ] Backup and restore tested at least once.
- [ ] Monitoring and alerts configured and tested.

## Go-Live

- [ ] Deploy to production (or switch traffic).
- [ ] Smoke test: homepage, login, one booking flow, portal dashboard.
- [ ] Verify payment webhook URL and test charge (e.g. small amount).
- [ ] Verify emails/notifications if applicable.

## Rollback Plan

- **Application:** Revert to previous deployment (e.g. previous Docker image or Vercel deployment). Keep last known-good deploy tagged.
- **Database:** If a migration caused issues, run down migration if available; otherwise restore from pre-deploy backup (document RPO).
- **Feature flags:** Disable problematic features without full rollback when possible.
- **Communication:** Notify users if downtime or degraded service; status page if maintained.

## Post-Launch

- [ ] Watch error rates and latency for 24–48 hours.
- [ ] Review Sentry and logs for new errors.
- [ ] Confirm backups are running and alerts fire as expected.
