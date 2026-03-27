// ============================================================
// Brilliant Earth Analytics Portal — Embed Loader
// Fetches a signed JWT from the Cloudflare Worker, then loads
// the Sigma embed iframe. Auto-refreshes before token expiry.
// ============================================================

const iframe       = document.getElementById('sigmaEmbed');
const loadingState = document.getElementById('loadingState');
const errorState   = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
let   refreshTimer = null;

// UPDATE THIS after deploying the Cloudflare Worker:
const API_URL = 'https://brilliantearth-embed-jwt.seventest.workers.dev';

async function loadEmbed() {
  loadingState.style.display = '';
  errorState.style.display   = 'none';
  iframe.style.display       = 'none';

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    iframe.src = data.url;
    iframe.onload  = () => { loadingState.style.display = 'none'; iframe.style.display = 'block'; };
    iframe.onerror = () => showError('The embed failed to load. Please try again.');

    // Auto-refresh at 80% of token lifetime
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(loadEmbed, (data.expiresIn || 3600) * 0.8 * 1000);

  } catch (err) {
    showError(err.message || 'Unable to load the analytics dashboard.');
  }
}

function showError(msg) {
  loadingState.style.display = 'none';
  errorState.style.display   = '';
  errorMessage.textContent   = msg;
}

// Kick off on page load
loadEmbed();
