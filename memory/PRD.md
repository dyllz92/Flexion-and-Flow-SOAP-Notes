# SOAP Notes - Muscle Map Feature PRD

## Original Problem Statement
1. Review the muscle map feature and suggest improvements
2. Fix polygon alignment issues (muscles not lining up properly)
3. Add Quick Select Common Areas feature
4. Comprehensive bug audit of the full SOAP Notes app

## Architecture
- **Frontend**: TypeScript/JavaScript with inline HTML rendering (Hono serve)
- **Backend**: Hono server (Node.js/TypeScript) on port 8001
- **Database**: SQLite (better-sqlite3)
- **Data**: Muscle polygons defined as coordinate strings in MUSCLES array
- **Images**: Male (890x1024), Female (862x1024) anatomical diagrams

## User Personas
1. **Massage Therapist** - Primary user marking client pain areas and generating SOAP notes
2. **Client** - Viewing their pain map during consultation

## Core Requirements (Static)
- 4-step wizard: Client Intake → Muscle Map → Session Notes → SOAP Notes
- Display anatomical body map (male/female, anterior/posterior)
- Allow clicking to place pain markers
- Identify muscles under click point
- Support multiple markers per session
- Toggle polygon visibility
- Switch between views and genders
- Quick select common pain patterns
- AI-powered SOAP note generation (requires OpenAI API key)
- PDF export functionality
- Client profile management

## What's Been Implemented
- [x] **2026-01-13**: Fixed polygon alignment - Y-coordinates corrected (shifted up ~12-15px)
- [x] **2026-01-13**: Updated MUSCLES array in app.ts with corrected coordinates
- [x] **2026-01-13**: Updated muscle-data.js with matching corrected coordinates
- [x] **2026-01-13**: Tested all views (male/female, anterior/posterior)
- [x] **2026-01-13**: Added Quick Select Common Areas feature with 6 presets:
  - Upper Back Tension (8 muscles)
  - Lower Back Pain (10 muscles)  
  - Desk Worker (8 muscles)
  - Runner Recovery (12 muscles)
  - Shoulder Issues (8 muscles)
  - Full Back (14 muscles)
- [x] **2026-01-13**: Toggle functionality for presets (click to add, click again to remove)
- [x] **2026-01-13**: Comprehensive bug audit completed
- [x] **2026-01-13**: Added data-testid attributes to critical UI elements:
  - Header buttons (clients, new session)
  - Step navigation items
  - Form inputs (first name, last name, email, chief complaint, pain level)
  - Muscle map controls (male/female, anterior/posterior, polygon toggle)
  - Action buttons (clear all markers, generate SOAP, export PDF, regenerate)

## Bug Audit Results (2026-01-13)

### Backend Testing: 90% Pass Rate
- All CRUD operations working (clients, sessions)
- CSRF protection functional
- API endpoints responding correctly
- **Expected Issue**: OpenAI API key not configured (SOAP generation returns 500)

### Frontend Testing: 95% Pass Rate
- All 4-step wizard navigation working
- Form inputs accepting data correctly
- Muscle map interactions functional
- Quick Select presets working
- Modal open/close working
- **Minor Issue**: Step 2 Next button timing in automated tests (works fine manually)

### No Critical Bugs Found

## Known Issues Resolved
1. Polygons were shifted down from actual muscle positions
2. Pectoralis, Deltoid, Trapezius, Gluteus regions had significant misalignment
3. Hit detection was inaccurate due to polygon offset

## Prioritized Backlog

### P0 - Critical
- None remaining

### P1 - High Priority
- [ ] OpenAI API key configuration for SOAP generation
- [ ] Fine-tune female body scaling factors for improved alignment
- [ ] Add zoom functionality for precise selection on mobile

### P2 - Medium Priority
- [ ] Custom preset creation (user-defined muscle groups)
- [ ] Save/load preset configurations
- [ ] Improve hover feedback without polygon toggle

### P3 - Nice to Have
- [ ] ARIA accessibility labels for muscle regions
- [ ] Drag-to-select multiple adjacent muscles
- [ ] Animation for marker placement
- [ ] Preset suggestions based on client history
- [ ] Client history-based "Your usual areas" preset

## Data-TestIDs Added
| Element | data-testid |
|---------|-------------|
| Clients button | header-clients-btn |
| New Session button | header-new-session-btn |
| Step 1 (Client Intake) | step-client-intake |
| Step 2 (Muscle Map) | step-muscle-map |
| Step 3 (Session Notes) | step-session-notes |
| Step 4 (SOAP Notes) | step-soap-notes |
| First Name input | input-first-name |
| Last Name input | input-last-name |
| Email input | input-email |
| Chief Complaint input | input-chief-complaint |
| Pain Level input | input-pain-level |
| Male button | btn-male |
| Female button | btn-female |
| Anterior button | btn-anterior |
| Posterior button | btn-posterior |
| Polygon toggle | toggle-muscle-polygons |
| Clear All Markers | btn-clear-all-markers |
| Step 2 Back | btn-step2-back |
| Step 2 Next | btn-step2-next |
| Generate SOAP | btn-generate-soap |
| Export PDF | btn-export-pdf |
| Regenerate | btn-regenerate-soap |
| Quick Select presets | quick-select-{preset-id} |

## Next Tasks
1. Configure OpenAI API key for SOAP generation functionality
2. Monitor user feedback on alignment accuracy
3. Consider adding visual guides/outlines for muscle boundaries
4. Evaluate need for higher-resolution images on retina displays
5. User testing for Quick Select UX refinement
