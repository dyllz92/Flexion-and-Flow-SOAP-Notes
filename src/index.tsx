import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  OPENAI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './' }))

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
  <title>SOAP Note Generator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { font-family: 'Inter', sans-serif; }
    
    .muscle-path {
      cursor: pointer;
      transition: all 0.2s ease;
      stroke-width: 0.5;
    }
    .muscle-path:hover {
      opacity: 0.75;
      filter: brightness(0.85);
    }
    .muscle-path.selected {
      stroke: #f59e0b !important;
      stroke-width: 2 !important;
      filter: brightness(0.7) saturate(1.5);
    }
    .muscle-path.treated {
      fill: #10b981 !important;
      stroke: #059669 !important;
      stroke-width: 1.5 !important;
    }
    .muscle-path.follow-up {
      fill: #f59e0b !important;
      stroke: #d97706 !important;
      stroke-width: 1.5 !important;
    }

    .tab-btn.active {
      border-bottom: 2px solid #7c3aed;
      color: #7c3aed;
      font-weight: 600;
    }
    
    .soap-section {
      border-left: 4px solid;
      padding-left: 1rem;
    }
    .soap-s { border-color: #3b82f6; }
    .soap-o { border-color: #10b981; }
    .soap-a { border-color: #f59e0b; }
    .soap-p { border-color: #8b5cf6; }
    .soap-n { border-color: #6b7280; }

    textarea { resize: vertical; }
    
    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      font-weight: 700;
      font-size: 0.875rem;
    }
    .step-active { background: #7c3aed; color: white; }
    .step-done { background: #10b981; color: white; }
    .step-pending { background: #e5e7eb; color: #6b7280; }

    .muscle-tooltip {
      position: fixed;
      background: rgba(15,23,42,0.95);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      pointer-events: none;
      z-index: 9999;
      white-space: nowrap;
      transform: translate(-50%, -120%);
    }

    .shimmer {
      background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .view-toggle button.active {
      background: #7c3aed;
      color: white;
    }

    scrollbar-width: thin;
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  </style>
</head>
<body class="bg-slate-50 min-h-screen">

  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <i class="fas fa-notes-medical text-white text-sm"></i>
        </div>
        <div>
          <h1 class="text-lg font-bold text-slate-800">SOAP Note Generator</h1>
          <p class="text-xs text-slate-500">Massage Therapy Documentation</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span id="statusBadge" class="hidden text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
          <i class="fas fa-check-circle mr-1"></i>Note Ready
        </span>
        <button onclick="resetAll()" class="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition">
          <i class="fas fa-rotate-right mr-1"></i>New Session
        </button>
      </div>
    </div>
  </header>

  <!-- Progress Steps -->
  <div class="bg-white border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 py-3">
      <div class="flex items-center gap-2 overflow-x-auto">
        <div class="flex items-center gap-2 whitespace-nowrap cursor-pointer" onclick="goToStep(1)">
          <div class="step-indicator step-active" id="step1">1</div>
          <span class="text-sm font-medium text-slate-700">Client Intake</span>
        </div>
        <div class="h-px w-8 bg-slate-300 flex-shrink-0"></div>
        <div class="flex items-center gap-2 whitespace-nowrap cursor-pointer" onclick="goToStep(2)">
          <div class="step-indicator step-pending" id="step2">2</div>
          <span class="text-sm text-slate-500" id="stepLabel2">Muscle Map</span>
        </div>
        <div class="h-px w-8 bg-slate-300 flex-shrink-0"></div>
        <div class="flex items-center gap-2 whitespace-nowrap cursor-pointer" onclick="goToStep(3)">
          <div class="step-indicator step-pending" id="step3">3</div>
          <span class="text-sm text-slate-500" id="stepLabel3">Session Notes</span>
        </div>
        <div class="h-px w-8 bg-slate-300 flex-shrink-0"></div>
        <div class="flex items-center gap-2 whitespace-nowrap cursor-pointer" onclick="goToStep(4)">
          <div class="step-indicator step-pending" id="step4">4</div>
          <span class="text-sm text-slate-500" id="stepLabel4">SOAP Notes</span>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 py-6">

    <!-- STEP 1: Client Intake -->
    <div id="panel1" class="step-panel">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Upload PDF -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 class="text-base font-semibold text-slate-800 mb-4">
            <i class="fas fa-file-upload text-violet-500 mr-2"></i>Upload Client Intake Form
          </h2>
          <div id="dropZone" class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-violet-400 hover:bg-violet-50 transition cursor-pointer"
               onclick="document.getElementById('pdfInput').click()"
               ondragover="handleDragOver(event)"
               ondrop="handleDrop(event)">
            <div class="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <i class="fas fa-file-pdf text-violet-500 text-2xl"></i>
            </div>
            <p class="text-slate-600 font-medium">Drop PDF here or click to browse</p>
            <p class="text-slate-400 text-sm mt-1">Supports PDF intake forms</p>
            <input type="file" id="pdfInput" accept=".pdf" class="hidden" onchange="handlePDFUpload(event)"/>
          </div>
          <div id="pdfStatus" class="hidden mt-3 flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <i class="fas fa-check-circle text-emerald-500"></i>
            <span id="pdfFileName" class="text-sm text-emerald-700 font-medium"></span>
            <button onclick="clearPDF()" class="ml-auto text-slate-400 hover:text-red-500">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div id="pdfParseProgress" class="hidden mt-3">
            <div class="flex items-center gap-2 text-sm text-slate-500">
              <i class="fas fa-spinner fa-spin text-violet-500"></i>
              <span>Extracting text from PDF...</span>
            </div>
          </div>
        </div>

        <!-- Manual Client Info -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 class="text-base font-semibold text-slate-800 mb-4">
            <i class="fas fa-user text-violet-500 mr-2"></i>Client Information
          </h2>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-slate-600 block mb-1">First Name</label>
                <input id="clientFirstName" type="text" placeholder="Jane" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 block mb-1">Last Name</label>
                <input id="clientLastName" type="text" placeholder="Smith" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-slate-600 block mb-1">Date of Birth</label>
                <input id="clientDOB" type="date" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 block mb-1">Session Date</label>
                <input id="sessionDate" type="date" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
            </div>
            <div>
              <label class="text-xs font-medium text-slate-600 block mb-1">Chief Complaint / Reason for Visit</label>
              <input id="chiefComplaint" type="text" placeholder="e.g. Lower back pain, tension headaches..." class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-slate-600 block mb-1">Pain Level (0-10)</label>
                <input id="painLevel" type="number" min="0" max="10" placeholder="7" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-600 block mb-1">Session Duration</label>
                <select id="sessionDuration" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300">
                  <option value="30 min">30 min</option>
                  <option value="45 min">45 min</option>
                  <option value="60 min" selected>60 min</option>
                  <option value="75 min">75 min</option>
                  <option value="90 min">90 min</option>
                  <option value="120 min">120 min</option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-xs font-medium text-slate-600 block mb-1">Medications / Contraindications</label>
              <input id="medications" type="text" placeholder="e.g. Blood thinners, NSAIDs..." class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
            </div>
          </div>
        </div>

        <!-- Extracted PDF Data -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-semibold text-slate-800">
              <i class="fas fa-clipboard-list text-violet-500 mr-2"></i>Intake Form Data
            </h2>
            <span class="text-xs text-slate-400">Auto-filled from PDF or enter manually</span>
          </div>
          <textarea id="intakeFormData" rows="5" placeholder="Intake form data will appear here after PDF upload, or type manually...&#10;&#10;Include: medical history, current conditions, allergies, medications, past injuries, client goals, etc."
            class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"></textarea>
          <div class="flex justify-end mt-4">
            <button onclick="goToStep(2)" class="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2">
              Next: Select Muscles <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 2: Muscle Map -->
    <div id="panel2" class="step-panel hidden">
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <!-- Muscle Map -->
        <div class="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-slate-800">
              <i class="fas fa-person text-violet-500 mr-2"></i>Interactive Muscle Map
            </h2>
            <div class="view-toggle flex bg-slate-100 rounded-lg p-1 gap-1">
              <button id="btnAnterior" onclick="setView('anterior')" class="active px-3 py-1 text-xs rounded-md font-medium transition">Anterior</button>
              <button id="btnPosterior" onclick="setView('posterior')" class="px-3 py-1 text-xs rounded-md font-medium transition">Posterior</button>
            </div>
          </div>
          
          <!-- Legend -->
          <div class="flex flex-wrap gap-3 mb-4">
            <div class="flex items-center gap-1.5 text-xs text-slate-600">
              <div class="w-3 h-3 rounded-sm bg-slate-300 border border-slate-400"></div>
              <span>Unselected</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-600">
              <div class="w-3 h-3 rounded-sm bg-emerald-400 border border-emerald-600"></div>
              <span>Treated</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-600">
              <div class="w-3 h-3 rounded-sm bg-amber-400 border border-amber-600"></div>
              <span>Needs Follow-up</span>
            </div>
            <div class="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <i class="fas fa-hand-pointer text-violet-400"></i>
              Click once = treated · Click twice = follow-up · Click 3x = clear
            </div>
          </div>

          <!-- SVG Muscle Body -->
          <div class="flex justify-center overflow-auto">
            <div id="muscleMapContainer" style="min-width:300px; max-width:500px; width:100%;">
              <!-- SVG injected by JS -->
            </div>
          </div>
        </div>

        <!-- Selected Muscles Panel -->
        <div class="space-y-4">
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 class="font-semibold text-slate-800 text-sm mb-3">
              <i class="fas fa-list-check text-violet-500 mr-2"></i>Selected Muscles
            </h3>
            
            <div class="mb-3">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-2.5 h-2.5 rounded-sm bg-emerald-400"></div>
                <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Treated</span>
              </div>
              <div id="treatedList" class="space-y-1 min-h-8">
                <p class="text-xs text-slate-400 italic">None selected</p>
              </div>
            </div>

            <div>
              <div class="flex items-center gap-2 mb-2">
                <div class="w-2.5 h-2.5 rounded-sm bg-amber-400"></div>
                <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide">Follow-up Needed</span>
              </div>
              <div id="followupList" class="space-y-1 min-h-8">
                <p class="text-xs text-slate-400 italic">None selected</p>
              </div>
            </div>

            <button onclick="clearAllMuscles()" class="mt-4 w-full text-xs text-slate-500 hover:text-red-500 py-2 border border-slate-200 rounded-lg hover:border-red-300 transition">
              <i class="fas fa-times mr-1"></i>Clear All
            </button>
          </div>

          <div class="bg-violet-50 border border-violet-200 rounded-2xl p-4">
            <p class="text-xs text-violet-700 font-medium mb-1">
              <i class="fas fa-lightbulb mr-1"></i>Quick Tip
            </p>
            <p class="text-xs text-violet-600">Use the anterior/posterior toggle to select muscles on both sides of the body. All selections carry over between views.</p>
          </div>

          <div class="flex gap-2">
            <button onclick="goToStep(1)" class="flex-1 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
              <i class="fas fa-arrow-left mr-1"></i>Back
            </button>
            <button onclick="goToStep(3)" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
              Next <i class="fas fa-arrow-right ml-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 3: Session Notes -->
    <div id="panel3" class="step-panel hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 class="text-base font-semibold text-slate-800 mb-4">
            <i class="fas fa-pen-to-square text-violet-500 mr-2"></i>Session Summary
          </h2>
          <div class="space-y-4">
            <div>
              <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Techniques Used</label>
              <div id="techniqueCheckboxes" class="grid grid-cols-2 gap-2">
                <!-- Generated by JS -->
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">
                Session Notes <span class="text-slate-400 normal-case font-normal">(describe what you found & did)</span>
              </label>
              <textarea id="sessionSummary" rows="6" placeholder="Describe your findings and treatment approach...&#10;&#10;e.g. Client presented with elevated tone in upper traps and levator scapulae bilaterally. Significant trigger points found at TP1 and TP2 of upper trapezius. Applied sustained pressure for 90 seconds each. ROM improved post-treatment. Client reported reduction in headache intensity..."
                class="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 leading-relaxed"></textarea>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Post-Session Pain Level (0-10)</label>
              <input id="postPainLevel" type="number" min="0" max="10" placeholder="3" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Client Feedback / Response</label>
              <textarea id="clientFeedback" rows="2" placeholder="e.g. Client reported significant relief in the neck area, felt relaxed, no adverse reactions..."
                class="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"></textarea>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Summary Preview -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 class="font-semibold text-slate-800 text-sm mb-3">
              <i class="fas fa-eye text-violet-500 mr-2"></i>Session Summary
            </h3>
            <div class="space-y-2 text-xs text-slate-600">
              <div class="flex justify-between">
                <span class="text-slate-400">Client:</span>
                <span id="summaryClient" class="font-medium">—</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Date:</span>
                <span id="summaryDate" class="font-medium">—</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Duration:</span>
                <span id="summaryDuration" class="font-medium">—</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Muscles treated:</span>
                <span id="summaryMuscleCount" class="font-medium">0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Follow-up needed:</span>
                <span id="summaryFollowupCount" class="font-medium">0</span>
              </div>
            </div>
          </div>

          <!-- API Key -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 class="font-semibold text-slate-800 text-sm mb-2">
              <i class="fas fa-key text-violet-500 mr-2"></i>OpenAI API Key
            </h3>
            <p class="text-xs text-slate-500 mb-2">Required to generate AI-powered SOAP notes</p>
            <input id="openaiKey" type="password" placeholder="sk-..." class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"/>
            <p class="text-xs text-slate-400 mt-1.5"><i class="fas fa-lock mr-1"></i>Key is stored locally in your browser only</p>
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p class="text-xs text-amber-800 font-medium mb-1"><i class="fas fa-triangle-exclamation mr-1"></i>Before Generating</p>
            <p class="text-xs text-amber-700">Review your muscle selections and session notes. The AI will use all this information to generate comprehensive SOAP notes.</p>
          </div>

          <div class="flex gap-2">
            <button onclick="goToStep(2)" class="flex-1 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
              <i class="fas fa-arrow-left mr-1"></i>Back
            </button>
            <button onclick="generateSOAP()" id="generateBtn" class="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
              <i class="fas fa-wand-magic-sparkles"></i> Generate SOAP
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 4: SOAP Notes -->
    <div id="panel4" class="step-panel hidden">
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <!-- SOAP Content -->
        <div class="xl:col-span-2 space-y-4">
          
          <!-- Loading state -->
          <div id="soapLoading" class="hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div class="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-wand-magic-sparkles text-violet-500 text-2xl fa-spin"></i>
            </div>
            <h3 class="font-semibold text-slate-700 mb-2">Generating SOAP Notes...</h3>
            <p class="text-sm text-slate-500">AI is analyzing your session data and creating professional documentation</p>
            <div class="mt-4 space-y-2">
              <div class="h-3 shimmer rounded-full w-3/4 mx-auto"></div>
              <div class="h-3 shimmer rounded-full w-1/2 mx-auto"></div>
              <div class="h-3 shimmer rounded-full w-2/3 mx-auto"></div>
            </div>
          </div>

          <!-- SOAP Sections -->
          <div id="soapContent" class="hidden space-y-4">
            
            <!-- Header Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div class="flex items-center justify-between">
                <div>
                  <h2 id="soapClientName" class="text-lg font-bold text-slate-800"></h2>
                  <p id="soapMeta" class="text-sm text-slate-500 mt-0.5"></p>
                </div>
                <div class="text-right text-xs text-slate-400">
                  <p id="soapDate"></p>
                  <p id="soapDuration"></p>
                </div>
              </div>
              <div id="soapMusclesSummary" class="mt-3 flex flex-wrap gap-1.5"></div>
            </div>

            <!-- S - Subjective -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">S</span>
                <h3 class="font-semibold text-slate-800">Subjective</h3>
                <button onclick="copySection('S')" class="ml-auto text-slate-400 hover:text-slate-600 text-xs"><i class="fas fa-copy"></i></button>
              </div>
              <div class="soap-section soap-s">
                <textarea id="soapS" rows="4" class="w-full text-sm text-slate-700 leading-relaxed bg-transparent border-none outline-none resize-none p-0"></textarea>
              </div>
            </div>

            <!-- O - Objective -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">O</span>
                <h3 class="font-semibold text-slate-800">Objective</h3>
                <button onclick="copySection('O')" class="ml-auto text-slate-400 hover:text-slate-600 text-xs"><i class="fas fa-copy"></i></button>
              </div>
              <div class="soap-section soap-o">
                <textarea id="soapO" rows="5" class="w-full text-sm text-slate-700 leading-relaxed bg-transparent border-none outline-none resize-none p-0"></textarea>
              </div>
            </div>

            <!-- A - Assessment -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">A</span>
                <h3 class="font-semibold text-slate-800">Assessment</h3>
                <button onclick="copySection('A')" class="ml-auto text-slate-400 hover:text-slate-600 text-xs"><i class="fas fa-copy"></i></button>
              </div>
              <div class="soap-section soap-a">
                <textarea id="soapA" rows="4" class="w-full text-sm text-slate-700 leading-relaxed bg-transparent border-none outline-none resize-none p-0"></textarea>
              </div>
            </div>

            <!-- P - Plan -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">P</span>
                <h3 class="font-semibold text-slate-800">Plan</h3>
                <button onclick="copySection('P')" class="ml-auto text-slate-400 hover:text-slate-600 text-xs"><i class="fas fa-copy"></i></button>
              </div>
              <div class="soap-section soap-p">
                <textarea id="soapP" rows="4" class="w-full text-sm text-slate-700 leading-relaxed bg-transparent border-none outline-none resize-none p-0"></textarea>
              </div>
            </div>

            <!-- Therapist Notes -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">N</span>
                <h3 class="font-semibold text-slate-800">Therapist Notes</h3>
                <button onclick="copySection('N')" class="ml-auto text-slate-400 hover:text-slate-600 text-xs"><i class="fas fa-copy"></i></button>
              </div>
              <div class="soap-section soap-n">
                <textarea id="soapN" rows="3" class="w-full text-sm text-slate-700 leading-relaxed bg-transparent border-none outline-none resize-none p-0"></textarea>
              </div>
            </div>

            <!-- Signature -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 class="font-semibold text-slate-800 text-sm mb-3">
                <i class="fas fa-signature text-violet-500 mr-2"></i>Therapist Signature
              </h3>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-500 block mb-1">Therapist Name</label>
                  <input id="therapistName" type="text" placeholder="Your full name" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                </div>
                <div>
                  <label class="text-xs text-slate-500 block mb-1">License / Credentials</label>
                  <input id="therapistCredentials" type="text" placeholder="e.g. LMT, RMT, CMT" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Panel -->
        <div class="space-y-4">
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 class="font-semibold text-slate-800 text-sm mb-3">
              <i class="fas fa-file-export text-violet-500 mr-2"></i>Export & Actions
            </h3>
            <div class="space-y-2">
              <button onclick="exportPDF()" class="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                <i class="fas fa-file-pdf"></i> Export as PDF
              </button>
              <button onclick="copyAllSOAP()" class="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                <i class="fas fa-copy"></i> Copy All Text
              </button>
              <button onclick="regenerateSOAP()" class="w-full border border-violet-200 text-violet-600 hover:bg-violet-50 px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                <i class="fas fa-rotate"></i> Regenerate
              </button>
            </div>
          </div>

          <!-- Muscles Summary -->
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 class="font-semibold text-slate-800 text-sm mb-3">
              <i class="fas fa-person text-violet-500 mr-2"></i>Muscles Reference
            </h3>
            <div id="soapMusclesList" class="space-y-1.5 text-xs text-slate-600"></div>
          </div>

          <div class="flex gap-2">
            <button onclick="goToStep(3)" class="flex-1 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
              <i class="fas fa-arrow-left mr-1"></i>Back
            </button>
            <button onclick="resetAll()" class="flex-1 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
              <i class="fas fa-plus mr-1"></i>New Session
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Muscle Tooltip -->
  <div id="muscleTooltip" class="muscle-tooltip hidden"></div>

  <script>
  // ============================================================
  // STATE
  // ============================================================
  const state = {
    currentStep: 1,
    currentView: 'anterior',
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
  // MUSCLE DATA
  // ============================================================
  const ANTERIOR_MUSCLES = [
    // HEAD & NECK
    { id: 'sternocleidomastoid_l', name: 'Sternocleidomastoid (L)', group: 'Neck',
      path: 'M 185,68 C 183,72 181,80 180,88 C 182,85 185,78 186,72 Z' },
    { id: 'sternocleidomastoid_r', name: 'Sternocleidomastoid (R)', group: 'Neck',
      path: 'M 215,68 C 217,72 219,80 220,88 C 218,85 215,78 214,72 Z' },
    { id: 'scalenes_l', name: 'Scalenes (L)', group: 'Neck',
      path: 'M 182,75 C 179,80 178,88 179,95 C 181,90 183,83 184,78 Z' },
    { id: 'scalenes_r', name: 'Scalenes (R)', group: 'Neck',
      path: 'M 218,75 C 221,80 222,88 221,95 C 219,90 217,83 216,78 Z' },

    // CHEST & SHOULDERS
    { id: 'pec_major_l', name: 'Pectoralis Major (L)', group: 'Chest',
      path: 'M 165,105 C 160,108 155,115 153,125 C 158,128 165,130 172,128 C 174,120 173,112 170,107 Z' },
    { id: 'pec_major_r', name: 'Pectoralis Major (R)', group: 'Chest',
      path: 'M 235,105 C 240,108 245,115 247,125 C 242,128 235,130 228,128 C 226,120 227,112 230,107 Z' },
    { id: 'pec_minor_l', name: 'Pectoralis Minor (L)', group: 'Chest',
      path: 'M 166,108 C 162,113 160,119 161,125 C 165,124 169,122 171,118 C 171,113 169,110 166,108 Z' },
    { id: 'pec_minor_r', name: 'Pectoralis Minor (R)', group: 'Chest',
      path: 'M 234,108 C 238,113 240,119 239,125 C 235,124 231,122 229,118 C 229,113 231,110 234,108 Z' },
    { id: 'deltoid_anterior_l', name: 'Deltoid Anterior (L)', group: 'Shoulders',
      path: 'M 157,98 C 152,103 149,112 150,120 C 155,117 159,110 160,103 Z' },
    { id: 'deltoid_anterior_r', name: 'Deltoid Anterior (R)', group: 'Shoulders',
      path: 'M 243,98 C 248,103 251,112 250,120 C 245,117 241,110 240,103 Z' },

    // ARMS
    { id: 'biceps_l', name: 'Biceps Brachii (L)', group: 'Upper Arm',
      path: 'M 148,123 C 144,132 142,143 143,153 C 147,150 151,143 152,133 Z' },
    { id: 'biceps_r', name: 'Biceps Brachii (R)', group: 'Upper Arm',
      path: 'M 252,123 C 256,132 258,143 257,153 C 253,150 249,143 248,133 Z' },
    { id: 'brachialis_l', name: 'Brachialis (L)', group: 'Upper Arm',
      path: 'M 145,140 C 142,148 141,157 142,165 C 146,162 149,155 150,147 Z' },
    { id: 'brachialis_r', name: 'Brachialis (R)', group: 'Upper Arm',
      path: 'M 255,140 C 258,148 259,157 258,165 C 254,162 251,155 250,147 Z' },
    { id: 'forearm_flexors_l', name: 'Forearm Flexors (L)', group: 'Forearm',
      path: 'M 140,165 C 137,175 136,186 137,196 C 141,193 144,183 145,173 Z' },
    { id: 'forearm_flexors_r', name: 'Forearm Flexors (R)', group: 'Forearm',
      path: 'M 260,165 C 263,175 264,186 263,196 C 259,193 256,183 255,173 Z' },
    { id: 'forearm_extensors_l', name: 'Forearm Extensors (L)', group: 'Forearm',
      path: 'M 143,165 C 140,173 140,182 141,191 C 144,188 146,180 146,172 Z' },
    { id: 'forearm_extensors_r', name: 'Forearm Extensors (R)', group: 'Forearm',
      path: 'M 257,165 C 260,173 260,182 259,191 C 256,188 254,180 254,172 Z' },

    // CORE / ABDOMEN
    { id: 'rectus_abdominis', name: 'Rectus Abdominis', group: 'Core',
      path: 'M 188,135 C 186,150 185,165 186,180 C 190,183 200,184 214,183 C 215,168 214,153 212,138 Z' },
    { id: 'external_oblique_l', name: 'External Oblique (L)', group: 'Core',
      path: 'M 175,140 C 172,153 172,167 174,178 C 179,180 185,181 187,178 C 185,166 184,152 183,140 Z' },
    { id: 'external_oblique_r', name: 'External Oblique (R)', group: 'Core',
      path: 'M 225,140 C 228,153 228,167 226,178 C 221,180 215,181 213,178 C 215,166 216,152 217,140 Z' },
    { id: 'serratus_anterior_l', name: 'Serratus Anterior (L)', group: 'Core',
      path: 'M 168,125 C 165,133 164,143 166,152 C 170,150 174,143 174,134 Z' },
    { id: 'serratus_anterior_r', name: 'Serratus Anterior (R)', group: 'Core',
      path: 'M 232,125 C 235,133 236,143 234,152 C 230,150 226,143 226,134 Z' },

    // HIP / GROIN
    { id: 'iliopsoas_l', name: 'Iliopsoas (L)', group: 'Hip',
      path: 'M 183,188 C 181,196 181,204 183,210 C 187,212 192,212 194,209 C 193,202 191,194 188,188 Z' },
    { id: 'iliopsoas_r', name: 'Iliopsoas (R)', group: 'Hip',
      path: 'M 217,188 C 219,196 219,204 217,210 C 213,212 208,212 206,209 C 207,202 209,194 212,188 Z' },
    { id: 'tensor_fascia_latae_l', name: 'Tensor Fascia Latae (L)', group: 'Hip',
      path: 'M 172,188 C 169,196 170,204 172,210 C 176,211 180,209 181,205 C 180,198 177,191 173,188 Z' },
    { id: 'tensor_fascia_latae_r', name: 'Tensor Fascia Latae (R)', group: 'Hip',
      path: 'M 228,188 C 231,196 230,204 228,210 C 224,211 220,209 219,205 C 220,198 223,191 227,188 Z' },
    { id: 'adductors_l', name: 'Adductors (L)', group: 'Hip/Inner Thigh',
      path: 'M 188,210 C 185,220 184,232 186,243 C 190,244 194,243 196,239 C 195,228 192,218 189,210 Z' },
    { id: 'adductors_r', name: 'Adductors (R)', group: 'Hip/Inner Thigh',
      path: 'M 212,210 C 215,220 216,232 214,243 C 210,244 206,243 204,239 C 205,228 208,218 211,210 Z' },

    // THIGHS
    { id: 'quad_l', name: 'Quadriceps (L)', group: 'Thigh',
      path: 'M 174,212 C 171,225 170,240 172,255 C 178,258 186,258 190,255 C 189,240 186,225 182,212 Z' },
    { id: 'quad_r', name: 'Quadriceps (R)', group: 'Thigh',
      path: 'M 226,212 C 229,225 230,240 228,255 C 222,258 214,258 210,255 C 211,240 214,225 218,212 Z' },
    { id: 'it_band_l', name: 'IT Band / Iliotibial (L)', group: 'Thigh',
      path: 'M 170,213 C 168,228 167,245 168,260 C 171,261 174,260 175,257 C 173,242 172,226 172,213 Z' },
    { id: 'it_band_r', name: 'IT Band / Iliotibial (R)', group: 'Thigh',
      path: 'M 230,213 C 232,228 233,245 232,260 C 229,261 226,260 225,257 C 227,242 228,226 228,213 Z' },

    // LOWER LEG
    { id: 'tibialis_anterior_l', name: 'Tibialis Anterior (L)', group: 'Lower Leg',
      path: 'M 174,267 C 173,278 173,290 174,300 C 178,301 181,300 182,296 C 181,285 179,274 176,267 Z' },
    { id: 'tibialis_anterior_r', name: 'Tibialis Anterior (R)', group: 'Lower Leg',
      path: 'M 226,267 C 227,278 227,290 226,300 C 222,301 219,300 218,296 C 219,285 221,274 224,267 Z' },
    { id: 'peroneals_l', name: 'Peroneals (L)', group: 'Lower Leg',
      path: 'M 171,270 C 169,281 169,293 170,302 C 173,303 176,301 177,297 C 175,286 173,276 172,270 Z' },
    { id: 'peroneals_r', name: 'Peroneals (R)', group: 'Lower Leg',
      path: 'M 229,270 C 231,281 231,293 230,302 C 227,303 224,301 223,297 C 225,286 227,276 228,270 Z' },
  ];

  const POSTERIOR_MUSCLES = [
    // HEAD & NECK
    { id: 'upper_trapezius_l', name: 'Upper Trapezius (L)', group: 'Neck/Shoulder',
      path: 'M 180,75 C 177,82 176,92 177,100 C 180,98 184,93 186,88 C 186,82 184,78 180,75 Z' },
    { id: 'upper_trapezius_r', name: 'Upper Trapezius (R)', group: 'Neck/Shoulder',
      path: 'M 220,75 C 223,82 224,92 223,100 C 220,98 216,93 214,88 C 214,82 216,78 220,75 Z' },
    { id: 'suboccipitals', name: 'Suboccipitals', group: 'Neck',
      path: 'M 190,63 C 187,67 186,72 187,76 C 191,77 209,77 213,76 C 214,72 213,67 210,63 Z' },
    { id: 'levator_scapulae_l', name: 'Levator Scapulae (L)', group: 'Neck',
      path: 'M 182,72 C 180,79 179,88 180,96 C 183,94 185,87 185,79 Z' },
    { id: 'levator_scapulae_r', name: 'Levator Scapulae (R)', group: 'Neck',
      path: 'M 218,72 C 220,79 221,88 220,96 C 217,94 215,87 215,79 Z' },

    // BACK - UPPER
    { id: 'mid_trapezius_l', name: 'Middle Trapezius (L)', group: 'Upper Back',
      path: 'M 177,100 C 172,107 170,116 171,124 C 176,123 182,120 185,115 C 184,108 181,103 177,100 Z' },
    { id: 'mid_trapezius_r', name: 'Middle Trapezius (R)', group: 'Upper Back',
      path: 'M 223,100 C 228,107 230,116 229,124 C 224,123 218,120 215,115 C 216,108 219,103 223,100 Z' },
    { id: 'lower_trapezius_l', name: 'Lower Trapezius (L)', group: 'Upper Back',
      path: 'M 176,124 C 172,133 171,143 173,152 C 178,151 183,148 185,142 C 184,133 181,127 176,124 Z' },
    { id: 'lower_trapezius_r', name: 'Lower Trapezius (R)', group: 'Upper Back',
      path: 'M 224,124 C 228,133 229,143 227,152 C 222,151 217,148 215,142 C 216,133 219,127 224,124 Z' },
    { id: 'rhomboids_l', name: 'Rhomboids (L)', group: 'Upper Back',
      path: 'M 185,105 C 182,112 181,120 183,128 C 188,127 192,124 193,119 C 192,112 189,107 185,105 Z' },
    { id: 'rhomboids_r', name: 'Rhomboids (R)', group: 'Upper Back',
      path: 'M 215,105 C 218,112 219,120 217,128 C 212,127 208,124 207,119 C 208,112 211,107 215,105 Z' },
    { id: 'deltoid_posterior_l', name: 'Deltoid Posterior (L)', group: 'Shoulders',
      path: 'M 158,100 C 153,108 152,118 154,127 C 159,125 163,118 163,109 Z' },
    { id: 'deltoid_posterior_r', name: 'Deltoid Posterior (R)', group: 'Shoulders',
      path: 'M 242,100 C 247,108 248,118 246,127 C 241,125 237,118 237,109 Z' },
    { id: 'infraspinatus_l', name: 'Infraspinatus (L)', group: 'Rotator Cuff',
      path: 'M 165,112 C 162,120 161,130 163,138 C 167,137 172,133 173,127 C 172,120 169,115 165,112 Z' },
    { id: 'infraspinatus_r', name: 'Infraspinatus (R)', group: 'Rotator Cuff',
      path: 'M 235,112 C 238,120 239,130 237,138 C 233,137 228,133 227,127 C 228,120 231,115 235,112 Z' },
    { id: 'teres_major_l', name: 'Teres Major (L)', group: 'Rotator Cuff',
      path: 'M 163,135 C 160,142 160,151 162,158 C 166,157 170,153 170,146 Z' },
    { id: 'teres_major_r', name: 'Teres Major (R)', group: 'Rotator Cuff',
      path: 'M 237,135 C 240,142 240,151 238,158 C 234,157 230,153 230,146 Z' },
    { id: 'teres_minor_l', name: 'Teres Minor (L)', group: 'Rotator Cuff',
      path: 'M 163,125 C 161,131 161,138 163,143 C 167,142 170,138 170,132 Z' },
    { id: 'teres_minor_r', name: 'Teres Minor (R)', group: 'Rotator Cuff',
      path: 'M 237,125 C 239,131 239,138 237,143 C 233,142 230,138 230,132 Z' },

    // ARMS POSTERIOR
    { id: 'triceps_l', name: 'Triceps Brachii (L)', group: 'Upper Arm',
      path: 'M 151,125 C 147,135 146,147 148,157 C 152,155 155,147 155,137 Z' },
    { id: 'triceps_r', name: 'Triceps Brachii (R)', group: 'Upper Arm',
      path: 'M 249,125 C 253,135 254,147 252,157 C 248,155 245,147 245,137 Z' },

    // MID BACK
    { id: 'erector_spinae_l', name: 'Erector Spinae (L)', group: 'Mid/Lower Back',
      path: 'M 186,138 C 184,150 183,165 184,180 C 189,181 193,180 194,176 C 194,161 192,148 188,138 Z' },
    { id: 'erector_spinae_r', name: 'Erector Spinae (R)', group: 'Mid/Lower Back',
      path: 'M 214,138 C 216,150 217,165 216,180 C 211,181 207,180 206,176 C 206,161 208,148 212,138 Z' },
    { id: 'latissimus_dorsi_l', name: 'Latissimus Dorsi (L)', group: 'Mid/Lower Back',
      path: 'M 172,133 C 168,145 167,158 169,170 C 174,172 180,171 183,167 C 182,154 178,142 173,133 Z' },
    { id: 'latissimus_dorsi_r', name: 'Latissimus Dorsi (R)', group: 'Mid/Lower Back',
      path: 'M 228,133 C 232,145 233,158 231,170 C 226,172 220,171 217,167 C 218,154 222,142 227,133 Z' },

    // LOWER BACK
    { id: 'ql_l', name: 'Quadratus Lumborum (L)', group: 'Lower Back',
      path: 'M 183,170 C 181,179 181,188 183,196 C 187,197 192,196 193,192 C 192,183 189,175 184,170 Z' },
    { id: 'ql_r', name: 'Quadratus Lumborum (R)', group: 'Lower Back',
      path: 'M 217,170 C 219,179 219,188 217,196 C 213,197 208,196 207,192 C 208,183 211,175 216,170 Z' },
    { id: 'multifidus_l', name: 'Multifidus (L)', group: 'Lower Back',
      path: 'M 188,165 C 186,174 186,183 188,192 C 191,193 194,192 195,188 C 194,179 192,170 189,165 Z' },
    { id: 'multifidus_r', name: 'Multifidus (R)', group: 'Lower Back',
      path: 'M 212,165 C 214,174 214,183 212,192 C 209,193 206,192 205,188 C 206,179 208,170 211,165 Z' },

    // GLUTES
    { id: 'gluteus_maximus_l', name: 'Gluteus Maximus (L)', group: 'Glutes',
      path: 'M 172,195 C 169,206 169,218 172,228 C 178,231 186,231 190,227 C 189,215 185,203 179,195 Z' },
    { id: 'gluteus_maximus_r', name: 'Gluteus Maximus (R)', group: 'Glutes',
      path: 'M 228,195 C 231,206 231,218 228,228 C 222,231 214,231 210,227 C 211,215 215,203 221,195 Z' },
    { id: 'gluteus_medius_l', name: 'Gluteus Medius (L)', group: 'Glutes',
      path: 'M 171,187 C 168,196 168,205 171,213 C 176,215 181,214 183,209 C 181,200 177,193 172,187 Z' },
    { id: 'gluteus_medius_r', name: 'Gluteus Medius (R)', group: 'Glutes',
      path: 'M 229,187 C 232,196 232,205 229,213 C 224,215 219,214 217,209 C 219,200 223,193 228,187 Z' },
    { id: 'piriformis_l', name: 'Piriformis (L)', group: 'Glutes/Hip',
      path: 'M 181,210 C 178,217 178,224 181,229 C 185,230 190,228 191,223 C 190,217 186,211 181,210 Z' },
    { id: 'piriformis_r', name: 'Piriformis (R)', group: 'Glutes/Hip',
      path: 'M 219,210 C 222,217 222,224 219,229 C 215,230 210,228 209,223 C 210,217 214,211 219,210 Z' },

    // HAMSTRINGS
    { id: 'biceps_femoris_l', name: 'Biceps Femoris (L)', group: 'Hamstrings',
      path: 'M 175,230 C 173,244 173,259 175,272 C 180,273 184,272 185,267 C 184,253 181,239 177,230 Z' },
    { id: 'biceps_femoris_r', name: 'Biceps Femoris (R)', group: 'Hamstrings',
      path: 'M 225,230 C 227,244 227,259 225,272 C 220,273 216,272 215,267 C 216,253 219,239 223,230 Z' },
    { id: 'semimembranosus_l', name: 'Semimembranosus / Semitendinosus (L)', group: 'Hamstrings',
      path: 'M 183,230 C 181,244 181,259 183,272 C 188,273 192,271 193,266 C 192,252 189,238 185,230 Z' },
    { id: 'semimembranosus_r', name: 'Semimembranosus / Semitendinosus (R)', group: 'Hamstrings',
      path: 'M 217,230 C 219,244 219,259 217,272 C 212,273 208,271 207,266 C 208,252 211,238 215,230 Z' },

    // LOWER LEG POSTERIOR
    { id: 'gastrocnemius_l', name: 'Gastrocnemius (L)', group: 'Calf',
      path: 'M 174,278 C 172,291 172,304 174,316 C 179,317 184,316 185,311 C 184,298 180,285 175,278 Z' },
    { id: 'gastrocnemius_r', name: 'Gastrocnemius (R)', group: 'Calf',
      path: 'M 226,278 C 228,291 228,304 226,316 C 221,317 216,316 215,311 C 216,298 220,285 225,278 Z' },
    { id: 'soleus_l', name: 'Soleus (L)', group: 'Calf',
      path: 'M 175,302 C 174,312 174,321 176,330 C 180,331 184,329 184,324 C 183,314 180,306 176,302 Z' },
    { id: 'soleus_r', name: 'Soleus (R)', group: 'Calf',
      path: 'M 225,302 C 226,312 226,321 224,330 C 220,331 216,329 216,324 C 217,314 220,306 224,302 Z' },
  ];

  // ============================================================
  // BODY OUTLINE SVGs
  // ============================================================
  const BODY_OUTLINE_ANTERIOR = \`
    <!-- Head -->
    <ellipse cx="200" cy="45" rx="18" ry="22" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <ellipse cx="200" cy="40" rx="16" ry="18" fill="#f8e5d0" stroke="#d4a574" stroke-width="1"/>
    <!-- Neck -->
    <rect x="192" y="63" width="16" height="14" rx="4" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Torso -->
    <path d="M 168,77 C 162,82 157,90 155,100 C 152,112 150,128 150,145 C 150,162 153,178 157,192 C 168,195 180,197 200,197 C 220,197 232,195 243,192 C 247,178 250,162 250,145 C 250,128 248,112 245,100 C 243,90 238,82 232,77 C 222,73 212,71 200,71 C 188,71 178,73 168,77 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Left Arm -->
    <path d="M 155,98 C 148,103 143,115 140,130 C 137,145 136,162 137,178 C 139,190 143,200 145,208 C 148,208 151,207 152,205 C 151,193 150,181 151,168 C 152,153 155,138 157,125 C 159,112 160,103 159,98 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Right Arm -->
    <path d="M 245,98 C 252,103 257,115 260,130 C 263,145 264,162 263,178 C 261,190 257,200 255,208 C 252,208 249,207 248,205 C 249,193 250,181 249,168 C 248,153 245,138 243,125 C 241,112 240,103 241,98 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Left Hand -->
    <ellipse cx="144" cy="212" rx="9" ry="13" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.2"/>
    <!-- Right Hand -->
    <ellipse cx="256" cy="212" rx="9" ry="13" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.2"/>
    <!-- Pelvis/Hips -->
    <path d="M 157,190 C 157,198 162,210 170,218 C 178,224 190,228 200,228 C 210,228 222,224 230,218 C 238,210 243,198 243,190 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Left Leg -->
    <path d="M 170,220 C 166,235 164,254 165,272 C 166,290 168,308 170,322 C 173,335 175,345 176,350 C 179,350 182,350 184,349 C 183,338 181,325 180,310 C 179,293 179,274 180,257 C 181,240 182,226 181,220 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Right Leg -->
    <path d="M 230,220 C 234,235 236,254 235,272 C 234,290 232,308 230,322 C 227,335 225,345 224,350 C 221,350 218,350 216,349 C 217,338 219,325 220,310 C 221,293 221,274 220,257 C 219,240 218,226 219,220 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Left Foot -->
    <ellipse cx="178" cy="354" rx="12" ry="7" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.2"/>
    <!-- Right Foot -->
    <ellipse cx="222" cy="354" rx="12" ry="7" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.2"/>
    <!-- Facial features -->
    <circle cx="194" cy="43" r="2" fill="#d4a574" opacity="0.5"/>
    <circle cx="206" cy="43" r="2" fill="#d4a574" opacity="0.5"/>
    <path d="M 196,50 Q 200,53 204,50" stroke="#d4a574" stroke-width="1" fill="none" opacity="0.5"/>
  \`;

  const BODY_OUTLINE_POSTERIOR = \`
    <!-- Head -->
    <ellipse cx="200" cy="45" rx="18" ry="22" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Neck -->
    <rect x="192" y="63" width="16" height="14" rx="4" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Hair suggestion -->
    <ellipse cx="200" cy="34" rx="17" ry="15" fill="#d4a574" opacity="0.3"/>
    <!-- Torso -->
    <path d="M 168,77 C 162,82 157,90 155,100 C 152,112 150,128 150,145 C 150,162 153,178 157,192 C 168,195 180,197 200,197 C 220,197 232,195 243,192 C 247,178 250,162 250,145 C 250,128 248,112 245,100 C 243,90 238,82 232,77 C 222,73 212,71 200,71 C 188,71 178,73 168,77 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Spine hint -->
    <line x1="200" y1="77" x2="200" y2="192" stroke="#d4a574" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.4"/>
    <!-- Left Arm -->
    <path d="M 155,98 C 148,103 143,115 140,130 C 137,145 136,162 137,178 C 139,190 143,200 145,208 C 148,208 151,207 152,205 C 151,193 150,181 151,168 C 152,153 155,138 157,125 C 159,112 160,103 159,98 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Right Arm -->
    <path d="M 245,98 C 252,103 257,115 260,130 C 263,145 264,162 263,178 C 261,190 257,200 255,208 C 252,208 249,207 248,205 C 249,193 250,181 249,168 C 248,153 245,138 243,125 C 241,112 240,103 241,98 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Left Hand -->
    <ellipse cx="144" cy="212" rx="9" ry="13" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.2"/>
    <!-- Right Hand -->
    <ellipse cx="256" cy="212" rx="9" ry="13" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.2"/>
    <!-- Pelvis/Hips -->
    <path d="M 157,190 C 157,198 162,210 170,218 C 178,224 190,228 200,228 C 210,228 222,224 230,218 C 238,210 243,198 243,190 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Left Leg -->
    <path d="M 170,220 C 166,235 164,254 165,272 C 166,290 168,308 170,322 C 173,335 175,345 176,350 C 179,350 182,350 184,349 C 183,338 181,325 180,310 C 179,293 179,274 180,257 C 181,240 182,226 181,220 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Right Leg -->
    <path d="M 230,220 C 234,235 236,254 235,272 C 234,290 232,308 230,322 C 227,335 225,345 224,350 C 221,350 218,350 216,349 C 217,338 219,325 220,310 C 221,293 221,274 220,257 C 219,240 218,226 219,220 Z" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.5"/>
    <!-- Left Foot -->
    <ellipse cx="178" cy="354" rx="12" ry="7" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.2"/>
    <!-- Right Foot -->
    <ellipse cx="222" cy="354" rx="12" ry="7" fill="#f8e5d0" stroke="#d4a574" stroke-width="1.2"/>
  \`;

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
  });

  function renderTechniques() {
    const container = document.getElementById('techniqueCheckboxes');
    container.innerHTML = TECHNIQUES.map(t => \`
      <label class="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-800">
        <input type="checkbox" name="technique" value="\${t}" class="rounded text-violet-600 focus:ring-violet-300"/>
        \${t}
      </label>
    \`).join('');
  }

  function renderMuscleMap() {
    const container = document.getElementById('muscleMapContainer');
    const muscles = state.currentView === 'anterior' ? ANTERIOR_MUSCLES : POSTERIOR_MUSCLES;
    const outline = state.currentView === 'anterior' ? BODY_OUTLINE_ANTERIOR : BODY_OUTLINE_POSTERIOR;

    const musclePaths = muscles.map(m => {
      const st = state.muscleStates[m.id];
      let cls = 'muscle-path';
      if (st === 'treated') cls += ' treated';
      else if (st === 'follow-up') cls += ' follow-up';
      return \`<path class="\${cls}" d="\${m.path}" fill="#c9d4e0" stroke="#8895a7"
        data-muscle-id="\${m.id}" data-muscle-name="\${m.name}"
        onclick="toggleMuscle('\${m.id}', '\${m.name}')"
        onmouseenter="showTooltip(event, '\${m.name}')"
        onmouseleave="hideTooltip()"/>\`;
    }).join('\\n');

    const label = state.currentView === 'anterior' ? 'Anterior View' : 'Posterior View';

    container.innerHTML = \`
      <svg viewBox="0 0 400 370" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:auto; display:block;">
        <!-- Body outline -->
        \${outline}
        <!-- Muscle paths -->
        \${musclePaths}
        <!-- View label -->
        <text x="200" y="365" text-anchor="middle" font-size="9" fill="#94a3b8" font-family="sans-serif">\${label}</text>
      </svg>
    \`;
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
      ? treated.map(n => \`<div class="flex items-center gap-1.5 text-xs text-slate-700 bg-emerald-50 rounded-md px-2 py-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>\${n}
        </div>\`).join('')
      : '<p class="text-xs text-slate-400 italic">None selected</p>';

    followupEl.innerHTML = followup.length
      ? followup.map(n => \`<div class="flex items-center gap-1.5 text-xs text-slate-700 bg-amber-50 rounded-md px-2 py-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>\${n}
        </div>\`).join('')
      : '<p class="text-xs text-slate-400 italic">None selected</p>';

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
    // Update panels
    document.querySelectorAll('.step-panel').forEach((p, i) => {
      p.classList.toggle('hidden', i + 1 !== step);
    });

    // Update step indicators
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById('step' + i);
      const label = document.getElementById('stepLabel' + i);
      el.className = 'step-indicator ' + (i < step ? 'step-done' : i === step ? 'step-active' : 'step-pending');
      if (i < step) el.innerHTML = '<i class="fas fa-check text-xs"></i>';
      else el.textContent = i;
      if (label) label.className = 'text-sm ' + (i <= step ? 'text-slate-700 font-medium' : 'text-slate-500');
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
    document.getElementById('dropZone').classList.add('border-violet-400', 'bg-violet-50');
  }

  function handleDrop(event) {
    event.preventDefault();
    document.getElementById('dropZone').classList.remove('border-violet-400', 'bg-violet-50');
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') processFile(file);
  }

  function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
  }

  function processFile(file) {
    document.getElementById('pdfParseProgress').classList.remove('hidden');
    document.getElementById('dropZone').classList.add('hidden');
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        // Try to extract text from PDF using basic approach
        const arrayBuffer = e.target.result;
        const text = await extractTextFromPDF(arrayBuffer);
        
        document.getElementById('intakeFormData').value = text || 
          'PDF uploaded: ' + file.name + '\\n\\n[Could not auto-extract text - please review and add relevant intake information manually]';
        
        document.getElementById('pdfFileName').textContent = file.name;
        document.getElementById('pdfStatus').classList.remove('hidden');
        document.getElementById('pdfParseProgress').classList.add('hidden');
      } catch (err) {
        document.getElementById('intakeFormData').value = 'PDF: ' + file.name + '\\n\\n[Please add client intake information manually]';
        document.getElementById('pdfFileName').textContent = file.name + ' (manual entry needed)';
        document.getElementById('pdfStatus').classList.remove('hidden');
        document.getElementById('pdfParseProgress').classList.add('hidden');
        document.getElementById('dropZone').classList.remove('hidden');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function extractTextFromPDF(arrayBuffer) {
    // Simple PDF text extraction - reads raw text streams
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawText = decoder.decode(uint8Array);
    
    // Extract text between BT (Begin Text) and ET (End Text) markers
    const texts = [];
    const btEtRegex = /BT[\\s\\S]*?ET/g;
    const matches = rawText.match(btEtRegex) || [];
    
    for (const block of matches) {
      // Extract Tj and TJ operators
      const tjMatches = block.match(/\\(([^)]+)\\)\\s*Tj/g) || [];
      const TJMatches = block.match(/\\[([^\\]]+)\\]\\s*TJ/g) || [];
      
      for (const m of tjMatches) {
        const txt = m.match(/\\(([^)]+)\\)/);
        if (txt && txt[1].trim()) texts.push(txt[1]);
      }
      for (const m of TJMatches) {
        const parts = m.match(/\\(([^)]+)\\)/g) || [];
        parts.forEach(p => {
          const txt = p.slice(1,-1).trim();
          if (txt) texts.push(txt);
        });
      }
    }
    
    const extracted = texts.join(' ').replace(/\\s+/g, ' ').trim();
    return extracted.length > 50 ? extracted : null;
  }

  function clearPDF() {
    document.getElementById('pdfInput').value = '';
    document.getElementById('pdfStatus').classList.add('hidden');
    document.getElementById('dropZone').classList.remove('hidden');
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
    document.getElementById('soapLoading').classList.remove('hidden');
    document.getElementById('soapContent').classList.add('hidden');

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
      document.getElementById('soapLoading').classList.add('hidden');
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
    document.getElementById('soapLoading').classList.add('hidden');
    document.getElementById('soapContent').classList.remove('hidden');
    document.getElementById('statusBadge').classList.remove('hidden');

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
    const el = document.createElement('div');
    el.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
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
    document.getElementById('statusBadge').classList.add('hidden');
    document.getElementById('soapContent').classList.add('hidden');
    document.getElementById('soapLoading').classList.add('hidden');

    setView('anterior');
    renderMuscleMap();
    updateMuscleLists();
    goToStep(1);
  }
  </script>
</body>
</html>`
}

export default app
