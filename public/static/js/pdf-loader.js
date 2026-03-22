/**
 * PDF.js Lazy Loader
 * Only loads PDF.js when PDF functionality is actually needed
 */

let pdfJsLoaded = false;
let pdfJsLoading = false;
let loadCallbacks = [];

/**
 * Load PDF.js library on demand
 * @returns {Promise<void>}
 */
export async function loadPdfJs() {
  if (pdfJsLoaded) return Promise.resolve();
  
  if (pdfJsLoading) {
    return new Promise((resolve) => {
      loadCallbacks.push(resolve);
    });
  }
  
  pdfJsLoading = true;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/static/vendor/pdf.min.js';
    script.async = true;
    
    script.onload = () => {
      pdfJsLoaded = true;
      pdfJsLoading = false;
      
      // Resolve all waiting callbacks
      loadCallbacks.forEach(cb => cb());
      loadCallbacks = [];
      
      resolve();
    };
    
    script.onerror = () => {
      pdfJsLoading = false;
      reject(new Error('Failed to load PDF.js'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Check if PDF.js is loaded
 */
export function isPdfJsLoaded() {
  return pdfJsLoaded || typeof window.pdfjsLib !== 'undefined';
}

/**
 * Get PDF.js library (loads if necessary)
 */
export async function getPdfJs() {
  if (!isPdfJsLoaded()) {
    await loadPdfJs();
  }
  return window.pdfjsLib;
}
