import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  OPENAI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './' }))
// Serve images and other static assets from public root
app.use('/*.png', serveStatic({ root: './' }))
app.use('/*.jpg', serveStatic({ root: './' }))
app.use('/*.ico', serveStatic({ root: './' }))
app.use('/*.svg', serveStatic({ root: './' }))

// Intake webhook – receives structured client data from Flexion & Flow intake form
// The intake form POSTs here after a successful submission so the therapist can
// load the client into a new SOAP session without uploading a PDF manually.
app.post('/api/intake-webhook', async (c) => {
  try {
    const body = await c.req.json()
    // Validate minimum required fields
    if (!body.firstName || !body.lastName) {
      return c.json({ error: 'firstName and lastName are required' }, 400)
    }
    // Return the parsed profile so the browser can save it in localStorage
    const profile = {
      id: body.id || crypto.randomUUID(),
      firstName:      String(body.firstName  || '').trim(),
      lastName:       String(body.lastName   || '').trim(),
      email:          String(body.email      || '').trim(),
      phone:          String(body.phone      || '').trim(),
      dob:            String(body.dob        || '').trim(),
      occupation:     String(body.occupation || '').trim(),
      chiefComplaint: String(body.primaryConcern || body.chiefComplaint || '').trim(),
      painIntensity:  body.painIntensity != null ? Number(body.painIntensity) : null,
      medications:    Array.isArray(body.medications) ? body.medications.join(', ') : String(body.medications || '').trim(),
      allergies:      String(body.allergies  || '').trim(),
      medicalConditions: Array.isArray(body.medicalConditions) ? body.medicalConditions.join(', ') : String(body.medicalConditions || '').trim(),
      areasToAvoid:   String(body.areasToAvoid || '').trim(),
      submittedAt:    body.submittedAt || new Date().toISOString(),
      source:         'flexion-intake-form',
    }
    return c.json({ success: true, profile })
  } catch (err) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
})

// Generate SOAP notes via OpenAI
app.post('/api/generate-soap', async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY
  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500)
  }

  const body = await c.req.json()
  const { muscles, sessionSummary, intakeData } = body

  const prompt = buildSOAPPrompt(muscles, sessionSummary, intakeData)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert massage therapist and clinical documentation specialist. Generate professional SOAP notes in a structured JSON format based on the provided session information. Use clinical terminology appropriate for massage therapy.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const err = await response.text()
    return c.json({ error: `OpenAI error: ${err}` }, 500)
  }

  const data: any = await response.json()
  const content = JSON.parse(data.choices[0].message.content)
  return c.json(content)
})

function buildSOAPPrompt(muscles: string[], sessionSummary: string, intakeData: string): string {
  const muscleList = muscles.length > 0 ? muscles.join(', ') : 'No specific muscles recorded'
  return `Generate a complete SOAP note for a massage therapy session. Return a JSON object with keys: "subjective", "objective", "assessment", "plan", "therapistNotes".

CLIENT INTAKE INFORMATION:
${intakeData || 'No intake form provided'}

MUSCLES TREATED / REQUIRING FOLLOW-UP:
${muscleList}

THERAPIST SESSION SUMMARY:
${sessionSummary || 'No summary provided'}

Return JSON with these exact keys:
- "subjective": Patient-reported complaints, pain levels (use NRS 0-10 scale if mentioned), history, and goals. 2-4 sentences.
- "objective": Observable/measurable findings including palpation findings for the listed muscles, range of motion, tissue texture, and postural observations. 3-5 sentences.
- "assessment": Clinical interpretation of findings, tissue response, progress toward goals, and clinical reasoning. 2-4 sentences.
- "plan": Treatment plan including frequency, home care recommendations, areas to focus on next session, and self-care advice. 3-5 sentences.
- "therapistNotes": Any additional clinical notes, contraindications observed, or special considerations. 1-3 sentences.`
}

// Main app - serve the SPA
app.get('/', (c) => {
  return c.html(renderApp())
})

app.get('*', (c) => {
  return c.html(renderApp())
})

