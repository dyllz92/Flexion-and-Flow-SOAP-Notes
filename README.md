# SOAP Note Generator — Flexion & Flow

## Project Overview
- **Name**: soap-note-generator
- **Goal**: AI-powered SOAP note generation for massage therapists with client file management
- **Stack**: Hono + Node.js + SQLite (better-sqlite3) + Railway
- **Frontend**: Single-page app served inline via Hono (HTML in TypeScript template literals)

## Features Completed
- ✅ Interactive muscle map (anterior/posterior, male/female) with SVG polygons
- ✅ PDF intake form upload & auto-fill via PDF.js text extraction
- ✅ AI SOAP note generation via OpenAI GPT-4o
- ✅ PDF export with jsPDF (client-branded, full SOAP + muscles)
- ✅ Client file management with unique account numbers (`FF-YYYYMM-XXXX`)
- ✅ SQLite persistence (clients, sessions, meta) with WAL mode
- ✅ Google Drive OAuth2 integration — PDF + JSON backup uploads
- ✅ Client Accounts UI — searchable list, file modal, session history
- ✅ Auto-save SOAP note to client file on generation
- ✅ Intake form snapshot stored per session

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/clients` | Create or upsert client (by email) |
| GET | `/api/clients` | List all clients (summary) |
| GET | `/api/clients/:accountNumber` | Get full client record |
| PUT | `/api/clients/:accountNumber` | Update client fields |
| POST | `/api/clients/:accountNumber/sessions` | Save SOAP session |
| GET | `/api/clients/:accountNumber/sessions` | List sessions for client |
| GET | `/api/sessions/:sessionId` | Get single session |
| POST | `/api/intake-webhook` | Webhook receiver for intake forms |
| POST | `/api/generate-soap` | Generate SOAP note via OpenAI |
| GET | `/api/drive/auth` | Start Google Drive OAuth flow |
| GET | `/api/drive/callback` | OAuth callback handler |
| POST | `/api/drive/upload-pdf` | Upload PDF to Drive |
| GET | `/api/drive/status` | Check Drive connection status |

## Data Architecture
- **Storage**: SQLite via `better-sqlite3` persisted to `/data/soap.db` (Railway volume)
- **Tables**: `clients`, `sessions`, `meta` (counters, tokens)
- **Account numbers**: `FF-YYYYMM-XXXX` (atomic counter per month stored in meta)
- **Google Drive**: Refresh token stored in `meta` table; PDFs + JSON backups uploaded per session

## Deployment — Railway

### Environment Variables to Set in Railway Dashboard
```
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=510179017776-...
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://YOUR-APP.up.railway.app/api/drive/callback
GOOGLE_DRIVE_FOLDER_ID=           # optional: specific folder ID
ADMIN_PASSWORD=YourPasswordHere
SESSION_SECRET=LongRandomSecretForSessionsAndCsrf
DATA_DIR=/data                     # matches the Railway volume mount
PORT=3000                          # Railway sets this automatically
WEBHOOK_SECRET_INTAKE=wh_intake_shared_with_intake_form
DASHBOARD_WEBHOOK_URL=https://flexion-and-flow-dashboard-production.up.railway.app/api/webhook/soap
WEBHOOK_SECRET_SOAP=wh_soap_shared_with_dashboard
```

### Steps to Deploy
1. Push this repo to GitHub
2. Create a new Railway project → Deploy from GitHub
3. Add a **Volume** mounted at `/data`
4. Set all environment variables above in Railway dashboard
5. Railway will auto-build with `npm install && npm run build` and start with `node dist/server.js`

Webhook integration notes:
- `WEBHOOK_SECRET_INTAKE` must exactly match the Intake Form app secret used for outbound intake webhooks to SOAP Notes.
- `WEBHOOK_SECRET_SOAP` must exactly match the Dashboard app's `WEBHOOK_SECRET_SOAP` value for SOAP completion notifications.
- Do not reuse `SESSION_SECRET` as a webhook secret.

### Google Drive Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com) → OAuth consent screen → add your Railway domain
2. Add `https://YOUR-APP.up.railway.app/api/drive/callback` as an Authorised Redirect URI
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway env vars
4. In the app, open a client record → "Connect Drive" → authorise

## Local Development
```bash
cp .dev.vars.example .dev.vars   # fill in your API keys
npm install
npm run dev                       # tsx watch src/server.ts (port 3000)
```

Required local integration variables:
- `SESSION_SECRET`
- `WEBHOOK_SECRET_INTAKE` if Intake Form sends local webhooks to SOAP Notes
- `WEBHOOK_SECRET_SOAP` if SOAP Notes sends completion webhooks to Dashboard

## Data Safety
- SQLite database is persisted on a Railway persistent volume (`/data`)
- Every SOAP session optionally backed up as JSON + PDF to Google Drive
- Client records include full intake form snapshots per session

## Last Updated
2026-03-05
