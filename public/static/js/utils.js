/**
 * Utility functions for SOAP Notes Generator
 */

// ═══════════════════════════════════════════════════════════════
// HTML Escaping (XSS Prevention)
// ═══════════════════════════════════════════════════════════════

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape HTML special characters
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (char) => escapeMap[char]);
}

/**
 * Escape single quotes for JS strings in onclick handlers
 */
export function escJsSingle(str) {
  if (str == null) return '';
  return String(str).replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

// ═══════════════════════════════════════════════════════════════
// Time & Date Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Format ISO date as relative time (e.g., "2 hours ago")
 */
export function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString('en-AU');
}

/**
 * Format date as AU locale string
 */
export function formatDateAU(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU');
}

// ═══════════════════════════════════════════════════════════════
// DOM Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Get string value from input element
 */
export function getStringValue(id) {
  const el = document.getElementById(id);
  return el ? (el.value || '').trim() : '';
}

/**
 * Set value of input element
 */
export function setStringValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

/**
 * Show/hide element by ID
 */
export function showElement(id, show = true) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}

/**
 * Add class to element
 */
export function addClass(el, className) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.classList.add(className);
}

/**
 * Remove class from element
 */
export function removeClass(el, className) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.classList.remove(className);
}

// ═══════════════════════════════════════════════════════════════
// Feedback & Notifications
// ═══════════════════════════════════════════════════════════════

let copyFeedbackTimeout = null;

/**
 * Show temporary feedback toast
 */
export function showCopyFeedback(message, duration = 2500) {
  let toast = document.getElementById('copyFeedback');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copyFeedback';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--primary);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 9999;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  
  // Clear any existing timeout
  if (copyFeedbackTimeout) {
    clearTimeout(copyFeedbackTimeout);
  }
  
  // Show toast
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  
  // Hide after duration
  copyFeedbackTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, duration);
}

// ═══════════════════════════════════════════════════════════════
// String Formatting
// ═══════════════════════════════════════════════════════════════

/**
 * Truncate string with ellipsis
 */
export function truncate(str, maxLen = 50) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Format review value (handles arrays and empty values)
 */
export function formatReviewValue(value) {
  if (!value) return '—';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
  return String(value).trim() || '—';
}

/**
 * Compact preview with newline handling
 */
export function compactPreview(value, maxLen = 60) {
  if (!value) return '—';
  const str = String(value).replace(/\n/g, ' · ').trim();
  return truncate(str, maxLen);
}

// ═══════════════════════════════════════════════════════════════
// Medical Shorthand Conversion
// ═══════════════════════════════════════════════════════════════

const medicalAbbreviations = {
  'patient': 'pt',
  'Patient': 'Pt',
  'treatment': 'tx',
  'Treatment': 'Tx',
  'with': 'w/',
  'without': 'w/o',
  'range of motion': 'ROM',
  'muscle': 'mm.',
  'muscles': 'mm.',
  'bilateral': 'B/L',
  'unilateral': 'U/L',
  'left': 'L',
  'right': 'R',
  'decreased': '↓',
  'increased': '↑',
  'approximately': 'approx.',
  'following': 'f/u',
  'before': 'pre-',
  'after': 'post-',
};

/**
 * Convert text to medical shorthand
 */
export function toMedicalShorthand(text) {
  if (!text) return text;
  let result = text;
  for (const [full, abbrev] of Object.entries(medicalAbbreviations)) {
    result = result.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbrev);
  }
  return result;
}
