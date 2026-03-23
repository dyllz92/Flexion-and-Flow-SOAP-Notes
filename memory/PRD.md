# SOAP Notes - Muscle Map Feature PRD

## Original Problem Statement
Review the muscle map feature and suggest improvements. User reported polygon alignment issues with muscles not lining up properly with the anatomical image. Added Quick Select Common Areas feature for faster muscle marking.

## Architecture
- **Frontend**: TypeScript/JavaScript with inline HTML rendering
- **Backend**: Hono server (Node.js/TypeScript)
- **Data**: Muscle polygons defined as coordinate strings in MUSCLES array
- **Images**: Male (890x1024), Female (862x1024) anatomical diagrams

## User Personas
1. **Massage Therapist** - Primary user marking client pain areas
2. **Client** - Viewing their pain map during consultation

## Core Requirements (Static)
- Display anatomical body map (male/female, anterior/posterior)
- Allow clicking to place pain markers
- Identify muscles under click point
- Support multiple markers per session
- Toggle polygon visibility
- Switch between views and genders
- Quick select common pain patterns

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

## Known Issues Resolved
1. Polygons were shifted down from actual muscle positions
2. Pectoralis, Deltoid, Trapezius, Gluteus regions had significant misalignment
3. Hit detection was inaccurate due to polygon offset

## Prioritized Backlog

### P0 - Critical
- None remaining

### P1 - High Priority
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

## Next Tasks
1. Monitor user feedback on alignment accuracy
2. Consider adding visual guides/outlines for muscle boundaries
3. Evaluate need for higher-resolution images on retina displays
4. User testing for Quick Select UX refinement
