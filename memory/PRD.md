# SOAP Notes Generator - PRD

## Original Problem Statement
Treatment note system for therapists that links to a dashboard app. Features:
- Client intake form integration
- Body map for muscle selection/pain markers
- Treatment type selection
- AI-generated SOAP notes (with medical shorthand option)
- PDF generation and Google Drive storage
- Client profile management

## Architecture
- **Backend**: Hono.js + Better-SQLite3 + Node.js (TypeScript)
- **Database**: SQLite with WAL mode (file-based)
- **Frontend**: Server-rendered HTML with vanilla JavaScript
- **Integrations**: OpenAI (SOAP generation), Google Drive (PDF storage)

## User Personas
1. **Therapist** - Primary user creating SOAP notes
2. **Admin** - Manages client data and integrations

## Core Requirements (Static)
- Client intake form data capture
- Interactive body map for muscle/pain marking
- AI-powered SOAP note generation
- PDF export to Google Drive
- Session history per client

## What's Been Implemented
### Jan 2026 - Code Review & Security Fixes
- [x] Comprehensive code review completed
- [x] **P0 FIX**: Removed client-side OpenAI API key exposure
  - API key now server-side only via `OPENAI_API_KEY` env var
  - Added `/api/ai-status` endpoint for status checking
  - Frontend shows status badge instead of key input
- [x] **P0 FIX**: XSS vulnerabilities patched
  - Applied `escapeHtml()` to all user-controlled innerHTML content
  - Applied `escJsSingle()` to onclick handler parameters

### Mar 2026 - P1 Security Improvements
- [x] **Input validation with Zod schemas**
  - Created `/src/validation/schemas.ts` with comprehensive schemas
  - Added validation to all API endpoints: clients, sessions, intake, AI
  - Email, phone, date, and pain level validation
  - Max length limits on all text fields
- [x] **Timing-safe password comparison**
  - Replaced plain string comparison with `crypto.timingSafeEqual`
  - Prevents timing attacks on authentication
- [x] **API request timeouts**
  - Added 30s timeout to OpenAI API calls
  - Added 30-60s timeouts to Google Drive operations
  - Proper AbortError handling with user-friendly messages

## Prioritized Backlog

### P0 (Critical) - COMPLETED
- [x] OpenAI key client-side exposure
- [x] XSS in client rendering

### P1 (High) - COMPLETED
- [x] Input validation with Zod schemas
- [x] Timing-safe password comparison in auth
- [x] Request timeout for external API calls

### P2 (Medium) - COMPLETED
- [x] **Encrypt Google Drive tokens at rest**
  - Created `/src/utils/crypto.ts` with AES-256-GCM encryption
  - KV store auto-encrypts sensitive keys (drive tokens)
  - Client driveToken field auto-encrypted on save
  - `safeDecrypt` handles legacy unencrypted data migration
- [x] **CSRF protection**
  - Created `/src/middleware/csrf.ts` with double-submit cookie pattern
  - All state-changing API endpoints require X-CSRF-Token header
  - Frontend `apiFetch()` wrapper auto-includes CSRF token
  - Webhooks exempt from CSRF (external services)
- [x] **Database migration system**
  - Created `/src/database/migrations.ts` with versioned migrations
  - Auto-runs pending migrations on startup
  - Added searchable columns for clients (first_name, last_name, phone, session_count)
  - Added searchable columns for sessions (client_name, therapist_name)
  - Includes backfill functions for existing data
- [x] **Rate limiting on public endpoints**
  - Created `/src/middleware/rate-limit.ts` with SQLite persistence
  - Standard: 100 req/min for general API
  - AI endpoints: 20 req/min (expensive operations)
  - Upload endpoints: 30 req/min
  - Proper rate limit headers (X-RateLimit-*)

### P3 (Low)
- [ ] Split app.ts monolith into components
- [ ] Add caching headers for static assets
- [ ] Pagination for client lists
- [ ] Lazy load PDF.js
- [ ] Full schema normalization (remove JSON blobs entirely)

## Next Tasks
1. Set `ENCRYPTION_SECRET` env variable for production token encryption
2. Run `backfillClientColumns()` and `backfillSessionColumns()` on existing databases
3. Consider full schema normalization (remove JSON blobs entirely)
4. Add caching headers for static assets
5. Implement pagination for client lists (performance at scale)
