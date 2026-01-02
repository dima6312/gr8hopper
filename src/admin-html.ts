/**
 * Admin UI HTML for Gr8hopper
 * Clean, minimal design with cyan-blue accents
 * All dynamic content uses safe DOM methods (textContent, createElement)
 */
export function getAdminHtml(basePath: string = '/admin'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gr8hopper Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f5f7fa;
      --card: #ffffff;
      --primary: #00baff;
      --primary-hover: #00a2ff;
      --primary-light: #e6f7ff;
      --text: #202730;
      --text-muted: #7990a1;
      --text-light: #a0b0be;
      --border: #e0e6ed;
      --danger: #ef4444;
      --danger-hover: #dc2626;
      --danger-light: #fef2f2;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 48px;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .logout-btn:hover {
      background: var(--bg);
      color: var(--text);
      border-color: var(--text-muted);
    }

    .logout-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Cards */
    .card {
      background: var(--card);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border: none;
      border-radius: 10px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:active {
      transform: scale(0.98);
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: var(--bg);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--border);
      color: var(--text);
    }

    .btn-danger {
      background: var(--danger-light);
      color: var(--danger);
    }

    .btn-danger:hover {
      background: var(--danger);
      color: white;
    }

    .btn-danger-outline {
      background: transparent;
      color: var(--danger);
      border: 1px solid var(--danger);
    }

    .btn-danger-outline:hover {
      background: var(--danger);
      color: white;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 13px;
      border-radius: 8px;
    }

    /* Route List */
    .route-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .route-item {
      padding: 16px;
      background: var(--bg);
      border-radius: 12px;
      transition: all 0.15s ease;
    }

    .route-item:hover {
      background: #f3f4f6;
    }

    .route-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .route-info {
      flex: 1;
      min-width: 0;
    }

    .route-name {
      font-weight: 600;
      font-size: 15px;
      color: var(--text);
      margin-bottom: 2px;
    }

    .route-url {
      font-size: 13px;
      color: var(--text-muted);
      font-family: 'SF Mono', Monaco, monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .route-sample-link {
      display: block;
      font-size: 12px;
      color: var(--primary);
      font-family: 'SF Mono', Monaco, monospace;
      text-decoration: none;
      word-break: break-all;
      line-height: 1.4;
    }

    .route-sample-link:hover {
      text-decoration: underline;
    }

    .route-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .route-status.active {
      background: var(--primary-light);
      color: var(--primary-hover);
    }

    .route-status.inactive {
      background: #f3f4f6;
      color: var(--text-muted);
    }

    .route-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .route-actions {
      display: flex;
      gap: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
    }

    .empty-state-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      color: var(--text-light);
    }

    .empty-state-text {
      font-size: 15px;
      margin-bottom: 16px;
    }

    /* Forms */
    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
      margin-bottom: 6px;
    }

    .form-hint {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    .help-details {
      margin-top: 8px;
      font-size: 13px;
    }

    .help-details summary {
      color: var(--primary);
      cursor: pointer;
      font-weight: 500;
    }

    .help-details summary:hover {
      text-decoration: underline;
    }

    .help-example {
      margin-top: 12px;
      padding: 12px;
      background: var(--bg);
      border-radius: 8px;
      font-size: 12px;
    }

    .help-example p {
      margin: 8px 0 4px;
      color: var(--text-muted);
    }

    .help-example p:first-child {
      margin-top: 0;
    }

    .help-example code {
      display: block;
      padding: 6px 8px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, monospace;
      color: var(--text);
    }

    .help-note {
      margin-top: 12px !important;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      line-height: 1.6;
    }

    .form-input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-family: inherit;
      font-size: 14px;
      color: var(--text);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-light);
    }

    .form-input::placeholder {
      color: var(--text-light);
    }

    .form-input-mono {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
    }

    .input-with-prefix {
      display: flex;
      align-items: stretch;
    }

    .input-prefix {
      display: flex;
      align-items: center;
      padding: 0 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-right: none;
      border-radius: 10px 0 0 10px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
      color: var(--text-muted);
    }

    .input-with-prefix .form-input {
      border-radius: 0 10px 10px 0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* Toggle Switch */
    .toggle-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--border);
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.2s ease;
    }

    .toggle.active {
      background: var(--primary);
    }

    .toggle.active::after {
      transform: translateX(20px);
    }

    .toggle-label {
      font-size: 14px;
      color: var(--text);
    }

    /* Settings Grid */
    .settings-grid {
      display: grid;
      gap: 20px;
    }

    .settings-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 600px) {
      .settings-row {
        grid-template-columns: 1fr;
      }
    }

    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal {
      background: var(--card);
      border-radius: 20px;
      width: 100%;
      max-width: 520px;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      animation: modalIn 0.25s ease;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
    }

    .modal-close {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: var(--bg);
      color: var(--text-muted);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .modal-close:hover {
      background: var(--border);
      color: var(--text);
    }

    .modal-body {
      padding: 28px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 28px;
      border-top: 1px solid var(--border);
      background: var(--bg);
      border-radius: 0 0 20px 20px;
    }

    /* Alerts */
    .alert {
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .alert-error {
      background: var(--danger-light);
      color: var(--danger);
    }

    .alert-success {
      background: var(--primary-light);
      color: var(--primary-hover);
    }

    /* Save indicator */
    .save-status {
      font-size: 13px;
      margin-left: 12px;
    }

    .save-status.success {
      color: var(--primary);
    }

    .save-status.error {
      color: var(--danger);
    }

    /* Divider */
    .divider {
      height: 1px;
      background: var(--border);
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <h1 style="font-size: 20px; font-weight: 600;">Redirects</h1>
      <button class="logout-btn" id="logout-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Log out
      </button>
    </header>

    <!-- Routes Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Your Redirects</h2>
        <button class="btn btn-primary" id="add-route-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Add New
        </button>
      </div>
      <div class="route-list" id="routes-list">
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
            <path d="M16 28 L22 18 L28 24 L36 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p class="empty-state-text">Loading...</p>
        </div>
      </div>
    </div>

    <!-- Settings Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Settings</h2>
      </div>
      <form id="settings-form">
        <div class="settings-grid">
          <div class="form-group">
            <label class="form-label">Route Parameter</label>
            <input type="text" id="route_param" class="form-input" placeholder="r" maxlength="20">
            <p class="form-hint">Query param that identifies the redirect, e.g. <strong>?r=</strong>campaign-link</p>
          </div>

          <div class="settings-row">
            <div class="form-group">
              <label class="form-label">Cache Duration</label>
              <select id="cache_ttl" class="form-input">
                <option value="86400">24 hours</option>
                <option value="604800" selected>1 week (recommended)</option>
                <option value="1209600">2 weeks</option>
                <option value="2592000">1 month</option>
              </select>
              <p class="form-hint">Browser cache duration (CDN caches 7× longer). Longer = faster &amp; cheaper.</p>
            </div>
            <div class="form-group">
              <label class="form-label">Fallback URL</label>
              <input type="text" id="fallback_url" class="form-input form-input-mono" placeholder="/not-found">
              <p class="form-hint">Where to send unknown redirects</p>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; margin-top: 8px;">
          <button type="submit" class="btn btn-primary">Save Settings</button>
          <span id="settings-status" class="save-status"></span>
        </div>
      </form>

      <!-- Cache Purge Section (only shown when configured) -->
      <div id="cache-purge-section" style="display: none; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;">
          <div style="flex: 1;">
            <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Purge CDN Cache</h3>
            <p class="form-hint" style="margin: 0;">Remove all cached redirects from Cloudflare's edge servers. Only use if you've made a mistake in one of the links, and the link has been accessed at least once.</p>
          </div>
          <button type="button" class="btn btn-danger-outline btn-sm" id="purge-cache-btn" style="white-space: nowrap; flex-shrink: 0;">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.75 3.5h10.5M5.25 3.5V2.333c0-.31.252-.583.583-.583h2.334c.31 0 .583.252.583.583V3.5m1.75 0v8.167c0 .31-.252.583-.583.583H4.083a.594.594 0 01-.583-.583V3.5h7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Purge All
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Purge Cache Confirmation Modal -->
  <div class="modal-overlay" id="purge-modal" style="display: none;">
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title" style="color: var(--danger);">⚠️ Purge All Cache?</h3>
        <button class="modal-close" id="close-purge-modal-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-muted); line-height: 1.6;">This will remove <strong>all cached redirects</strong> from Cloudflare's edge servers worldwide.</p>
        <p style="color: var(--text-muted); line-height: 1.6; margin-top: 12px;">The next request to each redirect URL will execute your Worker code again and re-cache the result.</p>
        <p style="color: var(--danger); font-weight: 500; margin-top: 16px;">This action cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="cancel-purge-btn">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirm-purge-btn">Yes, Purge Everything</button>
      </div>
    </div>
  </div>

  <!-- Add/Edit Route Modal -->
  <div class="modal-overlay" id="route-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title" id="modal-title">Add Redirect</h3>
        <button class="modal-close" id="close-modal-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <form id="route-form">
        <input type="hidden" id="edit-mode" value="create">
        <div class="modal-body">
          <div id="form-error"></div>

          <div class="form-group">
            <label class="form-label">Route ID</label>
            <input type="text" id="route-id" class="form-input" required pattern="[a-zA-Z0-9-]+" placeholder="my-redirect">
            <p class="form-hint">Letters, numbers, and hyphens only. Use in URLs as ?r=<strong>my-redirect</strong></p>
          </div>

          <div class="form-group">
            <label class="form-label">Destination URL</label>
            <div class="input-with-prefix">
              <span class="input-prefix">https://</span>
              <input type="text" id="route-template" class="form-input form-input-mono" required placeholder="example.com/page/{id}">
            </div>
            <p class="form-hint">Add <strong>{placeholders}</strong> that get replaced with values from your source URL.</p>
            <details class="help-details">
              <summary>Show example</summary>
              <div class="help-example">
                <p><strong>If your destination URL is:</strong></p>
                <code>partner.com/product/{id}?ref={route}</code>
                <p><strong>And someone visits:</strong></p>
                <code>yoursite.com/?r=my-route&id=12345</code>
                <p><strong>They get redirected to:</strong></p>
                <code>partner.com/product/12345?ref=my-route</code>
                <p class="help-note"><strong>{route}</strong> = route name (automatic)<br><strong>{anything}</strong> = value from ?anything=value in source URL</p>
              </div>
            </details>
          </div>

          <div class="divider"></div>

          <div class="toggle-group">
            <div class="toggle active" id="route-active-toggle"></div>
            <span class="toggle-label">Redirect is active</span>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-route-btn">Save Redirect</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const API_BASE = ${JSON.stringify(basePath)};
    let currentRouteParam = 'r'; // Will be updated from settings

    document.addEventListener('DOMContentLoaded', () => {
      loadSettings().then(() => loadRoutes()); // Load settings first to get route_param
      setupEventListeners();
    });

    function setupEventListeners() {
      document.getElementById('add-route-btn').addEventListener('click', () => openModal());
      document.getElementById('close-modal-btn').addEventListener('click', closeModal);
      document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);
      document.getElementById('settings-form').addEventListener('submit', saveSettings);
      document.getElementById('route-form').addEventListener('submit', saveRoute);
      document.getElementById('route-active-toggle').addEventListener('click', toggleActive);
      document.getElementById('logout-btn').addEventListener('click', logout);

      // Sanitize route ID input - only allow letters, numbers, hyphens
      document.getElementById('route-id').addEventListener('input', (e) => {
        const input = e.target;
        input.value = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      });

      // Strip http:// or https:// from destination URL (we prepend https:// on save)
      document.getElementById('route-template').addEventListener('input', (e) => {
        const input = e.target;
        input.value = input.value.replace(/^https?:\\/\\//i, '');
      });

      // Close modal on overlay click
      document.getElementById('route-modal').addEventListener('click', (e) => {
        if (e.target.id === 'route-modal') closeModal();
      });

      // Purge cache modal handlers
      document.getElementById('purge-cache-btn').addEventListener('click', openPurgeModal);
      document.getElementById('close-purge-modal-btn').addEventListener('click', closePurgeModal);
      document.getElementById('cancel-purge-btn').addEventListener('click', closePurgeModal);
      document.getElementById('confirm-purge-btn').addEventListener('click', purgeCache);
      document.getElementById('purge-modal').addEventListener('click', (e) => {
        if (e.target.id === 'purge-modal') closePurgeModal();
      });

      // Check if cache purging is available
      checkCachePurgeStatus();
    }

    function logout() {
      // Clear HTTP Basic Auth by making request with invalid credentials
      const logoutUrl = API_BASE + '/routes';
      const xhr = new XMLHttpRequest();
      xhr.open('GET', logoutUrl, true, 'logout', 'logout');
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          // Redirect to force new auth prompt
          window.location.href = API_BASE;
        }
      };
      xhr.send();
    }

    function toggleActive() {
      const toggle = document.getElementById('route-active-toggle');
      toggle.classList.toggle('active');
    }

    async function loadRoutes() {
      const container = document.getElementById('routes-list');
      try {
        const res = await fetch(API_BASE + '/routes');
        const data = await res.json();
        renderRoutes(data.routes || []);
      } catch (err) {
        container.textContent = '';
        const div = document.createElement('div');
        div.className = 'empty-state';
        const p = document.createElement('p');
        p.className = 'empty-state-text';
        p.textContent = 'Failed to load redirects';
        div.appendChild(p);
        container.appendChild(div);
      }
    }

    function renderRoutes(routes) {
      const container = document.getElementById('routes-list');
      container.textContent = '';

      if (routes.length === 0) {
        const div = document.createElement('div');
        div.className = 'empty-state';

        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'empty-state-icon');
        icon.setAttribute('viewBox', '0 0 48 48');
        icon.setAttribute('fill', 'none');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '24');
        circle.setAttribute('cy', '24');
        circle.setAttribute('r', '20');
        circle.setAttribute('stroke', 'currentColor');
        circle.setAttribute('stroke-width', '2');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M16 28 L22 18 L28 24 L36 14');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        icon.appendChild(circle);
        icon.appendChild(path);
        div.appendChild(icon);

        const p = document.createElement('p');
        p.className = 'empty-state-text';
        p.textContent = 'No redirects yet. Add your first one!';
        div.appendChild(p);

        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.textContent = 'Add Redirect';
        btn.addEventListener('click', () => openModal());
        div.appendChild(btn);

        container.appendChild(div);
        return;
      }

      routes.forEach(route => {
        const item = document.createElement('div');
        item.className = 'route-item';

        // Header row (name, template, status, actions)
        const header = document.createElement('div');
        header.className = 'route-header';

        // Info section
        const info = document.createElement('div');
        info.className = 'route-info';

        const name = document.createElement('div');
        name.className = 'route-name';
        name.textContent = route.id;
        info.appendChild(name);

        const url = document.createElement('div');
        url.className = 'route-url';
        url.textContent = route.template;
        info.appendChild(url);

        header.appendChild(info);

        // Status badge
        const status = document.createElement('div');
        status.className = 'route-status ' + (route.active ? 'active' : 'inactive');

        const dot = document.createElement('span');
        dot.className = 'route-status-dot';
        status.appendChild(dot);

        const statusText = document.createTextNode(route.active ? 'Active' : 'Inactive');
        status.appendChild(statusText);

        header.appendChild(status);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'route-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary btn-sm';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editRoute(route.id));
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteRoute(route.id));
        actions.appendChild(deleteBtn);

        header.appendChild(actions);
        item.appendChild(header);

        // Sample link on its own row - extract placeholders from template
        const sampleLink = document.createElement('a');
        sampleLink.className = 'route-sample-link';
        let sampleUrl = window.location.origin + '/?' + encodeURIComponent(currentRouteParam) + '=' + encodeURIComponent(route.id);
        // Extract {placeholders} from template and add with dummy values
        const placeholders = (route.template.match(/\\{([^}]+)\\}/g) || [])
          .map(m => m.slice(1, -1))
          .filter(p => p !== 'route'); // exclude {route} as it's auto-populated
        placeholders.forEach(param => {
          sampleUrl += '&' + encodeURIComponent(param) + '=YOUR_' + param.toUpperCase();
        });
        sampleLink.href = sampleUrl;
        sampleLink.target = '_blank';
        sampleLink.textContent = sampleUrl;
        item.appendChild(sampleLink);

        container.appendChild(item);
      });
    }

    async function loadSettings() {
      const status = document.getElementById('settings-status');
      try {
        const res = await fetch(API_BASE + '/settings');
        if (!res.ok) {
          throw new Error('Server returned ' + res.status);
        }
        const settings = await res.json();
        document.getElementById('fallback_url').value = settings.fallback_url || '';
        document.getElementById('cache_ttl').value = settings.cache_ttl || 604800;
        document.getElementById('route_param').value = settings.route_param || 'r';
        currentRouteParam = settings.route_param || 'r'; // Store for sample links
      } catch (err) {
        console.error('Failed to load settings:', err);
        status.textContent = 'Failed to load settings';
        status.className = 'save-status error';
      }
    }

    async function saveSettings(e) {
      e.preventDefault();
      const status = document.getElementById('settings-status');
      try {
        const res = await fetch(API_BASE + '/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fallback_url: document.getElementById('fallback_url').value,
            cache_ttl: parseInt(document.getElementById('cache_ttl').value) || 604800,
            route_param: document.getElementById('route_param').value || 'r'
          })
        });
        if (res.ok) {
          status.textContent = 'Saved!';
          status.className = 'save-status success';
        } else {
          status.textContent = 'Error saving';
          status.className = 'save-status error';
        }
        setTimeout(() => { status.textContent = ''; }, 3000);
      } catch (err) {
        status.textContent = 'Error saving';
        status.className = 'save-status error';
      }
    }

    function openModal(route = null) {
      const modal = document.getElementById('route-modal');
      const title = document.getElementById('modal-title');
      const editMode = document.getElementById('edit-mode');
      const idInput = document.getElementById('route-id');
      const toggle = document.getElementById('route-active-toggle');

      if (route) {
        title.textContent = 'Edit Redirect';
        editMode.value = 'update';
        idInput.value = route.id;
        idInput.disabled = true;
        // Strip https:// prefix for display (we prepend it on save)
        document.getElementById('route-template').value = route.template.replace(/^https?:\\/\\//i, '');

        if (route.active) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
      } else {
        title.textContent = 'Add Redirect';
        editMode.value = 'create';
        idInput.disabled = false;
        document.getElementById('route-form').reset();
        toggle.classList.add('active');
      }

      document.getElementById('form-error').textContent = '';
      modal.classList.add('active');
    }

    function closeModal() {
      document.getElementById('route-modal').classList.remove('active');
    }

    async function editRoute(id) {
      try {
        const res = await fetch(API_BASE + '/routes/' + encodeURIComponent(id));
        const route = await res.json();
        openModal(route);
      } catch (err) {
        alert('Failed to load redirect');
      }
    }

    async function deleteRoute(id) {
      if (!confirm('Delete this redirect?')) return;
      try {
        const response = await fetch(API_BASE + '/routes/' + encodeURIComponent(id), { method: 'DELETE' });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          alert('Failed to delete redirect: ' + (err.error || 'Unknown error'));
          return;
        }
        loadRoutes();
      } catch (err) {
        alert('Failed to delete redirect');
      }
    }

    async function saveRoute(e) {
      e.preventDefault();
      const errorEl = document.getElementById('form-error');
      errorEl.textContent = '';
      errorEl.className = '';

      const id = document.getElementById('route-id').value.trim();
      const name = id; // Use route ID as name
      const templateValue = document.getElementById('route-template').value.trim();
      const template = 'https://' + templateValue; // Always prepend https://
      const active = document.getElementById('route-active-toggle').classList.contains('active');
      const editMode = document.getElementById('edit-mode').value;

      const body = {
        id,
        name,
        template,
        active
      };

      try {
        const url = editMode === 'update'
          ? API_BASE + '/routes/' + encodeURIComponent(id)
          : API_BASE + '/routes';
        const method = editMode === 'update' ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const err = await res.json();
          const alertDiv = document.createElement('div');
          alertDiv.className = 'alert alert-error';
          alertDiv.textContent = err.error || 'Failed to save';
          errorEl.appendChild(alertDiv);
          return;
        }

        closeModal();
        loadRoutes();
      } catch (err) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error';
        alertDiv.textContent = 'Failed to save redirect';
        errorEl.appendChild(alertDiv);
      }
    }

    // Cache purge functions
    async function checkCachePurgeStatus() {
      try {
        const res = await fetch(API_BASE + '/purge-cache/status');
        const data = await res.json();
        if (data.available) {
          document.getElementById('cache-purge-section').style.display = 'block';
        }
      } catch (err) {
        // Silently ignore - section stays hidden
      }
    }

    function openPurgeModal() {
      document.getElementById('purge-modal').style.display = 'flex';
    }

    function closePurgeModal() {
      document.getElementById('purge-modal').style.display = 'none';
    }

    async function purgeCache() {
      const btn = document.getElementById('confirm-purge-btn');
      const originalText = btn.textContent;
      btn.textContent = 'Purging...';
      btn.disabled = true;

      try {
        const res = await fetch(API_BASE + '/purge-cache', { method: 'POST' });
        const data = await res.json();

        if (!res.ok) {
          alert('Error: ' + (data.error || 'Failed to purge cache'));
          return;
        }

        closePurgeModal();
        // Show success feedback
        const section = document.getElementById('cache-purge-section');
        const successMsg = document.createElement('span');
        successMsg.style.cssText = 'color: var(--primary); font-size: 13px; margin-left: 12px;';
        successMsg.textContent = '✓ Cache purged';
        section.querySelector('#purge-cache-btn').insertAdjacentElement('afterend', successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } catch (err) {
        console.error('Failed to purge cache:', err);
        alert('Failed to purge cache');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
}