function renderApp(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SOAP Notes — Flexion &amp; Flow</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    /* ═══════════════════════════════════════════════════════════
       Flexion & Flow — SOAP Note Generator
       Brand: Navy #1B3A6B | Sky #5BA3D9 | Light #EEF4FB
       ═══════════════════════════════════════════════════════════ */
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
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      position: relative;
      overflow-x: hidden;
    }

    /* ── Background wave ── */
    .bg-wave {
      position: fixed; inset: 0;
      background: url("/bg-wave.png") center center / cover no-repeat;
      opacity: 0.45; z-index: 0; pointer-events: none;
    }

    /* ── Header ── */
    .site-header {
      position: static;
      z-index: 200;
      background: white;
      box-shadow: 0 2px 12px rgba(255,255,255,0);
    }
    .header-inner {
      max-width: 960px; margin: 0 auto;
      padding: 20px 24px 12px;
      display: flex; align-items: center; justify-content: center;
      background: white;
      position: relative;
    }
    .header-logo { height: 72px; object-fit: contain; }
    .header-actions {
      position: absolute; right: 24px; top: 50%;
      transform: translateY(-50%);
      display: flex; align-items: center; gap: 8px;
    }

    /* ── Step bar ── */
    .step-bar {
      background: white;
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
    }
    .step-bar-inner {
      max-width: 960px; margin: 0 auto;
      padding: 0 24px;
      display: flex; align-items: center; gap: 0;
      overflow-x: auto;
    }
    .step-item {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 20px 14px 16px;
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
      position: relative;
    }
    .step-item:hover { background: var(--bg); }
    .step-item.active { border-bottom-color: var(--primary); }
    .step-item.done { border-bottom-color: var(--success); }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: #e2ebf7; color: var(--text-light);
      font-size: 0.8rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.2s;
    }
    .step-item.active .step-num { background: var(--primary); color: white; }
    .step-item.done .step-num { background: var(--success); color: white; }
    .step-label { font-size: 0.82rem; font-weight: 600; color: var(--text-light); transition: color 0.2s; }
    .step-item.active .step-label { color: var(--primary); }
    .step-item.done .step-label { color: var(--success); }
    .step-sep { width: 24px; height: 1px; background: var(--border); flex-shrink: 0; }

    /* ── Page layout ── */
    .page-content {
      position: relative; z-index: 1;
      max-width: 960px; margin: 0 auto;
      padding: 32px 16px 60px;
    }
    .step-panel { display: none; }
    .step-panel.active { display: block; }

    /* ── Cards ── */
    .card {
      background: var(--bg-card);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .card-header-bar {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      padding: 20px 28px;
      color: white;
    }
    .card-header-bar h2 { font-size: 1rem; font-weight: 700; margin-bottom: 2px; }
    .card-header-bar p { font-size: 0.78rem; opacity: 0.8; }
    .card-body { padding: 24px 28px; }
    .card-footer { padding: 16px 28px; border-top: 1px solid var(--border); background: #f7faff; }

    .card-plain { background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow-sm); border: 1px solid var(--border); }
    .card-plain .cp-head {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 10px;
      font-size: 0.88rem; font-weight: 700; color: var(--primary);
    }
    .card-plain .cp-head i { color: var(--accent); font-size: 0.9rem; }
    .card-plain .cp-body { padding: 18px 20px; }

    /* ── Grid ── */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .grid-3 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .col-span-2 { grid-column: span 2; }
    @media (max-width: 768px) {
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
      .col-span-2 { grid-column: span 1; }
    }

    /* ── Form fields ── */
    .field { margin-bottom: 16px; }
    .field label {
      display: block; font-size: 0.78rem; font-weight: 700;
      color: var(--primary); margin-bottom: 6px; letter-spacing: 0.3px;
    }
    .field label .req { color: var(--accent); }
    .field input, .field select, .field textarea {
      width: 100%; padding: 10px 14px;
      border: 1.5px solid var(--border); border-radius: var(--radius-sm);
      font-family: var(--font); font-size: 0.85rem; color: var(--text);
      background: #fff; transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(91,163,217,0.15);
    }
    .field textarea { resize: vertical; min-height: 80px; }
    .field-row { display: flex; gap: 14px; }
    .field-row > * { flex: 1; min-width: 0; }
    @media (max-width: 540px) { .field-row { flex-direction: column; } }

    /* ── Buttons ── */
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 22px; border-radius: 50px;
      font-family: var(--font); font-size: 0.85rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s; border: none; outline: none;
      text-decoration: none;
    }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-light); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(27,58,107,0.25); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-accent { background: var(--accent); color: white; }
    .btn-accent:hover { background: #4a8fc0; transform: translateY(-1px); }
    .btn-outline { background: transparent; color: var(--primary); border: 1.5px solid var(--primary); }
    .btn-outline:hover { background: var(--primary); color: white; }
    .btn-ghost { background: transparent; color: var(--text-light); border: 1.5px solid var(--border); }
    .btn-ghost:hover { background: var(--bg); color: var(--text); border-color: var(--primary); }
    .btn-danger { background: var(--danger); color: white; }
    .btn-danger:hover { background: #c53030; }
    .btn-sm { padding: 7px 16px; font-size: 0.78rem; }
    .btn-lg { padding: 13px 36px; font-size: 0.95rem; }
    .btn-full { width: 100%; justify-content: center; border-radius: var(--radius-sm); }

    /* ── Status badge ── */
    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 12px; border-radius: 50px;
      font-size: 0.72rem; font-weight: 700;
    }
    .badge-success { background: #e6f7ed; color: var(--success); }
    .badge-accent { background: #e8f4fc; color: var(--accent); }
    .badge-warning { background: var(--warning-bg); color: var(--warning-txt); }
    .badge-primary { background: #e2ebf7; color: var(--primary); }

    /* ── Integration client chips ── */
    .client-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 14px; border-radius: 50px;
      border: 1.5px solid var(--border);
      background: #f7faff; cursor: pointer;
      transition: all 0.15s; font-size: 0.82rem;
    }
    .client-chip:hover { border-color: var(--accent); background: #e8f4fc; }
    .client-chip .chip-avatar {
      width: 26px; height: 26px; border-radius: 50%;
      background: var(--primary); color: white;
      font-size: 0.68rem; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .client-chip .chip-name { font-weight: 600; color: var(--primary); }
    .client-chip .chip-ago { font-size: 0.7rem; color: var(--text-light); }

    /* ── Drop zone ── */
    .drop-zone {
      border: 2px dashed var(--border);
      border-radius: var(--radius-sm);
      padding: 32px 20px; text-align: center;
      cursor: pointer; transition: all 0.2s;
      background: #f7faff;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: var(--accent); background: #e8f4fc;
    }
    .drop-zone .dz-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: #e2ebf7; margin: 0 auto 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .drop-zone .dz-icon i { color: var(--primary); font-size: 1.3rem; }
    .drop-zone p { font-size: 0.85rem; color: var(--text); font-weight: 600; }
    .drop-zone .dz-sub { font-size: 0.75rem; color: var(--text-light); margin-top: 4px; }

    /* ── Muscle map ── */
    .muscle-path { cursor: pointer; transition: all 0.2s ease; stroke-width: 0.5; }
    .muscle-path:hover { opacity: 0.75; filter: brightness(0.85); }
    .muscle-path.treated { fill: #38a169 !important; stroke: #276749 !important; stroke-width: 1.5 !important; }
    .muscle-path.follow-up { fill: #d69e2e !important; stroke: #b7791f !important; stroke-width: 1.5 !important; }
    .muscle-tooltip {
      position: fixed;
      background: rgba(27,58,107,0.95); color: white;
      padding: 6px 12px; border-radius: 6px; font-size: 11px;
      pointer-events: none; z-index: 9999; white-space: nowrap;
      font-family: var(--font); font-weight: 600;
      transform: translate(-50%, -130%);
    }
    .view-toggle {
      display: flex; background: var(--bg); border-radius: var(--radius-sm);
      padding: 3px; gap: 3px; border: 1px solid var(--border);
    }
    .view-toggle button {
      padding: 6px 16px; border-radius: 6px; border: none;
      font-family: var(--font); font-size: 0.78rem; font-weight: 600;
      color: var(--text-light); cursor: pointer; transition: all 0.15s;
      background: transparent;
    }
    .view-toggle button.active { background: var(--primary); color: white; }

    /* ── Muscle legend dots ── */
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }

    /* ── Technique checkboxes ── */
    .technique-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border: 1.5px solid var(--border);
      border-radius: var(--radius-sm); cursor: pointer;
      font-size: 0.8rem; font-weight: 500; color: var(--text);
      transition: all 0.15s; background: #fff;
    }
    .technique-item:hover { border-color: var(--accent); background: #f0f8ff; }
    .technique-item input { accent-color: var(--primary); width: 15px; height: 15px; flex-shrink: 0; }
    .technique-item input:checked + span { color: var(--primary); font-weight: 600; }

    /* ── SOAP sections ── */
    .soap-block { border-left: 4px solid; padding-left: 14px; margin-bottom: 4px; }
    .soap-s { border-color: #5ba3d9; }
    .soap-o { border-color: #38a169; }
    .soap-a { border-color: #d69e2e; }
    .soap-p { border-color: #805ad5; }
    .soap-n { border-color: #718096; }
    .soap-letter {
      width: 30px; height: 30px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.88rem; font-weight: 800; flex-shrink: 0;
    }
    .soap-letter-s { background: #e8f4fc; color: #5ba3d9; }
    .soap-letter-o { background: #e6f7ed; color: #38a169; }
    .soap-letter-a { background: #fef9e8; color: #d69e2e; }
    .soap-letter-p { background: #f3eeff; color: #805ad5; }
    .soap-letter-n { background: #f1f5f9; color: #718096; }
    .soap-textarea {
      width: 100%; background: transparent; border: none; outline: none;
      font-family: var(--font); font-size: 0.85rem; color: var(--text);
      line-height: 1.7; resize: none; padding: 0;
    }

    /* ── Summary panel ── */
    .summary-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 7px 0; border-bottom: 1px solid var(--border);
      font-size: 0.8rem;
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-row .sr-label { color: var(--text-light); font-weight: 500; }
    .summary-row .sr-val { font-weight: 700; color: var(--primary); }

    /* ── Muscle list chips (selected) ── */
    .muscle-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 50px; font-size: 0.72rem; font-weight: 600;
      margin: 2px 3px 2px 0;
    }
    .muscle-chip-treated { background: #e6f7ed; color: #276749; border: 1px solid #c6f6d5; }
    .muscle-chip-followup { background: #fef9e8; color: #b7791f; border: 1px solid #fef08a; }

    /* ── Shimmer ── */
    .shimmer {
      background: linear-gradient(90deg, #e2ebf7 25%, #d0dff0 50%, #e2ebf7 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    /* ── Toast ── */
    #toast {
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: var(--primary); color: white;
      padding: 10px 24px; border-radius: 50px;
      font-family: var(--font); font-size: 0.82rem; font-weight: 600;
      box-shadow: 0 4px 20px rgba(27,58,107,0.3);
      z-index: 10000; opacity: 0; transition: all 0.3s; pointer-events: none;
      white-space: nowrap;
    }
    #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* ── Info box ── */
    .info-box {
      padding: 14px 16px; border-radius: var(--radius-sm);
      font-size: 0.8rem; line-height: 1.6;
    }
    .info-box-blue { background: #e8f4fc; border: 1px solid #bee3f8; color: #1a5276; }
    .info-box-yellow { background: var(--warning-bg); border: 1px solid #fde68a; color: var(--warning-txt); }
    .info-box-green { background: #e6f7ed; border: 1px solid #c6f6d5; color: #276749; }
    .info-box p { margin: 0; }
    .info-box strong { font-weight: 700; }

    /* ── PDF upload status ── */
    .pdf-status {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; background: #e6f7ed;
      border: 1px solid #c6f6d5; border-radius: var(--radius-sm);
      font-size: 0.82rem; color: #276749; font-weight: 600;
    }

    /* ── Modal ── */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(27,58,107,0.45);
      backdrop-filter: blur(3px); z-index: 500;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .modal-backdrop.hidden, .modal-backdrop[style*="display:none"] { display: none !important; }
    .modal-box {
      background: white; border-radius: var(--radius);
      box-shadow: 0 20px 60px rgba(27,58,107,0.25);
      width: 100%; overflow: hidden;
    }
    .modal-header {
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      padding: 18px 24px; color: white;
      display: flex; align-items: center; justify-content: space-between;
    }
    .modal-header h3 { font-size: 0.95rem; font-weight: 700; }
    .modal-header p { font-size: 0.75rem; opacity: 0.8; margin-top: 2px; }
    .modal-close {
      background: rgba(255,255,255,0.15); border: none; color: white;
      width: 30px; height: 30px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 0.85rem; transition: background 0.15s;
    }
    .modal-close:hover { background: rgba(255,255,255,0.3); }
    .modal-body { padding: 20px 24px; overflow-y: auto; max-height: 65vh; }
    .modal-footer { padding: 14px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* ── Footer ── */
    .site-footer {
      position: relative; z-index: 1;
      background: var(--primary);
      color: rgba(255,255,255,0.75);
      text-align: center;
      padding: 16px 24px;
      font-size: 0.78rem;
    }
    .site-footer a { color: rgba(255,255,255,0.75); text-decoration: none; }
    .site-footer a:hover { color: white; }

    /* ── Responsive ── */
    @media (max-width: 760px) {
      [style*="1fr 300px"],
      [style*="1fr 280px"] {
        grid-template-columns: 1fr !important;
      }
    }
    @media (max-width: 620px) {
      .page-content { padding: 16px 14px 48px; }
      .card-body { padding: 16px 18px; }
      .card-header-bar { padding: 16px 18px; }
      .header-inner { padding: 16px 16px 10px; }
      .header-logo { height: 52px; }
      .header-actions { right: 16px; }
    }
  </style>
</head>
<body>
  <div class="bg-wave"></div>

  <!-- Header -->
  <header class="site-header">
    <div class="header-inner">
      <img id="headerLogo" src="/logo-wordmark.png" alt="Flexion &amp; Flow" class="header-logo"
           onerror="this.src=''; this.onerror=null; this.style.display='none'; document.getElementById('fallbackLogo').style.display='flex'"/>
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
        <button onclick="resetAll()" class="btn btn-ghost btn-sm">
          <i class="fas fa-rotate-right"></i> New Session
        </button>
      </div>
    </div>
  </header>

  <!-- Step Bar -->
  <nav class="step-bar">
    <div class="step-bar-inner">
      <div class="step-item active" id="stepItem1" onclick="goToStep(1)">
        <div class="step-num" id="stepNum1">1</div>
        <span class="step-label">Client Intake</span>
      </div>
      <div class="step-sep"></div>
      <div class="step-item" id="stepItem2" onclick="goToStep(2)">
        <div class="step-num" id="stepNum2">2</div>
        <span class="step-label" id="stepLabel2">Muscle Map</span>
      </div>
      <div class="step-sep"></div>
      <div class="step-item" id="stepItem3" onclick="goToStep(3)">
        <div class="step-num" id="stepNum3">3</div>
        <span class="step-label" id="stepLabel3">Session Notes</span>
      </div>
      <div class="step-sep"></div>
      <div class="step-item" id="stepItem4" onclick="goToStep(4)">
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
      <div class="card" style="margin-bottom:20px; border: 1.5px solid var(--accent);">
        <div class="card-header-bar" style="padding:16px 24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <i class="fas fa-users" style="font-size:1.1rem;opacity:0.9;"></i>
              <div>
                <h2 style="margin:0;font-size:0.95rem;">Client Profiles</h2>
                <p style="margin:0;font-size:0.72rem;opacity:0.8;">Synced from Flexion &amp; Flow Intake Form</p>
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <button onclick="openClientBrowser()" class="btn btn-sm" style="background:white;color:var(--primary);border-radius:50px;">
                <i class="fas fa-search"></i> Browse Clients
              </button>
              <button onclick="openWebhookConfig()" class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white;border-radius:50px;border:1px solid rgba(255,255,255,0.3);" title="Configure integration">
                <i class="fas fa-link"></i> Setup
              </button>
            </div>
          </div>
        </div>
        <div style="padding:14px 24px 16px;">
          <div id="clientProfilesPreview" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            <p style="font-size:0.8rem;color:var(--text-light);font-style:italic;" id="noClientsMsg">
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
            <div id="dropZone" class="drop-zone"
                 onclick="document.getElementById('pdfInput').click()"
                 ondragover="handleDragOver(event)"
                 ondrop="handleDrop(event)">
              <div class="dz-icon"><i class="fas fa-file-pdf"></i></div>
              <p>Drop PDF here or click to browse</p>
              <p class="dz-sub">Flexion &amp; Flow intake forms supported</p>
              <input type="file" id="pdfInput" accept=".pdf" class="hidden" style="display:none" onchange="handlePDFUpload(event)"/>
            </div>
            <div id="pdfStatus" style="display:none;margin-top:12px;" class="pdf-status">
              <i class="fas fa-check-circle" style="color:var(--success);font-size:1rem;"></i>
              <span id="pdfFileName"></span>
              <button onclick="clearPDF()" style="margin-left:auto;background:none;border:none;color:var(--text-light);cursor:pointer;font-size:0.9rem;" title="Remove">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div id="pdfParseProgress" style="display:none;margin-top:10px;font-size:0.8rem;color:var(--text-light);display:none;align-items:center;gap:8px;">
              <i class="fas fa-spinner fa-spin" style="color:var(--accent);"></i>
              <span>Extracting text from PDF…</span>
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
                <input id="clientFirstName" type="text" placeholder="Jane" />
              </div>
              <div class="field">
                <label>Last Name <span class="req">*</span></label>
                <input id="clientLastName" type="text" placeholder="Smith" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Date of Birth</label>
                <input id="clientDOB" type="date" />
              </div>
              <div class="field">
                <label>Session Date</label>
                <input id="sessionDate" type="date" />
              </div>
            </div>
            <div class="field">
              <label>Chief Complaint / Reason for Visit</label>
              <input id="chiefComplaint" type="text" placeholder="e.g. Lower back pain, tension headaches…" />
            </div>
            <div class="field-row">
              <div class="field">
                <label>Pain Level (0–10)</label>
                <input id="painLevel" type="number" min="0" max="10" placeholder="7" />
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
              style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.85rem;color:var(--text);resize:vertical;outline:none;transition:border-color 0.2s,box-shadow 0.2s;"
              onfocus="this.style.borderColor='var(--accent)';this.style.boxShadow='0 0 0 3px rgba(91,163,217,0.15)'"
              onblur="this.style.borderColor='var(--border)';this.style.boxShadow='none'"></textarea>
          </div>
          <div class="card-footer" style="display:flex;justify-content:flex-end;">
            <button onclick="goToStep(2)" class="btn btn-primary">
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
                <h2><i class="fas fa-person" style="margin-right:8px;opacity:0.8;"></i>Interactive Muscle Map</h2>
                <p>Click muscles to mark as treated or needing follow-up</p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <div class="view-toggle">
                  <button id="btnMale" onclick="setGender('male')" class="active">
                    <i class="fas fa-mars" style="margin-right:4px;"></i>Male
                  </button>
                  <button id="btnFemale" onclick="setGender('female')">
                    <i class="fas fa-venus" style="margin-right:4px;"></i>Female
                  </button>
                </div>
                <div class="view-toggle">
                  <button id="btnAnterior" onclick="setView('anterior')" class="active">Anterior</button>
                  <button id="btnPosterior" onclick="setView('posterior')">Posterior</button>
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
                <div class="legend-dot" style="background:rgba(56,161,105,0.45);border:1px solid #276749;"></div> Treated
              </div>
              <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-light);">
                <div class="legend-dot" style="background:rgba(214,158,46,0.45);border:1px solid #b7791f;"></div> Needs Follow-up
              </div>
              <div style="margin-left:auto;font-size:0.75rem;color:var(--text-light);">
                <i class="fas fa-hand-pointer" style="color:var(--accent);margin-right:4px;"></i>
                Click once = treated · Twice = follow-up · 3× = clear
              </div>
            </div>
            <div style="display:flex;justify-content:center;overflow:auto;">
              <div id="muscleMapContainer" style="min-width:280px;max-width:480px;width:100%;"></div>
            </div>
          </div>
        </div>

        <!-- Selected muscles + nav -->
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card-plain">
            <div class="cp-head">
              <i class="fas fa-list-check"></i> Selected Muscles
            </div>
            <div class="cp-body">
              <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                  <div class="legend-dot" style="background:#38a169;border:1px solid #276749;"></div>
                  <span style="font-size:0.72rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;">Treated</span>
                </div>
                <div id="treatedList" style="min-height:24px;">
                  <p style="font-size:0.75rem;color:var(--text-light);font-style:italic;">None selected</p>
                </div>
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                  <div class="legend-dot" style="background:#d69e2e;border:1px solid #b7791f;"></div>
                  <span style="font-size:0.72rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;">Follow-up Needed</span>
                </div>
                <div id="followupList" style="min-height:24px;">
                  <p style="font-size:0.75rem;color:var(--text-light);font-style:italic;">None selected</p>
                </div>
              </div>
              <button onclick="clearAllMuscles()" class="btn btn-ghost btn-sm btn-full" style="margin-top:14px;font-size:0.75rem;">
                <i class="fas fa-times"></i> Clear All
              </button>
            </div>
          </div>

          <div class="info-box info-box-blue" style="font-size:0.78rem;">
            <strong><i class="fas fa-lightbulb" style="margin-right:5px;"></i>Tip:</strong>
            Toggle Anterior / Posterior to select muscles on both sides. All selections are retained.
          </div>

          <div style="display:flex;gap:10px;">
            <button onclick="goToStep(1)" class="btn btn-ghost" style="flex:1;justify-content:center;">
              <i class="fas fa-arrow-left"></i> Back
            </button>
            <button onclick="goToStep(3)" class="btn btn-primary" style="flex:1;justify-content:center;">
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
              <div class="summary-row"><span class="sr-label">Muscles treated</span><span class="sr-val" id="summaryMuscleCount">0</span></div>
              <div class="summary-row"><span class="sr-label">Follow-up needed</span><span class="sr-val" id="summaryFollowupCount">0</span></div>
            </div>
          </div>

          <!-- API Key -->
          <div class="card-plain">
            <div class="cp-head"><i class="fas fa-key"></i> OpenAI API Key</div>
            <div class="cp-body">
              <p style="font-size:0.78rem;color:var(--text-light);margin-bottom:10px;">Required to generate AI-powered SOAP notes</p>
              <input id="openaiKey" type="password" placeholder="sk-…"
                style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:monospace;font-size:0.82rem;color:var(--text);outline:none;transition:border-color 0.2s,box-shadow 0.2s;"
                onfocus="this.style.borderColor='var(--accent)';this.style.boxShadow='0 0 0 3px rgba(91,163,217,0.15)'"
                onblur="this.style.borderColor='var(--border)';this.style.boxShadow='none'"/>
              <p style="font-size:0.72rem;color:var(--text-light);margin-top:6px;"><i class="fas fa-lock" style="margin-right:4px;"></i>Stored in your browser only — never sent to our servers</p>
            </div>
          </div>

          <div class="info-box info-box-yellow">
            <p><strong><i class="fas fa-triangle-exclamation" style="margin-right:5px;"></i>Before Generating:</strong> Review your muscle selections and session notes. The AI will use all this information to create comprehensive SOAP documentation.</p>
          </div>

          <div style="display:flex;gap:10px;">
            <button onclick="goToStep(2)" class="btn btn-ghost" style="flex:1;justify-content:center;">
              <i class="fas fa-arrow-left"></i> Back
            </button>
            <button onclick="generateSOAP()" id="generateBtn" class="btn btn-primary" style="flex:1;justify-content:center;">
              <i class="fas fa-wand-magic-sparkles"></i> Generate SOAP
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
              </div>
            </div>

            <!-- S -->
            <div class="card">
              <div class="card-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <div class="soap-letter soap-letter-s">S</div>
                  <h3 style="font-size:0.9rem;font-weight:700;color:var(--primary);">Subjective</h3>
                  <button onclick="copySection('S')" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
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
                  <button onclick="copySection('O')" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
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
                  <button onclick="copySection('A')" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
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
                  <button onclick="copySection('P')" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
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
                  <button onclick="copySection('N')" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:5px 10px;"><i class="fas fa-copy"></i></button>
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
                <button onclick="exportPDF()" class="btn btn-primary btn-full">
                  <i class="fas fa-file-pdf"></i> Export as PDF
                </button>
                <button onclick="copyAllSOAP()" class="btn btn-outline btn-full">
                  <i class="fas fa-copy"></i> Copy All Text
                </button>
                <button onclick="regenerateSOAP()" class="btn btn-ghost btn-full">
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
            <button onclick="goToStep(3)" class="btn btn-ghost" style="flex:1;justify-content:center;"><i class="fas fa-arrow-left"></i> Back</button>
            <button onclick="resetAll()" class="btn btn-outline" style="flex:1;justify-content:center;"><i class="fas fa-plus"></i> New</button>
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
        <button class="modal-close" onclick="closeClientBrowser()"><i class="fas fa-times"></i></button>
      </div>
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);">
        <div style="position:relative;">
          <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-light);font-size:0.8rem;"></i>
          <input id="clientSearch" type="text" placeholder="Search by name, email or phone…"
            oninput="filterClients()"
            style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.82rem;outline:none;"
            onfocus="this.style.borderColor='var(--accent)'"
            onblur="this.style.borderColor='var(--border)'"/>
        </div>
      </div>
      <div id="clientList" class="modal-body" style="flex:1;"></div>
      <div class="modal-footer">
        <span id="clientCount" style="font-size:0.75rem;color:var(--text-light);"></span>
        <button onclick="closeClientBrowser()" class="btn btn-ghost btn-sm">Close</button>
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
        <button class="modal-close" onclick="closeWebhookConfig()"><i class="fas fa-times"></i></button>
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
            <button onclick="copyWebhookUrl()" class="btn btn-ghost btn-sm" title="Copy URL">
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
  // CLIENT PROFILES (localStorage-based, synced via webhook)
  // ============================================================
  const CLIENT_PROFILES_KEY = 'flexion_soap_client_profiles';
  const WEBHOOK_CONFIG_KEY  = 'flexion_soap_webhook_config';

  function loadClientProfiles() {
    try { return JSON.parse(localStorage.getItem(CLIENT_PROFILES_KEY) || '[]'); }
    catch { return []; }
  }
  function saveClientProfiles(profiles) {
    localStorage.setItem(CLIENT_PROFILES_KEY, JSON.stringify(profiles));
  }
  function loadWebhookConfig() {
    try { return JSON.parse(localStorage.getItem(WEBHOOK_CONFIG_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveWebhookConfigData(cfg) {
    localStorage.setItem(WEBHOOK_CONFIG_KEY, JSON.stringify(cfg));
  }

  // Save a single profile (upsert by id or email)
  function upsertClientProfile(profile) {
    const profiles = loadClientProfiles();
    const idx = profiles.findIndex(p => p.id === profile.id || (p.email && p.email === profile.email));
    if (idx >= 0) profiles[idx] = { ...profiles[idx], ...profile, updatedAt: new Date().toISOString() };
    else profiles.unshift({ ...profile, savedAt: new Date().toISOString() });
    saveClientProfiles(profiles);
    renderClientProfilesPreview();
  }

  // Delete a profile
  function deleteClientProfile(id) {
    if (!confirm('Remove this client profile?')) return;
    const profiles = loadClientProfiles().filter(p => p.id !== id);
    saveClientProfiles(profiles);
    renderClientProfilesPreview();
    filterClients();
  }

  // Render the quick-access chips in Step 1
  function renderClientProfilesPreview() {
    const profiles = loadClientProfiles();
    const container = document.getElementById('clientProfilesPreview');
    const noMsg = document.getElementById('noClientsMsg');
    if (!container) return;
    if (profiles.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 italic" id="noClientsMsg">No client profiles saved yet. Connect your Flexion &amp; Flow intake form to auto-populate clients, or upload a PDF below.</p>';
      return;
    }
    if (noMsg) noMsg.remove();
    // Show last 6 profiles as clickable chips
    const recent = profiles.slice(0, 6);
    container.innerHTML = recent.map(p => {
      const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
      const initials = [(p.firstName||'')[0], (p.lastName||'')[0]].filter(Boolean).join('').toUpperCase();
      const ago = p.savedAt ? timeAgo(p.savedAt) : '';
      return \`<button onclick="loadClientProfile('\${p.id}')"
        class="flex items-center gap-2 px-3 py-2 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition group text-left">
        <div class="w-7 h-7 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">\${initials || '?'}</div>
        <div>
          <div class="text-xs font-semibold text-slate-700">\${name || 'Unknown'}</div>
          \${ago ? \`<div class="text-[10px] text-slate-400">\${ago}</div>\` : ''}
        </div>
      </button>\`;
    }).join('');
    if (profiles.length > 6) {
      container.innerHTML += \`<button onclick="openClientBrowser()" class="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition text-xs text-slate-500">
        <i class="fas fa-ellipsis"></i> +\${profiles.length - 6} more
      </button>\`;
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
  function loadClientProfile(id) {
    const profiles = loadClientProfiles();
    const p = profiles.find(x => x.id === id);
    if (!p) return;

    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');

    // Fill in all fields
    const setVal = (elId, val) => { const el = document.getElementById(elId); if (el && val) el.value = val; };
    setVal('clientFirstName',  p.firstName);
    setVal('clientLastName',   p.lastName);
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
  function openClientBrowser() {
    const modal = document.getElementById('clientBrowserModal');
    modal.style.display = 'flex';
    
    filterClients();
    document.getElementById('clientSearch').focus();
  }
  function closeClientBrowser() {
    const modal = document.getElementById('clientBrowserModal');
    modal.style.display = 'none';
    
  }

  function filterClients() {
    const query = (document.getElementById('clientSearch')?.value || '').toLowerCase().trim();
    const profiles = loadClientProfiles();
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
      return \`<div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition cursor-pointer group" onclick="loadClientProfile('\${p.id}')">
        <div class="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold flex-shrink-0">\${initials || '?'}</div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-slate-800 text-sm">\${name || 'Unknown Client'}</div>
          <div class="text-xs text-slate-400">\${[p.email, p.phone].filter(Boolean).join(' · ')}</div>
          <div class="flex flex-wrap gap-1 mt-1">\${tags.join('')}</div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="text-xs text-slate-400">\${dateStr}</div>
          <button onclick="event.stopPropagation(); deleteClientProfile('\${p.id}')" class="mt-1 text-[10px] text-slate-300 hover:text-red-500 transition hidden group-hover:block">
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
    renderClientProfilesPreview();
    showCopyFeedback('\\u2705 Settings saved');
  }
  function importManualProfile() {
    const raw = document.getElementById('manualImportJson')?.value.trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (!data.firstName && !data.lastName) { alert('Profile must have at least firstName or lastName.'); return; }
      if (!data.id) data.id = 'manual-' + Date.now();
      data.source = 'manual-import';
      data.savedAt = new Date().toISOString();
      upsertClientProfile(data);
      document.getElementById('manualImportJson').value = '';
      showCopyFeedback('\\u2705 Profile imported: ' + [data.firstName, data.lastName].filter(Boolean).join(' '));
      filterClients();
    } catch(e) {
      alert('Invalid JSON. Please check the format and try again.');
    }
  }

  // ============================================================
  // HANDLE INCOMING WEBHOOK DATA (when page is the target)
  // The intake form can also redirect to this page with ?clientData=...
  // ============================================================
  function checkUrlClientData() {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('clientData');
      if (!encoded) return;
      const profile = JSON.parse(atob(encoded));
      if (profile && (profile.firstName || profile.lastName)) {
        if (!profile.id) profile.id = 'url-' + Date.now();
        profile.source = profile.source || 'url-import';
        profile.savedAt = new Date().toISOString();
        upsertClientProfile(profile);
        // Auto-load into form
        loadClientProfile(profile.id);
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
    muscleStates: {}, // muscleId -> 'treated' | 'follow-up'
    pdfText: '',
    soapData: null
  };

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
    // ─── ANTERIOR ───────────────────────────────────────────────
    // NECK
    { id:'scm_l', name:'Sternocleidomastoid (L)', group:'Neck', view:'anterior',
      points:'177,92 172,95 168,108 170,120 176,122 180,108 181,97' },
    { id:'scm_r', name:'Sternocleidomastoid (R)', group:'Neck', view:'anterior',
      points:'223,92 228,95 232,108 230,120 224,122 220,108 219,97' },
    // SHOULDER
    { id:'deltoid_ant_l', name:'Anterior Deltoid (L)', group:'Shoulder', view:'anterior',
      points:'143,120 133,127 128,142 132,158 140,162 148,150 150,135' },
    { id:'deltoid_ant_r', name:'Anterior Deltoid (R)', group:'Shoulder', view:'anterior',
      points:'257,120 267,127 272,142 268,158 260,162 252,150 250,135' },
    // CHEST
    { id:'pec_major_l', name:'Pectoralis Major (L)', group:'Chest', view:'anterior',
      points:'162,117 145,125 140,145 148,162 163,168 175,160 178,142 172,124' },
    { id:'pec_major_r', name:'Pectoralis Major (R)', group:'Chest', view:'anterior',
      points:'238,117 255,125 260,145 252,162 237,168 225,160 222,142 228,124' },
    // BICEPS
    { id:'biceps_l', name:'Biceps Brachii (L)', group:'Upper Arm', view:'anterior',
      points:'133,162 126,175 124,195 128,212 136,215 143,200 144,180 140,163' },
    { id:'biceps_r', name:'Biceps Brachii (R)', group:'Upper Arm', view:'anterior',
      points:'267,162 274,175 276,195 272,212 264,215 257,200 256,180 260,163' },
    // FOREARM
    { id:'forearm_flex_l', name:'Forearm Flexors (L)', group:'Forearm', view:'anterior',
      points:'127,215 120,228 118,252 122,272 130,275 138,260 139,238 134,218' },
    { id:'forearm_flex_r', name:'Forearm Flexors (R)', group:'Forearm', view:'anterior',
      points:'273,215 280,228 282,252 278,272 270,275 262,260 261,238 266,218' },
    // ABS
    { id:'rectus_abdominis', name:'Rectus Abdominis', group:'Core', view:'anterior',
      points:'183,168 183,200 186,240 192,268 200,272 208,268 214,240 217,200 217,168 207,163 193,163' },
    { id:'oblique_l', name:'External Oblique (L)', group:'Core', view:'anterior',
      points:'163,168 163,200 168,228 174,250 183,258 186,240 183,200 178,168' },
    { id:'oblique_r', name:'External Oblique (R)', group:'Core', view:'anterior',
      points:'237,168 237,200 232,228 226,250 217,258 214,240 217,200 222,168' },
    { id:'serratus_l', name:'Serratus Anterior (L)', group:'Core', view:'anterior',
      points:'155,162 150,175 150,195 155,210 163,208 167,190 165,170' },
    { id:'serratus_r', name:'Serratus Anterior (R)', group:'Core', view:'anterior',
      points:'245,162 250,175 250,195 245,210 237,208 233,190 235,170' },
    // HIP
    { id:'iliopsoas_l', name:'Iliopsoas / Hip Flexor (L)', group:'Hip', view:'anterior',
      points:'183,258 178,270 178,290 184,302 193,302 196,285 194,265' },
    { id:'iliopsoas_r', name:'Iliopsoas / Hip Flexor (R)', group:'Hip', view:'anterior',
      points:'217,258 222,270 222,290 216,302 207,302 204,285 206,265' },
    { id:'tfl_l', name:'Tensor Fascia Latae (L)', group:'Hip', view:'anterior',
      points:'168,258 162,272 162,295 168,308 176,306 178,288 175,265' },
    { id:'tfl_r', name:'Tensor Fascia Latae (R)', group:'Hip', view:'anterior',
      points:'232,258 238,272 238,295 232,308 224,306 222,288 225,265' },
    // THIGH
    { id:'quad_l', name:'Quadriceps (L)', group:'Thigh', view:'anterior',
      points:'172,308 165,330 163,358 165,388 172,408 182,415 192,412 196,390 195,360 190,330 182,308' },
    { id:'quad_r', name:'Quadriceps (R)', group:'Thigh', view:'anterior',
      points:'228,308 235,330 237,358 235,388 228,408 218,415 208,412 204,390 205,360 210,330 218,308' },
    { id:'adductors_l', name:'Adductors (L)', group:'Thigh', view:'anterior',
      points:'190,308 184,325 182,352 184,380 190,395 198,395 200,370 200,340 198,312' },
    { id:'adductors_r', name:'Adductors (R)', group:'Thigh', view:'anterior',
      points:'210,308 216,325 218,352 216,380 210,395 202,395 200,370 200,340 202,312' },
    { id:'sartorius_l', name:'Sartorius (L)', group:'Thigh', view:'anterior',
      points:'175,302 168,318 168,345 172,375 178,390 182,385 180,355 178,325 180,305' },
    { id:'sartorius_r', name:'Sartorius (R)', group:'Thigh', view:'anterior',
      points:'225,302 232,318 232,345 228,375 222,390 218,385 220,355 222,325 220,305' },
    // LOWER LEG
    { id:'tibialis_ant_l', name:'Tibialis Anterior (L)', group:'Lower Leg', view:'anterior',
      points:'172,420 168,438 167,462 168,485 173,498 180,500 184,488 184,462 182,438 178,420' },
    { id:'tibialis_ant_r', name:'Tibialis Anterior (R)', group:'Lower Leg', view:'anterior',
      points:'228,420 232,438 233,462 232,485 227,498 220,500 216,488 216,462 218,438 222,420' },
    { id:'peroneals_l', name:'Peroneals (L)', group:'Lower Leg', view:'anterior',
      points:'165,422 160,440 159,465 162,488 168,498 173,495 172,470 170,445 168,425' },
    { id:'peroneals_r', name:'Peroneals (R)', group:'Lower Leg', view:'anterior',
      points:'235,422 240,440 241,465 238,488 232,498 227,495 228,470 230,445 232,425' },

    // ─── POSTERIOR ──────────────────────────────────────────────
    // NECK / UPPER BACK
    { id:'upper_trap_l', name:'Upper Trapezius (L)', group:'Neck/Shoulder', view:'posterior',
      points:'185,88 178,95 172,108 175,122 185,128 193,120 196,105 192,92' },
    { id:'upper_trap_r', name:'Upper Trapezius (R)', group:'Neck/Shoulder', view:'posterior',
      points:'215,88 222,95 228,108 225,122 215,128 207,120 204,105 208,92' },
    { id:'levator_scap_l', name:'Levator Scapulae (L)', group:'Neck', view:'posterior',
      points:'183,88 178,95 177,110 180,122 186,122 188,108 188,93' },
    { id:'levator_scap_r', name:'Levator Scapulae (R)', group:'Neck', view:'posterior',
      points:'217,88 222,95 223,110 220,122 214,122 212,108 212,93' },
    // SHOULDERS POSTERIOR
    { id:'deltoid_post_l', name:'Posterior Deltoid (L)', group:'Shoulder', view:'posterior',
      points:'143,122 133,128 128,145 132,162 142,168 152,155 153,138' },
    { id:'deltoid_post_r', name:'Posterior Deltoid (R)', group:'Shoulder', view:'posterior',
      points:'257,122 267,128 272,145 268,162 258,168 248,155 247,138' },
    // ROTATOR CUFF
    { id:'infraspinatus_l', name:'Infraspinatus (L)', group:'Rotator Cuff', view:'posterior',
      points:'155,128 148,138 147,155 152,168 162,170 170,162 168,145 160,130' },
    { id:'infraspinatus_r', name:'Infraspinatus (R)', group:'Rotator Cuff', view:'posterior',
      points:'245,128 252,138 253,155 248,168 238,170 230,162 232,145 240,130' },
    { id:'teres_l', name:'Teres Major / Minor (L)', group:'Rotator Cuff', view:'posterior',
      points:'148,165 142,178 142,195 148,205 157,205 162,192 160,175' },
    { id:'teres_r', name:'Teres Major / Minor (R)', group:'Rotator Cuff', view:'posterior',
      points:'252,165 258,178 258,195 252,205 243,205 238,192 240,175' },
    // TRICEPS
    { id:'triceps_l', name:'Triceps Brachii (L)', group:'Upper Arm', view:'posterior',
      points:'140,162 133,175 130,198 133,218 140,222 148,210 150,188 147,165' },
    { id:'triceps_r', name:'Triceps Brachii (R)', group:'Upper Arm', view:'posterior',
      points:'260,162 267,175 270,198 267,218 260,222 252,210 250,188 253,165' },
    // FOREARM POSTERIOR
    { id:'forearm_ext_l', name:'Forearm Extensors (L)', group:'Forearm', view:'posterior',
      points:'130,222 122,238 120,262 124,280 132,282 140,268 140,245 135,225' },
    { id:'forearm_ext_r', name:'Forearm Extensors (R)', group:'Forearm', view:'posterior',
      points:'270,222 278,238 280,262 276,280 268,282 260,268 260,245 265,225' },
    // MID BACK
    { id:'rhomboids_l', name:'Rhomboids (L)', group:'Upper Back', view:'posterior',
      points:'182,122 178,135 178,155 183,165 192,162 195,148 192,130' },
    { id:'rhomboids_r', name:'Rhomboids (R)', group:'Upper Back', view:'posterior',
      points:'218,122 222,135 222,155 217,165 208,162 205,148 208,130' },
    { id:'mid_trap_l', name:'Middle Trapezius (L)', group:'Upper Back', view:'posterior',
      points:'170,122 163,132 162,150 167,162 178,162 182,148 180,130' },
    { id:'mid_trap_r', name:'Middle Trapezius (R)', group:'Upper Back', view:'posterior',
      points:'230,122 237,132 238,150 233,162 222,162 218,148 220,130' },
    { id:'lower_trap_l', name:'Lower Trapezius (L)', group:'Upper Back', view:'posterior',
      points:'175,162 170,178 170,198 175,210 185,212 190,198 188,175' },
    { id:'lower_trap_r', name:'Lower Trapezius (R)', group:'Upper Back', view:'posterior',
      points:'225,162 230,178 230,198 225,210 215,212 210,198 212,175' },
    { id:'lats_l', name:'Latissimus Dorsi (L)', group:'Mid/Lower Back', view:'posterior',
      points:'160,162 153,178 150,202 153,228 163,240 175,238 178,218 175,192 168,168' },
    { id:'lats_r', name:'Latissimus Dorsi (R)', group:'Mid/Lower Back', view:'posterior',
      points:'240,162 247,178 250,202 247,228 237,240 225,238 222,218 225,192 232,168' },
    { id:'erector_l', name:'Erector Spinae (L)', group:'Lower Back', view:'posterior',
      points:'188,175 184,192 183,218 184,245 188,262 195,262 198,242 197,215 194,188' },
    { id:'erector_r', name:'Erector Spinae (R)', group:'Lower Back', view:'posterior',
      points:'212,175 216,192 217,218 216,245 212,262 205,262 202,242 203,215 206,188' },
    { id:'ql_l', name:'Quadratus Lumborum (L)', group:'Lower Back', view:'posterior',
      points:'183,245 180,258 180,278 184,290 192,292 195,278 194,258 188,245' },
    { id:'ql_r', name:'Quadratus Lumborum (R)', group:'Lower Back', view:'posterior',
      points:'217,245 220,258 220,278 216,290 208,292 205,278 206,258 212,245' },
    // GLUTES
    { id:'glut_max_l', name:'Gluteus Maximus (L)', group:'Glutes', view:'posterior',
      points:'170,292 163,310 162,335 165,358 175,370 188,370 196,355 195,328 188,305 178,292' },
    { id:'glut_max_r', name:'Gluteus Maximus (R)', group:'Glutes', view:'posterior',
      points:'230,292 237,310 238,335 235,358 225,370 212,370 204,355 205,328 212,305 222,292' },
    { id:'glut_med_l', name:'Gluteus Medius (L)', group:'Glutes', view:'posterior',
      points:'168,272 162,285 162,305 168,318 178,318 183,305 180,285 172,272' },
    { id:'glut_med_r', name:'Gluteus Medius (R)', group:'Glutes', view:'posterior',
      points:'232,272 238,285 238,305 232,318 222,318 217,305 220,285 228,272' },
    { id:'piriformis_l', name:'Piriformis (L)', group:'Glutes/Hip', view:'posterior',
      points:'182,308 178,318 178,332 183,338 192,338 195,328 193,315' },
    { id:'piriformis_r', name:'Piriformis (R)', group:'Glutes/Hip', view:'posterior',
      points:'218,308 222,318 222,332 217,338 208,338 205,328 207,315' },
    // HAMSTRINGS
    { id:'biceps_fem_l', name:'Biceps Femoris (L)', group:'Hamstrings', view:'posterior',
      points:'175,372 170,392 168,420 170,450 175,475 183,478 188,465 186,435 182,405 178,375' },
    { id:'biceps_fem_r', name:'Biceps Femoris (R)', group:'Hamstrings', view:'posterior',
      points:'225,372 230,392 232,420 230,450 225,475 217,478 212,465 214,435 218,405 222,375' },
    { id:'semimem_l', name:'Semimembranosus / Semitendinosus (L)', group:'Hamstrings', view:'posterior',
      points:'188,372 184,392 182,420 184,450 190,472 198,475 200,455 198,425 195,395 192,375' },
    { id:'semimem_r', name:'Semimembranosus / Semitendinosus (R)', group:'Hamstrings', view:'posterior',
      points:'212,372 216,392 218,420 216,450 210,472 202,475 200,455 202,425 205,395 208,375' },
    // CALF
    { id:'gastroc_l', name:'Gastrocnemius (L)', group:'Calf', view:'posterior',
      points:'172,485 167,502 165,528 168,555 175,570 183,572 188,558 188,530 184,505 178,487' },
    { id:'gastroc_r', name:'Gastrocnemius (R)', group:'Calf', view:'posterior',
      points:'228,485 233,502 235,528 232,555 225,570 217,572 212,558 212,530 216,505 222,487' },
    { id:'soleus_l', name:'Soleus (L)', group:'Calf', view:'posterior',
      points:'175,558 170,572 169,595 172,615 178,622 185,620 188,605 187,580 182,562' },
    { id:'soleus_r', name:'Soleus (R)', group:'Calf', view:'posterior',
      points:'225,558 230,572 231,595 228,615 222,622 215,620 212,605 213,580 218,562' },
  ];

  // Convenience lookups
  const ANTERIOR_MUSCLES = MUSCLES.filter(m => m.view === 'anterior');
  const POSTERIOR_MUSCLES = MUSCLES.filter(m => m.view === 'posterior');

  // ============================================================
  // IMAGE-BASED MUSCLE MAP
  // ============================================================
  // The image viewBox is 400×870 (normalised from actual half-image).
  // For the MALE image (890×1024): each half = 445×1024, normalised to 400×870
  // For the FEMALE image (862×1024): each half = 431×1024, normalised to 400×870
  // Image is positioned so only the correct half is visible:
  //   anterior → show left half  (image translateX 0)
  //   posterior → show right half (image translateX -100%)

  function renderMuscleMap() {
    const container = document.getElementById('muscleMapContainer');
    const gender    = state.currentGender;   // 'male' | 'female'
    const view      = state.currentView;     // 'anterior' | 'posterior'
    const muscles   = view === 'anterior' ? ANTERIOR_MUSCLES : POSTERIOR_MUSCLES;
    const imgSrc    = \`/muscle-map-\${gender}.png\`;

    // Image natural dimensions
    const imgW = gender === 'male' ? 890 : 862;
    const halfW = imgW / 2;
    const imgH = 1024;

    // We display a 400px wide viewport and scale proportionally
    // SVG viewBox per half: halfW × imgH, displayed at width=400, height=auto
    const vbH = Math.round(imgH / (halfW / 400));

    // Translate the image: anterior = left half (translateX 0), posterior = right half (translateX -50%)
    const imgTranslate = view === 'anterior' ? '0' : '-50%';

    const musclePaths = muscles.map(m => {
      const st  = state.muscleStates[m.id];
      let fill  = 'rgba(91,163,217,0.25)';
      let stroke = 'rgba(91,163,217,0.7)';
      let sw    = '1.5';
      if (st === 'treated')   { fill = 'rgba(56,161,105,0.45)';  stroke = '#276749'; sw = '2'; }
      if (st === 'follow-up') { fill = 'rgba(214,158,46,0.45)';  stroke = '#b7791f'; sw = '2'; }
      return \`<polygon
        class="muscle-hit"
        points="\${m.points}"
        fill="\${fill}" stroke="\${stroke}" stroke-width="\${sw}"
        data-id="\${m.id}" data-name="\${m.name}"
        style="cursor:pointer;transition:all 0.15s;"
        onmouseenter="showTooltip(event,this.dataset.name)"
        onmouseleave="hideTooltip()"
        onclick="toggleMuscle(this.dataset.id,this.dataset.name)"/>\`;
    }).join('\\n');

    // Render the map at full container width, allow vertical scroll for tall aspect ratio
    // Each half dimensions: male=445×1024, female=431×1024 (nearly 1:2.3 aspect)
    // At 480px wide the map would be ~1100px tall — use a scrollable container with max-height

    container.innerHTML = \`
      <div style="position:relative;width:100%;padding-bottom:\${Math.round(imgH/halfW*100)}%;overflow:hidden;border-radius:var(--radius-sm);border:1.5px solid var(--border);background:#f8fafc;">
        <!-- Base image — 200% width, translate to show correct half -->
        <img src="\${imgSrc}" alt="Muscle map"
          style="position:absolute;top:0;left:0;width:200%;height:100%;transform:translateX(\${imgTranslate});pointer-events:none;object-fit:fill;"
          onerror="this.style.opacity='0.2'"/>
        <!-- SVG overlay — covers the same half exactly -->
        <svg viewBox="0 0 400 \${vbH}"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;">
          <g style="pointer-events:all;">
            \${musclePaths}
          </g>
        </svg>
      </div>
    \`;
  }


  // ============================================================
  // INITIALIZE
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    // Set today's date
    document.getElementById('sessionDate').value = new Date().toISOString().split('T')[0];
    
    // Render techniques
    renderTechniques();
    
    // Render muscle map
    renderMuscleMap();
    
    updateSummaryPanel();

    // Load client profiles from localStorage
    renderClientProfilesPreview();

    // Check if client data was passed via URL (from intake form redirect)
    checkUrlClientData();

    // Close modals on backdrop click
    document.getElementById('clientBrowserModal').addEventListener('click', function(e) {
      if (e.target === this) closeClientBrowser();
    });
    document.getElementById('webhookModal').addEventListener('click', function(e) {
      if (e.target === this) closeWebhookConfig();
    });
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


  function toggleMuscle(id, name) {
    const current = state.muscleStates[id];
    if (!current) {
      state.muscleStates[id] = 'treated';
    } else if (current === 'treated') {
      state.muscleStates[id] = 'follow-up';
    } else {
      delete state.muscleStates[id];
    }
    renderMuscleMap();
    updateMuscleLists();
  }

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

  function updateMuscleLists() {
    const treated = [];
    const followup = [];
    const allMuscles = [...ANTERIOR_MUSCLES, ...POSTERIOR_MUSCLES];
    
    for (const [id, status] of Object.entries(state.muscleStates)) {
      const muscle = allMuscles.find(m => m.id === id);
      if (muscle) {
        if (status === 'treated') treated.push(muscle.name);
        else followup.push(muscle.name);
      }
    }

    const treatedEl = document.getElementById('treatedList');
    const followupEl = document.getElementById('followupList');

    treatedEl.innerHTML = treated.length
      ? treated.map(n => \`<span class="muscle-chip muscle-chip-treated"><i class="fas fa-circle-dot"></i> \${n}</span>\`).join('')
      : '<p style="font-size:0.75rem;color:var(--text-light);font-style:italic;">None selected</p>';

    followupEl.innerHTML = followup.length
      ? followup.map(n => \`<span class="muscle-chip muscle-chip-followup"><i class="fas fa-clock"></i> \${n}</span>\`).join('')
      : '<p style="font-size:0.75rem;color:var(--text-light);font-style:italic;">None selected</p>';
    updateSummaryPanel();
  }

  function clearAllMuscles() {
    state.muscleStates = {};
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

  function updateSummaryPanel() {
    const fn = document.getElementById('clientFirstName').value;
    const ln = document.getElementById('clientLastName').value;
    const name = [fn, ln].filter(Boolean).join(' ') || '—';
    const date = document.getElementById('sessionDate').value || '—';
    const duration = document.getElementById('sessionDuration').value || '—';
    
    const treated = Object.values(state.muscleStates).filter(s => s === 'treated').length;
    const followup = Object.values(state.muscleStates).filter(s => s === 'follow-up').length;

    document.getElementById('summaryClient').textContent = name;
    document.getElementById('summaryDate').textContent = date;
    document.getElementById('summaryDuration').textContent = duration;
    document.getElementById('summaryMuscleCount').textContent = treated;
    document.getElementById('summaryFollowupCount').textContent = followup;
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        autoFillClientFields(parsed);
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
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
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
  function autoFillClientFields(p) {
    if (p.firstName)  setIfEmpty('clientFirstName',  p.firstName);
    if (p.lastName)   setIfEmpty('clientLastName',   p.lastName);
    if (p.dobForInput) setIfEmpty('clientDOB',       p.dobForInput);
    if (p.chiefComplaint) setIfEmpty('chiefComplaint', p.chiefComplaint);
    if (p.medications)    setIfEmpty('medications',     p.medications);

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
        lastTreatment:     p.lastTreatment  || '',
        source:            'pdf-upload',
        savedAt:           new Date().toISOString(),
      };
      upsertClientProfile(profile);
    }

    // Show a brief toast
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
    if (name) showCopyFeedback('\u2705 Client info auto-filled: ' + name);
    updateSummaryPanel();
  }

  function setIfEmpty(id, value) {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = value;
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
    const apiKey = document.getElementById('openaiKey').value.trim();
    if (!apiKey) {
      alert('Please enter your OpenAI API key to generate SOAP notes.');
      return;
    }

    goToStep(4);
    document.getElementById('soapLoading').style.display = 'block';
    document.getElementById('soapContent').style.display = 'none';

    // Gather all muscles
    const allMuscles = [...ANTERIOR_MUSCLES, ...POSTERIOR_MUSCLES];
    const treatedMuscles = [];
    const followupMuscles = [];
    
    for (const [id, status] of Object.entries(state.muscleStates)) {
      const m = allMuscles.find(x => x.id === id);
      if (m) {
        if (status === 'treated') treatedMuscles.push(m.name);
        else followupMuscles.push(m.name);
      }
    }

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
      treatedMuscles.length ? 'Treated: ' + treatedMuscles.join(', ') : '',
      followupMuscles.length ? 'Needs follow-up: ' + followupMuscles.join(', ') : ''
    ].filter(Boolean).join(' | ');

    const contextData = {
      client: [firstName, lastName].filter(Boolean).join(' '),
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
      // Call OpenAI directly from frontend with provided key
      const prompt = buildPrompt(contextData, intakeData);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert massage therapist and clinical documentation specialist. Generate professional SOAP notes in JSON format using clinical massage therapy terminology.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      const soapData = JSON.parse(data.choices[0].message.content);
      state.soapData = soapData;

      displaySOAP(soapData, contextData, treatedMuscles, followupMuscles);

    } catch (err) {
      document.getElementById('soapLoading').style.display = 'none';
      goToStep(3);
      alert('Error generating SOAP notes: ' + err.message);
    }
  }

  function buildPrompt(ctx, intakeData) {
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

Return JSON:
{
  "subjective": "Patient-reported complaints, pain levels, history, goals. 3-4 clinical sentences.",
  "objective": "Observable findings: palpation results for each muscle treated, tissue texture, ROM findings, postural observations, technique response. 4-6 sentences.",
  "assessment": "Clinical interpretation: tissue findings, treatment response, progress toward therapeutic goals, functional improvement. 3-4 sentences.",
  "plan": "Next session plan, recommended frequency, home care exercises, self-care instructions, areas to focus on next visit. 4-5 sentences.",
  "therapistNotes": "Additional clinical notes, contraindications observed, special considerations, referral recommendations if applicable. 2-3 sentences."
}\`;
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
  // PDF EXPORT
  // ============================================================
  function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const pageW = 210;
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 20;

    // Colors
    const violet = [124, 58, 237];
    const dark = [15, 23, 42];
    const mid = [71, 85, 105];
    const light = [248, 250, 252];

    // Header
    doc.setFillColor(...violet);
    doc.rect(0, 0, pageW, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SOAP NOTE — MASSAGE THERAPY', margin, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by SOAP Note Generator', margin, 22);
    y = 38;

    // Client info row
    const client = document.getElementById('soapClientName').textContent;
    const dateText = document.getElementById('sessionDate').value || '';
    const duration = document.getElementById('sessionDuration').value || '';
    const chiefComplaint = document.getElementById('chiefComplaint').value || '';
    const painBefore = document.getElementById('painLevel').value;
    const painAfter = document.getElementById('postPainLevel').value;
    const therapist = document.getElementById('therapistName').value || '';
    const creds = document.getElementById('therapistCredentials').value || '';

    doc.setFillColor(...light);
    doc.rect(margin, y, contentW, 22, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentW, 22, 'S');
    
    doc.setTextColor(...dark);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(client || 'Client', margin + 3, y + 7);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mid);
    doc.text('Date: ' + (dateText || '—'), margin + 3, y + 13);
    doc.text('Duration: ' + (duration || '—'), margin + 3, y + 18);
    if (chiefComplaint) doc.text('CC: ' + chiefComplaint, margin + 60, y + 13);
    if (painBefore) doc.text('Pain before: ' + painBefore + '/10', margin + 60, y + 18);
    if (painAfter) doc.text('Pain after: ' + painAfter + '/10', margin + 120, y + 18);
    y += 28;

    // SOAP Sections
    const sections = [
      { label: 'S — Subjective', id: 'soapS', color: [59, 130, 246] },
      { label: 'O — Objective', id: 'soapO', color: [16, 185, 129] },
      { label: 'A — Assessment', id: 'soapA', color: [245, 158, 11] },
      { label: 'P — Plan', id: 'soapP', color: [139, 92, 246] },
      { label: 'N — Therapist Notes', id: 'soapN', color: [107, 114, 128] },
    ];

    for (const section of sections) {
      const text = document.getElementById(section.id).value;
      if (!text) continue;

      // Check if we need a new page
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Section header
      doc.setFillColor(...section.color);
      doc.rect(margin, y, 4, 8, 'F');
      doc.setTextColor(...dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(section.label, margin + 7, y + 5.5);
      y += 11;

      // Section content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...mid);
      const lines = doc.splitTextToSize(text, contentW - 5);
      
      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin + 3, y);
        y += 5;
      }
      y += 5;
    }

    // Muscles section
    const allMuscles = [...ANTERIOR_MUSCLES, ...POSTERIOR_MUSCLES];
    const treatedMuscles = [];
    const followupMuscles = [];
    for (const [id, status] of Object.entries(state.muscleStates)) {
      const m = allMuscles.find(x => x.id === id);
      if (m) {
        if (status === 'treated') treatedMuscles.push(m.name);
        else followupMuscles.push(m.name);
      }
    }

    if (treatedMuscles.length || followupMuscles.length) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFillColor(107, 114, 128);
      doc.rect(margin, y, 4, 8, 'F');
      doc.setTextColor(...dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Muscles Addressed', margin + 7, y + 5.5);
      y += 11;

      if (treatedMuscles.length) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('Treated:', margin + 3, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mid);
        const lines = doc.splitTextToSize(treatedMuscles.join(', '), contentW - 10);
        lines.forEach(l => { doc.text(l, margin + 3, y); y += 4.5; });
        y += 2;
      }
      if (followupMuscles.length) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(245, 158, 11);
        doc.text('Needs Follow-up:', margin + 3, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mid);
        const lines = doc.splitTextToSize(followupMuscles.join(', '), contentW - 10);
        lines.forEach(l => { doc.text(l, margin + 3, y); y += 4.5; });
      }
      y += 5;
    }

    // Footer / signature
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y + 5, margin + contentW, y + 5);
    y += 10;
    doc.setTextColor(...mid);
    doc.setFontSize(8);
    if (therapist || creds) {
      doc.text('Therapist: ' + [therapist, creds].filter(Boolean).join(', '), margin, y);
      y += 5;
    }
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('Generated: ' + new Date().toLocaleString() + ' · SOAP Note Generator', margin, y + 5);

    // Save
    const filename = 'SOAP_Note_' + (client || 'Client').replace(/\\s+/g, '_') + '_' + (dateText || 'date') + '.pdf';
    doc.save(filename);
  }

  // ============================================================
  // RESET
  // ============================================================
  function resetAll() {
    if (!confirm('Start a new session? All current data will be cleared.')) return;
    
    state.muscleStates = {};
    state.soapData = null;
    state.currentView = 'anterior';
    state.currentGender = 'male';

    // Reset fields
    ['clientFirstName', 'clientLastName', 'clientDOB', 'chiefComplaint', 
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

    setView('anterior');
    setGender('male');
    renderMuscleMap();
    updateMuscleLists();
    goToStep(1);
  }
  </script>
</body>
</html>`
}

export default app
