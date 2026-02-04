# Production Monitoring & Alerting (Phase 9.3)

## Already in Place

- **Sentry:** Error tracking (client, server, edge).
- **Winston:** Structured logging (server).
- **Web Vitals / GA4:** Front-end performance and analytics (if configured).

## Recommended Alerts

- **Errors:** Sentry alert on error rate above threshold or critical errors (e.g. payment failures).
- **Uptime:** HTTP checks for `/`, `/api/public/equipment` (or health endpoint); alert on repeated failures.
- **Database:** Connection failures, slow queries (if available from DB or APM).
- **Payment:** Alert on webhook failures or repeated 5xx from payment provider.

## Dashboards

- **Operations:** Error rate, latency p95/p99, request count by route.
- **Business:** Bookings created, payments succeeded/failed, cart abandonment (if tracked).

## Runbook

- Document who is on-call and escalation path.
- Document how to disable a feature (e.g. feature flag), roll back deploy, and restore DB from backup.
