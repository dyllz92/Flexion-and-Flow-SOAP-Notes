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

### P2 (Medium)
- [ ] Encrypt Google Drive tokens at rest
- [ ] Normalize database schema (remove JSON blobs)
- [ ] Add CSRF protection
- [ ] Database migration system

### P3 (Low)
- [ ] Split app.ts monolith into components
- [ ] Add caching headers for static assets
- [ ] Pagination for client lists
- [ ] Lazy load PDF.js

## Next Tasks
1. Implement Zod validation for all client/session inputs
2. Replace plain string password comparison with constant-time check
3. Add timeout to OpenAI/Google API calls
