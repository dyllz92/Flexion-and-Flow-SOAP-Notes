/**
 * Main App component - contains the full single page application
 * This is the main UI for the SOAP Notes Generator
 *
 * Structure:
 * - CSS: /static/styles/app.css (extracted)
 * - JS Utils: /static/js/utils.js
 * - JS API: /static/js/api.js
 * - PDF Loader: /static/js/pdf-loader.js (lazy loads PDF.js)
 */
export function renderApp(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SOAP Notes — Flexion &amp; Flow</title>
  
  <!-- Fonts & Icons -->
  <link rel="stylesheet" href="/static/vendor/fonts/montserrat.css"/>
  <link rel="stylesheet" href="/static/vendor/fontawesome/css/all.min.css"/>
  
  <!-- App Styles (external) -->
  <link rel="stylesheet" href="/static/styles/app.css"/>
  
  <!-- jsPDF for PDF generation (always needed) -->
  <script src="/static/vendor/jspdf.umd.min.js"></script>
  
  <!-- PDF.js loaded lazily when needed -->
  <script>
    // Lazy load PDF.js only when PDF viewing is needed
    window.loadPdfJs = function() {
      if (window.pdfjsLib) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/static/vendor/pdf.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };
  </script>
  
  <!-- Inline critical styles (variables only) -->
  <style>
    :root {
      --primary:       #1b3a6b;
      --primary-light: #2c5fa3;
      --accent:        #5ba3d9;
      --bg:            #eef4fb;
      --bg-card:       #ffffff;
      --text:          #2d3748;
      --text-light:    #718096;
      --border:        #d0dff0;
      --success:       #38a169;
      --danger:        #e53e3e;
      --warning-bg:    #fff3cd;
      --warning-txt:   #856404;
      --radius:        12px;
      --radius-sm:     8px;
      --shadow:        0 4px 24px rgba(27,58,107,0.10);
      --shadow-sm:     0 2px 8px rgba(27,58,107,0.08);
      --font:          "Montserrat", -apple-system, BlinkMacSystemFont, sans-serif;
    }
  </style>
</head>
<body>
  <div class="bg-wave"></div>

  <!-- Header -->
  <header class="site-header">
    <div class="header-inner">
      <img id="headerLogo" src="/logo-wordmark.png" alt="Flexion &amp; Flow" class="header-logo"/>
      <div id="fallbackLogo" style="display:none; flex-direction:column; align-items:center; gap:4px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:40px;height:40px;border-radius:10px;background:var(--primary);display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-notes-medical" style="color:white;font-size:1.1rem;"></i>
          </div>
          <div>
            <div style="font-size:1.1rem;font-weight:800;color:var(--primary);">Flexion &amp; Flow</div>
            <div style="font-size:0.72rem;color:var(--text-light);font-weight:500;">Remedial Massage</div>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <span id="statusBadge" class="badge badge-success" style="display:none">
          <i class="fas fa-check-circle"></i> Note Ready
        </span>
        <button id="openClientAccountsBtn" class="btn btn-ghost btn-sm" title="Client Accounts">
          <i class="fas fa-users"></i> <span class="hide-mobile">Clients</span>
        </button>
        <button id="resetAllBtn" class="btn btn-ghost btn-sm">
          <i class="fas fa-rotate-right"></i> <span class="hide-mobile">New Session</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Step Bar -->
  <nav class="step-bar">
    <div class="step-bar-inner">
      <div class="step-item active" id="stepItem1" onclick="goToStep(1)" data-testid="step-client-intake">
        <div class="step-num" id="stepNum1">1</div>
        <span class="step-label">Client Intake</span>
      </div>
      <div class="step-sep"></div>
      <div class="step-item" id="stepItem2" onclick="goToStep(2)" data-testid="step-muscle-map">
        <div class="step-num" id="stepNum2">2</div>
        <span class="step-label" id="stepLabel2">Muscle Map</span>
      </div>
      <div class="step-sep"></div>
      <div class="step-item" id="stepItem3" onclick="goToStep(3)" data-testid="step-session-notes">
        <div class="step-num" id="stepNum3">3</div>
        <span class="step-label" id="stepLabel3">Session Notes</span>
      </div>
      <div class="step-sep"></div>
      <div class="step-item" id="stepItem4" onclick="goToStep(4)" data-testid="step-soap-notes">
        <div class="step-num" id="stepNum4">4</div>
        <span class="step-label" id="stepLabel4">SOAP Notes</span>
      </div>
    </div>
  </nav>

  <main class="page-content">

    <!-- ═══════════════════════════════════════
         STEP 1: CLIENT INTAKE
         ═══════════════════════════════════════ -->
    <div id="panel1" class="step-panel active">

      <!-- Client Profiles Integration Banner -->
      <div class="card" style="margin-bottom:20px; border: 1.5px solid var(--accent); overflow: hidden;">
        <div class="card-header-bar" style="padding:18px 24px; background: linear-gradient(135deg, var(--primary) 0%, #2c5fa3 50%, #4a84c7 100%);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;">
                <i class="fas fa-users" style="font-size:1rem;color:white;"></i>
              </div>
              <div>
                <h2 style="margin:0;font-size:1rem;font-weight:700;color:white;">Client Profiles</h2>
                <p style="margin:0;font-size:0.74rem;opacity:0.85;color:white;">Synced from Flexion &amp; Flow Intake Form</p>
              </div>
            </div>
            <div style="display:flex;gap:10px;">
              <button id="openClientBrowserBtn" class="btn btn-sm btn-profile-primary">
                <i class="fas fa-search"></i> Browse Clients
              </button>
              <button id="openWebhookConfigBtn" class="btn btn-sm btn-profile-secondary" title="Configure integration">
                <i class="fas fa-link"></i> Setup
              </button>
            </div>
          </div>
        </div>
        <div style="padding:16px 24px 20px;">
          <div id="clientProfilesPreview" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
            <p style="font-size:0.82rem;color:var(--text-light);font-style:italic;margin:0;" id="noClientsMsg">
              <i class="fas fa-info-circle" style="margin-right:6px;opacity:0.7;"></i>
              No client profiles yet — connect your intake form or upload a PDF below.
            </p>
          </div>
          <div id="webhookBanner" style="display:none;margin-top:10px;" class="info-box info-box-blue">
            <i class="fas fa-circle-check" style="margin-right:6px;"></i>
            <strong>Integration active.</strong> New intake form submissions appear here automatically.
            Webhook: <code id="webhookUrlDisplay" style="background:rgba(91,163,217,0.15);padding:1px 6px;border-radius:4px;font-size:0.75rem;"></code>
          </div>
        </div>
      </div>

      <div class="grid-2" style="gap:20px;">

        <!-- Upload PDF -->
        <div class="card">
          <div class="card-header-bar">
            <h2><i class="fas fa-file-upload" style="margin-right:8px;opacity:0.8;"></i>Upload Intake Form PDF</h2>
            <p>Auto-extracts client information from the Flexion &amp; Flow intake PDF</p>
          </div>
          <div class="card-body">
            <div id="dropZone" class="drop-zone">
              <div class="dz-icon"><i class="fas fa-file-pdf"></i></div>
              <p>Drop PDF here or click to browse</p>
              <p class="dz-sub">Flexion &amp; Flow intake forms supported</p>
              <input type="file" id="pdfInput" accept=".pdf" class="hidden" style="display:none"/>
            </div>
            <div id="pdfStatus" style="display:none;margin-top:12px;" class="pdf-status">
              <i class="fas fa-check-circle" style="color:var(--success);font-size:1rem;"></i>
              <span id="pdfFileName"></span>
              <button id="clearPDFBtn" style="margin-left:auto;background:none;border:none;color:var(--text-light);cursor:pointer;font-size:0.9rem;" title="Remove">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div id="pdfParseProgress" style="display:none;margin-top:10px;font-size:0.8rem;color:var(--text-light);display:none;align-items:center;gap:8px;">
              <i class="fas fa-spinner fa-spin" style="color:var(--accent);"></i>
              <span>Extracting text from PDF…</span>
            </div>

            <!-- Supabase Stored PDFs -->
            <div id="supabaseFilesSection" style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <h3 style="margin:0;font-size:0.85rem;font-weight:600;color:var(--text);">
                  <i class="fas fa-clipboard-list" style="margin-right:6px;opacity:0.7;"></i>Recent Intake Forms
                </h3>
                <button id="supabaseFilesRefreshBtn" class="btn btn-ghost btn-sm" style="font-size:0.72rem;padding:3px 10px;" title="Refresh Supabase files">
                  <i class="fas fa-sync-alt" id="supabaseFilesRefreshIcon"></i>
                </button>
              </div>
              <div id="supabaseFilesList" style="max-height:200px;overflow-y:auto;">
                <p style="font-size:0.78rem;color:var(--text-light);font-style:italic;">
                  Loading intake forms…
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Client Info -->
        <div class="card">
          <div class="card-header-bar">
            <h2><i class="fas fa-user" style="margin-right:8px;opacity:0.8;"></i>Client Information</h2>
            <p>Auto-filled from PDF upload or client profile</p>
          </div>
          <div class="card-body">
            <div class="field-row">
              <div class="field">
                <label>First Name <span class="req">*</span></label>
                <input id="clientFirstName" type="text" placeholder="Jane" data-testid="input-first-name" />
              </div>
              <div class="field">
                <label>Last Name <span class="req">*</span></label>
                <input id="clientLastName" type="text" placeholder="Smith" data-testid="input-last-name" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Email <span style="font-size:0.7rem;color:var(--text-light);font-weight:400;">(used to link client file)</span></label>
                <input id="clientEmail" type="email" placeholder="jane@example.com" oninput="updateSummaryPanel()" data-testid="input-email" />
              </div>
              <div class="field">
                <label>Date of Birth</label>
                <input id="clientDOB" type="date" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Session Date</label>
                <input id="sessionDate" type="date" />
              </div>
            <div class="field">
              <label>Chief Complaint / Reason for Visit</label>
              <input id="chiefComplaint" type="text" placeholder="e.g. Lower back pain, tension headaches…" data-testid="input-chief-complaint" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Pain Level (0–10)</label>
                <input id="painLevel" type="number" min="0" max="10" placeholder="7" data-testid="input-pain-level" />
              </div>
              <div class="field">
                <label>Session Duration</label>
                <select id="sessionDuration">
                  <option value="30 min">30 min</option>
                  <option value="45 min">45 min</option>
                  <option value="60 min" selected>60 min</option>
                  <option value="75 min">75 min</option>
                  <option value="90 min">90 min</option>
                  <option value="120 min">120 min</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Medications / Contraindications</label>
              <input id="medications" type="text" placeholder="e.g. Blood thinners, NSAIDs…" />
            </div>
          </div>
        </div>

        <!-- Intake Form Data -->
        <div class="card col-span-2">
          <div class="card-header-bar" style="padding:14px 24px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <h2 style="font-size:0.9rem;"><i class="fas fa-clipboard-list" style="margin-right:8px;opacity:0.8;"></i>Intake Form Data</h2>
              <span style="font-size:0.72rem;opacity:0.75;">Auto-filled from PDF or enter manually</span>
            </div>
          </div>
          <div class="card-body">
            <textarea id="intakeFormData" rows="5"
              placeholder="Intake form data will appear here after PDF upload, or type manually…&#10;&#10;Include: medical history, current conditions, allergies, medications, past injuries, client goals, etc."
              style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.85rem;color:var(--text);resize:vertical;outline:none;transition:border-color 0.2s,box-shadow 0.2s;"></textarea>
          </div>
          <div class="card-footer" style="display:flex;justify-content:flex-end;">
            <button id="goToStep2Btn" class="btn btn-primary">
              Next: Select Muscles <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ═══════════════════════════════════════
         STEP 2: MUSCLE MAP
         ═══════════════════════════════════════ -->
    <div id="panel2" class="step-panel">
      <div style="display:grid;grid-template-columns:1fr 300px;gap:20px;">

        <!-- Map card -->
        <div class="card">
          <div class="card-header-bar">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <div>
                <h2><i class="fas fa-person" style="margin-right:8px;opacity:0.8;"></i>Mark Areas of Pain or Concern</h2>
                <p>Select your gender first, then tap or click the diagram to add pain markers</p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <div class="view-toggle">
                  <button id="btnMale" onclick="setGender('male')" class="active" data-testid="btn-male">
                    <i class="fas fa-mars" style="margin-right:4px;"></i>Male
                  </button>
                  <button id="btnFemale" onclick="setGender('female')" data-testid="btn-female">
                    <i class="fas fa-venus" style="margin-right:4px;"></i>Female
                  </button>
                </div>
                <div class="view-toggle">
                  <button id="btnAnterior" onclick="setView('anterior')" class="active" data-testid="btn-anterior">Anterior</button>
                  <button id="btnPosterior" onclick="setView('posterior')" data-testid="btn-posterior">Posterior</button>
                </div>
              </div>
            </div>
          </div>
          <div class="card-body">
            <!-- Legend -->
            <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px;align-items:center;">
              <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-light);">
                <div class="legend-dot" style="background:rgba(91,163,217,0.25);border:1px solid rgba(91,163,217,0.7);"></div> Hover to identify
              </div>
              <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-light);">
                <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                  <input id="toggleMusclePolygons" type="checkbox" onchange="toggleMusclePolygons(this.checked)" data-testid="toggle-muscle-polygons" />
                  Show muscle polygons
                </label>
              </div>
                <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-light);">
                <div class="legend-dot" style="background:rgba(239, 68, 68, 0.9);border:1px solid rgba(239, 68, 68, 1);"></div> Pain marker
              </div>
              <div style="margin-left:auto;font-size:0.75rem;color:var(--text-light);">
                <i class="fas fa-hand-pointer" style="color:var(--accent);margin-right:4px;"></i>
                Click diagram to place marker · Click marker to remove
              </div>
            </div>
            <div style="display:flex;justify-content:center;overflow:auto;">
              <div id="muscleMapContainer" style="min-width:260px;max-width:400px;width:100%;"></div>
            </div>
          </div>
        </div>

        <!-- Selected muscles + nav -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card-plain">
            <div class="cp-head">
              <i class="fas fa-location-dot"></i> Pain Markers
            </div>
            <div class="cp-body">
              <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                  <div class="legend-dot" style="background:rgba(239, 68, 68, 0.9);border:1px solid rgba(239, 68, 68, 1);"></div>
                  <span style="font-size:0.72rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;">Marked Areas</span>
                </div>
                <div id="treatedList" style="min-height:24px;">
                  <p style="font-size:0.75rem;color:var(--text-light);font-style:italic;">No markers placed yet</p>
                </div>
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                  <div class="legend-dot" style="background:rgba(91,163,217,0.25);border:1px solid rgba(91,163,217,0.7);"></div>
                  <span style="font-size:0.72rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;">Marker Notes</span>
                </div>
                <div id="followupList" style="min-height:24px;">
                  <p style="font-size:0.75rem;color:var(--text-light);font-style:italic;">Add a marker on the map, then describe each area here.</p>
                </div>
              </div>
              <button onclick="clearAllMuscles()" class="btn btn-ghost btn-sm btn-full" style="margin-top:14px;font-size:0.75rem;" data-testid="btn-clear-all-markers">
                <i class="fas fa-times"></i> Clear All Markers
              </button>
            </div>
          </div>

          <div class="info-box info-box-blue" style="font-size:0.78rem;">
            <strong><i class="fas fa-lightbulb" style="margin-right:5px;"></i>Tip:</strong>
            Toggle Anterior / Posterior to select muscles on both sides. All selections are retained.
          </div>

          <!-- Quick Select Common Areas -->
          <div class="card-plain">
            <div class="cp-head" style="cursor:pointer;user-select:none;" onclick="toggleQuickSelectPanel()">
              <i class="fas fa-bolt"></i> Quick Select
              <i id="quickSelectChevron" class="fas fa-chevron-down" style="margin-left:auto;font-size:0.7rem;transition:transform 0.2s;"></i>
            </div>
            <div id="quickSelectPanel" class="cp-body" style="display:none;padding-top:8px;">
              <p style="font-size:0.72rem;color:var(--text-light);margin-bottom:10px;">Select common pain patterns to quickly add markers:</p>
              <div id="quickSelectButtons" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button onclick="goToStep(1)" class="btn btn-ghost" style="flex:1;justify-content:center;" data-testid="btn-step2-back">
              <i class="fas fa-arrow-left"></i> Back
            </button>
            <button onclick="goToStep(3)" class="btn btn-primary" style="flex:1;justify-content:center;" data-testid="btn-step2-next">
              Next <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ═══════════════════════════════════════
         STEP 3: SESSION NOTES
         ═══════════════════════════════════════ -->
    <div id="panel3" class="step-panel">
      <div class="grid-2" style="gap:20px;">

        <div class="card">
          <div class="card-header-bar">
            <h2><i class="fas fa-pen-to-square" style="margin-right:8px;opacity:0.8;"></i>Session Summary</h2>
            <p>Describe what you found and what you did</p>
          </div>
          <div class="card-body">
            <div class="field">
              <label>Techniques Used</label>
              <div id="techniqueCheckboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;"></div>
            </div>
            <div class="field" style="margin-top:4px;">
              <label>Session Notes <span style="font-weight:400;color:var(--text-light);text-transform:none;">(describe what you found &amp; did)</span></label>
              <textarea id="sessionSummary" rows="6"
                placeholder="Describe your findings and treatment approach…&#10;&#10;e.g. Client presented with elevated tone in upper traps bilaterally. Significant trigger points at TP1 and TP2. Applied sustained pressure for 90s each. ROM improved post-treatment…"
                style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.85rem;color:var(--text);resize:vertical;outline:none;line-height:1.7;transition:border-color 0.2s,box-shadow 0.2s;"
                onfocus="this.style.borderColor='var(--accent)';this.style.boxShadow='0 0 0 3px rgba(91,163,217,0.15)'"
                onblur="this.style.borderColor='var(--border)';this.style.boxShadow='none'"></textarea>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Post-Session Pain (0–10)</label>
                <input id="postPainLevel" type="number" min="0" max="10" placeholder="3" />
              </div>
              <div class="field">
                <label>Client Feedback</label>
                <input id="clientFeedback" type="text" placeholder="e.g. Significant relief in neck area…" />
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:16px;">

          <!-- Session preview -->
          <div class="card-plain">
            <div class="cp-head"><i class="fas fa-eye"></i> Session Preview</div>
            <div class="cp-body">
              <div class="summary-row"><span class="sr-label">Client</span><span class="sr-val" id="summaryClient">—</span></div>
              <div class="summary-row"><span class="sr-label">Date</span><span class="sr-val" id="summaryDate">—</span></div>
              <div class="summary-row"><span class="sr-label">Duration</span><span class="sr-val" id="summaryDuration">—</span></div>
              <div class="summary-row"><span class="sr-label">Markers placed</span><span class="sr-val" id="summaryMuscleCount">0</span></div>
              <div class="summary-row"><span class="sr-label">Follow-up needed</span><span class="sr-val" id="summaryFollowupCount">0</span></div>
            </div>
          </div>

          <div class="card-plain">
            <div class="cp-head"><i class="fas fa-clipboard-check"></i> Review Intake Data</div>
            <div class="cp-body" style="display:flex;flex-direction:column;gap:8px;">
              <p id="intakeReviewStatus" style="font-size:0.76rem;color:var(--text-light);">Quick final check before Generate &amp; Save.</p>
              <div class="summary-row"><span class="sr-label">Client</span><span class="sr-val" id="reviewClientName">—</span></div>
              <div class="summary-row"><span class="sr-label">Email</span><span class="sr-val" id="reviewClientEmail">—</span></div>
              <div class="summary-row"><span class="sr-label">DOB</span><span class="sr-val" id="reviewClientDOB">—</span></div>
              <div class="summary-row"><span class="sr-label">Chief complaint</span><span class="sr-val" id="reviewChiefComplaint">—</span></div>
              <div class="summary-row"><span class="sr-label">Pain B/A</span><span class="sr-val" id="reviewPainRange">—</span></div>
              <div class="summary-row"><span class="sr-label">Duration</span><span class="sr-val" id="reviewDuration">—</span></div>
              <div class="summary-row"><span class="sr-label">Medications</span><span class="sr-val" id="reviewMedications">—</span></div>
              <div class="summary-row"><span class="sr-label">Session notes</span><span class="sr-val" id="reviewSessionNotes">—</span></div>
              <div class="summary-row" style="align-items:flex-start;"><span class="sr-label">Intake summary</span><span class="sr-val" id="reviewIntakePreview">—</span></div>
              <div style="display:flex;gap:8px;margin-top:6px;">
                <button onclick="jumpToField(1, 'chiefComplaint')" class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;">
                  <i class="fas fa-pen"></i> Edit Intake
                </button>
                <button onclick="jumpToField(3, 'sessionSummary')" class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;">
                  <i class="fas fa-pen"></i> Edit Notes
                </button>
              </div>
            </div>
          </div>

          <!-- API Status -->
          <div class="card-plain">
            <div class="cp-head"><i class="fas fa-robot"></i> AI Configuration</div>
            <div class="cp-body">
              <div id="apiStatusContainer">
                <p style="font-size:0.78rem;color:var(--text-light);margin-bottom:10px;">
                  <i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Checking AI service status...
                </p>
              </div>
            </div>
          </div>

          <div class="info-box info-box-yellow">
            <p><strong><i class="fas fa-triangle-exclamation" style="margin-right:5px;"></i>Before Generating:</strong> Confirm the intake review above. Generate &amp; Save will create SOAP notes and save the updated session data to the client file.</p>
          </div>

          <!-- Medical Shorthand Toggle -->
          <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f7faff;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:0.78rem;color:var(--text);cursor:pointer;">
            <input id="medicalShorthandToggle" type="checkbox" style="accent-color:var(--primary);cursor:pointer;" />
            <span>Use medical shorthand (applies to generation + PDF export)</span>
          </label>
          <p id="writingStyleBadge" style="font-size:0.72rem;color:var(--text-light);margin-top:-8px;">Current style: Normal writing</p>

          <div style="display:flex;gap:10px;">
            <button id="goToStep2FromNotesBtn" class="btn btn-ghost" style="flex:1;justify-content:center;">
              <i class="fas fa-arrow-left"></i> Back
            </button>
            <button onclick="generateSOAP()" id="generateBtn" class="btn btn-primary" style="flex:1;justify-content:center;" data-testid="btn-generate-soap">
              <i class="fas fa-wand-magic-sparkles"></i> Generate &amp; Save
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════
         STEP 4: SOAP NOTES
         ═══════════════════════════════════════ -->
    <div id="panel4" class="step-panel">
      <div style="display:grid;grid-template-columns:1fr 280px;gap:20px;">

        <!-- SOAP Content -->
        <div style="display:flex;flex-direction:column;gap:16px;">

          <!-- Loading state -->
          <div id="soapLoading" style="display:none;" class="card">
            <div class="card-body" style="text-align:center;padding:48px 28px;">
              <div style="width:64px;height:64px;border-radius:50%;background:#e2ebf7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                <i class="fas fa-wand-magic-sparkles fa-spin" style="color:var(--primary);font-size:1.5rem;"></i>
              </div>
              <h3 style="font-size:1rem;font-weight:700;color:var(--primary);margin-bottom:8px;">Generating SOAP Notes…</h3>
              <p style="font-size:0.82rem;color:var(--text-light);">AI is analysing your session data and creating professional documentation</p>
              <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px;align-items:center;">
                <div class="shimmer" style="height:12px;width:75%;"></div>
                <div class="shimmer" style="height:12px;width:55%;"></div>
                <div class="shimmer" style="height:12px;width:65%;"></div>
              </div>
            </div>
          </div>

          <!-- SOAP sections -->
          <div id="soapContent" style="display:none;flex-direction:column;gap:16px;">

            <!-- Header -->
            <div class="card">
              <div class="card-header-bar">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                  <div>
                    <h2 id="soapClientName" style="font-size:1.1rem;margin-bottom:2px;"></h2>
                    <p id="soapMeta" style="opacity:0.8;font-size:0.78rem;"></p>
                  </div>
                  <div style="text-align:right;font-size:0.75rem;opacity:0.75;">
                    <div id="soapDate"></div>
                    <div id="soapDuration"></div>
                  </div>
                </div>
                <div id="soapMusclesSummary" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;"></div>
                <!-- Save badges -->
                <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                  <span id="savedFileBadge" style="display:none;background:rgba(255,255,255,0.15);border-radius:50px;padding:3px 10px;font-size:0.72rem;font-weight:600;">
                    <i class="fas fa-folder-open" style="margin-right:4px;"></i><span></span>
                  </span>
                  <a id="driveBadge" href="#" target="_blank" style="display:none;background:rgba(255,255,255,0.15);border-radius:50px;padding:3px 10px;font-size:0.72rem;font-weight:600;color:white;text-decoration:none;" hidden>
                    <i class="fab fa-google-drive" style="margin-right:4px;"></i>View in Drive
                  </a>
                </div>
              </div>
            </div>

            <!-- S -->
            <div class="card">
              <div class="card-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <div class="soap-letter soap-letter-s">S</div>
                  <h3 style="font-size:0.9rem;font-weight:700;color:var(--primary);">Subjective</h3>
                  <button id="copySectionSBtn" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
                </div>
                <div class="soap-block soap-s">
                  <textarea id="soapS" rows="4" class="soap-textarea"></textarea>
                </div>
              </div>
            </div>

            <!-- O -->
            <div class="card">
              <div class="card-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <div class="soap-letter soap-letter-o">O</div>
                  <h3 style="font-size:0.9rem;font-weight:700;color:var(--primary);">Objective</h3>
                  <button id="copySectionOBtn" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
                </div>
                <div class="soap-block soap-o">
                  <textarea id="soapO" rows="5" class="soap-textarea"></textarea>
                </div>
              </div>
            </div>

            <!-- A -->
            <div class="card">
              <div class="card-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <div class="soap-letter soap-letter-a">A</div>
                  <h3 style="font-size:0.9rem;font-weight:700;color:var(--primary);">Assessment</h3>
                  <button id="copySectionABtn" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
                </div>
                <div class="soap-block soap-a">
                  <textarea id="soapA" rows="4" class="soap-textarea"></textarea>
                </div>
              </div>
            </div>

            <!-- P -->
            <div class="card">
              <div class="card-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <div class="soap-letter soap-letter-p">P</div>
                  <h3 style="font-size:0.9rem;font-weight:700;color:var(--primary);">Plan</h3>
                  <button id="copySectionPBtn" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
                </div>
                <div class="soap-block soap-p">
                  <textarea id="soapP" rows="4" class="soap-textarea"></textarea>
                </div>
              </div>
            </div>

            <!-- N -->
            <div class="card">
              <div class="card-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <div class="soap-letter soap-letter-n">N</div>
                  <h3 style="font-size:0.9rem;font-weight:700;color:var(--primary);">Therapist Notes</h3>
                  <button id="copySectionNBtn" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
                </div>
                <div class="soap-block soap-n">
                  <textarea id="soapN" rows="3" class="soap-textarea"></textarea>
                </div>
              </div>
            </div>

            <!-- Signature -->
            <div class="card">
              <div class="card-header-bar" style="padding:14px 24px;">
                <h2 style="font-size:0.88rem;"><i class="fas fa-signature" style="margin-right:8px;opacity:0.8;"></i>Therapist Signature</h2>
              </div>
              <div class="card-body">
                <div class="field-row">
                  <div class="field"><label>Therapist Name</label><input id="therapistName" type="text" placeholder="Your full name" /></div>
                  <div class="field"><label>Credentials</label><input id="therapistCredentials" type="text" placeholder="e.g. LMT, RMT, CMT" /></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Right panel: Actions + Muscles -->
        <div style="display:flex;flex-direction:column;gap:16px;">

          <div class="card">
            <div class="card-header-bar" style="padding:14px 20px;">
              <h2 style="font-size:0.88rem;"><i class="fas fa-file-export" style="margin-right:8px;opacity:0.8;"></i>Export &amp; Actions</h2>
            </div>
            <div class="card-body">
              <div style="display:flex;flex-direction:column;gap:8px;">
                <button onclick="exportPDF()" class="btn btn-primary btn-full" data-testid="btn-export-pdf">
                  <i class="fas fa-file-pdf"></i> Export as PDF
                </button>
                <button onclick="copyAllSOAP()" class="btn btn-outline btn-full">
                  <i class="fas fa-copy"></i> Copy All Text
                </button>
                <button onclick="regenerateSOAP()" class="btn btn-ghost btn-full" data-testid="btn-regenerate-soap">
                  <i class="fas fa-rotate"></i> Regenerate
                </button>
              </div>
            </div>
          </div>

          <div class="card-plain">
            <div class="cp-head"><i class="fas fa-person"></i> Muscles Reference</div>
            <div class="cp-body">
              <div id="soapMusclesList" style="font-size:0.78rem;color:var(--text);"></div>
            </div>
          </div>

          <div style="display:flex;gap:10px;">
            <button id="goToStep3FromSOAPBtn" class="btn btn-ghost" style="flex:1;justify-content:center;"><i class="fas fa-arrow-left"></i> Back</button>
            <button id="resetAllFromSOAPBtn" class="btn btn-outline" style="flex:1;justify-content:center;"><i class="fas fa-plus"></i> New</button>
          </div>

        </div>
      </div>
    </div>

  </main>

  <!-- Footer -->
  <footer class="site-footer">
    <strong>Flexion &amp; Flow</strong> · Remedial Massage · SOAP Note Generator<br>
    <span style="font-size:0.72rem;opacity:0.75;">4/207 Barkly St, Footscray VIC 3011 · 0420 435 950 · dylan@flexionandflow.com.au</span>
  </footer>

  <!-- ═══════════════════════════════════════
       CLIENT BROWSER MODAL
       ═══════════════════════════════════════ -->
  <div id="clientBrowserModal" class="modal-backdrop hidden" style="display:none;">
    <div class="modal-box" style="max-width:640px;max-height:90vh;display:flex;flex-direction:column;">
      <div class="modal-header">
        <div>
          <h3><i class="fas fa-users" style="margin-right:8px;opacity:0.8;"></i>Client Profiles</h3>
          <p>Select a client to auto-fill their intake information</p>
        </div>
        <button id="modalCloseClientBrowserBtn" class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);">
        <div style="position:relative;">
          <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-light);font-size:0.8rem;"></i>
          <input id="clientSearch" type="text" placeholder="Search by name, email or phone…"
            oninput="filterClients().catch(console.error)"
            style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.82rem;outline:none;"
            onfocus="this.style.borderColor='var(--accent)'"
            onblur="this.style.borderColor='var(--border)'"/>
        </div>
      </div>
      <div id="clientList" class="modal-body" style="flex:1;"></div>
      <div class="modal-footer">
        <span id="clientCount" style="font-size:0.75rem;color:var(--text-light);"></span>
        <button id="closeClientBrowserBtn" class="btn btn-ghost btn-sm">Close</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════
       WEBHOOK SETUP MODAL
       ═══════════════════════════════════════ -->
  <div id="webhookModal" class="modal-backdrop hidden" style="display:none;">
    <div class="modal-box" style="max-width:520px;">
      <div class="modal-header">
        <div>
          <h3><i class="fas fa-link" style="margin-right:8px;opacity:0.8;"></i>Flexion &amp; Flow Integration Setup</h3>
          <p>Connect the intake form to this SOAP generator</p>
        </div>
        <button id="modalCloseWebhookBtn" class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="info-box info-box-blue" style="margin-bottom:18px;">
          <strong><i class="fas fa-plug" style="margin-right:5px;"></i>How it works:</strong>
          <ol style="margin:8px 0 0 16px;font-size:0.78rem;line-height:1.8;">
            <li>Client submits the Flexion &amp; Flow intake form</li>
            <li>Form automatically sends their data to this app</li>
            <li>Client profile appears in the Browse Clients panel</li>
            <li>Click their name to auto-fill a new SOAP session instantly</li>
          </ol>
        </div>

        <div class="field">
          <label>This App's Webhook URL</label>
          <div style="display:flex;gap:8px;">
            <input id="myWebhookUrl" type="text" readonly
              style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:monospace;font-size:0.78rem;background:#f7faff;color:var(--text);outline:none;"/>
            <button id="copyWebhookUrlBtn" class="btn btn-ghost btn-sm" title="Copy URL">
              <i class="fas fa-copy"></i>
            </button>
          </div>
          <p style="font-size:0.72rem;color:var(--text-light);margin-top:5px;">
            Copy this URL and add it as <code style="background:#e2ebf7;padding:1px 5px;border-radius:3px;">SOAP_NOTE_WEBHOOK_URL</code> in your intake form's environment variables.
          </p>
        </div>

        <div class="field">
          <label>Intake Form App URL <span style="font-weight:400;color:var(--text-light);text-transform:none;">(optional)</span></label>
          <input id="intakeFormUrl" type="text" placeholder="https://your-intake-form.railway.app" />
        </div>

        <div class="info-box info-box-yellow" style="margin-bottom:18px;">
          <p><strong><i class="fas fa-triangle-exclamation" style="margin-right:5px;"></i>Add to your intake form .env:</strong></p>
          <pre id="envSnippet" style="margin-top:8px;background:rgba(0,0,0,0.06);border-radius:4px;padding:8px;font-size:0.75rem;font-family:monospace;overflow-x:auto;white-space:pre-wrap;"></pre>
        </div>

        <div style="display:flex;gap:10px;">
          <button onclick="saveWebhookConfig()" class="btn btn-primary" style="flex:1;justify-content:center;">
            <i class="fas fa-save"></i> Save Settings
          </button>
          <button onclick="closeWebhookConfig()" class="btn btn-ghost" style="flex:1;justify-content:center;">Cancel</button>
        </div>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);">
          <p style="font-size:0.8rem;font-weight:700;color:var(--primary);margin-bottom:6px;">Manual Import</p>
          <p style="font-size:0.75rem;color:var(--text-light);margin-bottom:8px;">Paste a client profile in JSON format:</p>
          <textarea id="manualImportJson" rows="3"
            placeholder='{"firstName":"Jane","lastName":"Smith","email":"jane@example.com",...}'
            style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:monospace;font-size:0.75rem;outline:none;resize:vertical;"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>
          <button onclick="importManualProfile()" class="btn btn-outline btn-sm" style="margin-top:8px;">
            <i class="fas fa-file-import"></i> Import Profile
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast notification -->
  <div id="toast"></div>

  <!-- Muscle tooltip -->
  <div id="muscleTooltip" class="muscle-tooltip" style="display:none;"></div>

  <script>
  // ============================================================
  // CSRF Protection & API Helpers
  // ============================================================
  let _csrfToken = null;
  
  async function getCsrfToken() {
    if (_csrfToken) return _csrfToken;
    try {
      const res = await fetch('/api/csrf-token');
      const data = await res.json();
      _csrfToken = data.csrfToken;
      return _csrfToken;
    } catch(e) {
      console.warn('Could not fetch CSRF token:', e);
      return null;
    }
  }
  
  // CSRF-protected fetch wrapper for POST/PUT/DELETE requests
  async function apiFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { ...options.headers };
    
    // Add CSRF token for state-changing requests
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const token = await getCsrfToken();
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }
    
    return fetch(url, { ...options, headers });
  }

  // ============================================================
  // CLIENT PROFILES (localStorage-based, synced via webhook)
  // ============================================================
  const CLIENT_PROFILES_KEY = 'flexion_soap_client_profiles';
  const WEBHOOK_CONFIG_KEY  = 'flexion_soap_webhook_config';

  // ── API Status Check (server-side key) ──
  async function checkAPIStatus() {
    const container = document.getElementById('apiStatusContainer');
    if (!container) return;
    
    try {
      const response = await fetch('/api/ai-status');
      const data = await response.json();
      
      if (data.configured) {
        container.innerHTML = \`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#e6f7ed;border:1px solid #c6f6d5;border-radius:var(--radius-sm);">
            <i class="fas fa-check-circle" style="color:var(--success);font-size:1.1rem;"></i>
            <div>
              <div style="font-size:0.82rem;font-weight:600;color:#276749;">AI Service Ready</div>
              <div style="font-size:0.72rem;color:#38a169;">OpenAI is configured and ready to generate SOAP notes</div>
            </div>
          </div>
        \`;
      } else {
        container.innerHTML = \`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--warning-bg);border:1px solid #fde68a;border-radius:var(--radius-sm);">
            <i class="fas fa-exclamation-triangle" style="color:var(--warning-txt);font-size:1.1rem;"></i>
            <div>
              <div style="font-size:0.82rem;font-weight:600;color:var(--warning-txt);">AI Service Not Configured</div>
              <div style="font-size:0.72rem;color:#92400e;">Contact administrator to set up OpenAI API key</div>
            </div>
          </div>
        \`;
      }
    } catch(e) {
      container.innerHTML = \`
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fee2e2;border:1px solid #fecaca;border-radius:var(--radius-sm);">
          <i class="fas fa-times-circle" style="color:var(--danger);font-size:1.1rem;"></i>
          <div>
            <div style="font-size:0.82rem;font-weight:600;color:var(--danger);">Connection Error</div>
            <div style="font-size:0.72rem;color:#991b1b;">Could not check AI service status</div>
          </div>
        </div>
      \`;
    }
  }

  // Load client profiles from server database (replaces localStorage)
  async function loadClientProfiles() {
    try {
      const res = await fetch('/api/clients');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.clients || []).map(c => ({
        id: c.accountNumber,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        email: c.email || '',
        phone: c.phone || '',
        dob: c.dob || '',
        occupation: c.occupation || '',
        chiefComplaint: c.chiefComplaint || '',
        savedAt: c.updatedAt || c.createdAt,
        accountNumber: c.accountNumber
      }));
    } catch {
      return [];
    }
  }
  function loadWebhookConfig() {
    try { return JSON.parse(localStorage.getItem(WEBHOOK_CONFIG_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveWebhookConfigData(cfg) {
    localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(cfg));
  }

  // Save a single profile (upsert by id or email) - now posts to server
  async function upsertClientProfile(profile) {
    try {
      const res = await apiFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          dob: profile.dob,
          occupation: profile.occupation,
          chiefComplaint: profile.chiefComplaint || profile.primaryConcern,
          medications: profile.medications,
          allergies: profile.allergies,
          medicalConditions: profile.medicalConditions,
          areasToAvoid: profile.areasToAvoid,
          source: profile.source || 'manual-entry',
          intakeData: profile.intakeData || {}
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await renderClientProfilesPreview();
      }
      return {
        success: res.ok,
        accountNumber: data.accountNumber || null
      };
    } catch {
      return {
        success: false,
        accountNumber: null
      };
    }
  }

  async function removeClientProfile(id) {
    if (!id) return;
    if (!confirm('Remove this client profile and all saved sessions?')) return;

    try {
      const res = await apiFetch('/api/clients/' + encodeURIComponent(id), {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove profile');
      }

      if (_currentClientFile && _currentClientFile.accountNumber === id) {
        closeClientFile();
      }

      await renderClientProfilesPreview();
      await filterClients();
      if (document.getElementById('clientAccountsModal')?.style.display === 'flex') {
        await loadAccountList();
      }

      showCopyFeedback('\u2705 Profile removed: ' + id);
    } catch (e) {
      alert('Could not remove profile: ' + (e?.message || 'Unknown error'));
    }
  }

  // Delete a profile
  // This is now handled by removeClientProfile - keeping for compatibility
  async function deleteClientProfile(id) {
    await removeClientProfile(id);
  }

  // Render the quick-access chips in Step 1
  async function renderClientProfilesPreview() {
    const profiles = await loadClientProfiles();
    const container = document.getElementById('clientProfilesPreview');
    const noMsg = document.getElementById('noClientsMsg');
    if (!container) return;
    if (profiles.length === 0) {
      container.innerHTML = '<p style="font-size:0.82rem;color:var(--text-light);font-style:italic;margin:0;" id="noClientsMsg"><i class="fas fa-info-circle" style="margin-right:6px;opacity:0.7;"></i>No client profiles yet — connect your intake form or upload a PDF below.</p>';
      return;
    }
    if (noMsg) noMsg.remove();
    // Show last 6 profiles as clickable chips
    const recent = profiles.slice(0, 6);
    container.innerHTML = recent.map(p => {
      const name = escapeHtml([p.firstName, p.lastName].filter(Boolean).join(' '));
      const initials = escapeHtml([(p.firstName||'')[0], (p.lastName||'')[0]].filter(Boolean).join('').toUpperCase());
      const safeId = escapeHtml(p.id);
      const ago = p.savedAt ? timeAgo(p.savedAt) : '';
      return '<button onclick="loadClientProfile(this.dataset.clientId)" data-client-id="' + safeId + '" class="client-chip">'
        + '<div class="chip-avatar">' + (initials || "?") + '</div>'
        + '<div class="chip-content">'
        + '<div class="chip-name">' + (name || "Unknown") + '</div>'
        + (ago ? '<div class="chip-ago">' + escapeHtml(ago) + '</div>' : "")
        + '</div>'
        + '</button>';
    }).join('');
    if (profiles.length > 6) {
      container.innerHTML += '<button onclick="openClientBrowser()" class="client-chip" style="border-style:dashed;opacity:0.7;">'
        + '<div class="chip-avatar" style="background:var(--text-light); font-size:0.8rem;">'
        + '<i class="fas fa-ellipsis"></i>'
        + '</div>'
        + '<div class="chip-content">'
        + '<div class="chip-name" style="color:var(--text-light);">+' + (profiles.length - 6) + ' more</div>'
        + '</div>'
        + '</button>';
    }
    // Update webhook banner
    const cfg = loadWebhookConfig();
    const banner = document.getElementById('webhookBanner');
    const urlDisplay = document.getElementById('webhookUrlDisplay');
    if (cfg.myUrl && banner && urlDisplay) {
      banner.style.display = 'block';
      urlDisplay.textContent = cfg.myUrl;
    }
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return days + ' days ago';
    const months = Math.floor(days / 30);
    return months + ' month' + (months > 1 ? 's' : '') + ' ago';
  }

  // Load a client profile into the Step 1 form
  async function loadClientProfile(id) {
    const profiles = await loadClientProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;

    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');

    // Fill in all fields
    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el && val) el.value = val; };
    setVal('clientFirstName',  p.firstName);
    setVal('clientLastName',   p.lastName);
    setVal('clientEmail',      p.email || '');
    setVal('clientDOB',        p.dob ? p.dob.split('T')[0] : '');
    setVal('chiefComplaint',   p.chiefComplaint || p.primaryConcern || '');
    setVal('painLevel',        p.painIntensity != null ? p.painIntensity : '');
    setVal('medications',      p.medications || '');

    // Build a structured intake summary
    const lines = [];
    const add = (label, val) => { if (val && String(val).trim() && !/^no$/i.test(String(val).trim())) lines.push(label + ': ' + String(val).trim()); };
    add('Client Name',       name);
    add('Date of Birth',     p.dob ? p.dob.split('T')[0] : '');
    add('Email',             p.email);
    add('Phone',             p.phone);
    add('Occupation',        p.occupation);
    add('Reason for Visit',  p.chiefComplaint || p.primaryConcern);
    add('Pain Intensity',    p.painIntensity != null ? p.painIntensity + '/10' : '');
    add('Areas to Avoid',    p.areasToAvoid);
    add('Medications',       p.medications);
    add('Allergies',         p.allergies);
    add('Medical Conditions',p.medicalConditions);
    add('Last Treatment',    p.lastTreatment);
    add('Submitted',         p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('en-AU') : '');

    const intakeEl = document.getElementById('intakeFormData');
    if (intakeEl) intakeEl.value = lines.join('\\n');

    closeClientBrowser();
    updateSummaryPanel();
    showCopyFeedback('\\u2705 Client loaded: ' + name);
  }

  // ============================================================
  // CLIENT BROWSER MODAL
  // ============================================================
  async function openClientBrowser() {
    const modal = document.getElementById('clientBrowserModal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    await filterClients();
    document.getElementById('clientSearch').focus();
  }
  function closeClientBrowser() {
    const modal = document.getElementById('clientBrowserModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }

  async function filterClients() {
    const query = (document.getElementById('clientSearch')?.value || '').toLowerCase().trim();
    const profiles = await loadClientProfiles();
    const filtered = query
      ? profiles.filter(p =>
          [p.firstName, p.lastName, p.email, p.phone].join(' ').toLowerCase().includes(query))
      : profiles;

    const list = document.getElementById('clientList');
    const countEl = document.getElementById('clientCount');
    if (!list) return;

    if (filtered.length === 0) {
      list.innerHTML = '<p style="font-size:0.82rem;color:var(--text-light);text-align:center;padding:32px 0;"><i class="fas fa-user-slash" style="display:block;font-size:1.8rem;margin-bottom:8px;"></i>' +
        (query ? 'No clients match "' + query + '"' : 'No client profiles saved yet.') + '</p>';
      if (countEl) countEl.textContent = '';
      return;
    }

    if (countEl) countEl.textContent = filtered.length + ' client' + (filtered.length !== 1 ? 's' : '');

    list.innerHTML = filtered.map(p => {
      const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
      const initials = [(p.firstName||'')[0], (p.lastName||'')[0]].filter(Boolean).join('').toUpperCase();
      const dateStr = p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('en-AU') : '';
      const tags = [];
      if (p.source === 'flexion-intake-form') tags.push('<span class="px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded text-[10px]">Intake Form</span>');
      if (p.medicalConditions) tags.push('<span class="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px]">Medical Hx</span>');
      if (p.medications)       tags.push('<span class="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px]">Medications</span>');
      return \`<div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition cursor-pointer group" onclick="loadClientProfile('\${p.accountNumber}').catch(console.error)">
        <div class="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold flex-shrink-0">\${escapeHtml(initials || '?')}</div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-slate-800 text-sm">\${escapeHtml(name || 'Unknown Client')}</div>
          <div class="text-xs text-slate-400">\${escapeHtml([p.email, p.phone].filter(Boolean).join(' · '))}</div>
          <div class="flex flex-wrap gap-1 mt-1">\${tags.join('')}</div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="text-xs text-slate-400">\${dateStr}</div>
          <button onclick="event.stopPropagation(); deleteClientProfile('\${escJsSingle(p.accountNumber)}').catch(console.error)" class="mt-1 text-[10px] text-slate-300 hover:text-red-500 transition hidden group-hover:block">
            <i class="fas fa-trash"></i> Remove
          </button>
        </div>
      </div>\`;
    }).join('');
  }

  // ============================================================
  // WEBHOOK CONFIG MODAL
  // ============================================================
  function openWebhookConfig() {
    const modal = document.getElementById('webhookModal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    const myUrl = window.location.origin + '/api/intake-webhook';
    const urlInput = document.getElementById('myWebhookUrl');
    if (urlInput) urlInput.value = myUrl;

    const envSnippet = document.getElementById('envSnippet');
    if (envSnippet) envSnippet.textContent = 'SOAP_NOTE_WEBHOOK_URL=' + myUrl;

    const cfg = loadWebhookConfig();
    const intakeInput = document.getElementById('intakeFormUrl');
    if (intakeInput && cfg.intakeFormUrl) intakeInput.value = cfg.intakeFormUrl;
  }
  function closeWebhookConfig() {
    const modal = document.getElementById('webhookModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }
  function copyWebhookUrl() {
    const val = document.getElementById('myWebhookUrl')?.value;
    if (val) { navigator.clipboard.writeText(val); showCopyFeedback('\\u2705 Webhook URL copied!'); }
  }
  function saveWebhookConfig() {
    const intakeFormUrl = document.getElementById('intakeFormUrl')?.value.trim() || '';
    const myUrl = document.getElementById('myWebhookUrl')?.value.trim() || '';
    saveWebhookConfigData({ intakeFormUrl, myUrl });
    closeWebhookConfig();
    renderClientProfilesPreview().catch(console.error);
    showCopyFeedback('\\u2705 Settings saved');
  }
  async function importManualProfile() {
    const raw = document.getElementById('manualImportJson')?.value.trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (!data.firstName && !data.lastName) { alert('Profile must have at least firstName or lastName.'); return; }
      if (!data.id) data.id = 'manual-' + Date.now();
      data.source = 'manual-import';
      data.savedAt = new Date().toISOString();
      const result = await upsertClientProfile(data);
      if (!result.success) {
        throw new Error('Import failed');
      }
      document.getElementById('manualImportJson').value = '';
      showCopyFeedback('\\u2705 Profile imported: ' + [data.firstName, data.lastName].filter(Boolean).join(' '));
      await filterClients();
    } catch(e) {
      alert('Invalid JSON. Please check the format and try again.');
    }
  }

  // ============================================================
  // HANDLE INCOMING WEBHOOK DATA (when page is the target)
  // The intake form can also redirect to this page with ?clientData=...
  // ============================================================
  async function checkUrlClientData() {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('clientData');
      if (!encoded) return;
      const profile = JSON.parse(atob(encoded));
      if (profile && (profile.firstName || profile.lastName)) {
        if (!profile.id) profile.id = 'url-' + Date.now();
        profile.source = profile.source || 'url-import';
        profile.savedAt = new Date().toISOString();
        const upsertResult = await upsertClientProfile(profile);
        // Auto-load into form
        await loadClientProfile(upsertResult.accountNumber || profile.accountNumber || profile.id);
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        showCopyFeedback('\\u2705 Client data imported from intake form!');
      }
    } catch(e) {}
  }

  // ============================================================
  // STATE
  // ============================================================
  const state = {
    currentStep: 1,
    currentView: 'anterior',
    currentGender: 'male',
    showMusclePolygons: false,
    tensionPoints: [], // Array of dot objects: { id, number, x, y, muscleId, muscleName, type, notes, timestamp }
    treatedMuscles: new Set(), // Auto-populated from tension point muscle IDs
    useMedicalShorthand: false,
    pdfText: '',
    soapData: null,
    lastAccountNumber: null, // set after SOAP auto-save
    lastSessionId: null      // set after SOAP auto-save
  };

  const SHORTHAND_REPLACEMENTS = [
    [/\bbilateral\b/gi, 'B/L'],
    [/\bunilateral\b/gi, 'U/L'],
    [/\bcomplains of\b/gi, 'c/o'],
    [/\breports\b/gi, 'rpts'],
    [/\bpatient\b/gi, 'pt'],
    [/\bclient\b/gi, 'pt'],
    [/\brange of motion\b/gi, 'ROM'],
    [/\bwithin normal limits\b/gi, 'WNL'],
    [/\btenderness to palpation\b/gi, 'TTP'],
    [/\bincreased\b/gi, 'inc'],
    [/\bdecreased\b/gi, 'dec'],
    [/\bapproximately\b/gi, 'approx'],
    [/\bwithout\b/gi, 'w/o'],
    [/\bwith\b/gi, 'w/'],
    [/\bstatus post\b/gi, 's/p']
  ];

  function getStringValue(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    if (typeof el.value === 'string') return el.value.trim();
    if (typeof el.textContent === 'string') return el.textContent.trim();
    return '';
  }

  function formatReviewValue(value) {
    return value && value.trim() ? value.trim() : '—';
  }

  function compactPreview(value, maxLen) {
    const cleaned = (value || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '—';
    if (cleaned.length <= maxLen) return cleaned;
    return cleaned.slice(0, maxLen - 1) + '…';
  }

  function buildIntakeReviewSnapshot() {
    const first = getStringValue('clientFirstName');
    const last = getStringValue('clientLastName');
    const painBefore = getStringValue('painLevel');
    const painAfter = getStringValue('postPainLevel');
    return {
      clientName: [first, last].filter(Boolean).join(' '),
      email: getStringValue('clientEmail'),
      dob: getStringValue('clientDOB'),
      chiefComplaint: getStringValue('chiefComplaint'),
      painSummary: [painBefore ? painBefore + '/10' : '', painAfter ? painAfter + '/10' : ''].filter(Boolean).join(' -> '),
      duration: getStringValue('sessionDuration'),
      medications: getStringValue('medications'),
      sessionNotes: getStringValue('sessionSummary'),
      intakeData: getStringValue('intakeFormData')
    };
  }

  function updateIntakeReviewPanel() {
    const snapshot = buildIntakeReviewSnapshot();
    const required = [
      { key: 'clientName', label: 'client name' },
      { key: 'chiefComplaint', label: 'chief complaint' },
      { key: 'sessionNotes', label: 'session notes' },
      { key: 'duration', label: 'session duration' }
    ];
    const missing = required.filter(item => !snapshot[item.key]).map(item => item.label);

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('reviewClientName', formatReviewValue(snapshot.clientName));
    setText('reviewClientEmail', formatReviewValue(snapshot.email));
    setText('reviewClientDOB', formatReviewValue(snapshot.dob));
    setText('reviewChiefComplaint', formatReviewValue(snapshot.chiefComplaint));
    setText('reviewPainRange', formatReviewValue(snapshot.painSummary));
    setText('reviewDuration', formatReviewValue(snapshot.duration));
    setText('reviewMedications', formatReviewValue(snapshot.medications));
    setText('reviewSessionNotes', compactPreview(snapshot.sessionNotes, 100));
    setText('reviewIntakePreview', compactPreview(snapshot.intakeData, 120));

    const statusEl = document.getElementById('intakeReviewStatus');
    if (statusEl) {
      if (missing.length) {
        statusEl.textContent = 'Needs review: ' + missing.join(', ');
        statusEl.style.color = 'var(--danger)';
      } else {
        statusEl.textContent = 'Ready to generate and save.';
        statusEl.style.color = 'var(--success)';
      }
    }
  }

  function jumpToField(step, fieldId) {
    goToStep(step);
    setTimeout(() => {
      const el = document.getElementById(fieldId);
      if (!el) return;
      el.focus();
      if (typeof el.select === 'function') el.select();
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 140);
  }

  function setMedicalShorthand(enabled) {
    state.useMedicalShorthand = !!enabled;
    updateWritingStyleBadge();
  }

  function updateWritingStyleBadge() {
    const badge = document.getElementById('writingStyleBadge');
    if (badge) {
      badge.textContent = state.useMedicalShorthand
        ? 'Current style: Medical shorthand'
        : 'Current style: Normal writing';
    }
    const toggle = document.getElementById('medicalShorthandToggle');
    if (toggle) toggle.checked = !!state.useMedicalShorthand;
  }

  function toMedicalShorthand(text) {
    if (!text) return '';
    let out = text;
    SHORTHAND_REPLACEMENTS.forEach(([pattern, replacement]) => {
      out = out.replace(pattern, replacement);
    });
    out = out.replace(/\s{2,}/g, ' ');
    return out.trim();
  }

  function applyWritingStyle(text) {
    if (!text) return '';
    return state.useMedicalShorthand ? toMedicalShorthand(text) : text;
  }

  function applyWritingStyleToSoapData(soapData) {
    if (!state.useMedicalShorthand || !soapData) return soapData;
    return {
      ...soapData,
      subjective: applyWritingStyle(soapData.subjective || ''),
      objective: applyWritingStyle(soapData.objective || ''),
      assessment: applyWritingStyle(soapData.assessment || ''),
      plan: applyWritingStyle(soapData.plan || ''),
      therapistNotes: applyWritingStyle(soapData.therapistNotes || '')
    };
  }

  const TECHNIQUES = [
    'Swedish Massage', 'Deep Tissue', 'Trigger Point Therapy',
    'Myofascial Release', 'Neuromuscular Therapy', 'Sports Massage',
    'Hot Stone', 'Lymphatic Drainage', 'Stretching / PNF', 'Cupping',
    'Instrument-Assisted (IASTM)', 'Craniosacral'
  ];

  // ============================================================
  // MUSCLE MAP IMAGE DATA
  // Images: 890x1024 (male), 862x1024 (female)
  // Each image: LEFT HALF = anterior, RIGHT HALF = posterior
  // SVG viewBox per half = 445x1024 (male) / 431x1024 (female)
  // Muscles mapped as ellipses in the HALF-IMAGE coordinate space
  // Anterior: coords as-is; Posterior: subtract half-width offset
  // ============================================================

  // Male image: 890x1024 — each half is 445x1024
  // Female image: 862x1024 — each half is 431x1024
  // We use a normalised 400x920 viewBox for both, scaled to fit

  // Muscle regions defined as { id, name, group, view, cx, cy, rx, ry }
  // Coordinates are in the 400x920 normalised space PER HALF VIEW
  // Anterior muscles: x=0..400, y=0..920 mapped to left half of image
  // Posterior muscles: x=0..400, y=0..920 mapped to right half of image

  const MUSCLES = [
    // ─── ANTERIOR ──────────────────────────────────────────────────
    // CORRECTED ALIGNMENT: Y values shifted UP by ~12-15px to better match image

    // NECK - Sternocleidomastoid
    { id:'scm_l', name:'Sternocleidomastoid (L)', group:'Neck', view:'anterior',
      points:'180,78 174,88 168,102 165,118 166,132 172,140 180,136 185,122 184,106 182,90' },
    { id:'scm_r', name:'Sternocleidomastoid (R)', group:'Neck', view:'anterior',
      points:'220,78 226,88 232,102 235,118 234,132 228,140 220,136 215,122 216,106 218,90' },

    // SHOULDER — ANTERIOR DELTOID
    { id:'deltoid_ant_l', name:'Anterior Deltoid (L)', group:'Shoulder', view:'anterior',
      points:'152,136 140,142 126,152 112,164 102,178 98,194 100,210 110,218 124,220 138,214 148,202 152,186 154,168 153,150' },
    { id:'deltoid_ant_r', name:'Anterior Deltoid (R)', group:'Shoulder', view:'anterior',
      points:'248,136 260,142 274,152 288,164 298,178 302,194 300,210 290,218 276,220 262,214 252,202 248,186 246,168 247,150' },

    // CHEST - Pectoralis Major
    { id:'pec_major_l', name:'Pectoralis Major (L)', group:'Chest', view:'anterior',
      points:'200,156 194,154 180,154 164,158 148,168 134,182 124,200 120,220 124,240 136,256 152,264 170,266 186,260 196,248 200,230 200,210' },
    { id:'pec_major_r', name:'Pectoralis Major (R)', group:'Chest', view:'anterior',
      points:'200,156 206,154 220,154 236,158 252,168 266,182 276,200 280,220 276,240 264,256 248,264 230,266 214,260 204,248 200,230 200,210' },

    // SERRATUS ANTERIOR
    { id:'serratus_l', name:'Serratus Anterior (L)', group:'Core', view:'anterior',
      points:'148,210 140,228 138,250 142,268 152,274 162,266 165,246 160,226 154,212' },
    { id:'serratus_r', name:'Serratus Anterior (R)', group:'Core', view:'anterior',
      points:'252,210 260,228 262,250 258,268 248,274 238,266 235,246 240,226 246,212' },

    // BICEPS BRACHII
    { id:'biceps_l', name:'Biceps Brachii (L)', group:'Upper Arm', view:'anterior',
      points:'134,216 122,228 110,248 100,272 94,300 92,330 96,358 106,374 122,376 134,364 142,340 144,308 140,276 134,248' },
    { id:'biceps_r', name:'Biceps Brachii (R)', group:'Upper Arm', view:'anterior',
      points:'266,216 278,228 290,248 300,272 306,300 308,330 304,358 294,374 278,376 266,364 258,340 256,308 260,276 266,248' },

    // FOREARM FLEXORS
    { id:'forearm_flex_l', name:'Forearm Flexors (L)', group:'Forearm', view:'anterior',
      points:'114,372 100,388 88,410 78,434 72,458 74,476 82,484 98,480 114,464 124,438 130,410 128,386' },
    { id:'forearm_flex_r', name:'Forearm Flexors (R)', group:'Forearm', view:'anterior',
      points:'286,372 300,388 312,410 322,434 328,458 326,476 318,484 302,480 286,464 276,438 270,410 272,386' },

    // CORE — RECTUS ABDOMINIS
    { id:'rectus_abdominis', name:'Rectus Abdominis', group:'Core', view:'anterior',
      points:'188,262 184,290 182,322 182,356 184,388 188,416 196,432 200,434 204,432 212,416 216,388 218,356 218,322 216,290 212,262 200,258' },

    // CORE — EXTERNAL OBLIQUES
    { id:'oblique_l', name:'External Oblique (L)', group:'Core', view:'anterior',
      points:'184,262 174,278 164,306 156,338 150,370 148,400 152,424 164,432 178,424 182,404 184,374 184,340 184,304 184,274' },
    { id:'oblique_r', name:'External Oblique (R)', group:'Core', view:'anterior',
      points:'216,262 226,278 236,306 244,338 250,370 252,400 248,424 236,432 222,424 218,404 216,374 216,340 216,304 216,274' },

    // HIP — ILIOPSOAS
    { id:'iliopsoas_l', name:'Iliopsoas / Hip Flexor (L)', group:'Hip', view:'anterior',
      points:'182,438 174,456 170,476 174,494 182,504 194,504 200,494 200,474 194,454 188,440' },
    { id:'iliopsoas_r', name:'Iliopsoas / Hip Flexor (R)', group:'Hip', view:'anterior',
      points:'218,438 226,456 230,476 226,494 218,504 206,504 200,494 200,474 206,454 212,440' },

    // HIP — TENSOR FASCIA LATAE
    { id:'tfl_l', name:'Tensor Fascia Latae (L)', group:'Hip', view:'anterior',
      points:'152,438 142,456 136,478 134,500 138,518 150,524 162,516 166,496 164,474 158,452' },
    { id:'tfl_r', name:'Tensor Fascia Latae (R)', group:'Hip', view:'anterior',
      points:'248,438 258,456 264,478 266,500 262,518 250,524 238,516 234,496 236,474 242,452' },

    // THIGH — QUADRICEPS
    { id:'quad_l', name:'Quadriceps (L)', group:'Thigh', view:'anterior',
      points:'156,518 144,540 132,572 122,608 118,648 122,682 132,704 150,712 168,706 178,688 182,656 180,620 172,582 162,548 156,528' },
    { id:'quad_r', name:'Quadriceps (R)', group:'Thigh', view:'anterior',
      points:'244,518 256,540 268,572 278,608 282,648 278,682 268,704 250,712 232,706 222,688 218,656 220,620 228,582 238,548 244,528' },

    // THIGH — ADDUCTORS
    { id:'adductors_l', name:'Adductors (L)', group:'Thigh', view:'anterior',
      points:'186,516 180,538 176,572 174,608 174,644 178,672 188,682 198,676 200,648 200,612 200,576 198,542 192,520' },
    { id:'adductors_r', name:'Adductors (R)', group:'Thigh', view:'anterior',
      points:'214,516 220,538 224,572 226,608 226,644 222,672 212,682 202,676 200,648 200,612 200,576 202,542 208,520' },

    // THIGH — SARTORIUS
    { id:'sartorius_l', name:'Sartorius (L)', group:'Thigh', view:'anterior',
      points:'160,514 154,540 152,572 154,606 160,644 168,678 176,702 184,700 180,672 172,638 166,600 164,564 166,532 168,516' },
    { id:'sartorius_r', name:'Sartorius (R)', group:'Thigh', view:'anterior',
      points:'240,514 246,540 248,572 246,606 240,644 232,678 224,702 216,700 220,672 228,638 234,600 236,564 234,532 232,516' },

    // LOWER LEG — TIBIALIS ANTERIOR
    { id:'tibialis_ant_l', name:'Tibialis Anterior (L)', group:'Lower Leg', view:'anterior',
      points:'166,714 158,736 152,764 150,796 154,826 164,844 176,846 188,836 192,812 188,778 180,746 172,724' },
    { id:'tibialis_ant_r', name:'Tibialis Anterior (R)', group:'Lower Leg', view:'anterior',
      points:'234,714 242,736 248,764 250,796 246,826 236,844 224,846 212,836 208,812 212,778 220,746 228,724' },

    // LOWER LEG — PERONEALS
    { id:'peroneals_l', name:'Peroneals (L)', group:'Lower Leg', view:'anterior',
      points:'148,720 140,744 136,774 138,804 144,828 154,834 162,824 162,794 158,762 152,736' },
    { id:'peroneals_r', name:'Peroneals (R)', group:'Lower Leg', view:'anterior',
      points:'252,720 260,744 264,774 262,804 256,828 246,834 238,824 238,794 242,762 248,736' },

    // ─── POSTERIOR ──────────────────────────────────────────────────

    // NECK — UPPER TRAPEZIUS
    { id:'upper_trap_l', name:'Upper Trapezius (L)', group:'Neck/Shoulder', view:'posterior',
      points:'200,76 190,88 176,108 158,132 140,156 122,180 110,202 106,224 116,232 138,228 162,216 184,198 198,176 200,150' },
    { id:'upper_trap_r', name:'Upper Trapezius (R)', group:'Neck/Shoulder', view:'posterior',
      points:'200,76 210,88 224,108 242,132 260,156 278,180 290,202 294,224 284,232 262,228 238,216 216,198 202,176 200,150' },

    // NECK — LEVATOR SCAPULAE
    { id:'levator_scap_l', name:'Levator Scapulae (L)', group:'Neck', view:'posterior',
      points:'192,76 184,92 180,110 184,124 192,130 200,124 200,106 196,88' },
    { id:'levator_scap_r', name:'Levator Scapulae (R)', group:'Neck', view:'posterior',
      points:'208,76 216,92 220,110 216,124 208,130 200,124 200,106 204,88' },

    // SHOULDER — POSTERIOR DELTOID
    { id:'deltoid_post_l', name:'Posterior Deltoid (L)', group:'Shoulder', view:'posterior',
      points:'118,188 104,204 92,226 88,248 94,270 110,278 130,270 144,252 148,228 138,206' },
    { id:'deltoid_post_r', name:'Posterior Deltoid (R)', group:'Shoulder', view:'posterior',
      points:'282,188 296,204 308,226 312,248 306,270 290,278 270,270 256,252 252,228 262,206' },

    // ROTATOR CUFF — INFRASPINATUS
    { id:'infraspinatus_l', name:'Infraspinatus (L)', group:'Rotator Cuff', view:'posterior',
      points:'148,180 134,200 128,224 134,250 150,264 168,268 188,260 200,242 200,218 192,194 174,180' },
    { id:'infraspinatus_r', name:'Infraspinatus (R)', group:'Rotator Cuff', view:'posterior',
      points:'252,180 266,200 272,224 266,250 250,264 232,268 212,260 200,242 200,218 208,194 226,180' },

    // ROTATOR CUFF — TERES MAJOR / MINOR
    { id:'teres_l', name:'Teres Major / Minor (L)', group:'Rotator Cuff', view:'posterior',
      points:'132,250 124,268 124,292 134,308 150,312 164,300 168,278 156,256' },
    { id:'teres_r', name:'Teres Major / Minor (R)', group:'Rotator Cuff', view:'posterior',
      points:'268,250 276,268 276,292 266,308 250,312 236,300 232,278 244,256' },

    // UPPER BACK — RHOMBOIDS
    { id:'rhomboids_l', name:'Rhomboids (L)', group:'Upper Back', view:'posterior',
      points:'200,152 190,166 178,188 174,212 178,232 190,240 200,234 200,206 200,176' },
    { id:'rhomboids_r', name:'Rhomboids (R)', group:'Upper Back', view:'posterior',
      points:'200,152 210,166 222,188 226,212 222,232 210,240 200,234 200,206 200,176' },

    // UPPER ARM — TRICEPS BRACHII
    { id:'triceps_l', name:'Triceps Brachii (L)', group:'Upper Arm', view:'posterior',
      points:'112,220 100,238 88,264 80,296 78,330 84,362 96,380 114,382 130,370 140,342 142,306 138,270 124,242' },
    { id:'triceps_r', name:'Triceps Brachii (R)', group:'Upper Arm', view:'posterior',
      points:'288,220 300,238 312,264 320,296 322,330 316,362 304,380 286,382 270,370 260,342 258,306 262,270 276,242' },

    // FOREARM — EXTENSORS
    { id:'forearm_ext_l', name:'Forearm Extensors (L)', group:'Forearm', view:'posterior',
      points:'98,380 84,400 70,424 60,452 58,478 66,492 84,494 102,480 118,454 128,424 128,398' },
    { id:'forearm_ext_r', name:'Forearm Extensors (R)', group:'Forearm', view:'posterior',
      points:'302,380 316,400 330,424 340,452 342,478 334,492 316,494 298,480 282,454 272,424 272,398' },

    // MID/LOWER BACK — LATISSIMUS DORSI
    { id:'lats_l', name:'Latissimus Dorsi (L)', group:'Mid/Lower Back', view:'posterior',
      points:'142,228 128,258 116,296 108,336 106,376 112,410 126,432 146,438 166,430 180,408 186,374 178,336 166,298 154,264 148,240' },
    { id:'lats_r', name:'Latissimus Dorsi (R)', group:'Mid/Lower Back', view:'posterior',
      points:'258,228 272,258 284,296 292,336 294,376 288,410 274,432 254,438 234,430 220,408 214,374 222,336 234,298 246,264 252,240' },

    // LOWER BACK — ERECTOR SPINAE
    { id:'erector_l', name:'Erector Spinae (L)', group:'Lower Back', view:'posterior',
      points:'186,244 180,270 176,304 174,342 174,382 178,416 184,436 196,438 200,426 200,390 200,352 198,314 194,276 190,252' },
    { id:'erector_r', name:'Erector Spinae (R)', group:'Lower Back', view:'posterior',
      points:'214,244 220,270 224,304 226,342 226,382 222,416 216,436 204,438 200,426 200,390 200,352 202,314 206,276 210,252' },

    // LOWER BACK — QUADRATUS LUMBORUM
    { id:'ql_l', name:'Quadratus Lumborum (L)', group:'Lower Back', view:'posterior',
      points:'180,402 172,420 170,444 176,460 190,466 200,456 200,432 196,414' },
    { id:'ql_r', name:'Quadratus Lumborum (R)', group:'Lower Back', view:'posterior',
      points:'220,402 228,420 230,444 224,460 210,466 200,456 200,432 204,414' },

    // GLUTES - Gluteus Maximus
    { id:'glut_max_l', name:'Gluteus Maximus (L)', group:'Glutes', view:'posterior',
      points:'156,460 140,482 128,510 124,542 130,574 144,596 164,602 186,596 200,576 200,544 198,510 190,480 174,462' },
    { id:'glut_max_r', name:'Gluteus Maximus (R)', group:'Glutes', view:'posterior',
      points:'244,460 260,482 272,510 276,542 270,574 256,596 236,602 214,596 200,576 200,544 202,510 210,480 226,462' },
    
    // GLUTES - Gluteus Medius
    { id:'glut_med_l', name:'Gluteus Medius (L)', group:'Glutes', view:'posterior',
      points:'150,430 136,448 130,470 136,492 150,502 168,502 182,488 186,468 180,448 166,432' },
    { id:'glut_med_r', name:'Gluteus Medius (R)', group:'Glutes', view:'posterior',
      points:'250,430 264,448 270,470 264,492 250,502 232,502 218,488 214,468 220,448 234,432' },

    // GLUTES/HIP — PIRIFORMIS
    { id:'piriformis_l', name:'Piriformis (L)', group:'Glutes/Hip', view:'posterior',
      points:'180,500 170,518 170,540 180,552 196,556 204,542 204,520 194,504' },
    { id:'piriformis_r', name:'Piriformis (R)', group:'Glutes/Hip', view:'posterior',
      points:'220,500 230,518 230,540 220,552 204,556 196,542 196,520 206,504' },

    // HAMSTRINGS — BICEPS FEMORIS
    { id:'biceps_fem_l', name:'Biceps Femoris (L)', group:'Hamstrings', view:'posterior',
      points:'158,598 144,624 134,662 126,702 124,740 130,770 144,784 162,784 176,770 184,738 182,700 174,660 164,622' },
    { id:'biceps_fem_r', name:'Biceps Femoris (R)', group:'Hamstrings', view:'posterior',
      points:'242,598 256,624 266,662 274,702 276,740 270,770 256,784 238,784 224,770 216,738 218,700 226,660 236,622' },

    // HAMSTRINGS — SEMIMEMBRANOSUS / SEMITENDINOSUS
    { id:'semimem_l', name:'Semimembranosus / Semitendinosus (L)', group:'Hamstrings', view:'posterior',
      points:'194,598 182,622 174,660 170,700 170,740 176,770 190,784 206,786 218,772 220,740 218,698 212,658 204,620' },
    { id:'semimem_r', name:'Semimembranosus / Semitendinosus (R)', group:'Hamstrings', view:'posterior',
      points:'206,598 218,622 226,660 230,700 230,740 224,770 210,784 194,786 182,772 180,740 182,698 188,658 196,620' },

    // CALF — GASTROCNEMIUS
    { id:'gastroc_l', name:'Gastrocnemius (L)', group:'Calf', view:'posterior',
      points:'148,784 134,808 126,840 124,876 132,904 146,920 164,922 180,912 188,888 188,852 180,818 166,794' },
    { id:'gastroc_r', name:'Gastrocnemius (R)', group:'Calf', view:'posterior',
      points:'252,784 266,808 274,840 276,876 268,904 254,920 236,922 220,912 212,888 212,852 220,818 234,794' },

    // CALF — SOLEUS
    { id:'soleus_l', name:'Soleus (L)', group:'Calf', view:'posterior',
      points:'158,900 146,920 140,948 144,974 156,986 172,988 186,978 192,954 190,924 176,904' },
    { id:'soleus_r', name:'Soleus (R)', group:'Calf', view:'posterior',
      points:'242,900 254,920 260,948 256,974 244,986 228,988 214,978 208,954 210,924 224,904' },
  ];

  // Convenience lookups
  const ANTERIOR_MUSCLES = MUSCLES.filter(m => m.view === 'anterior');
  const POSTERIOR_MUSCLES = MUSCLES.filter(m => m.view === 'posterior');

  // ============================================================
  // QUICK SELECT PRESETS - Common Pain Patterns
  // ============================================================
  const QUICK_SELECT_PRESETS = [
    {
      id: 'upper_back_tension',
      name: 'Upper Back Tension',
      icon: 'fa-person-rays',
      description: 'Neck, traps & shoulders',
      muscles: ['upper_trap_l', 'upper_trap_r', 'levator_scap_l', 'levator_scap_r', 'rhomboids_l', 'rhomboids_r', 'scm_l', 'scm_r']
    },
    {
      id: 'lower_back_pain',
      name: 'Lower Back Pain',
      icon: 'fa-user-injured',
      description: 'QL, erectors & glutes',
      muscles: ['erector_l', 'erector_r', 'ql_l', 'ql_r', 'glut_max_l', 'glut_max_r', 'glut_med_l', 'glut_med_r', 'piriformis_l', 'piriformis_r']
    },
    {
      id: 'desk_worker',
      name: 'Desk Worker',
      icon: 'fa-computer',
      description: 'Chest, neck & hip flexors',
      muscles: ['pec_major_l', 'pec_major_r', 'scm_l', 'scm_r', 'upper_trap_l', 'upper_trap_r', 'iliopsoas_l', 'iliopsoas_r']
    },
    {
      id: 'runner_legs',
      name: 'Runner Recovery',
      icon: 'fa-person-running',
      description: 'Quads, hamstrings & calves',
      muscles: ['quad_l', 'quad_r', 'biceps_fem_l', 'biceps_fem_r', 'semimem_l', 'semimem_r', 'gastroc_l', 'gastroc_r', 'soleus_l', 'soleus_r', 'tfl_l', 'tfl_r']
    },
    {
      id: 'shoulder_complex',
      name: 'Shoulder Issues',
      icon: 'fa-hand-fist',
      description: 'Rotator cuff & deltoids',
      muscles: ['deltoid_ant_l', 'deltoid_ant_r', 'deltoid_post_l', 'deltoid_post_r', 'infraspinatus_l', 'infraspinatus_r', 'teres_l', 'teres_r']
    },
    {
      id: 'full_back',
      name: 'Full Back',
      icon: 'fa-arrows-up-down',
      description: 'Complete posterior chain',
      muscles: ['upper_trap_l', 'upper_trap_r', 'rhomboids_l', 'rhomboids_r', 'lats_l', 'lats_r', 'erector_l', 'erector_r', 'ql_l', 'ql_r', 'infraspinatus_l', 'infraspinatus_r', 'teres_l', 'teres_r']
    }
  ];

  // ============================================================
  // IMAGE-BASED MUSCLE MAP
  // ============================================================
  // Geometry helpers keep polygon rendering, hit-testing and dot placement
  // aligned in the same coordinate system for both male and female figures.

  const VIEWBOX_WIDTH = 400;
  const MALE_VIEWBOX_HEIGHT = 920;

  function getViewBoxHeight(gender) {
    const g = gender || state.currentGender;
    if (g === 'male') return 920;
    // Female half image width = 431 (862 / 2)
    return Math.round(1024 / (431 / VIEWBOX_WIDTH));
  }

  function scalePointForGender(x, y, gender, vbH) {
    const g = gender || state.currentGender;
    const targetHeight = vbH || getViewBoxHeight(g);

    if (g !== 'female') {
      return { x: x, y: y };
    }

    let sx, cx;
    if      (y < 130) { sx = 0.60; cx = 214; }
    else if (y < 220) { sx = 0.69; cx = 215; }
    else if (y < 360) { sx = 0.80; cx = 215; }
    else if (y < 470) { sx = 0.91; cx = 215; }
    else if (y < 535) { sx = 1.08; cx = 214; }
    else if (y < 680) { sx = 0.86; cx = 215; }
    else if (y < 780) { sx = 0.69; cx = 216; }
    else              { sx = 0.75; cx = 215; }

    return {
      x: Math.round((x - 205) * sx + cx),
      y: Math.round(y * (targetHeight / MALE_VIEWBOX_HEIGHT))
    };
  }

  function getPolygonPoints(muscle, gender, vbH) {
    const g = gender || state.currentGender;
    const targetHeight = vbH || getViewBoxHeight(g);
    return muscle.points.split(' ').map(function(pair) {
      const nums = pair.split(',').map(Number);
      return scalePointForGender(nums[0], nums[1], g, targetHeight);
    });
  }

  function polygonToString(points) {
    return points.map(function(p) {
      return p.x + ',' + p.y;
    }).join(' ');
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      const intersects = ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function polygonArea(points) {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j].x * points[i].y) - (points[i].x * points[j].y);
    }
    return Math.abs(area / 2);
  }

  function polygonCentroid(points) {
    let x = 0;
    let y = 0;
    let areaFactor = 0;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const cross = (points[j].x * points[i].y) - (points[i].x * points[j].y);
      areaFactor += cross;
      x += (points[j].x + points[i].x) * cross;
      y += (points[j].y + points[i].y) * cross;
    }

    const area = areaFactor / 2;
    if (Math.abs(area) < 1e-9) {
      return {
        x: points.reduce(function(sum, p) { return sum + p.x; }, 0) / points.length,
        y: points.reduce(function(sum, p) { return sum + p.y; }, 0) / points.length
      };
    }

    return {
      x: x / (6 * area),
      y: y / (6 * area)
    };
  }

  function renderMuscleMap() {
    const container = document.getElementById('muscleMapContainer');
    const gender = state.currentGender;
    const view = state.currentView;
    const muscles = view === 'anterior' ? ANTERIOR_MUSCLES : POSTERIOR_MUSCLES;
    const imgSrc = "/static/muscle-map-" + gender + ".png";

    const imgW = gender === 'male' ? 890 : 862;
    const halfW = imgW / 2;
    const imgH = 1024;
    const vbH = getViewBoxHeight(gender);
    const imgTranslate = view === 'anterior' ? '0' : '-50%';

    // Keep selected muscles visible even when the polygon toggle is off.
    const shouldRenderPolygons = state.showMusclePolygons || state.treatedMuscles.size > 0;
    const musclePolygons = shouldRenderPolygons ? renderMusclePolygons(muscles, vbH) : '';
    const tensionDots = renderTensionDots(vbH);

    container.innerHTML = \`
      <div style="position:relative;width:100%;padding-bottom:\${Math.round(imgH / halfW * 100)}%;overflow:hidden;border-radius:var(--radius-sm);border:1.5px solid var(--border);background:#f8fafc;">
        <img src="\${imgSrc}" alt="Muscle map"
          style="position:absolute;top:0;left:0;width:200%;height:100%;transform:translateX(\${imgTranslate});pointer-events:none;object-fit:fill;"
          onerror="this.style.opacity='0.2'"/>

        <canvas id="dotPlacementCanvas"
          style="position:absolute;top:0;left:0;width:100%;height:100%;cursor:crosshair;z-index:10;"
          onclick="handleCanvasClick(event)"></canvas>

        <svg viewBox="0 0 400 \${vbH}"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:15;">
          <g>\${musclePolygons}</g>
        </svg>

        <svg viewBox="0 0 400 \${vbH}"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:20;">
          <g style="pointer-events:all;">
            \${tensionDots}
          </g>
        </svg>
      </div>
    \`;

    setupCanvasClickDetection();
  }

  function renderMusclePolygons(muscles, vbH) {
    return muscles.map(function(muscle) {
      const points = polygonToString(getPolygonPoints(muscle, state.currentGender, vbH));
      const isTreated = state.treatedMuscles.has(muscle.id);
      const fill = isTreated ? 'rgba(56, 161, 105, 0.42)' : 'rgba(91,163,217,0.14)';
      const stroke = isTreated ? 'rgba(39, 103, 73, 0.95)' : 'rgba(37,99,235,0.45)';
      const strokeWidth = isTreated ? 2 : 1.1;

      return '<polygon '
        + 'class="muscle-path ' + (isTreated ? 'treated' : '') + '" '
        + 'data-muscle-id="' + muscle.id + '" '
        + 'points="' + points + '" '
        + 'fill="' + fill + '" '
        + 'stroke="' + stroke + '" '
        + 'stroke-width="' + strokeWidth + '"></polygon>';
    }).join('');
  }

  // ============================================================
  // TENSION POINTS SYSTEM (Enhanced Muscle Map)
  // ============================================================

  function renderTensionDots(vbH) {
    if (state.tensionPoints.length === 0) return '';

    const currentView = state.currentView;
    const currentGender = state.currentGender;

    const viewDots = state.tensionPoints.filter(function(dot) {
      const muscle = MUSCLES.find(function(m) { return m.id === dot.muscleId; });
      return muscle && muscle.view === currentView;
    });

    return viewDots.map(function(dot) {
      const scaled = scalePointForGender(dot.x, dot.y, currentGender, vbH);

      return \`
        <g class="tension-dot" style="cursor:pointer;" data-dot-id="\${dot.id}"
           onclick="removeTensionDot('\${dot.id}')"
           onmouseenter="showDotTooltip(event, '\${dot.number}', '\${dot.muscleName}', '\${dot.type}', '\${dot.notes}')"
           onmouseleave="hideDotTooltip()">
          <circle cx="\${scaled.x}" cy="\${scaled.y}" r="12"
                  fill="rgba(239, 68, 68, 0.9)"
                  stroke="rgba(239, 68, 68, 1)"
                  stroke-width="2"/>
          <text x="\${scaled.x}" y="\${scaled.y + 1}"
                text-anchor="middle"
                dominant-baseline="middle"
                fill="white"
                font-family="var(--font)"
                font-size="11"
                font-weight="bold">
            \${dot.number}
          </text>
        </g>\`;
    }).join('\\n');
  }

  function setupCanvasClickDetection() {
    const canvas = document.getElementById('dotPlacementCanvas');
    if (!canvas) return;

    const resizeCanvas = function() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    if (window.__soapCanvasResizeHandler) {
      window.removeEventListener('resize', window.__soapCanvasResizeHandler);
    }

    window.__soapCanvasResizeHandler = resizeCanvas;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function handleCanvasClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const canvas = document.getElementById('dotPlacementCanvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    const vbH = getViewBoxHeight(state.currentGender);
    const svgX = (canvasX / rect.width) * VIEWBOX_WIDTH;
    const svgY = (canvasY / rect.height) * vbH;

    const detectedMuscle = findMuscleAtPoint(svgX, svgY, state.currentView, state.currentGender, vbH);

    if (detectedMuscle) {
      saveTensionDot(svgX, svgY, detectedMuscle.id, detectedMuscle.name, 'pain-area', '');
    } else {
      showCopyFeedback('Click on a mapped muscle area to place a marker');
    }
  }

  function findMuscleAtPoint(x, y, view, gender, vbH) {
    const muscles = view === 'anterior' ? ANTERIOR_MUSCLES : POSTERIOR_MUSCLES;
    const targetHeight = vbH || getViewBoxHeight(gender);

    const matches = muscles
      .map(function(muscle) {
        const points = getPolygonPoints(muscle, gender, targetHeight);
        if (!pointInPolygon(x, y, points)) return null;

        const centroid = polygonCentroid(points);
        const area = polygonArea(points);
        const distance = Math.hypot(x - centroid.x, y - centroid.y);
        const score = distance + (area * 0.0025);

        return { muscle: muscle, score: score };
      })
      .filter(Boolean)
      .sort(function(a, b) { return a.score - b.score; });

    return matches.length ? matches[0].muscle : null;
  }

  function isPointInMuscle(x, y, muscle, gender, vbH) {
    const points = getPolygonPoints(muscle, gender, vbH || getViewBoxHeight(gender));
    return pointInPolygon(x, y, points);
  }


  // Save tension dot
  function saveTensionDot(x, y, muscleId, muscleName, selectedType = 'pain-area', notes = '') {
    // Create new tension point
    const dotNumber = state.tensionPoints.length + 1;
    const newDot = {
      id: 'dot_' + Date.now(),
      number: dotNumber,
      x: Math.round(x),
      y: Math.round(y),
      muscleId,
      muscleName,
      type: selectedType,
      notes: notes.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Add to state
    state.tensionPoints.push(newDot);
    state.treatedMuscles.add(muscleId);
    
    // Refresh display
    renderMuscleMap();
    updateMuscleLists();
    updateSummaryPanel();
    
    showCopyFeedback(\`Added marker \${dotNumber}: \${muscleName}\`);
  }

  // Remove tension dot
  function removeTensionDot(dotId) {
    const dotIndex = state.tensionPoints.findIndex(dot => dot.id === dotId);
    if (dotIndex === -1) return;
    
    const removedDot = state.tensionPoints[dotIndex];
    
    // Remove dot
    state.tensionPoints.splice(dotIndex, 1);
    
    // Renumber remaining dots
    state.tensionPoints.forEach((dot, index) => {
      dot.number = index + 1;
    });
    
    // Check if muscle should remain in treated set
    const muscleStillHasDots = state.tensionPoints.some(dot => dot.muscleId === removedDot.muscleId);
    if (!muscleStillHasDots) {
      state.treatedMuscles.delete(removedDot.muscleId);
    }
    
    // Refresh display
    renderMuscleMap();
    updateMuscleLists();
    updateSummaryPanel();
    
    showCopyFeedback(\`Removed marker: \${removedDot.muscleName}\`);
  }



  // Show dot tooltip
  function showDotTooltip(event, number, muscleName, type, notes) {
    const tooltip = document.getElementById('muscleTooltip') || createTooltipElement();
    const safeMuscleName = escapeHtml(muscleName);
    const safeType = escapeHtml(type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '));
    const safeNotes = notes ? escapeHtml(notes) : '';
    const displayText = \`\${number}. \${safeMuscleName}<br>\${safeType}\${safeNotes ? '<br>' + safeNotes : ''}\`;
    tooltip.innerHTML = displayText;
    tooltip.classList.remove('hidden');
    tooltip.style.display = 'block';
    tooltip.style.left = (event.clientX + 10) + 'px';
    tooltip.style.top = (event.clientY + 10) + 'px';
  }

  // Hide dot tooltip
  function hideDotTooltip() {
    const tooltip = document.getElementById('muscleTooltip');
    if (tooltip) {
      tooltip.classList.add('hidden');
      tooltip.style.display = 'none';
    }
  }

  // Create tooltip element if it doesn't exist
  function createTooltipElement() {
    let tooltip = document.getElementById('muscleTooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'muscleTooltip';
      tooltip.className = 'muscle-tooltip hidden';
      tooltip.style.cssText = 'position:fixed;background:rgba(0,0,0,0.9);color:white;padding:8px 12px;border-radius:6px;font-size:0.8rem;font-weight:500;z-index:9999;pointer-events:none;line-height:1.4;';
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  // ============================================================
  // QUICK SELECT FUNCTIONS
  // ============================================================
  
  function toggleQuickSelectPanel() {
    const panel = document.getElementById('quickSelectPanel');
    const chevron = document.getElementById('quickSelectChevron');
    if (panel && chevron) {
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'block' : 'none';
      chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      
      // Render buttons on first open
      if (isHidden) {
        renderQuickSelectButtons();
      }
    }
  }
  
  function renderQuickSelectButtons() {
    const container = document.getElementById('quickSelectButtons');
    if (!container) return;
    
    container.innerHTML = QUICK_SELECT_PRESETS.map(preset => {
      const isActive = checkPresetActive(preset);
      return \`
        <button 
          data-testid="quick-select-\${preset.id}"
          onclick="applyQuickSelectPreset('\${preset.id}')"
          class="btn \${isActive ? 'btn-primary' : 'btn-ghost'} btn-sm"
          style="display:flex;flex-direction:column;align-items:center;padding:10px 8px;gap:4px;height:auto;text-align:center;\${isActive ? 'background:var(--accent);color:white;' : ''}"
          title="\${preset.description}">
          <i class="fas \${preset.icon}" style="font-size:1rem;"></i>
          <span style="font-size:0.68rem;line-height:1.2;white-space:normal;">\${preset.name}</span>
        </button>
      \`;
    }).join('');
  }
  
  function checkPresetActive(preset) {
    // Check if any muscles from this preset are already marked
    return preset.muscles.some(muscleId => state.treatedMuscles.has(muscleId));
  }
  
  function applyQuickSelectPreset(presetId) {
    const preset = QUICK_SELECT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    // Check if preset is already active (has any muscles marked)
    const isActive = checkPresetActive(preset);
    
    if (isActive) {
      // Remove all muscles from this preset
      preset.muscles.forEach(muscleId => {
        // Remove all dots for this muscle
        const dotsToRemove = state.tensionPoints.filter(dot => dot.muscleId === muscleId);
        dotsToRemove.forEach(dot => {
          const dotIndex = state.tensionPoints.findIndex(d => d.id === dot.id);
          if (dotIndex !== -1) {
            state.tensionPoints.splice(dotIndex, 1);
          }
        });
        state.treatedMuscles.delete(muscleId);
      });
      
      // Renumber remaining dots
      state.tensionPoints.forEach((dot, index) => {
        dot.number = index + 1;
      });
      
      showCopyFeedback(\`Cleared \${preset.name} markers\`);
    } else {
      // Add markers for all muscles in preset
      let addedCount = 0;
      preset.muscles.forEach(muscleId => {
        // Skip if already has a marker
        if (state.treatedMuscles.has(muscleId)) return;
        
        const muscle = MUSCLES.find(m => m.id === muscleId);
        if (!muscle) return;
        
        // Calculate centroid for marker placement
        const vbH = getViewBoxHeight(state.currentGender);
        const points = getPolygonPoints(muscle, state.currentGender, vbH);
        const centroid = polygonCentroid(points);
        
        // Convert back to male coordinates for storage (will be scaled on render)
        const storageX = muscle.view === state.currentView ? centroid.x : centroid.x;
        const storageY = muscle.view === state.currentView ? centroid.y : centroid.y;
        
        // Get original centroid from muscle points (not gender-scaled)
        const originalPoints = muscle.points.split(' ').map(pair => {
          const nums = pair.split(',').map(Number);
          return { x: nums[0], y: nums[1] };
        });
        const originalCentroid = polygonCentroid(originalPoints);
        
        // Create new tension point
        const dotNumber = state.tensionPoints.length + 1;
        const newDot = {
          id: 'dot_' + Date.now() + '_' + muscleId,
          number: dotNumber,
          x: Math.round(originalCentroid.x),
          y: Math.round(originalCentroid.y),
          muscleId: muscleId,
          muscleName: muscle.name,
          type: 'pain-area',
          notes: '',
          timestamp: new Date().toISOString()
        };
        
        state.tensionPoints.push(newDot);
        state.treatedMuscles.add(muscleId);
        addedCount++;
      });
      
      showCopyFeedback(\`Added \${addedCount} markers for \${preset.name}\`);
    }
    
    // Refresh display
    renderMuscleMap();
    updateMuscleLists();
    updateSummaryPanel();
    renderQuickSelectButtons();
  }


  // ============================================================
  // INITIALIZE
  // ============================================================
  document.addEventListener('DOMContentLoaded', async () => {
    // Set today's date
    document.getElementById('sessionDate').value = new Date().toISOString().split('T')[0];
    
    // Render techniques
    renderTechniques();
    
    // CSRF Protection: Automatically add CSRF token to state-changing requests
    const getCsrfToken = () => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.getAttribute('content') : '';
    };

    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      const method = options?.method?.toUpperCase();
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          options.headers = {
            ...options.headers,
            'X-CSRF-Token': csrfToken,
          };
        }
      }
      return originalFetch(url, options);
    };

    // Render muscle map
    renderMuscleMap();

    const polyToggle = document.getElementById('toggleMusclePolygons');
    if (polyToggle) polyToggle.checked = !!state.showMusclePolygons;
    
    updateSummaryPanel();
    updateIntakeReviewPanel();
    updateWritingStyleBadge();

    const reviewFieldIds = [
      'clientFirstName', 'clientLastName', 'clientEmail', 'clientDOB', 'sessionDate',
      'chiefComplaint', 'painLevel', 'postPainLevel', 'sessionDuration', 'medications',
      'sessionSummary', 'clientFeedback', 'intakeFormData'
    ];
    reviewFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', updateIntakeReviewPanel);
      el.addEventListener('change', updateIntakeReviewPanel);
    });

    // Load client profiles from server database
    await renderClientProfilesPreview();

    // Check API status (server-side key)
    checkAPIStatus();
    
    // Pre-fetch CSRF token for subsequent API calls
    getCsrfToken();

    // Load recent intake form PDFs
    setTimeout(() => { if (typeof loadSupabaseFiles === 'function') loadSupabaseFiles(); }, 20);

    // Check if client data was passed via URL (from intake form redirect)
    await checkUrlClientData();

    // Close modals on backdrop click
    document.getElementById('clientBrowserModal').addEventListener('click', function(e) {
      if (e.target === this) closeClientBrowser();
    });
    document.getElementById('webhookModal').addEventListener('click', function(e) {
      if (e.target === this) closeWebhookConfig();
    });
    document.getElementById('clientAccountsModal').addEventListener('click', function(e) {
      if (e.target === this) closeClientAccounts();
    });
    document.getElementById('clientFileModal').addEventListener('click', function(e) {
      if (e.target === this) closeClientFile();
    });
    document.getElementById('sessionViewModal').addEventListener('click', function(e) {
      if (e.target === this) closeSessionView();
    });

    // Header buttons
    document.getElementById('openClientAccountsBtn').addEventListener('click', openClientAccounts);
    document.getElementById('resetAllBtn').addEventListener('click', resetAll);

    // Step navigation
    document.querySelectorAll('.step-item').forEach(stepItem => {
      stepItem.addEventListener('click', function() {
        const step = parseInt(this.dataset.step);
        goToStep(step);
      });
    });

    // Client profile buttons
    document.getElementById('openClientBrowserBtn').addEventListener('click', openClientBrowser);
    document.getElementById('openWebhookConfigBtn').addEventListener('click', openWebhookConfig);

    // PDF upload functionality
    const dropZone = document.getElementById('dropZone');
    const pdfInput = document.getElementById('pdfInput');
    
    dropZone.addEventListener('click', () => pdfInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    pdfInput.addEventListener('change', handlePDFUpload);
    
    const clearPDFBtn = document.getElementById('clearPDFBtn');
    if (clearPDFBtn) {
      clearPDFBtn.addEventListener('click', clearPDF);
    }

    // Intake form textarea focus/blur styling
    const intakeFormData = document.getElementById('intakeFormData');
    if (intakeFormData) {
      intakeFormData.addEventListener('focus', function() {
        this.style.borderColor = 'var(--accent)';
        this.style.boxShadow = '0 0 0 3px rgba(91,163,217,0.15)';
      });
      intakeFormData.addEventListener('blur', function() {
        this.style.borderColor = 'var(--border)';
        this.style.boxShadow = 'none';
      });
    }

    // Navigation buttons
    const goToStep2Btn = document.getElementById('goToStep2Btn');
    if (goToStep2Btn) {
      goToStep2Btn.addEventListener('click', () => goToStep(2));
    }

    // Gender and view toggles
    document.getElementById('btnMale').addEventListener('click', function() {
      setGender(this.dataset.gender);
    });
    document.getElementById('btnFemale').addEventListener('click', function() {
      setGender(this.dataset.gender);
    });
    document.getElementById('btnAnterior').addEventListener('click', function() {
      setView(this.dataset.view);
    });
    document.getElementById('btnPosterior').addEventListener('click', function() {
      setView(this.dataset.view);
    });

    // Muscle polygons toggle
    const toggleMusclePolygons = document.getElementById('toggleMusclePolygons');
    if (toggleMusclePolygons) {
      toggleMusclePolygons.addEventListener('change', function() {
        toggleMusclePolygons(this.checked);
      });
    }

    // Additional form elements with oninput handlers
    const clientEmail = document.getElementById('clientEmail');
    if (clientEmail) {
      clientEmail.addEventListener('input', updateSummaryPanel);
    }

    // Step 2 (Muscle Map) buttons
    const clearAllMusclesBtn = document.getElementById('clearAllMusclesBtn');
    if (clearAllMusclesBtn) {
      clearAllMusclesBtn.addEventListener('click', clearAllMuscles);
    }

    const goToStep1FromMapBtn = document.getElementById('goToStep1FromMapBtn');
    if (goToStep1FromMapBtn) {
      goToStep1FromMapBtn.addEventListener('click', () => goToStep(1));
    }

    const goToStep3FromMapBtn = document.getElementById('goToStep3FromMapBtn');
    if (goToStep3FromMapBtn) {
      goToStep3FromMapBtn.addEventListener('click', () => goToStep(3));
    }

    // Step 3 (Session Notes) form field focus/blur styling
    const chiefComplaint = document.getElementById('chiefComplaint');
    if (chiefComplaint) {
      chiefComplaint.addEventListener('focus', function() {
        this.style.borderColor = 'var(--accent)';
        this.style.boxShadow = '0 0 0 3px rgba(91,163,217,0.15)';
      });
      chiefComplaint.addEventListener('blur', function() {
        this.style.borderColor = 'var(--border)';
        this.style.boxShadow = 'none';
      });
    }

    // Jump navigation buttons
    const jumpToChiefComplaintBtn = document.getElementById('jumpToChiefComplaintBtn');
    if (jumpToChiefComplaintBtn) {
      jumpToChiefComplaintBtn.addEventListener('click', () => jumpToField(1, 'chiefComplaint'));
    }

    const jumpToSessionSummaryBtn = document.getElementById('jumpToSessionSummaryBtn');
    if (jumpToSessionSummaryBtn) {
      jumpToSessionSummaryBtn.addEventListener('click', () => jumpToField(3, 'sessionSummary'));
    }

    // Medical shorthand toggle
    const medicalShorthandToggle = document.getElementById('medicalShorthandToggle');
    if (medicalShorthandToggle) {
      medicalShorthandToggle.addEventListener('change', function() {
        setMedicalShorthand(this.checked);
      });
    }

    // Step 3 navigation buttons
    const goToStep2FromNotesBtn = document.getElementById('goToStep2FromNotesBtn');
    if (goToStep2FromNotesBtn) {
      goToStep2FromNotesBtn.addEventListener('click', () => goToStep(2));
    }

    const generateSOAPBtn = document.getElementById('generateSOAPBtn');
    if (generateSOAPBtn) {
      generateSOAPBtn.addEventListener('click', generateSOAP);
    }

    // SOAP section copy buttons
    const copySectionSBtn = document.getElementById('copySectionSBtn');
    if (copySectionSBtn) {
      copySectionSBtn.addEventListener('click', () => copySection('S'));
    }

    const copySectionOBtn = document.getElementById('copySectionOBtn');
    if (copySectionOBtn) {
      copySectionOBtn.addEventListener('click', () => copySection('O'));
    }

    const copySectionABtn = document.getElementById('copySectionABtn');
    if (copySectionABtn) {
      copySectionABtn.addEventListener('click', () => copySection('A'));
    }

    const copySectionPBtn = document.getElementById('copySectionPBtn');
    if (copySectionPBtn) {
      copySectionPBtn.addEventListener('click', () => copySection('P'));
    }

    const copySectionNBtn = document.getElementById('copySectionNBtn');
    if (copySectionNBtn) {
      copySectionNBtn.addEventListener('click', () => copySection('N'));
    }

    // Step 4 (SOAP) action buttons
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) {
      exportPDFBtn.addEventListener('click', exportPDF);
    }

    const copyAllSOAPBtn = document.getElementById('copyAllSOAPBtn');
    if (copyAllSOAPBtn) {
      copyAllSOAPBtn.addEventListener('click', copyAllSOAP);
    }

    const regenerateSOAPBtn = document.getElementById('regenerateSOAPBtn');
    if (regenerateSOAPBtn) {
      regenerateSOAPBtn.addEventListener('click', regenerateSOAP);
    }

    // Step 4 navigation buttons
    const goToStep3FromSOAPBtn = document.getElementById('goToStep3FromSOAPBtn');
    if (goToStep3FromSOAPBtn) {
      goToStep3FromSOAPBtn.addEventListener('click', () => goToStep(3));
    }

    const resetAllFromSOAPBtn = document.getElementById('resetAllFromSOAPBtn');
    if (resetAllFromSOAPBtn) {
      resetAllFromSOAPBtn.addEventListener('click', resetAll);
    }

    // Modal close buttons
    const modalCloseClientBrowserBtn = document.getElementById('modalCloseClientBrowserBtn');
    if (modalCloseClientBrowserBtn) {
      modalCloseClientBrowserBtn.addEventListener('click', closeClientBrowser);
    }

    const closeClientBrowserBtn = document.getElementById('closeClientBrowserBtn');
    if (closeClientBrowserBtn) {
      closeClientBrowserBtn.addEventListener('click', closeClientBrowser);
    }

    const modalCloseWebhookBtn = document.getElementById('modalCloseWebhookBtn');
    if (modalCloseWebhookBtn) {
      modalCloseWebhookBtn.addEventListener('click', closeWebhookConfig);
    }

    // Client search functionality
    const clientSearch = document.getElementById('clientSearch');
    if (clientSearch) {
      clientSearch.addEventListener('input', function() {
        filterClients().catch(console.error);
      });
      clientSearch.addEventListener('focus', function() {
        this.style.borderColor = 'var(--accent)';
      });
      clientSearch.addEventListener('blur', function() {
        this.style.borderColor = 'var(--border)';
      });
    }

    // Webhook config buttons
    const copyWebhookUrlBtn = document.getElementById('copyWebhookUrlBtn');
    if (copyWebhookUrlBtn) {
      copyWebhookUrlBtn.addEventListener('click', copyWebhookUrl);
    }

    const saveWebhookConfigBtn = document.getElementById('saveWebhookConfigBtn');
    if (saveWebhookConfigBtn) {
      saveWebhookConfigBtn.addEventListener('click', saveWebhookConfig);
    }

    const cancelWebhookConfigBtn = document.getElementById('cancelWebhookConfigBtn');
    if (cancelWebhookConfigBtn) {
      cancelWebhookConfigBtn.addEventListener('click', closeWebhookConfig);
    }

    // Manual client data textarea
    const manualClientData = document.getElementById('manualClientData');
    if (manualClientData) {
      manualClientData.addEventListener('focus', function() {
        this.style.borderColor = 'var(--accent)';
      });
      manualClientData.addEventListener('blur', function() {
        this.style.borderColor = 'var(--border)';
      });
    }

    const importManualProfileBtn = document.getElementById('importManualProfileBtn');
    if (importManualProfileBtn) {
      importManualProfileBtn.addEventListener('click', importManualProfile);
    }

    // Logo error handling
    const headerLogo = document.getElementById('headerLogo');
    if (headerLogo) {
      headerLogo.addEventListener('error', function() {
        this.src = '';
        this.onerror = null;
        this.style.display = 'none';
        const fallbackLogo = document.getElementById('fallbackLogo');
        if (fallbackLogo) {
          fallbackLogo.style.display = 'flex';
        }
      });
    }
  });

  function renderTechniques() {
    const container = document.getElementById('techniqueCheckboxes');
    container.innerHTML = TECHNIQUES.map(t => \`
      <label class="technique-item">
        <input type="checkbox" name="technique" value="\${t}"/>
        <span>\${t}</span>
      </label>
    \`).join('');
  }


  // Remove old toggleMuscle function - replaced with dot placement system

  function showTooltip(event, name) {
    const tooltip = document.getElementById('muscleTooltip');
    tooltip.textContent = name;
    tooltip.classList.remove('hidden');
    tooltip.style.left = event.clientX + 'px';
    tooltip.style.top = event.clientY + 'px';
  }

  function hideTooltip() {
    document.getElementById('muscleTooltip').classList.add('hidden');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escJsSingle(value) {
    return String(value || '').replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
  }

  function updateMarkerNotes(dotId, notes) {
    const dot = state.tensionPoints.find(item => item.id === dotId);
    if (!dot) return;
    dot.notes = (notes || '').trim();
  }

  function updateMuscleLists() {
    const markers = state.tensionPoints.slice().sort((a, b) => a.number - b.number);

    const treatedEl = document.getElementById('treatedList');
    const followupEl = document.getElementById('followupList');

    treatedEl.innerHTML = markers.length
      ? markers.map(dot => \`<span class="muscle-chip muscle-chip-treated"><i class="fas fa-location-dot"></i> Marker \${dot.number}: \${escapeHtml(dot.muscleName)}</span>\`).join('')
      : '<p style="font-size:0.75rem;color:var(--text-light);font-style:italic;">No markers placed yet</p>';

    followupEl.innerHTML = markers.length
      ? markers.map(dot => {
          const safeName = escapeHtml(dot.muscleName);
          const safeNotes = escapeHtml(dot.notes || '');
          return \`<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;background:#fff;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
              <strong style="font-size:0.78rem;color:var(--primary);">Marker \${dot.number}</strong>
              <button type="button" onclick="removeTensionDot('\${dot.id}')" style="border:none;background:transparent;color:#e53e3e;font-size:1rem;line-height:1;cursor:pointer;" aria-label="Remove marker \${dot.number}">&times;</button>
            </div>
            <div style="font-size:0.74rem;color:var(--text-light);margin-bottom:6px;">\${safeName}</div>
            <textarea rows="2" placeholder="Describe this pain area..." oninput="updateMarkerNotes('\${dot.id}', this.value)" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:var(--font);font-size:0.78rem;resize:vertical;">\${safeNotes}</textarea>
          </div>\`;
        }).join('')
      : '<p style="font-size:0.75rem;color:var(--text-light);font-style:italic;">Add a marker on the map, then describe each area here.</p>';
    
    updateSummaryPanel();
  }

  function clearAllMuscles() {
    state.tensionPoints = [];
    state.treatedMuscles.clear();
    renderMuscleMap();
    updateMuscleLists();
  }

  function setView(view) {
    state.currentView = view;
    document.getElementById('btnAnterior').classList.toggle('active', view === 'anterior');
    document.getElementById('btnPosterior').classList.toggle('active', view === 'posterior');
    renderMuscleMap();
  }

  function setGender(gender) {
    state.currentGender = gender;
    document.getElementById('btnMale').classList.toggle('active', gender === 'male');
    document.getElementById('btnFemale').classList.toggle('active', gender === 'female');
    renderMuscleMap();
  }

  function toggleMusclePolygons(show) {
    state.showMusclePolygons = !!show;
    renderMuscleMap();
  }

  function updateSummaryPanel() {
    const fn = document.getElementById('clientFirstName').value;
    const ln = document.getElementById('clientLastName').value;
    const name = [fn, ln].filter(Boolean).join(' ') || '—';
    const date = document.getElementById('sessionDate').value || '—';
    const duration = document.getElementById('sessionDuration').value || '—';
    
    const treated = state.treatedMuscles.size;
    const followup = 0; // No follow-up system with tension points

    document.getElementById('summaryClient').textContent = name;
    document.getElementById('summaryDate').textContent = date;
    document.getElementById('summaryDuration').textContent = duration;
    document.getElementById('summaryMuscleCount').textContent = treated;
    document.getElementById('summaryFollowupCount').textContent = followup;
    updateIntakeReviewPanel();
  }

  // ============================================================
  // STEPS NAVIGATION
  // ============================================================
  function goToStep(step) {
    // Update panels — use .active class instead of .hidden
    document.querySelectorAll('.step-panel').forEach((p, i) => {
      p.classList.toggle('active', i + 1 === step);
    });

    // Update step bar items
    for (let i = 1; i <= 4; i++) {
      const item  = document.getElementById('stepItem' + i);
      const num   = document.getElementById('stepNum' + i);
      const label = document.getElementById('stepLabel' + i);
      if (item) {
        item.classList.toggle('active', i === step);
        item.classList.toggle('done',   i < step);
      }
      if (num) {
        num.innerHTML = i < step ? '<i class="fas fa-check" style="font-size:0.7rem;"></i>' : String(i);
      }
    }

    state.currentStep = step;
    if (step === 3) updateSummaryPanel();
    if (step === 4) updateWritingStyleBadge();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================
  // DRIVE FILE PICKER
  // ============================================================
  
  // Hoisted function declaration (available immediately)
  async function loadDriveFiles() {
    const list = document.getElementById('driveFilesList');
    const icon = document.getElementById('driveFilesRefreshIcon');
    if (icon) icon.classList.add('fa-spin');
    try {
      const res = await fetch('/api/drive/files');
      const data = await res.json();
      if (!res.ok || !data.files || data.files.length === 0) {
        if (list) list.innerHTML = '<p style="font-size:0.78rem;color:var(--text-light);font-style:italic;">No PDF files found in Drive folder.</p>';
        return;
      }
      if (list) {
        list.innerHTML = data.files.map(function(f) {
          const date = new Date(f.modifiedTime);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const rawName = String(f.name || '');
          const fileNameEncoded = encodeURIComponent(rawName.replace(/\\r?\\n/g, ' '));
          const nameShort = rawName.length > 40 ? rawName.slice(0, 37) + '…' : rawName;
          const safeNameShort = escapeHtml(nameShort);
          const safeTitle = escapeHtml(rawName);
          return '<div class="drive-file-row" data-file-id="' + f.id + '" data-file-name="' + fileNameEncoded + '" '
            + 'style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;transition:background 0.15s;font-size:0.8rem;">'
            + '<i class="fas fa-file-pdf" style="color:#e53e3e;opacity:0.7;flex-shrink:0;"></i>'
            + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + safeTitle + '">' + safeNameShort + '</span>'
            + '<span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap;">' + dateStr + '</span>'
            + '</div>';
        }).join('');

        const rows = list.querySelectorAll('.drive-file-row');
        rows.forEach(function(row) {
          row.addEventListener('mouseenter', function() {
            if (row.dataset.selected !== '1') row.style.background = 'rgba(91,163,217,0.08)';
          });
          row.addEventListener('mouseleave', function() {
            if (row.dataset.selected !== '1') row.style.background = 'transparent';
          });
          row.addEventListener('click', function() {
            const fileId = row.dataset.fileId || '';
            const fileName = decodeURIComponent(row.dataset.fileName || '');
            if (!fileId) return;
            selectDriveFile(fileId, fileName);
          });
        });
      }
    } catch (err) {
      if (list) list.innerHTML = '<p style="font-size:0.78rem;color:#e53e3e;">Failed to load Drive files.</p>';
    } finally {
      if (icon) icon.classList.remove('fa-spin');
    }
  }

  async function selectDriveFile(fileId, fileName) {
    const list = document.getElementById('driveFilesList');
    const progress = document.getElementById('pdfParseProgress');
    const dropZone = document.getElementById('dropZone');
    if (progress) progress.style.display = 'flex';
    if (dropZone) dropZone.style.display = 'none';

    // Highlight selected row
    if (list) {
      const rows = list.querySelectorAll('.drive-file-row');
      rows.forEach(function(r) {
        r.dataset.selected = '0';
        r.style.background = 'transparent';
      });
      const selected = list.querySelector('[data-file-id="' + fileId + '"]');
      if (selected) {
        selected.dataset.selected = '1';
        selected.style.background = 'rgba(91,163,217,0.16)';
      }
    }

    try {
      const res = await fetch('/api/drive/extract-text/' + encodeURIComponent(fileId));
      const data = await res.json();
      if (!res.ok || !data.text) {
        alert('Could not extract text from ' + fileName);
        if (progress) progress.style.display = 'none';
        if (dropZone) dropZone.style.display = '';
        return;
      }

      const parsed = parseIntakeFields(data.text);
      autoFillClientFields(parsed, { overwrite: true, source: 'pdf-upload' });
      const formattedSummary = formatIntakeSummary(data.text, parsed);
      document.getElementById('intakeFormData').value = formattedSummary;

      const filledCount = Object.values(parsed).filter(function(v) { return v && v !== 'Not provided'; }).length;
      document.getElementById('pdfFileName').textContent =
        fileName + ' (Drive)' + (filledCount > 0 ? ' — ' + filledCount + ' fields auto-filled ✓' : '');

      const pdfStatus = document.getElementById('pdfStatus');
      if (pdfStatus) pdfStatus.style.display = 'flex';
      if (progress) progress.style.display = 'none';
    } catch (err) {
      console.error('Drive PDF extract error:', err);
      alert('Failed to extract text from Drive PDF: ' + err.message);
      if (progress) progress.style.display = 'none';
      if (dropZone) dropZone.style.display = '';
    }
  }

  // Expose to window for button onclick handlers
  window.selectDriveFile = selectDriveFile;

  // ============================================================
  // SUPABASE FILE PICKER
  // ============================================================
  async function loadSupabaseFiles() {
    const list = document.getElementById('supabaseFilesList');
    const icon = document.getElementById('supabaseFilesRefreshIcon');
    if (icon) icon.classList.add('fa-spin');
    try {
      const res = await fetch('/api/drive/supabase-files');
      const data = await res.json();
      if (!res.ok || !data.files || data.files.length === 0) {
        if (list) list.innerHTML = '<p style="font-size:0.78rem;color:var(--text-light);font-style:italic;">No intake form PDFs found.</p>';
        return;
      }
      if (list) {
        list.innerHTML = data.files.map(function(f) {
          const date = f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const rawName = String(f.name || '');
          const nameShort = rawName.length > 40 ? rawName.slice(0, 37) + '…' : rawName;
          const safeNameShort = escapeHtml(nameShort);
          const safeTitle = escapeHtml(rawName);
          const safeUrl = escapeHtml(f.url || '');
          return '<div class="supabase-file-row" data-file-name="' + encodeURIComponent(rawName) + '" '
            + 'style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;cursor:pointer;transition:background 0.15s;font-size:0.8rem;">'
            + '<i class="fas fa-file-pdf" style="color:#3b82f6;opacity:0.7;flex-shrink:0;"></i>'
            + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + safeTitle + '">' + safeNameShort + '</span>'
            + '<button class="supabase-open-btn btn btn-ghost btn-sm" data-filename="' + encodeURIComponent(rawName) + '" style="font-size:0.7rem;color:var(--accent);white-space:nowrap;border:none;background:none;cursor:pointer;padding:2px 6px;" title="View PDF">'
            + '<i class="fas fa-external-link-alt"></i></button>'
            + '<span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap;">' + date + '</span>'
            + '</div>';
        }).join('');

        const rows = list.querySelectorAll('.supabase-file-row');
        rows.forEach(function(row) {
          row.addEventListener('mouseenter', function() { row.style.background = 'rgba(59,130,246,0.08)'; });
          row.addEventListener('mouseleave', function() { row.style.background = 'transparent'; });
        });

        // Open PDFs via signed URL
        list.querySelectorAll('.supabase-open-btn').forEach(function(btn) {
          btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const filename = decodeURIComponent(btn.getAttribute('data-filename') || '');
            if (!filename) return;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            try {
              const urlRes = await fetch('/api/drive/supabase-file-url/' + encodeURIComponent(filename));
              const urlData = await urlRes.json();
              if (urlData.url) {
                window.open(urlData.url, '_blank');
              } else {
                alert('Could not get file URL');
              }
            } catch (err) {
              alert('Error fetching file URL');
            } finally {
              btn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
            }
          });
        });
      }
    } catch (err) {
      if (list) list.innerHTML = '<p style="font-size:0.78rem;color:#e53e3e;">Failed to load intake forms.</p>';
    } finally {
      if (icon) icon.classList.remove('fa-spin');
    }
  }

  window.loadSupabaseFiles = loadSupabaseFiles;

  const supabaseRefreshBtn = document.getElementById('supabaseFilesRefreshBtn');
  if (supabaseRefreshBtn) {
    supabaseRefreshBtn.addEventListener('click', () => {
      loadSupabaseFiles();
    });
  }

  // ============================================================
  // PDF UPLOAD
  // ============================================================
  function handleDragOver(event) {
    event.preventDefault();
    document.getElementById('dropZone').classList.add('drag-over');
  }

  function handleDrop(event) {
    event.preventDefault();
    document.getElementById('dropZone').classList.remove('drag-over');
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') processFile(file);
  }

  function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
  }

  async function processFile(file) {
    const progress = document.getElementById('pdfParseProgress');
    const dropZone = document.getElementById('dropZone');
    if (progress) progress.style.display = 'flex';
    if (dropZone) dropZone.style.display = 'none';
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextWithPDFJS(arrayBuffer);

      if (text && text.length > 30) {
        const parsed = parseIntakeFields(text);
        autoFillClientFields(parsed, { overwrite: true, source: 'pdf-upload' });
        const formattedSummary = formatIntakeSummary(text, parsed);
        document.getElementById('intakeFormData').value = formattedSummary;
        const filledCount = Object.values(parsed).filter(v => v && v !== 'Not provided').length;
        document.getElementById('pdfFileName').textContent =
          file.name + (filledCount > 0 ? ' — ' + filledCount + ' fields auto-filled ✓' : '');
      } else {
        document.getElementById('intakeFormData').value =
          'PDF: ' + file.name + '\\n\\n[Text could not be extracted — please enter client information manually]';
        document.getElementById('pdfFileName').textContent = file.name + ' (manual entry needed)';
      }

      const pdfStatus = document.getElementById('pdfStatus');
      if (pdfStatus) pdfStatus.style.display = 'flex';
      if (progress) progress.style.display = 'none';
    } catch (err) {
      console.error('PDF error:', err);
      document.getElementById('intakeFormData').value =
        'PDF: ' + file.name + '\\n\\n[Please add client intake information manually]';
      document.getElementById('pdfFileName').textContent = file.name + ' (manual entry needed)';
      const pdfStatus = document.getElementById('pdfStatus');
      if (pdfStatus) pdfStatus.style.display = 'flex';
      if (progress) progress.style.display = 'none';
      if (dropZone) dropZone.style.display = '';
    }
  }

  // ---- PDF.js text extraction ----
  async function extractTextWithPDFJS(arrayBuffer) {
    // Configure pdf.js worker
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        '/static/vendor/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\\n';
      }
      return fullText.trim();
    }
    return null;
  }

  // ---- Parse Flexion & Flow (and similar) intake form fields ----
  // Strategy: extract each Q->A pair by finding the answer between a question
  // keyword and the next recognisable keyword. Avoids complex regexes that
  // break when embedded inside a TypeScript template literal.
  function parseIntakeFields(text) {
    const t = text.replace(/[ \\t]+/g, ' ').trim();

    // Simple grab: find keyword, capture up to ~120 chars, trim at next cap word
    function after(keyword) {
      const idx = t.toLowerCase().indexOf(keyword.toLowerCase());
      if (idx === -1) return '';
      let chunk = t.slice(idx + keyword.length, idx + keyword.length + 200);
      // strip leading punctuation / spaces
      chunk = chunk.replace(/^[?:\\s]+/, '').trim();
      // stop at the next sentence-like boundary or question word
      const stopAt = chunk.search(/\\s+(?:How |What |Do |Are |Have |When |Please|Emergency|Lifestyle|Previous|Declaration|Signature|\\d+ \\/ )/);
      if (stopAt > 5) chunk = chunk.slice(0, stopAt).trim();
      return chunk;
    }

    // ---- Name (appear before "Email" so no ambiguity) ----
    const firstName = after('First name').split(' ')[0].replace(/[^A-Za-z\\-]/g, '');
    const lastName  = after('Last name').split(' ')[0].replace(/[^A-Za-z\\-]/g, '');

    // ---- DOB ----
    const dobRaw = after('Birthday').split(' ').slice(0, 3).join(' ').trim();
    let dobForInput = '';
    if (dobRaw) {
      try {
        const d = new Date(dobRaw);
        if (!isNaN(d.getTime())) dobForInput = d.toISOString().split('T')[0];
      } catch(e) {}
    }

    // ---- Email ----
    const emailMatch = t.match(/[\\w.+-]+@[\\w.-]+\\.[a-z]{2,}/i);
    const email = emailMatch ? emailMatch[0] : '';

    // ---- Phone: first number after "Phone" (not "Emergency") ----
    const phoneIdx = t.toLowerCase().indexOf('\\nphone ');
    const phoneChunk = phoneIdx !== -1
      ? t.slice(phoneIdx + 7, phoneIdx + 35)
      : after('Phone +') || after('Phone ');
    const phoneMatch2 = phoneChunk.match(/[+\\d][\\d\\s()+-]{6,18}/);
    const phone = phoneMatch2 ? phoneMatch2[0].trim() : '';

    // ---- Chief complaint ----
    const chiefComplaint = (() => {
      const raw = after('brings you to see me today');
      if (!raw) return after('Reason for visit');
      // stop before "How did you hear"
      const cut = raw.toLowerCase().indexOf('how did you hear');
      return cut > 3 ? raw.slice(0, cut).trim() : raw;
    })();

    // ---- Lifestyle ----
    const occupation    = after('do for work').split(/\\s+(?:How |Are |Do |Have )/)[0].trim();
    const sleep         = after('well do you sleep').split(/\\s+(?:How |Are |Do |Have )/)[0].trim();
    const stress        = after('stress levels').split(/\\s+(?:How |Are |Do |Have )/)[0].trim();
    const exercise      = after('do you ex').split(/\\s+(?:Do |Are |Have |When )/)[0].trim();
    const lastTreatment = after('last treatment').split(/\\s+(?:Are |Do |Have )/)[0].trim();

    // ---- Yes/No fields (suppress "No") ----
    const no = /^no$/i;
    const medsRaw    = after('taking any medications').split(/\\s+(?:Do |Are |Have )/)[0].trim();
    const allergyRaw = after('any allergies').split(/\\s+(?:Have |Are |Do )/)[0].trim();
    const injuryRaw  = after('accidents, injuries or surg').split(/\\s+(?:Do |Are |Have )/)[0].trim();
    const condRaw    = after('medical conditions we need').split(/\\s+(?:Have |Are |Do )/)[0].trim();
    const pregRaw    = after('pregnant or breastfeeding').split(/\\s+/)[0].trim();

    return {
      firstName, lastName, dobForInput, email, phone,
      chiefComplaint,
      occupation, sleep, stress, exercise, lastTreatment,
      medications:  (!no.test(medsRaw)    && medsRaw)    ? medsRaw    : '',
      allergies:    (!no.test(allergyRaw) && allergyRaw) ? allergyRaw : '',
      injuries:     (!no.test(injuryRaw)  && injuryRaw)  ? injuryRaw  : '',
      conditions:   (!no.test(condRaw)    && condRaw)    ? condRaw    : '',
      pregnancy:    (!no.test(pregRaw)    && pregRaw)    ? pregRaw    : '',
    };
  }

  // ---- Auto-fill the Step 1 client fields ----
  function autoFillClientFields(p, options = {}) {
    const overwrite = !!options.overwrite;
    const source = options.source || 'manual-entry';

    if (p.firstName) setFieldValue('clientFirstName', p.firstName, overwrite);
    if (p.lastName) setFieldValue('clientLastName', p.lastName, overwrite);
    if (p.email) setFieldValue('clientEmail', p.email, overwrite);
    if (p.dobForInput) setFieldValue('clientDOB', p.dobForInput, overwrite);
    if (p.chiefComplaint) setFieldValue('chiefComplaint', p.chiefComplaint, overwrite);
    if (p.medications) setFieldValue('medications', p.medications, overwrite);

    // Save to client profiles so it's available for future sessions
    if (p.firstName || p.lastName) {
      const profile = {
        id: 'pdf-' + Date.now(),
        firstName:         p.firstName      || '',
        lastName:          p.lastName       || '',
        email:             p.email          || '',
        phone:             p.phone          || '',
        dob:               p.dobForInput    || '',
        occupation:        p.occupation     || '',
        chiefComplaint:    p.chiefComplaint || '',
        medications:       p.medications    || '',
        allergies:         p.allergies      || '',
        medicalConditions: p.conditions     || '',
        areasToAvoid:      p.injuries       || '',
        lastTreatment:     p.lastTreatment  || '',
        source,
        savedAt:           new Date().toISOString(),
      };
      upsertClientProfile(profile).catch(console.error);
    }

    // Show a brief toast
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
    if (name) showCopyFeedback('\u2705 Client info auto-filled: ' + name);
    updateSummaryPanel();
  }

  function setFieldValue(id, value, overwrite) {
    const el = document.getElementById(id);
    if (!el || !value) return;
    if (overwrite || !el.value) el.value = value;
  }

  // ---- Build a clean intake summary for the textarea ----
  function formatIntakeSummary(rawText, p) {
    const lines = [];
    const add = (label, val) => { if (val && val.trim() && !/^no$/i.test(val.trim())) lines.push(label + ': ' + val.trim()); };
    add('Client Name',       [p.firstName, p.lastName].filter(Boolean).join(' '));
    add('Date of Birth',     p.dobForInput);
    add('Email',             p.email);
    add('Phone',             p.phone);
    add('Reason for Visit',  p.chiefComplaint);
    add('Occupation',        p.occupation);
    add('Sleep Quality',     p.sleep);
    add('Stress Level',      p.stress);
    add('Exercise Frequency',p.exercise);
    add('Last Treatment',    p.lastTreatment);
    add('Medications',       p.medications);
    add('Allergies',         p.allergies);
    add('Injuries / Surgeries', p.injuries);
    add('Medical Conditions',p.conditions);
    add('Pregnancy / Breastfeeding', p.pregnancy);
    return lines.length > 0
      ? lines.join('\\n')
      : rawText.replace(/\\s+/g, ' ').trim().slice(0, 1500);
  }

  function clearPDF() {
    document.getElementById('pdfInput').value = '';
    document.getElementById('pdfStatus').style.display = 'none';
    document.getElementById('dropZone').style.display = '';
    document.getElementById('intakeFormData').value = '';
    state.pdfText = '';
  }

  // ============================================================
  // GENERATE SOAP NOTES
  // ============================================================
  async function generateSOAP() {
    // API key is now handled server-side - no client key needed

    goToStep(4);
    document.getElementById('soapLoading').style.display = 'block';
    document.getElementById('soapContent').style.display = 'none';

    // Gather all tension points and create muscle context
    const allMuscles = [...ANTERIOR_MUSCLES, ...POSTERIOR_MUSCLES];
    const treatedMuscles = [];
    const tensionPointDetails = [];
    
    // Group tension points by muscle
    const muscleGroups = new Map();
    state.tensionPoints.forEach(dot => {
      if (!muscleGroups.has(dot.muscleId)) {
        muscleGroups.set(dot.muscleId, []);
        treatedMuscles.push(dot.muscleName);
      }
      muscleGroups.get(dot.muscleId).push(dot);
      tensionPointDetails.push(dot.number + '. ' + dot.muscleName + ': ' + dot.type + (dot.notes ? ' - ' + dot.notes : ''));
    });
    
    // No follow-up muscles with tension point system
    const followupMuscles = [];

    // Gather techniques
    const techniques = Array.from(document.querySelectorAll('input[name="technique"]:checked'))
      .map(el => el.value);

    // Build context
    const firstName = document.getElementById('clientFirstName').value;
    const lastName = document.getElementById('clientLastName').value;
    const dob = document.getElementById('clientDOB').value;
    const chiefComplaint = document.getElementById('chiefComplaint').value;
    const painBefore = document.getElementById('painLevel').value;
    const painAfter = document.getElementById('postPainLevel').value;
    const duration = document.getElementById('sessionDuration').value;
    const medications = document.getElementById('medications').value;
    const sessionSummary = document.getElementById('sessionSummary').value;
    const clientFeedback = document.getElementById('clientFeedback').value;
    const intakeData = document.getElementById('intakeFormData').value;

    const musclesContext = [
      treatedMuscles.length ? 'Treated muscles: ' + treatedMuscles.join(', ') : '',
      tensionPointDetails.length ? 'Specific areas: ' + tensionPointDetails.join('; ') : ''
    ].filter(Boolean).join(' | ');

    const contextData = {
      client: [firstName, lastName].filter(Boolean).join(' '),
      firstName,
      lastName,
      email: document.getElementById('clientEmail')?.value || '',
      dob,
      chiefComplaint,
      painBefore,
      painAfter,
      duration,
      medications,
      techniques: techniques.join(', '),
      sessionSummary,
      clientFeedback,
      muscles: musclesContext
    };

    try {
      const prompt = buildPrompt(contextData, intakeData, state.useMedicalShorthand);
      
      const response = await apiFetch('/api/generate-soap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          intakeData: intakeData,
          sessionSummary: contextData.sessionSummary,
          muscles: treatedMuscles,
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'OpenAI API error');
      }

      const soapData = await response.json();
      const formattedSoapData = applyWritingStyleToSoapData(soapData);
      state.soapData = formattedSoapData;

      displaySOAP(formattedSoapData, contextData, treatedMuscles, followupMuscles);

      // ── Auto-save to client file ──────────────────────────────────────────
      const saved = await saveSOAPToClientFile(
        contextData, formattedSoapData, treatedMuscles, followupMuscles, techniques
      );
      if (saved) {
        // Try to upload PDF to Drive in background
        setTimeout(() => {
          uploadPDFToDrive(
            saved.sessionId,
            saved.accountNumber,
            contextData.client || 'Client',
            document.getElementById('sessionDate')?.value || new Date().toISOString().split('T')[0]
          );
        }, 1200);
      }

    } catch (err) {
      document.getElementById('soapLoading').style.display = 'none';
      goToStep(3);
      alert('Error generating SOAP notes: ' + err.message);
    }
  }

  function buildPrompt(ctx, intakeData, useMedicalShorthand) {
    const writingStyleGuide = useMedicalShorthand
      ? 'Writing style: Use concise medical shorthand where safe and clear (e.g., ROM, TTP, B/L, w/, w/o, c/o). Keep statements clinically clear and avoid ambiguous abbreviations.'
      : 'Writing style: Use full clinical sentences in clear professional language.';

    const responseGuide = useMedicalShorthand
      ? [
        '{',
        '  "subjective": "Concise pt-reported symptoms/history in medical shorthand. 2-4 lines.",',
        '  "objective": "Objective findings in shorthand: palpation, tissue quality, ROM, and treatment response. 3-5 lines.",',
        '  "assessment": "Clinical interpretation using concise shorthand. 2-4 lines.",',
        '  "plan": "Next-session plan + self-care in concise shorthand. 3-5 lines.",',
        '  "therapistNotes": "Additional key notes/precautions in shorthand. 1-3 lines."',
        '}'
      ].join('\\n')
      : [
        '{',
        '  "subjective": "Patient-reported complaints, pain levels, history, goals. 3-4 clinical sentences.",',
        '  "objective": "Observable findings: palpation results for each muscle treated, tissue texture, ROM findings, postural observations, technique response. 4-6 sentences.",',
        '  "assessment": "Clinical interpretation: tissue findings, treatment response, progress toward therapeutic goals, functional improvement. 3-4 sentences.",',
        '  "plan": "Next session plan, recommended frequency, home care exercises, self-care instructions, areas to focus on next visit. 4-5 sentences.",',
        '  "therapistNotes": "Additional clinical notes, contraindications observed, special considerations, referral recommendations if applicable. 2-3 sentences."',
        '}'
      ].join('\\n');

    return \`Generate complete professional SOAP notes for a massage therapy session. Return a JSON object with keys: "subjective", "objective", "assessment", "plan", "therapistNotes".

CLIENT INFORMATION:
- Name: \${ctx.client || 'Not provided'}
- Date of Birth: \${ctx.dob || 'Not provided'}
- Chief Complaint: \${ctx.chiefComplaint || 'Not provided'}
- Pain Level (before session): \${ctx.painBefore || 'Not recorded'}/10
- Pain Level (after session): \${ctx.painAfter || 'Not recorded'}/10
- Session Duration: \${ctx.duration}
- Current Medications: \${ctx.medications || 'None reported'}

INTAKE FORM DATA:
\${intakeData || 'No intake form provided'}

MUSCLES ADDRESSED:
\${ctx.muscles || 'No specific muscles recorded'}

TECHNIQUES USED:
\${ctx.techniques || 'Not specified'}

THERAPIST SESSION SUMMARY:
\${ctx.sessionSummary || 'No summary provided'}

CLIENT FEEDBACK:
\${ctx.clientFeedback || 'No feedback recorded'}

Generate detailed, clinically appropriate SOAP notes. Use professional massage therapy terminology.
\${writingStyleGuide}

Return JSON:
\${responseGuide}\`;
  }

  function displaySOAP(data, ctx, treatedMuscles, followupMuscles) {
    document.getElementById('soapLoading').style.display = 'none';
    document.getElementById('soapContent').style.display = 'flex';
    document.getElementById('statusBadge').style.display = 'inline-flex';

    // Header
    document.getElementById('soapClientName').textContent = ctx.client || 'Client';
    document.getElementById('soapMeta').textContent = 'Chief Complaint: ' + (ctx.chiefComplaint || 'Not specified');
    document.getElementById('soapDate').textContent = 'Date: ' + (document.getElementById('sessionDate').value || new Date().toLocaleDateString());
    document.getElementById('soapDuration').textContent = 'Duration: ' + ctx.duration;

    // Muscle tags
    const tagsEl = document.getElementById('soapMusclesSummary');
    tagsEl.innerHTML = [
      ...treatedMuscles.map(m => \`<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">\${m}</span>\`),
      ...followupMuscles.map(m => \`<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">\${m}</span>\`)
    ].join('');

    // SOAP content
    document.getElementById('soapS').value = data.subjective || '';
    document.getElementById('soapO').value = data.objective || '';
    document.getElementById('soapA').value = data.assessment || '';
    document.getElementById('soapP').value = data.plan || '';
    document.getElementById('soapN').value = data.therapistNotes || '';

    // Auto-resize textareas
    ['soapS', 'soapO', 'soapA', 'soapP', 'soapN'].forEach(id => {
      const el = document.getElementById(id);
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });

    // Muscles sidebar list
    const musclesListEl = document.getElementById('soapMusclesList');
    musclesListEl.innerHTML = [
      treatedMuscles.length ? '<p class="font-semibold text-slate-500 uppercase text-xs tracking-wide mb-1">Treated</p>' + treatedMuscles.map(m => \`<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>\${m}</div>\`).join('') : '',
      followupMuscles.length ? '<p class="font-semibold text-slate-500 uppercase text-xs tracking-wide mt-2 mb-1">Follow-up</p>' + followupMuscles.map(m => \`<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>\${m}</div>\`).join('') : ''
    ].join('');
  }

  async function regenerateSOAP() {
    goToStep(3);
    setTimeout(() => generateSOAP(), 100);
  }

  // ============================================================
  // COPY FUNCTIONS
  // ============================================================
  function copySection(section) {
    const map = { S: 'soapS', O: 'soapO', A: 'soapA', P: 'soapP', N: 'soapN' };
    const el = document.getElementById(map[section]);
    if (el) {
      navigator.clipboard.writeText(el.value).then(() => {
        showCopyFeedback('Section copied!');
      });
    }
  }

  function copyAllSOAP() {
    const s = document.getElementById('soapS').value;
    const o = document.getElementById('soapO').value;
    const a = document.getElementById('soapA').value;
    const p = document.getElementById('soapP').value;
    const n = document.getElementById('soapN').value;
    const therapist = document.getElementById('therapistName').value;
    const creds = document.getElementById('therapistCredentials').value;
    
    const client = document.getElementById('soapClientName').textContent;
    const date = document.getElementById('soapDate').textContent;
    const duration = document.getElementById('soapDuration').textContent;

    const text = \`SOAP NOTE - MASSAGE THERAPY
============================
\${client}
\${date} | \${duration}

SUBJECTIVE:
\${s}

OBJECTIVE:
\${o}

ASSESSMENT:
\${a}

PLAN:
\${p}

THERAPIST NOTES:
\${n}

\${therapist ? 'Therapist: ' + therapist : ''}
\${creds ? 'Credentials: ' + creds : ''}
============================\`;

    navigator.clipboard.writeText(text).then(() => {
      showCopyFeedback('All notes copied!');
    });
  }

  function showCopyFeedback(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ============================================================
  // PDF EXPORT UTILITIES
  // ============================================================
  
  // Enhanced PDF configuration for professional output
  const PDF_CONFIG = {
    pageWidth: 210,
    marginTop: 20,
    marginSide: 20,
    lineHeight: 4.5,
    sectionSpacing: 8,
    colors: {
      primary: [124, 58, 237],     // Violet brand color
      secondary: [99, 102, 241],   // Indigo accent
      dark: [15, 23, 42],          // Primary text
      medium: [71, 85, 105],       // Secondary text
      light: [248, 250, 252],      // Background
      success: [16, 185, 129],     // Green
      warning: [245, 158, 11],     // Amber
      info: [59, 130, 246],        // Blue
      accent: [139, 92, 246],      // Purple
      neutral: [107, 114, 128]     // Gray
    },
    fonts: {
      title: { size: 18, style: 'bold' },
      subtitle: { size: 12, style: 'bold' },
      heading: { size: 11, style: 'bold' },
      body: { size: 9.5, style: 'normal' },
      small: { size: 8, style: 'normal' },
      tiny: { size: 7, style: 'normal' }
    }
  };

  // Utility function to create consistent PDF instance
  function createPDFInstance() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ 
      orientation: 'portrait', 
      unit: 'mm', 
      format: 'a4',
      putOnlyUsedFonts: true,
      precision: 2
    });
    
    // Enable text justification and better spacing
    doc.setLineHeightFactor(1.2);
    return doc;
  }

  // Enhanced text wrapping with better line breaks
  function wrapTextWithSpacing(doc, text, maxWidth, fontSize = 9.5) {
    if (!text || !text.trim()) return [];
    
    doc.setFontSize(fontSize);
    
    // Split into paragraphs first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    const allLines = [];
    
    paragraphs.forEach((paragraph, index) => {
      const cleanPara = paragraph.replace(/\s+/g, ' ').trim();
      const lines = doc.splitTextToSize(cleanPara, maxWidth);
      allLines.push(...lines);
      
      // Add paragraph spacing (except for last paragraph)
      if (index < paragraphs.length - 1) {
        allLines.push(''); // Empty line for paragraph break
      }
    });
    
    return allLines;
  }

  // Professional header with branding
  function renderPDFHeader(doc, pageNumber = 1) {
    const { pageWidth, marginSide, colors } = PDF_CONFIG;
    const contentWidth = pageWidth - (marginSide * 2);
    
    if (pageNumber === 1) {
      // Main header with full branding
      doc.setFillColor(...colors.primary);
      doc.rect(0, 0, pageWidth, 32, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(PDF_CONFIG.fonts.title.size);
      doc.setFont('helvetica', 'bold');
      doc.text('SOAP NOTE — MASSAGE THERAPY', marginSide, 16);
      
      // Subtitle with practice name
      doc.setFontSize(PDF_CONFIG.fonts.small.size);
      doc.setFont('helvetica', 'normal');
      doc.text('Flexion & Flow Massage Therapy', marginSide, 25);
      
      return 40; // Return Y position after header
    } else {
      // Continuation page header
      doc.setFillColor(...colors.medium);
      doc.rect(0, 0, pageWidth, 20, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(PDF_CONFIG.fonts.body.size);
      doc.setFont('helvetica', 'bold');
      doc.text('SOAP Note (Continued)', marginSide, 12);
      
      doc.setFont('helvetica', 'normal');
      doc.text('Page ' + pageNumber, pageWidth - marginSide - 20, 12);
      
      return 28; // Return Y position after header
    }
  }

  function generatePdfDocument(outputType = 'save') { // 'save' or 'base64'
    const doc = createPDFInstance();
    const { pageWidth, marginSide, colors, fonts } = PDF_CONFIG;
    const contentWidth = pageWidth - (marginSide * 2);
    let currentPage = 1;
    let y = renderPDFHeader(doc, currentPage);

    // Professional client information panel
    y += 5;

    // Enhanced client information panel
    const clientData = {
      name: document.getElementById('soapClientName')?.textContent || 'Client',
      date: document.getElementById('sessionDate')?.value || '',
      duration: document.getElementById('sessionDuration')?.value || '',
      complaint: document.getElementById('chiefComplaint')?.value || '',
      painBefore: document.getElementById('painLevel')?.value || '',
      painAfter: document.getElementById('postPainLevel')?.value || '',
      therapist: document.getElementById('therapistName')?.value || '',
      credentials: document.getElementById('therapistCredentials')?.value || '',
      accountNumber: state.lastAccountNumber || ''
    };

    // Client info panel with enhanced styling
    const panelHeight = 30;
    doc.setFillColor(...colors.light);
    doc.rect(marginSide, y, contentWidth, panelHeight, 'F');
    doc.setDrawColor(...colors.medium);
    doc.setLineWidth(0.5);
    doc.rect(marginSide, y, contentWidth, panelHeight, 'S');
    
    // Client name (prominent)
    doc.setTextColor(...colors.dark);
    doc.setFontSize(fonts.subtitle.size);
    doc.setFont('helvetica', 'bold');
    doc.text(clientData.name, marginSide + 4, y + 8);
    
    // Session details (two columns)
    doc.setFontSize(fonts.small.size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.medium);
    
    // Left column
    const leftCol = marginSide + 4;
    doc.text('Date: ' + (clientData.date || '—'), leftCol, y + 15);
    doc.text('Duration: ' + (clientData.duration || '—'), leftCol, y + 20);
    if (clientData.accountNumber) {
      doc.text('Account: ' + clientData.accountNumber, leftCol, y + 25);
    }
    
    // Center column  
    const centerCol = marginSide + 70;
    if (clientData.complaint) {
      const ccLines = wrapTextWithSpacing(doc, 'Chief Complaint: ' + clientData.complaint, 60, fonts.small.size);
      doc.text(ccLines[0] || '', centerCol, y + 15);
      if (ccLines[1]) doc.text(ccLines[1], centerCol, y + 20);
    }
    
    // Right column - Pain scores
    const rightCol = marginSide + 130;
    if (clientData.painBefore) {
      doc.text('Pain Before: ' + clientData.painBefore + '/10', rightCol, y + 15);
    }
    if (clientData.painAfter) {
      doc.text('Pain After: ' + clientData.painAfter + '/10', rightCol, y + 20);
    }
    
    y += panelHeight + 8;

    // Enhanced SOAP Sections with better typography
    const soapSections = [
      { label: 'S — Subjective', id: 'soapS', color: colors.info, description: 'Patient\'s reported symptoms and concerns' },
      { label: 'O — Objective', id: 'soapO', color: colors.success, description: 'Observable findings and measurements' },
      { label: 'A — Assessment', id: 'soapA', color: colors.warning, description: 'Professional evaluation and analysis' },
      { label: 'P — Plan', id: 'soapP', color: colors.accent, description: 'Treatment plan and recommendations' },
      { label: 'N — Therapist Notes', id: 'soapN', color: colors.neutral, description: 'Additional observations and notes' },
    ];

    for (const section of soapSections) {
      const rawText = document.getElementById(section.id)?.value || '';
      const processedText = applyWritingStyle(rawText);
      
      if (!processedText.trim()) continue;

      // Smart page break management
      if (y > 240) {
        doc.addPage();
        currentPage++;
        y = renderPDFHeader(doc, currentPage);
      }

      // Enhanced section header with color bar and description
      doc.setFillColor(...section.color);
      doc.rect(marginSide, y, 6, 10, 'F');
      
      doc.setTextColor(...colors.dark);
      doc.setFontSize(fonts.heading.size);
      doc.setFont('helvetica', 'bold');
      doc.text(section.label, marginSide + 10, y + 7);
      
      // Optional: Add subtle description
      doc.setFontSize(fonts.tiny.size);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...colors.medium);
      doc.text(section.description, marginSide + 10, y + 11);
      
      y += 16;

      // Section content with improved formatting
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fonts.body.size);
      doc.setTextColor(...colors.dark);
      
      const textLines = wrapTextWithSpacing(doc, processedText, contentWidth - 8, fonts.body.size);
      
      for (const line of textLines) {
        if (y > 265) { // Leave more space for footer
          doc.addPage();
          currentPage++;
          y = renderPDFHeader(doc, currentPage);
        }
        
        if (line.trim()) { // Skip empty lines from paragraph breaks
          doc.text(line, marginSide + 4, y);
        }
        y += line.trim() ? PDF_CONFIG.lineHeight : PDF_CONFIG.lineHeight * 0.8; // Smaller spacing for paragraph breaks
      }
      
      y += PDF_CONFIG.sectionSpacing;
    }

    // Enhanced Treatment Areas & Tension Points section
    const treatmentData = {
      muscles: [],
      tensionPoints: [],
      techniques: []
    };
    
    // Organize tension points by muscle
    const muscleGroups = new Map();
    state.tensionPoints.forEach(point => {
      if (!muscleGroups.has(point.muscleId)) {
        muscleGroups.set(point.muscleId, []);
        treatmentData.muscles.push(point.muscleName);
      }
      muscleGroups.get(point.muscleId).push(point);
      
      const pointDetail = {
        number: point.number,
        muscle: point.muscleName,
        type: point.type,
        notes: point.notes || ''
      };
      treatmentData.tensionPoints.push(pointDetail);
    });

    // Add treatment areas section if there's data
    if (treatmentData.muscles.length > 0 || treatmentData.tensionPoints.length > 0) {
      // Page break check
      if (y > 230) {
        doc.addPage();
        currentPage++;
        y = renderPDFHeader(doc, currentPage);
      }

      // Section header
      doc.setFillColor(...colors.secondary);
      doc.rect(marginSide, y, 6, 10, 'F');
      doc.setTextColor(...colors.dark);
      doc.setFontSize(fonts.heading.size);
      doc.setFont('helvetica', 'bold');
      doc.text('Treatment Areas & Clinical Findings', marginSide + 10, y + 7);
      y += 16;

      // Treated muscles summary
      if (treatmentData.muscles.length > 0) {
        doc.setFontSize(fonts.body.size);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.success);
        doc.text('◆ Treated Areas:', marginSide + 4, y);
        y += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.dark);
        const muscleText = treatmentData.muscles.join(', ');
        const muscleLines = wrapTextWithSpacing(doc, muscleText, contentWidth - 12, fonts.body.size);
        muscleLines.forEach(line => {
          if (line.trim()) {
            doc.text(line, marginSide + 8, y);
            y += PDF_CONFIG.lineHeight;
          }
        });
        y += 4;
      }
      
      // Detailed tension points 
      if (treatmentData.tensionPoints.length > 0) {
        doc.setFontSize(fonts.body.size);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor([220, 38, 127]); // Rose color for tension points
        doc.text('◆ Tension Points & Clinical Notes:', marginSide + 4, y);
        y += 6;
        
        // Group and display tension points
        treatmentData.tensionPoints.forEach((point, index) => {
          if (y > 265) {
            doc.addPage();
            currentPage++;
            y = renderPDFHeader(doc, currentPage);
          }
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.dark);
          doc.setFontSize(fonts.small.size);
          
          const pointText = point.number + '. ' + point.muscle + ': ' + point.type;
          doc.text(pointText, marginSide + 8, y);
          y += 4;
          
          if (point.notes) {
            doc.setTextColor(...colors.medium);
            doc.setFont('helvetica', 'italic');
            const noteLines = wrapTextWithSpacing(doc, 'Notes: ' + point.notes, contentWidth - 16, fonts.tiny.size);
            noteLines.forEach(noteLine => {
              if (noteLine.trim()) {
                doc.text(noteLine, marginSide + 12, y);
                y += 3.5;
              }
            });
          }
          y += 2;
        });
      }
      
      y += PDF_CONFIG.sectionSpacing;
    }

    // Professional footer with signature area
    if (y > 240) {
      doc.addPage();
      currentPage++;
      y = renderPDFHeader(doc, currentPage);
    }

    // Signature section
    y += 10;
    doc.setDrawColor(...colors.medium);
    doc.setLineWidth(0.5);
    doc.line(marginSide, y, marginSide + contentWidth, y);
    y += 8;

    // Therapist information
    doc.setTextColor(...colors.dark);
    doc.setFontSize(fonts.body.size);
    doc.setFont('helvetica', 'bold');
    
    if (clientData.therapist || clientData.credentials) {
      const therapistInfo = [clientData.therapist, clientData.credentials].filter(Boolean).join(', ');
      doc.text('Therapist:', marginSide, y);
      doc.setFont('helvetica', 'normal');
      doc.text(therapistInfo, marginSide + 25, y);
      y += 6;
    }
    
    // Signature line
    doc.setTextColor(...colors.medium);
    doc.setFontSize(fonts.small.size);
    doc.text('Signature:', marginSide, y);
    doc.setDrawColor(...colors.medium);
    doc.line(marginSide + 25, y, marginSide + 100, y);
    
    doc.text('Date:', marginSide + 110, y);
    doc.line(marginSide + 125, y, marginSide + contentWidth, y);
    y += 8;
    
    // Practice information
    doc.setTextColor(...colors.medium);
    doc.setFontSize(fonts.tiny.size);
    doc.setFont('helvetica', 'normal');
    doc.text('Flexion & Flow Massage Therapy', marginSide, y);
    
    // Generation timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    doc.setTextColor(180, 180, 180);
    doc.text('Generated: ' + timestamp, marginSide + contentWidth - 80, y);

    // Return based on output type
    if (outputType === 'base64') {
      return doc.output('datauristring').split(',')[1];
    } else {
      // Enhanced filename with better formatting
      const safeName = (clientData.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
      const safeDate = (clientData.date || '').replace(/[^0-9]/g, '') || 'date';
      const filename = 'SOAP_Note_' + safeName + '_' + safeDate + '.pdf';
      doc.save(filename);
    }
  }

  // ============================================================
  // RESET
  // ============================================================
  function resetAll() {
    if (!confirm('Start a new session? All current data will be cleared.')) return;
    
    state.tensionPoints = [];
    state.treatedMuscles.clear();
    state.soapData = null;
    state.currentView = 'anterior';
    state.currentGender = 'male';
    state.showMusclePolygons = false;
    state.useMedicalShorthand = false;

    const polyToggle = document.getElementById('toggleMusclePolygons');
    if (polyToggle) polyToggle.checked = false;

    // Reset fields
    ['clientFirstName', 'clientLastName', 'clientEmail', 'clientDOB', 'chiefComplaint', 
     'painLevel', 'medications', 'sessionSummary', 'clientFeedback',
     'postPainLevel', 'intakeFormData', 'therapistName', 'therapistCredentials']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    
    document.getElementById('sessionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('sessionDuration').value = '60 min';
    
    // Reset checkboxes
    document.querySelectorAll('input[name="technique"]').forEach(cb => cb.checked = false);
    
    clearPDF();
    document.getElementById('statusBadge').style.display = 'none';
    document.getElementById('soapContent').style.display = 'none';
    document.getElementById('soapLoading').style.display = 'none';
    const savedBadge = document.getElementById('savedFileBadge');
    if (savedBadge) savedBadge.style.display = 'none';
    const driveBadge = document.getElementById('driveBadge');
    if (driveBadge) driveBadge.style.display = 'none';
    state.lastAccountNumber = null;
    state.lastSessionId = null;

    setView('anterior');
    setGender('male');
    renderMuscleMap();
    updateMuscleLists();
    updateWritingStyleBadge();
    updateIntakeReviewPanel();
    goToStep(1);
  }

  // ── Expose functions to global scope for inline HTML handlers ──
  window.goToStep = goToStep;
  window.setView = setView;
  window.setGender = setGender;
  window.toggleMusclePolygons = toggleMusclePolygons;
  // Removed toggleMuscle - replaced with dot placement system
  window.showTooltip = showTooltip;
  window.hideTooltip = hideTooltip;
  window.clearAllMuscles = clearAllMuscles;
  // New tension points functions
  window.handleCanvasClick = handleCanvasClick;
  window.saveTensionDot = saveTensionDot;
  window.removeTensionDot = removeTensionDot;
  window.updateMarkerNotes = updateMarkerNotes;
  // Quick Select functions
  window.toggleQuickSelectPanel = toggleQuickSelectPanel;
  window.applyQuickSelectPreset = applyQuickSelectPreset;
  window.openClientBrowser = openClientBrowser;
  window.closeClientBrowser = closeClientBrowser;
  window.filterClients = filterClients;
  window.loadClientProfile = loadClientProfile;
  window.importManualProfile = importManualProfile;
  window.openWebhookConfig = openWebhookConfig;
  window.closeWebhookConfig = closeWebhookConfig;
  window.saveWebhookConfig = saveWebhookConfig;
  window.copyWebhookUrl = copyWebhookUrl;
  window.deleteClientProfile = deleteClientProfile;
  window.removeClientProfile = removeClientProfile;
  window.jumpToField = jumpToField;
  window.setMedicalShorthand = setMedicalShorthand;
  // loadDriveFiles and selectDriveFile are exposed to window immediately after their definitions
  </script>

  <!-- ═══════════════════════════════════════════════════════════
       CLIENT ACCOUNTS MODAL
       ═══════════════════════════════════════════════════════════ -->
  <div id="clientAccountsModal" class="modal-backdrop" style="display:none;">
    <div class="modal-box" style="max-width:900px;width:95vw;height:88vh;display:flex;flex-direction:column;">
      <div class="modal-header">
        <div>
          <h3><i class="fas fa-folder-open" style="margin-right:8px;opacity:0.8;"></i>Client Accounts</h3>
          <p>All client files — account numbers, intake history &amp; SOAP sessions</p>
        </div>
        <button class="modal-close" onclick="closeClientAccounts()"><i class="fas fa-times"></i></button>
      </div>

      <!-- Toolbar -->
      <div style="padding:14px 24px;border-bottom:1px solid var(--border);background:#f7faff;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <input id="accountSearch" type="text" placeholder="Search by name, account number or email…"
          oninput="filterAccountList()"
          style="flex:1;min-width:200px;padding:9px 14px;border:1.5px solid var(--border);border-radius:50px;font-family:var(--font);font-size:0.82rem;outline:none;"/>
        <span id="accountCount" style="font-size:0.75rem;color:var(--text-light);white-space:nowrap;"></span>
        <button onclick="checkDriveStatus()" id="driveStatusBtn" class="btn btn-ghost btn-sm" title="Google Drive status">
          <i class="fab fa-google-drive"></i> <span id="driveStatusLabel">Drive</span>
        </button>
        <button onclick="syncDrivePDFs()" id="driveSyncBtn" class="btn btn-ghost btn-sm" title="Sync PDFs from Google Drive">
          <i class="fas fa-sync-alt"></i> <span id="driveSyncLabel">Sync PDFs</span>
        </button>
        <button onclick="syncClientsNow()" id="clientSyncBtn" class="btn btn-ghost btn-sm" title="Sync client profiles across apps">
          <i class="fas fa-cloud-download-alt"></i> <span id="clientSyncLabel">Sync Clients</span>
        </button>
      </div>

      <!-- Client list -->
      <div id="accountList" style="flex:1;overflow-y:auto;padding:16px 24px;"></div>

      <!-- Footer -->
      <div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;">
        <button onclick="closeClientAccounts()" class="btn btn-ghost btn-sm">Close</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════
       CLIENT FILE MODAL (detail view)
       ═══════════════════════════════════════════════════════════ -->
  <div id="clientFileModal" class="modal-backdrop" style="display:none;">
    <div class="modal-box" style="max-width:780px;width:95vw;max-height:90vh;overflow-y:auto;">
      <div class="modal-header">
        <div>
          <h3 id="clientFileTitle"><i class="fas fa-user-circle" style="margin-right:8px;opacity:0.8;"></i>Client File</h3>
          <p id="clientFileSubtitle"></p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button onclick="loadClientFromFile()" class="btn btn-primary btn-sm">
            <i class="fas fa-play"></i> New Session
          </button>
          <button class="modal-close" onclick="closeClientFile()"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div id="clientFileBody" style="padding:20px 24px;"></div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════
       SESSION VIEWER MODAL
       ═══════════════════════════════════════════════════════════ -->
  <div id="sessionViewModal" class="modal-backdrop" style="display:none;">
    <div class="modal-box" style="max-width:700px;width:95vw;max-height:90vh;overflow-y:auto;">
      <div class="modal-header">
        <div>
          <h3><i class="fas fa-file-medical" style="margin-right:8px;opacity:0.8;"></i>Session Record</h3>
          <p id="sessionViewSubtitle"></p>
        </div>
        <button class="modal-close" onclick="closeSessionView()"><i class="fas fa-times"></i></button>
      </div>
      <div id="sessionViewBody" style="padding:20px 24px;"></div>
    </div>
  </div>

  <script>
  // ============================================================
  // CLIENT ACCOUNTS — server-side KV storage
  // ============================================================
  let _currentClientFile = null; // currently open client record

  async function openClientAccounts() {
    document.getElementById('clientAccountsModal').style.display = 'flex';
    document.getElementById('accountSearch').value = '';
    await loadAccountList();
    checkDriveStatus();
    document.getElementById('accountSearch').focus();
  }
  function closeClientAccounts() {
    document.getElementById('clientAccountsModal').style.display = 'none';
  }

  async function loadAccountList() {
    const list = document.getElementById('accountList');
    list.innerHTML = '<p style="text-align:center;padding:32px;color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> Loading clients…</p>';
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      renderAccountList(data.clients || []);
    } catch(e) {
      list.innerHTML = '<p style="text-align:center;padding:32px;color:var(--danger);">Could not load clients — KV storage may not be configured yet.</p>';
    }
  }

  async function syncClientsNow() {
    const btn = document.getElementById('clientSyncBtn');
    const label = document.getElementById('clientSyncLabel');
    if (!btn || !label) return;
    btn.disabled = true;
    label.textContent = 'Syncing…';
    try {
      const res = await apiFetch('/api/clients/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        label.textContent = 'Synced ✓';
        await loadAccountList();
      } else {
        label.textContent = data.error || 'Sync failed';
      }
    } catch(e) {
      label.textContent = 'Sync error';
    }
    btn.disabled = false;
    setTimeout(() => { label.textContent = 'Sync Clients'; }, 3000);
  }

  function renderAccountList(clients) {
    const list = document.getElementById('accountList');
    const countEl = document.getElementById('accountCount');
    if (countEl) countEl.textContent = clients.length + ' client' + (clients.length !== 1 ? 's' : '');

    if (clients.length === 0) {
      list.innerHTML = \`<div style="text-align:center;padding:48px 24px;color:var(--text-light);">
        <i class="fas fa-users" style="font-size:2.5rem;opacity:0.25;display:block;margin-bottom:12px;"></i>
        <p style="font-size:0.88rem;">No client files yet.<br>Client accounts are created automatically when you save a SOAP note.</p>
      </div>\`;
      return;
    }

    list.innerHTML = clients.map(c => {
      const name = escapeHtml([c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown');
      const initials = escapeHtml([(c.firstName||'')[0],(c.lastName||'')[0]].filter(Boolean).join('').toUpperCase() || '?');
      const lastSess = c.lastSessionDate ? new Date(c.lastSessionDate).toLocaleDateString('en-AU') : '—';
      const sessions = c.sessionCount || 0;
      const safeAccountNumber = escJsSingle(c.accountNumber);
      const safeEmail = escapeHtml(c.email || '');
      const safePhone = escapeHtml(c.phone || '');
      const contactInfo = [safeEmail, safePhone].filter(Boolean).join(' · ') || 'No contact details';
      return \`<div onclick="openClientFile('\${safeAccountNumber}')"
        style="display:flex;align-items:center;gap:14px;padding:14px 16px;border:1.5px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer;transition:all 0.15s;background:white;"
        onmouseenter="this.style.borderColor='var(--accent)';this.style.background='#f0f8ff';"
        onmouseleave="this.style.borderColor='var(--border)';this.style.background='white';">
        <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-light));color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;flex-shrink:0;">\${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:var(--primary);font-size:0.9rem;">\${name}</div>
          <div style="font-size:0.75rem;color:var(--text-light);margin-top:2px;">\${contactInfo}</div>
        </div>
        <div style="text-align:center;flex-shrink:0;">
          <div style="font-size:0.72rem;color:var(--text-light);font-family:monospace;background:#eef4fb;padding:3px 8px;border-radius:50px;font-weight:600;">\${escapeHtml(c.accountNumber)}</div>
          <div style="font-size:0.7rem;color:var(--text-light);margin-top:4px;">\${sessions} session\${sessions !== 1 ? 's' : ''} · Last: \${lastSess}</div>
        </div>
        <i class="fas fa-chevron-right" style="color:var(--border);flex-shrink:0;"></i>
      </div>\`;
    }).join('');
  }

  function filterAccountList() {
    const q = (document.getElementById('accountSearch')?.value || '').toLowerCase();
    const items = document.getElementById('accountList')?.querySelectorAll('[onclick^="openClientFile"]');
    if (!items) { loadAccountList(); return; }
    // Re-fetch and filter
    fetch('/api/clients').then(r => r.json()).then(data => {
      const filtered = q
        ? (data.clients || []).filter(c =>
            [c.firstName, c.lastName, c.email, c.accountNumber].join(' ').toLowerCase().includes(q))
        : (data.clients || []);
      renderAccountList(filtered);
    });
  }

  // ─── Client File view ─────────────────────────────────────────────────────
  async function openClientFile(accountNumber) {
    const modal = document.getElementById('clientFileModal');
    const body = document.getElementById('clientFileBody');
    body.innerHTML = '<p style="text-align:center;padding:32px;color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> Loading…</p>';
    modal.style.display = 'flex';

    try {
      const [clientRes, sessionsRes] = await Promise.all([
        fetch('/api/clients/' + accountNumber),
        fetch('/api/clients/' + accountNumber + '/sessions')
      ]);
      const client = await clientRes.json();
      const { sessions } = await sessionsRes.json();
      _currentClientFile = client;
      renderClientFile(client, sessions || []);
    } catch(e) {
      body.innerHTML = '<p style="color:var(--danger);padding:24px;">Error loading client file.</p>';
    }
  }

  function closeClientFile() {
    document.getElementById('clientFileModal').style.display = 'none';
    _currentClientFile = null;
  }

  function renderClientFile(client, sessions) {
    const esc = (v) => escapeHtml(String(v ?? ''));
    const escJs = (v) => String(v ?? '').replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'").replace(/\\n/g, ' ');
    const safeFullName = esc([client.firstName, client.lastName].filter(Boolean).join(' ') || '—');
    const safeAccountNumber = esc(client.accountNumber || '');
    const safeConnectAccount = escJs(client.accountNumber || '');

    document.getElementById('clientFileTitle').innerHTML =
      '<i class="fas fa-user-circle" style="margin-right:8px;opacity:0.8;"></i>' +
      safeFullName;
    document.getElementById('clientFileSubtitle').textContent =
      client.accountNumber + ' · ' + (client.email || 'No email') + ' · ' + (sessions.length) + ' sessions';

    const lastIntake = client.intakeForms?.[0];
    const intakeDate = lastIntake?.savedAt ? new Date(lastIntake.savedAt).toLocaleDateString('en-AU') : '—';

    document.getElementById('clientFileBody').innerHTML = \`
      <!-- Account Details -->
      <div class="card-plain" style="margin-bottom:16px;">
        <div class="cp-head"><i class="fas fa-id-card"></i> Account Details
          <span style="margin-left:auto;font-size:0.72rem;font-family:monospace;background:#eef4fb;padding:3px 8px;border-radius:50px;">\${safeAccountNumber}</span>
        </div>
        <div class="cp-body">
          <div class="grid-2" style="gap:12px;">
            <div><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Full Name</span><div style="font-size:0.88rem;margin-top:3px;">\${safeFullName}</div></div>
            <div><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Date of Birth</span><div style="font-size:0.88rem;margin-top:3px;">\${esc(client.dob||'—')}</div></div>
            <div><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Email</span><div style="font-size:0.88rem;margin-top:3px;">\${esc(client.email||'—')}</div></div>
            <div><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Phone</span><div style="font-size:0.88rem;margin-top:3px;">\${esc(client.phone||'—')}</div></div>
            <div><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Occupation</span><div style="font-size:0.88rem;margin-top:3px;">\${esc(client.occupation||'—')}</div></div>
            <div><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Chief Complaint</span><div style="font-size:0.88rem;margin-top:3px;">\${esc(client.chiefComplaint||'—')}</div></div>
            \${client.medications ? '<div class="col-span-2"><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Medications</span><div style="font-size:0.88rem;margin-top:3px;background:#fff7ed;padding:6px 10px;border-radius:6px;">' + esc(client.medications) + '</div></div>' : ''}
            \${client.allergies ? '<div class="col-span-2"><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Allergies</span><div style="font-size:0.88rem;margin-top:3px;background:#fef2f2;padding:6px 10px;border-radius:6px;">' + esc(client.allergies) + '</div></div>' : ''}
            \${client.medicalConditions ? '<div class="col-span-2"><span style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;font-weight:700;">Medical Conditions</span><div style="font-size:0.88rem;margin-top:3px;">' + esc(client.medicalConditions) + '</div></div>' : ''}
          </div>
          <div style="margin-top:12px;font-size:0.72rem;color:var(--text-light);">
            Created: \${new Date(client.createdAt).toLocaleDateString('en-AU')} · 
            Last updated: \${new Date(client.updatedAt).toLocaleDateString('en-AU')} · 
            First intake: \${intakeDate}
          </div>
        </div>
      </div>

      <!-- Intake Forms History -->
      \${(client.intakeForms||[]).length > 0 ? \`
      <div class="card-plain" style="margin-bottom:16px;">
        <div class="cp-head"><i class="fas fa-clipboard-list"></i> Intake History (\${client.intakeForms.length})</div>
        <div class="cp-body" style="padding:0;">
          \${client.intakeForms.map((f, i) => \`
            <details style="border-bottom:1px solid var(--border);">
              <summary style="padding:12px 20px;cursor:pointer;font-size:0.82rem;font-weight:600;color:var(--primary);list-style:none;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-file-alt" style="color:var(--accent);"></i>
                Intake \${client.intakeForms.length - i}: \${new Date(f.savedAt).toLocaleDateString('en-AU')} <span style="font-size:0.7rem;color:var(--text-light);font-weight:400;margin-left:auto;">\${esc(f.source||'')}</span>
              </summary>
              <div style="padding:12px 20px 16px;background:#f7faff;font-size:0.8rem;color:var(--text);white-space:pre-wrap;">\${Object.entries(f.data||{}).map(([k,v]) => esc(k)+': '+esc(v)).join('\\n')||'No structured data captured.'}</div>
            </details>
          \`).join('')}
        </div>
      </div>
      \` : ''}

      <!-- Session History -->
      <div class="card-plain">
        <div class="cp-head"><i class="fas fa-history"></i> Session History (\${sessions.length})
          \${sessions.some(s => s.pdfDriveUrl) ? '<span style="margin-left:auto;font-size:0.7rem;color:#38a169;"><i class="fab fa-google-drive"></i> Drive backups</span>' : ''}
        </div>
        <div class="cp-body" style="padding:0;">
          \${sessions.length === 0
            ? '<p style="padding:20px;font-size:0.82rem;color:var(--text-light);text-align:center;">No sessions recorded yet.</p>'
            : sessions.map(s => \`
              <div onclick="openSessionView('\${s.sessionId}')"
                style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.1s;"
                onmouseenter="this.style.background='#f0f8ff';" onmouseleave="this.style.background='';">
                <div style="width:36px;height:36px;border-radius:50%;background:#e8f4fc;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i class="fas fa-file-medical" style="color:var(--accent);font-size:0.85rem;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.85rem;font-weight:600;color:var(--primary);">
                    \${new Date(s.sessionDate).toLocaleDateString('en-AU',{weekday:'short',year:'numeric',month:'short',day:'numeric'})}
                    \${s.pdfDriveUrl ? '<i class="fab fa-google-drive" style="color:#38a169;margin-left:6px;font-size:0.75rem;" title="PDF saved to Drive"></i>' : ''}
                  </div>
                  <div style="font-size:0.72rem;color:var(--text-light);margin-top:2px;">
                    \${esc(s.duration)} · \${s.musclesTreated?.length||0} muscles treated · \${esc(s.chiefComplaint||'')}
                  </div>
                </div>
                <i class="fas fa-chevron-right" style="color:var(--border);flex-shrink:0;font-size:0.75rem;"></i>
              </div>
            \`).join('')
          }
        </div>
      </div>

      <!-- Google Drive Connect (hidden - backend only) -->
      <div id="driveConnectSection" style="display:none;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <strong style="color:#276749;"><i class="fab fa-google-drive" style="margin-right:6px;"></i>Google Drive PDF Backup</strong>
            <div style="color:#2f855a;margin-top:3px;" id="driveLinkStatus">Checking connection…</div>
          </div>
          <button onclick="connectDriveForClient('\${safeConnectAccount}')" id="driveConnectBtn" class="btn btn-sm" style="background:#276749;color:white;border-radius:50px;">
            <i class="fab fa-google-drive"></i> Connect Drive
          </button>
        </div>
      </div>
    \`;

    // Check drive status
    fetch('/api/drive/status').then(r => r.json()).then(d => {
      const statusEl = document.getElementById('driveLinkStatus');
      const btnEl = document.getElementById('driveConnectBtn');
      if (d.connected) {
        if (statusEl) statusEl.innerHTML = '✅ Connected — new SOAP PDFs will be automatically saved to your Google Drive.';
        if (btnEl) btnEl.textContent = '✅ Connected';
      } else {
        if (statusEl) statusEl.textContent = 'Not connected. Click to authorise Google Drive access.';
      }
    });
  }

  async function loadClientFromFile() {
    if (!_currentClientFile) return;
    await loadClientProfile(_currentClientFile.accountNumber || _currentClientFile.id);
    closeClientFile();
    closeClientAccounts();
  }

  // ─── Session viewer ────────────────────────────────────────────────────────
  async function openSessionView(sessionId) {
    const modal = document.getElementById('sessionViewModal');
    const body = document.getElementById('sessionViewBody');
    body.innerHTML = '<p style="text-align:center;padding:32px;color:var(--text-light);"><i class="fas fa-spinner fa-spin"></i> Loading…</p>';
    modal.style.display = 'flex';

    try {
      const res = await fetch('/api/sessions/' + sessionId);
      const session = await res.json();
      renderSessionView(session);
    } catch(e) {
      body.innerHTML = '<p style="color:var(--danger);">Error loading session.</p>';
    }
  }

  function closeSessionView() {
    document.getElementById('sessionViewModal').style.display = 'none';
  }

  function renderSessionView(s) {
    const esc = (v) => escapeHtml(String(v ?? ''));
    document.getElementById('sessionViewSubtitle').textContent =
      new Date(s.sessionDate).toLocaleDateString('en-AU',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) +
      ' · ' + s.clientName + ' · ' + s.duration;

    const soap = s.soapNote || {};
    document.getElementById('sessionViewBody').innerHTML = \`
      <!-- Client & session info -->
      <div style="display:flex;gap:20px;flex-wrap:wrap;background:#f7faff;padding:14px 16px;border-radius:var(--radius-sm);margin-bottom:16px;font-size:0.82rem;">
        <div><strong style="color:var(--primary);">\${esc(s.clientName)}</strong><div style="color:var(--text-light);">\${esc(s.accountNumber)}</div></div>
        <div><strong>Date</strong><div style="color:var(--text-light);">\${new Date(s.sessionDate).toLocaleDateString('en-AU')}</div></div>
        <div><strong>Duration</strong><div style="color:var(--text-light);">\${esc(s.duration)}</div></div>
        <div><strong>Pain</strong><div style="color:var(--text-light);">\${s.painBefore||'—'}/10 → \${s.painAfter||'—'}/10</div></div>
        \${s.therapistName ? '<div><strong>Therapist</strong><div style="color:var(--text-light);">'+esc(s.therapistName)+(s.therapistCredentials?' ('+esc(s.therapistCredentials)+')':'')+'</div></div>' : ''}
      </div>

      <!-- Muscles -->
      \${(s.musclesTreated?.length || s.musclesToFollowUp?.length) ? \`
        <div style="margin-bottom:16px;display:flex;flex-wrap:wrap;gap:6px;">
          \${(s.musclesTreated||[]).map(m => '<span style="font-size:0.72rem;padding:3px 10px;background:#d1fae5;color:#065f46;border-radius:50px;">'+esc(m)+'</span>').join('')}
          \${(s.musclesToFollowUp||[]).map(m => '<span style="font-size:0.72rem;padding:3px 10px;background:#fef3c7;color:#92400e;border-radius:50px;"><i class="fas fa-clock" style="margin-right:3px;"></i>'+esc(m)+'</span>').join('')}
        </div>
      \` : ''}

      <!-- SOAP sections -->
      \${[
        {key:'subjective', label:'S — Subjective', color:'#3b82f6'},
        {key:'objective', label:'O — Objective', color:'#10b981'},
        {key:'assessment', label:'A — Assessment', color:'#f59e0b'},
        {key:'plan', label:'P — Plan', color:'#8b5cf6'},
        {key:'therapistNotes', label:'Therapist Notes', color:'#6b7280'}
      ].filter(sec => soap[sec.key]).map(sec => \`
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="width:4px;height:18px;background:\${sec.color};border-radius:2px;"></div>
            <strong style="font-size:0.82rem;color:var(--primary);">\${sec.label}</strong>
          </div>
          <div style="font-size:0.83rem;line-height:1.6;color:var(--text);background:#f7faff;padding:12px 14px;border-radius:var(--radius-sm);">\${esc(soap[sec.key])}</div>
        </div>
      \`).join('')}

      <!-- Drive link -->
      \${s.pdfDriveUrl ? \`
        <div style="margin-top:16px;padding:12px 14px;background:#f0faf5;border:1px solid #c6f6d5;border-radius:var(--radius-sm);font-size:0.8rem;display:flex;align-items:center;gap:10px;">
          <i class="fab fa-google-drive" style="color:#38a169;font-size:1.1rem;"></i>
          <div>PDF backed up to Google Drive — <a href="\${esc(s.pdfDriveUrl)}" target="_blank" rel="noopener noreferrer" style="color:#276749;text-decoration:underline;">View in Drive</a></div>
        </div>
      \` : ''}

      <div style="margin-top:16px;font-size:0.7rem;color:var(--text-light);">Saved: \${new Date(s.savedAt).toLocaleString('en-AU')}</div>
    \`;
  }

  // ─── Google Drive connection ───────────────────────────────────────────────
  function connectDriveForClient(accountNumber) {
    const url = '/api/drive/auth?account=' + encodeURIComponent(accountNumber);
    const popup = window.open(url, 'google-drive-auth', 'width=500,height=620,top=100,left=200');
    const expectedOrigin = window.location.origin;
    window.addEventListener('message', function handler(e) {
      if (e.origin !== expectedOrigin) return;
      if (popup && e.source !== popup) return;
      if (e.data?.type === 'DRIVE_AUTH_SUCCESS') {
        window.removeEventListener('message', handler);
        popup?.close();
        const statusEl = document.getElementById('driveLinkStatus');
        const btnEl = document.getElementById('driveConnectBtn');
        if (statusEl) statusEl.innerHTML = '✅ Connected — future SOAP PDFs will be saved to Google Drive automatically.';
        if (btnEl) { btnEl.textContent = '✅ Connected'; btnEl.style.background = '#38a169'; }
        showCopyFeedback('✅ Google Drive connected!');
      }
    });
  }

  async function checkDriveStatus() {
    try {
      const res = await fetch('/api/drive/status');
      const d = await res.json();
      const btn = document.getElementById('driveStatusBtn');
      const label = document.getElementById('driveStatusLabel');
      if (d.connected) {
        if (label) label.innerHTML = '<span style="color:#38a169;">Drive ✓</span>';
        if (btn) btn.title = 'Google Drive connected';
      } else {
        if (label) label.textContent = 'Drive';
      }
    } catch {}
  }

  async function syncDrivePDFs() {
    const btn = document.getElementById('driveSyncBtn');
    const label = document.getElementById('driveSyncLabel');
    if (btn) btn.disabled = true;
    if (label) label.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing…';
    try {
      const res = await apiFetch('/api/drive/sync-pdfs', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert('Sync failed: ' + (data.error || 'Unknown error'));
        return;
      }
      if (label) label.innerHTML = '<span style="color:#38a169;">Synced ' + data.synced + '/' + data.total + '</span>';
      if (data.errors > 0) {
        alert('Synced ' + data.synced + ' of ' + data.total + ' PDFs (' + data.errors + ' errors).');
      }
      setTimeout(() => { if (label) label.textContent = 'Sync PDFs'; }, 5000);
    } catch (err) {
      alert('Sync error: ' + err.message);
      if (label) label.textContent = 'Sync PDFs';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ─── Auto-save SOAP note to client file ───────────────────────────────────
  async function saveSOAPToClientFile(contextData, soapData, treatedMuscles, followupMuscles, techniques) {
    try {
      const firstName = contextData.firstName || '';
      const lastName = contextData.lastName || '';
      const email = contextData.email || '';

      // Build intake data map from the form
      const intakeText = document.getElementById('intakeFormData')?.value || '';
      const intakeMap = {};
      intakeText.split('\\n').forEach(line => {
        const colon = line.indexOf(':');
        if (colon > 0) {
          intakeMap[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
        }
      });

      // 1. Create/upsert client record
      const clientRes = await apiFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: intakeMap['Phone'] || '',
          dob: contextData.dob || '',
          occupation: intakeMap['Occupation'] || '',
          chiefComplaint: contextData.chiefComplaint || '',
          medications: contextData.medications || '',
          allergies: intakeMap['Allergies'] || '',
          medicalConditions: intakeMap['Medical Conditions'] || '',
          areasToAvoid: intakeMap['Areas to Avoid'] || '',
          source: 'soap-generator',
          intakeData: intakeMap
        })
      });
      const clientJson = await clientRes.json();
      const accountNumber = clientJson.accountNumber;
      if (!accountNumber) throw new Error('No account number returned');

      // 2. Save session
      const sessRes = await apiFetch('/api/clients/' + accountNumber + '/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: contextData.submissionId || contextData.id || '',
          sessionDate: document.getElementById('sessionDate')?.value || new Date().toISOString().split('T')[0],
          duration: contextData.duration || '',
          musclesTreated: treatedMuscles,
          musclesToFollowUp: followupMuscles,
          techniques,
          soapNote: soapData,
          intakeSnapshot: intakeText,
          therapistName: document.getElementById('therapistName')?.value || '',
          therapistCredentials: document.getElementById('therapistCredentials')?.value || '',
          painBefore: contextData.painBefore || '',
          painAfter: contextData.painAfter || '',
          chiefComplaint: contextData.chiefComplaint || ''
        })
      });
      const sessJson = await sessRes.json();

      // Store account number and session id in state for PDF upload
      state.lastAccountNumber = accountNumber;
      state.lastSessionId = sessJson.sessionId;

      const label = clientJson.isNew ? '✅ New client file created' : '✅ Session saved';
      showCopyFeedback(label + ' · ' + accountNumber);

      // Show save confirmation in SOAP header
      const badge = document.getElementById('savedFileBadge');
      if (badge) {
        const span = badge.querySelector('span');
        if (span) span.textContent = accountNumber;
        badge.style.display = 'inline-flex';
      }

      return { accountNumber, sessionId: sessJson.sessionId };
    } catch(e) {
      console.warn('Could not save to client file:', e.message);
      return null;
    }
  }

  // ─── Upload PDF to Drive after save ──────────────────────────────────────
  async function uploadPDFToDrive(sessionId, accountNumber, clientName, sessionDate) {
    try {
      const driveStatus = await fetch('/api/drive/status').then(r => r.json());
      if (!driveStatus.connected) return;

      // Generate PDF as base64
      const base64 = generatePDFBase64();
      if (!base64) return;

      const filename = 'SOAP_' + accountNumber + '_' + sessionDate + '_' + clientName.replace(/\\s+/g,'_') + '.pdf';

      const res = await apiFetch('/api/drive/upload-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, accountNumber, filename, pdfBase64: base64 })
      });
      const data = await res.json();
      if (data.success) {
        showCopyFeedback('📁 PDF saved to Google Drive');
        const badge = document.getElementById('driveBadge');
        if (badge) { badge.style.display = 'inline-flex'; badge.href = data.url; }
      }
    } catch(e) {
      console.warn('Drive upload failed:', e.message);
    }
  }

  // ─── Generate PDF and return base64 string ────────────────────────────────
  function generatePDFBase64() {
    try {
      // Use the same enhanced PDF generation with base64 output
      return generatePdfDocument('base64');
    } catch(e) {
      console.warn('PDF base64 generation failed:', e);
      return null;
    }
  }
  </script>
</body>
</html>`;
}
