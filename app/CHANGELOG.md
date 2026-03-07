# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2025-02-18

### Added

- Public `/api/health` route for DB connectivity check
- 403 Forbidden page (`/403`) with RTL support
- VENDOR role mapping in permissions
- Dockerfile, docker-compose, and .dockerignore
- CI PostgreSQL service in GitHub Actions
- Unit tests for booking, payment, equipment, and cart services
- E2E tests for checkout and admin flows
- Loading skeletons for admin pages (bookings, inventory, clients, damage-claims, invoices, calendar)
- Shared policy and FAQ form dialogs (consolidated duplicates)
- API error response utilities (`lib/api/error-response.ts`)
- Error boundaries for admin and portal routes
- CONTRIBUTING.md
- CHANGELOG.md

### Changed

- Removed hardcoded auth logging
- Updated .env.example with CRON_SECRET, GOOGLE_GENERATIVE_AI_API_KEY, AI_SEASONALITY_FACTOR
- Aligned WhatsApp env var to WHATSAPP_ACCESS_TOKEN
- Fixed Playwright port to 3000
- Replaced via.placeholder.com with local placeholder image
- Removed dead Supabase auth helpers (signIn, signOut, getCurrentUser, getUserRole)
- Replaced coming soon copy in messages
- Fixed silent catch blocks with proper error logging
- AI seasonality factor now configurable via AI_SEASONALITY_FACTOR env

### Fixed

- Accessibility gaps (aria-labels, role="alert" on error messages)
