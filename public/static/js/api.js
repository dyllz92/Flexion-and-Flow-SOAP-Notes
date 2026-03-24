/**
 * API Client for SOAP Notes Generator
 * Handles CSRF tokens and provides typed API methods
 */

let _csrfToken = null;

/**
 * Fetch CSRF token from server
 */
export async function getCsrfToken() {
  if (_csrfToken) return _csrfToken;
  
  try {
    const res = await fetch('/api/csrf-token');
    const data = await res.json();
    _csrfToken = data.csrfToken;
    return _csrfToken;
  } catch (e) {
    console.warn('Could not fetch CSRF token:', e);
    return null;
  }
}

/**
 * Clear cached CSRF token (call after 403 errors)
 */
export function clearCsrfToken() {
  _csrfToken = null;
}

/**
 * CSRF-protected fetch wrapper
 */
export async function apiFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...options.headers };
  
  // Add CSRF token for state-changing requests
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = await getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  
  const response = await fetch(url, { ...options, headers });
  
  // If CSRF token expired, clear it and retry once
  if (response.status === 403 && method !== 'GET') {
    const data = await response.clone().json().catch(() => ({}));
    if (data.error?.includes('CSRF')) {
      clearCsrfToken();
      const newToken = await getCsrfToken();
      if (newToken) {
        headers['X-CSRF-Token'] = newToken;
        return fetch(url, { ...options, headers });
      }
    }
  }
  
  return response;
}

// ═══════════════════════════════════════════════════════════════
// Client API
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all clients with optional pagination
 */
export async function fetchClients(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);
  if (params.order) query.set('order', params.order);
  
  const url = `/api/clients${query.toString() ? '?' + query : ''}`;
  const res = await fetch(url);
  return res.json();
}

/**
 * Fetch single client by account number
 */
export async function fetchClient(accountNumber) {
  const res = await fetch(`/api/clients/${encodeURIComponent(accountNumber)}`);
  return res.json();
}

/**
 * Create or update client
 */
export async function saveClient(clientData) {
  const res = await apiFetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientData),
  });
  return res.json();
}

/**
 * Delete client
 */
export async function deleteClient(accountNumber) {
  const res = await apiFetch(`/api/clients/${encodeURIComponent(accountNumber)}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// Session API
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch sessions for a client
 */
export async function fetchSessions(accountNumber) {
  const res = await fetch(`/api/clients/${encodeURIComponent(accountNumber)}/sessions`);
  return res.json();
}

/**
 * Fetch single session
 */
export async function fetchSession(sessionId) {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
  return res.json();
}

/**
 * Save session (SOAP note)
 */
export async function saveSession(accountNumber, sessionData) {
  const res = await apiFetch(`/api/clients/${encodeURIComponent(accountNumber)}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData),
  });
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// AI API
// ═══════════════════════════════════════════════════════════════

/**
 * Check if AI is configured
 */
export async function checkAIStatus() {
  const res = await fetch('/api/ai-status');
  return res.json();
}

/**
 * Generate SOAP notes
 */
export async function generateSOAP(data) {
  const res = await apiFetch('/api/generate-soap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to generate SOAP notes');
  }
  
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// Drive API
// ═══════════════════════════════════════════════════════════════

/**
 * Get Drive connection status
 */
export async function getDriveStatus() {
  const res = await fetch('/api/drive/status');
  return res.json();
}

/**
 * List Drive files
 */
export async function listDriveFiles() {
  const res = await fetch('/api/drive/files');
  return res.json();
}

/**
 * Upload PDF to Drive
 */
export async function uploadPDF(data) {
  const res = await apiFetch('/api/drive/upload-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * Sync PDFs with Drive
 */
export async function syncDrivePDFs() {
  const res = await apiFetch('/api/drive/sync-pdfs', {
    method: 'POST',
  });
  return res.json();
}

/**
 * Sync clients with dashboard
 */
export async function syncClients() {
  const res = await apiFetch('/api/clients/sync', {
    method: 'POST',
  });
  return res.json();
}
