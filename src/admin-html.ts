/**
 * Admin UI HTML for Gr8hopper
 * Clean, minimal design with cyan-blue accents
 * All dynamic content uses safe DOM methods (textContent, createElement)
 */
export function getAdminHtml(basePath: string = '/admin', version: string = 'dev'): string {
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
      --success: #10b981;
      --success-light: #ecfdf5;
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
      padding: 24px 16px 60px;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 12px;
    }



    /* Expand/Collapse Settings */
    .settings-expandable {
      background: var(--card);
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .settings-expandable--collapsed {
      border: 1px solid transparent;
    }

    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      cursor: pointer;
      background: var(--card);
      transition: background 0.15s ease;
      user-select: none;
    }

    .settings-header:hover {
      background: var(--bg);
    }

    .settings-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
    }

    .expand-icon {
      width: 18px;
      height: 18px;
      transition: transform 0.2s ease;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .settings-expandable--collapsed .expand-icon {
      transform: rotate(-90deg);
    }

    /* Routes count in header */
    .routes-count {
      display: inline-block;
      background: var(--primary-light);
      color: var(--primary);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-left: 8px;
    }

    .header h1 {
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .settings-content {
      display: block;
      padding: 20px;
      border-top: 1px solid var(--border);
      background: var(--card);
    }

    .settings-expandable--collapsed .settings-content {
      display: none;
    }

    /* Empty state inside collapsed settings */
    .settings-empty {
      padding: 16px 20px;
      color: var(--text-muted);
      font-size: 14px;
      background: var(--bg);
      border-radius: 8px;
      margin: 0 20px 20px;
    }

    /* Header Buttons Container */
    .header-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    /* Mobile Header Optimizations */
    @media (max-width: 768px) {
      .header {
        margin-bottom: 20px;
      }

      .header h1 {
        font-size: 18px;
        flex-wrap: wrap;
      }

      .routes-count {
        font-size: 11px;
        padding: 1px 6px;
      }

      .settings-header {
        padding: 14px 16px;
      }

      .settings-header-title {
        font-size: 15px;
      }

      .expand-icon {
        width: 16px;
        height: 16px;
      }

      .settings-content {
        padding: 16px;
      }

      .settings-empty {
        margin: 0 16px 16px;
        font-size: 13px;
      }
    }

    /* Desktop: Header h1 flex layout */
    @media (min-width: 769px) {
      .header h1 {
        gap: 10px;
      }
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
      white-space: nowrap;
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
      background: var(--card);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--bg);
      color: var(--text);
      transform: translateY(-1px);
    }

    .btn-danger {
      background: #fff;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }

    .btn-danger:hover {
      background: var(--danger-light);
      color: var(--danger);
      border-color: var(--danger);
      transform: translateY(-1px);
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

    /* Mobile Button Optimizations */
    @media (max-width: 768px) {
      .btn {
        padding: 8px 12px;
        font-size: 13px;
        gap: 4px;
      }

      .btn-sm {
        padding: 5px 10px;
        font-size: 12px;
      }

      .header-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        justify-content: flex-end;
        max-width: 100%;
      }

      .header-buttons .btn {
        flex: 1;
        min-width: 60px;
        justify-content: center;
      }

      .header-buttons .btn svg {
        width: 14px;
        height: 14px;
      }

      .header-buttons .btn span {
        display: none;
      }

      .header-buttons .btn-primary span {
        display: inline;
      }
    }

    @media (max-width: 480px) {
      .header-buttons .btn-primary span {
        display: none;
      }
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
      border: 1px solid transparent;
    }

    .route-item:hover {
      background: #f3f4f6;
      border-color: var(--border);
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
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .route-url {
      font-size: 13px;
      color: var(--text-muted);
      font-family: 'SF Mono', Monaco, monospace;
      word-break: break-all;
      line-height: 1.4;
      padding: 4px 0;
      margin-bottom: 2px;
    }

    .sample-link-wrapper {
      position: relative;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 2px;
      margin-top: 12px;
      display: flex;
      align-items: center;
      transition: all 0.2s ease;
    }

    .sample-link-wrapper:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 12px rgba(0, 186, 255, 0.08);
    }

    .route-sample-link {
      flex: 1;
      font-size: 13px;
      color: var(--primary);
      font-family: 'SF Mono', Monaco, monospace;
      text-decoration: none;
      word-break: break-all;
      line-height: 1.4;
      padding: 10px 12px;
      border: none;
      background: transparent;
      outline: none;
    }

    .route-sample-link:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
      border-radius: 6px;
    }

    .copy-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: 7px;
      margin: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
    }

    .copy-btn:hover {
      color: var(--primary);
      border-color: var(--primary);
      background: var(--primary-light);
    }

    .copy-btn:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .copy-btn.copied {
      color: var(--success);
      border-color: var(--success);
      background: var(--success-light);
    }

    .copy-btn svg {
      width: 14px;
      height: 14px;
    }



    .route-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding-top: 12px;
      margin-top: 8px;
      border-top: 1px solid var(--border);
      width: 100%;
    }

    /* Toggle Switch for Route Status */
    .route-toggle {
      position: relative;
      width: 40px;
      height: 22px;
      background: var(--border);
      border-radius: 11px;
      cursor: pointer;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .route-toggle:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .route-toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 9px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.2s ease;
    }

    .route-toggle.active {
      background: var(--primary);
    }

    .route-toggle.active::after {
      transform: translateX(18px);
    }



    /* Mobile Route Item Optimizations */
    @media (max-width: 768px) {
      .route-item {
        padding: 12px;
      }

      .route-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .route-info {
        width: 100%;
      }

      .route-name {
        font-size: 14px;
      }

      .route-url {
        font-size: 12px;
      }



      .route-sample-link {
        font-size: 11px;
        padding: 8px;
      }
    }

    @media (max-width: 480px) {
      .route-actions .btn-sm {
        padding: 5px 6px;
        font-size: 11px;
      }
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
      line-height: 1.4;
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
      word-break: break-all;
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

    /* Mobile Form Optimizations */
    @media (max-width: 768px) {
      .form-input {
        padding: 10px 12px;
        font-size: 14px;
      }

      .form-label {
        font-size: 13px;
      }

      .form-hint {
        font-size: 12px;
      }

      .input-prefix {
        padding: 0 10px;
        font-size: 12px;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .help-example code {
        font-size: 11px;
        padding: 5px 6px;
      }
    }

    /* Settings form actions */
    .form-actions {
      display: flex;
      align-items: center;
      margin-top: 8px;
    }

    .input-hidden {
      display: none;
    }

    /* Cache purge section */
    .cache-purge-section {
      display: none;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }

    .cache-purge-section--visible {
      display: block;
    }

    .cache-purge-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .cache-purge-info {
      flex: 1;
    }

    .cache-purge-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .cache-purge-hint {
      margin: 0;
    }

    .cache-purge-btn {
      white-space: nowrap;
      flex-shrink: 0;
    }

    .cache-purge-success {
      color: var(--primary);
      font-size: 13px;
      margin-left: 12px;
    }

    /* Mobile Modal Optimizations */
    @media (max-width: 768px) {
      .modal {
        max-width: calc(100vw - 32px);
        max-height: calc(100vh - 32px);
        border-radius: 16px;
      }

      .modal-header {
        padding: 16px 20px;
      }

      .modal-body {
        padding: 20px;
      }

      .modal-footer {
        padding: 14px 20px;
      }

      .modal-title {
        font-size: 16px;
      }
    }

    @media (max-width: 480px) {
      .modal {
        max-width: calc(100vw - 16px);
        max-height: calc(100vh - 16px);
      }

      .modal-header,
      .modal-body,
      .modal-footer {
        padding: 12px 16px;
      }
    }

    /* Toast Mobile Optimizations */
    @media (max-width: 768px) {
      .toast-container {
        top: 12px;
        right: 12px;
        left: 12px;
        max-width: none;
      }

      .toast {
        font-size: 13px;
        padding: 12px 14px;
      }
    }

    /* Card Mobile Optimizations */
    @media (max-width: 768px) {
      .card {
        padding: 20px;
      }

      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .card-title {
        font-size: 16px;
      }
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

    .modal--sm {
      max-width: 400px;
    }

    .modal--md {
      max-width: 450px;
    }

    .modal-title--danger {
      color: var(--danger);
    }

    .modal-text {
      color: var(--text-muted);
      line-height: 1.6;
      margin: 0;
    }

    .modal-text--spaced {
      margin-top: 12px;
    }

    .modal-text--warning {
      color: var(--danger);
      font-weight: 500;
      margin-top: 16px;
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

    /* Toast Notifications */
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      padding: 14px 18px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      font-size: 14px;
      line-height: 1.5;
      animation: toastIn 0.3s ease;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .toast.success {
      background: var(--primary-light);
      color: var(--primary-hover);
      border: 1px solid var(--primary);
    }

    .toast.error {
      background: var(--danger-light);
      color: var(--danger);
      border: 1px solid var(--danger);
    }

    .toast-icon {
      flex-shrink: 0;
      font-size: 16px;
    }

    .toast-message {
      flex: 1;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: inherit;
      opacity: 0.6;
      cursor: pointer;
      padding: 0;
      font-size: 18px;
      line-height: 1;
    }

    .toast-close:hover {
      opacity: 1;
    }

    .toast.hiding {
      animation: toastOut 0.2s ease forwards;
    }

    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes toastOut {
      to {
        opacity: 0;
        transform: translateX(20px);
      }
    }

    /* Scroll to Top Button */
    .scroll-to-top {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      background: var(--primary);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px);
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 186, 255, 0.3);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scroll-to-top.visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .scroll-to-top:hover {
      background: var(--primary-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 186, 255, 0.4);
    }

    .scroll-to-top:active {
      transform: translateY(0);
    }

    .scroll-to-top svg {
      width: 20px;
      height: 20px;
    }

    @media (max-width: 768px) {
      .scroll-to-top {
        bottom: 16px;
        right: 16px;
        width: 44px;
        height: 44px;
      }

      .scroll-to-top svg {
        width: 18px;
        height: 18px;
      }
    }

    .app-footer {
      margin-top: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-light);
      font-size: 12px;
    }

    .app-footer a {
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 500;
    }

    .app-footer a:hover {
      color: var(--primary-hover);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <!-- Toast Notification Container -->
  <div class="toast-container" id="toast-container" role="status" aria-live="polite" aria-atomic="true"></div>

  <!-- Scroll to Top Button -->
  <button class="scroll-to-top" id="scroll-to-top" aria-label="Scroll to top">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  </button>

  <div class="container">
    <!-- Header -->
    <header class="header">
      <h1>gr8hopper <span style="font-size: 14px; font-weight: 500; color: var(--text-muted);">v${version}</span></h1>
      <div class="header-buttons">
        <button class="logout-btn" id="logout-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>
      </div>
    </header>

    <!-- Settings Expandable Section (at top) -->
    <div class="settings-expandable settings-expandable--collapsed" id="settings-section">
      <div class="settings-header" id="settings-toggle">
        <div class="settings-header-title">
          Settings
          <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div class="settings-content">
        <form id="settings-form">
          <div class="settings-grid">
            <div class="form-group">
              <label class="form-label">Route parameter</label>
              <input type="text" id="route_param" class="form-input" placeholder="r" maxlength="20">
              <p class="form-hint">Query param that identifies the redirect, e.g. <strong>?r=</strong>campaign-link</p>
            </div>

            <div class="settings-row">
              <div class="form-group">
                <label class="form-label">Cache duration</label>
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

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save settings</button>
            <span id="settings-status" class="save-status"></span>
          </div>
        </form>

        <!-- Cache Purge Section (only shown when configured) -->
        <div id="cache-purge-section" class="cache-purge-section">
          <div class="cache-purge-header">
            <div class="cache-purge-info">
              <h3 class="cache-purge-title">Purge CDN Cache</h3>
              <p class="form-hint cache-purge-hint">Remove all cached redirects from Cloudflare's edge servers. Only use if you've made a mistake in one of the links, and the link has been accessed at least once.</p>
            </div>
            <button type="button" class="btn btn-danger-outline btn-sm cache-purge-btn" id="purge-cache-btn">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1.75 3.5h10.5M5.25 3.5V2.333c0-.31.252-.583.583-.583h2.334c.31 0 .583.252.583.583V3.5m1.75 0v8.167c0 .31-.252.583-.583.583H4.083a.594.594 0 01-.583-.583V3.5h7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Purge All
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Routes Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Your redirects <span class="routes-count" id="routes-count">0</span></h2>
        <div class="header-buttons">
          <button class="btn btn-secondary" id="export-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M11 5L8 2 5 5M8 2v9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span id="export-btn-text">Export</span>
          </button>
          <button class="btn btn-secondary" id="import-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M11 8L8 11 5 8M8 11V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Import
          </button>
          <input type="file" id="import-file" class="input-hidden" accept=".json">
          <button class="btn btn-primary" id="add-route-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Add new
          </button>
        </div>
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

    <footer class="app-footer">
      <a href="https://github.com/dima6312/gr8hopper" target="_blank" rel="noopener noreferrer">Gr8hopper</a>
      <span>v${version}</span>
    </footer>

  </div>

  <!-- Purge Cache Confirmation Modal -->
  <div class="modal-overlay" id="purge-modal">
    <div class="modal modal--sm">
      <div class="modal-header">
        <h3 class="modal-title modal-title--danger">⚠️ Purge All Cache?</h3>
        <button class="modal-close" id="close-purge-modal-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <p class="modal-text">This will remove <strong>all cached redirects</strong> from Cloudflare's edge servers worldwide.</p>
        <p class="modal-text modal-text--spaced">The next request to each redirect URL will execute your Worker code again and re-cache the result.</p>
        <p class="modal-text modal-text--warning">This action cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="cancel-purge-btn">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirm-purge-btn">Yes, Purge Everything</button>
      </div>
    </div>
  </div>

  <!-- Import Confirmation Modal -->
  <div class="modal-overlay" id="import-modal">
    <div class="modal modal--md">
      <div class="modal-header">
        <h3 class="modal-title modal-title--danger">⚠️ Import Configuration?</h3>
        <button class="modal-close" id="close-import-modal-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <p class="modal-text">This will <strong>replace all existing routes</strong> with the imported configuration.</p>
        <p class="modal-text modal-text--spaced" id="import-preview"></p>
        <p class="modal-text modal-text--warning">This action cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="cancel-import-btn">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirm-import-btn">Yes, Replace All</button>
      </div>
    </div>
  </div>

  <!-- Add/Edit Route Modal -->
  <div class="modal-overlay" id="route-modal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title" id="modal-title">Add redirect</h3>
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
            <label class="form-label">Route ID / Path</label>
            <input type="text" id="route-id" class="form-input" required pattern="[a-zA-Z0-9/{}\\*\\.\\?&amp;=:\\-]+" placeholder="my-redirect, shop/{id}, shop/:id, or product/{id}?lang={lang}" autocomplete="off">
            <p class="form-hint">Letters, numbers, hyphens, slashes, braces, asterisks, colons, and query symbols (? &amp; =). Supports patterns like <strong>shop/{id}</strong>, <strong>shop/:id</strong>, <strong>files/**</strong>, or <strong>product/{id}?lang={lang}</strong>.</p>
          </div>

          <div class="form-group">
            <label class="form-label">Destination URL</label>
            <div class="input-with-prefix">
              <span class="input-prefix">https://</span>
              <input type="text" id="route-template" class="form-input form-input-mono" required placeholder="example.com/page/{id}" autocomplete="off">
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

          <div class="toggle-group" style="margin-top: 16px;">
            <div class="toggle" id="route-passthrough-toggle"></div>
            <span class="toggle-label">Passthrough query parameters</span>
          </div>
          <p class="form-hint" style="margin-top: 4px; margin-left: 56px;">When enabled, query parameters from the source URL (like UTM tags) will be automatically appended to the destination URL.</p>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-route-btn">Save redirect</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const API_BASE = ${JSON.stringify(basePath)};
    const SETTINGS_COLLAPSED_KEY = 'gr8hopper_settings_collapsed';
    let currentRouteParam = 'r'; // Will be updated from settings

    // Toast notification system (replaces disruptive alert() calls)
    function showToast(message, type = 'success', duration = 5000) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;

      const icon = document.createElement('span');
      icon.className = 'toast-icon';
      icon.textContent = type === 'success' ? '\\u2713' : '\\u2717';
      toast.appendChild(icon);

      const msg = document.createElement('span');
      msg.className = 'toast-message';
      msg.textContent = message;
      toast.appendChild(msg);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => removeToast(toast));
      toast.appendChild(closeBtn);

      container.appendChild(toast);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
      }
    }

    function removeToast(toast) {
      if (!toast.parentNode) return;
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 200);
    }

    document.addEventListener('DOMContentLoaded', () => {
      // Check for saved settings state
      const settingsCollapsed = localStorage.getItem(SETTINGS_COLLAPSED_KEY);
      if (settingsCollapsed === 'false') {
        document.getElementById('settings-section').classList.remove('settings-expandable--collapsed');
      }

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
      document.getElementById('route-passthrough-toggle').addEventListener('click', togglePassthrough);
      document.getElementById('logout-btn').addEventListener('click', logout);

      // Settings expand/collapse toggle
      document.getElementById('settings-toggle').addEventListener('click', toggleSettings);

      // Sanitize route ID input - allow letters, numbers, hyphens, slashes, braces, asterisks, dots, colons, and query symbols
      document.getElementById('route-id').addEventListener('input', (e) => {
        const input = e.target;
        input.value = input.value.toLowerCase().replace(/[^a-z0-9/{}.?&=:*-]/g, '');
      });

      // Strip http:// or https:// from destination URL (we prepend https:// on save)
      document.getElementById('route-template').addEventListener('input', (e) => {
        const input = e.target;
        input.value = input.value.replace(/^https?:\\/\\/\\//i, '');
      });

      // Close modal on overlay click (only if started and ended on overlay)
      const setupOverlayClick = (id, closeFn) => {
        const el = document.getElementById(id);
        if (!el || el.dataset.overlayClickBound === '1') return;
        el.dataset.overlayClickBound = '1';
        let mousedownOnOverlay = false;
        const handleMouseDown = (e) => { mousedownOnOverlay = (e.target === el); };
        const handleClick = (e) => { if (mousedownOnOverlay && e.target === el) closeFn(); };
        el.addEventListener('mousedown', handleMouseDown);
        el.addEventListener('click', handleClick);
      };

      setupOverlayClick('route-modal', closeModal);

      // Purge cache modal handlers
      document.getElementById('purge-cache-btn').addEventListener('click', openPurgeModal);
      document.getElementById('close-purge-modal-btn').addEventListener('click', closePurgeModal);
      document.getElementById('cancel-purge-btn').addEventListener('click', closePurgeModal);
      document.getElementById('confirm-purge-btn').addEventListener('click', purgeCache);
      setupOverlayClick('purge-modal', closePurgeModal);

      // Check if cache purging is available
      checkCachePurgeStatus();

      // Export/Import handlers
      document.getElementById('export-btn').addEventListener('click', exportConfig);
      document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
      document.getElementById('import-file').addEventListener('change', handleImportFile);
      document.getElementById('close-import-modal-btn').addEventListener('click', closeImportModal);
      document.getElementById('cancel-import-btn').addEventListener('click', closeImportModal);
      document.getElementById('confirm-import-btn').addEventListener('click', confirmImport);
      setupOverlayClick('import-modal', closeImportModal);
    }

    function toggleSettings() {
      const section = document.getElementById('settings-section');
      const isCollapsed = section.classList.contains('settings-expandable--collapsed');
      section.classList.toggle('settings-expandable--collapsed');
      localStorage.setItem(SETTINGS_COLLAPSED_KEY, String(!isCollapsed));
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

    function togglePassthrough() {
      const toggle = document.getElementById('route-passthrough-toggle');
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

      // Update routes count in header
      const routesCount = document.getElementById('routes-count');
      const count = routes.length;
      routesCount.textContent = count;

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
        btn.textContent = 'Add redirect';
        btn.addEventListener('click', () => openModal());
        div.appendChild(btn);

        container.appendChild(div);
        return;
      }

      // Show latest entries first (based on storage order)
      [...routes].reverse().forEach(route => {
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

        // Add toggle switch to the name
        const toggle = document.createElement('div');
        toggle.className = 'route-toggle ' + (route.active ? 'active' : 'inactive');
        toggle.dataset.routeId = route.id;
        toggle.dataset.active = route.active ? '1' : '0';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-checked', String(route.active));
        toggle.setAttribute('aria-label', 'Toggle ' + route.id + ' redirect');
        toggle.setAttribute('tabindex', '0');

        // Add click handler for one-click toggle
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleRouteStatus(route.id, toggle);
        });
        toggle.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle.click();
          }
        });

        name.appendChild(toggle);

        const nameText = document.createElement('span');
        nameText.textContent = route.id;
        name.appendChild(nameText);

        info.appendChild(name);

        const url = document.createElement('div');
        url.className = 'route-url';
        url.textContent = route.template;
        info.appendChild(url);

        header.appendChild(info);

        // Actions
        const createActions = () => {
          const actions = document.createElement('div');
          actions.className = 'route-actions';

          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-secondary btn-sm';
          editBtn.textContent = 'Edit';
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editRoute(route.id);
          });
          actions.appendChild(editBtn);

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-danger btn-sm';
          deleteBtn.textContent = 'Delete';
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteRoute(route.id);
          });
          actions.appendChild(deleteBtn);
          return actions;
        };

        item.appendChild(header);

        // Sample link wrapper logic
        const linkWrapper = document.createElement('div');
        linkWrapper.className = 'sample-link-wrapper';

        const sampleLink = document.createElement('a');
        sampleLink.className = 'route-sample-link';
        
        // Detect if this is a pattern route (contains {, *, ?, or :)
        const isPatternRoute = route.id.includes('{') || route.id.includes('*') || route.id.includes('?') || route.id.includes(':');
        
        let sampleUrl;
        if (isPatternRoute) {
          // For pattern routes, show path-based URL (cleaner and more intuitive)
          // Replace placeholders in the route pattern with example values
          const queryIndex = route.id.indexOf('?');
          let pathPattern = queryIndex >= 0 ? route.id.slice(0, queryIndex) : route.id;
          const queryPart = queryIndex >= 0 ? route.id.slice(queryIndex + 1) : '';
          
          // Extract placeholders from the pattern
          const pathPlaceholders = (pathPattern.match(/\\{([^}]+)\\}/g) || [])
            .map(m => {
              const inner = m.slice(1, -1);
              // Handle optional params: {param?} -> param
              // Handle defaults: {param=value} -> param
              const name = inner.replace(/[?=].*$/, '');
              return { full: m, name };
            });
          
          // Replace each placeholder with example value
          pathPlaceholders.forEach(({ full, name }) => {
            const exampleValue = 'YOUR_' + name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
            pathPattern = pathPattern.replace(full, exampleValue);
          });
          
          // Replace :param-style placeholders (preserving slashes around them)
          // eslint-disable-next-line no-useless-escape
          pathPattern = pathPattern.replace(/:([a-z0-9_]+)\\??/gi, (match, name) => {
            if (!name) return match;
            return 'YOUR_' + name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
          });
          
          // Handle wildcards
          if (pathPattern.includes('**')) {
            // eslint-disable-next-line no-useless-escape
            pathPattern = pathPattern.replace(/\\*\\*/g, 'example/path');
          }
          if (pathPattern.includes('*')) {
            // eslint-disable-next-line no-useless-escape
            pathPattern = pathPattern.replace(/\\*/g, 'example');
          }
          
          sampleUrl = window.location.origin + '/' + pathPattern;
          
          // Add query params if the pattern has query requirements
          if (queryPart) {
            const queryParams = new URLSearchParams();
            
            // Parse query params from pattern
            queryPart.split('&').forEach(pair => {
              if (pair === '*' || pair.trim() === '') return;
              const equalIndex = pair.indexOf('=');
              if (equalIndex < 0) {
                const paramName = pair.trim();
                if (!paramName) return;
                const exampleValue = 'YOUR_' + paramName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                queryParams.set(paramName, exampleValue);
                return;
              }

              const paramName = pair.slice(0, equalIndex).trim();
              const valueSpec = pair.slice(equalIndex + 1).trim();

              if (!paramName) return;
              
              if (valueSpec === '*') {
                queryParams.set(paramName, 'any');
                return;
              }
              
              if (valueSpec.startsWith('{') && valueSpec.endsWith('}')) {
                const inner = valueSpec.slice(1, -1).trim();
                const defaultIndex = inner.indexOf('=');
                const placeholderName = defaultIndex >= 0 ? inner.slice(0, defaultIndex).trim() : inner.replace(/[?]$/, '').trim();
                const name = placeholderName || paramName;
                const exampleValue = 'YOUR_' + name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                queryParams.set(paramName, exampleValue);
                return;
              }

              // Literal value (e.g., lang=en)
              queryParams.set(paramName, valueSpec);
            });
            
            if (queryParams.toString()) {
              sampleUrl += '?' + queryParams.toString();
            }
          }
        } else {
          // For simple routes, use query parameter format
          sampleUrl = window.location.origin + '/?' + encodeURIComponent(currentRouteParam) + '=' + encodeURIComponent(route.id);
          const placeholders = (route.template.match(/\\{([^}]+)\\}/g) || [])
            .map(m => m.slice(1, -1))
            .filter(p => p !== 'route'); 
          placeholders.forEach(param => {
            sampleUrl += '&' + encodeURIComponent(param) + '=YOUR_' + param.toUpperCase();
          });
        }
        
        sampleLink.href = sampleUrl;
        sampleLink.target = '_blank';
        sampleLink.textContent = sampleUrl;
        linkWrapper.appendChild(sampleLink);

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
        copyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          copyToClipboard(sampleUrl, copyBtn);
        });
        linkWrapper.appendChild(copyBtn);

        item.appendChild(linkWrapper);

        // Actions row (DRY - appended once at the bottom for both mobile/desktop)
        item.appendChild(createActions());

        container.appendChild(item);
      });
    }

    // One-click toggle route status
    async function toggleRouteStatus(id, element) {
      if (element.dataset.loading === '1') return;
      const isActive = element.classList.contains('active');
      const newStatus = !isActive;

      const updateElementUI = (status) => {
        element.classList.toggle('active', status);
        element.classList.toggle('inactive', !status);
        element.dataset.active = status ? '1' : '0';
        element.setAttribute('aria-checked', String(status));
      };

      // Optimistic UI update
      element.dataset.loading = '1';
      updateElementUI(newStatus);

      try {
        const res = await fetch(API_BASE + '/routes/' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            active: newStatus
          })
        });

        if (!res.ok) {
          let errorMessage = 'Failed to update status';
          try {
            const errorData = await res.json();
            if (errorData && typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            }
          } catch {
            // Ignore JSON parse errors and keep default message.
          }
          throw new Error(errorMessage);
        }

        showToast('Route ' + id + ' is now ' + (newStatus ? 'active' : 'inactive'), 'success');

        // Reload routes to ensure sync
        await loadRoutes();
      } catch (err) {
        // Revert UI on error
        console.error('Toggle failed:', err);
        updateElementUI(isActive);
        const message = err instanceof Error && err.message ? err.message : 'Failed to update route status';
        showToast(message, 'error');
      } finally {
        element.dataset.loading = '0';
      }
    }

    function copyToClipboard(text, btn) {
      const originalHTML = btn.innerHTML;

      const showCopied = () => {
        btn.classList.add('copied');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalHTML;
        }, 2000);
      };

      const fallbackCopy = () => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            showCopied();
          } else {
            showToast('Copy failed. Please copy manually.', 'error');
          }
        } catch (err) {
          console.error('Fallback copy failed:', err);
          showToast('Copy failed. Please copy manually.', 'error');
        } finally {
          document.body.removeChild(textArea);
        }
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(showCopied).catch((err) => {
          console.error('Failed to copy text:', err);
          fallbackCopy();
        });
      } else {
        fallbackCopy();
      }
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
      const passthroughToggle = document.getElementById('route-passthrough-toggle');

      if (route) {
        title.textContent = 'Edit redirect';
        editMode.value = 'update';
        idInput.value = route.id;
        idInput.disabled = true;
      document.getElementById('route-template').value = route.template;

        if (route.active) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }

        if (route.passthrough) {
          passthroughToggle.classList.add('active');
        } else {
          passthroughToggle.classList.remove('active');
        }
      } else {
        title.textContent = 'Add redirect';
        editMode.value = 'create';
        idInput.disabled = false;
        document.getElementById('route-form').reset();
        toggle.classList.add('active');
        passthroughToggle.classList.remove('active'); // Default: passthrough off
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
        showToast('Failed to load redirect', 'error');
      }
    }

    async function deleteRoute(id) {
      if (!confirm('Delete this redirect?')) return;
      try {
        const response = await fetch(API_BASE + '/routes/' + encodeURIComponent(id), { method: 'DELETE' });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          showToast('Failed to delete redirect: ' + (err.error || 'Unknown error'), 'error');
          return;
        }
        loadRoutes();
      } catch (err) {
        showToast('Failed to delete redirect', 'error');
      }
    }

    async function saveRoute(e) {
      e.preventDefault();
      const errorEl = document.getElementById('form-error');
      errorEl.textContent = '';
      errorEl.className = '';

      const id = document.getElementById('route-id').value.trim();
      const name = id; // Use route ID as name
      const template = document.getElementById('route-template').value.trim();
      const active = document.getElementById('route-active-toggle').classList.contains('active');
      const passthrough = document.getElementById('route-passthrough-toggle').classList.contains('active');
      const editMode = document.getElementById('edit-mode').value;

      const body = {
        id,
        name,
        template,
        active,
        passthrough
      };

      try {
        const url = editMode === 'update'
          ? API_BASE + '/routes/' + encodeURIComponent(id)
          : API_BASE + '/routes';
        const method = editMode === 'update' ? 'PATCH' : 'POST';

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
          document.getElementById('cache-purge-section').classList.add('cache-purge-section--visible');
        }
      } catch (err) {
        // Silently ignore - section stays hidden
      }
    }

    function openPurgeModal() {
      document.getElementById('purge-modal').classList.add('active');
    }

    function closePurgeModal() {
      document.getElementById('purge-modal').classList.remove('active');
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
          showToast('Error: ' + (data.error || 'Failed to purge cache'), 'error');
          return;
        }

        closePurgeModal();
        // Show success feedback
        const section = document.getElementById('cache-purge-section');
        const successMsg = document.createElement('span');
        successMsg.className = 'cache-purge-success';
        successMsg.textContent = '✓ Cache purged';
        section.querySelector('#purge-cache-btn').insertAdjacentElement('afterend', successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } catch (err) {
        console.error('Failed to purge cache:', err);
        showToast('Failed to purge cache', 'error');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }

    // Export/Import functions
    let pendingImportData = null;

    async function exportConfig() {
      const btn = document.getElementById('export-btn');
      const btnText = document.getElementById('export-btn-text');
      const originalText = btnText.textContent;
      btnText.textContent = 'Exporting...';
      btn.disabled = true;

      try {
        const res = await fetch(API_BASE + '/export');
        if (!res.ok) {
          throw new Error('Export failed');
        }
        const data = await res.json();

        // Download as file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gr8hopper-routes-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export failed:', err);
        showToast('Failed to export configuration', 'error');
      } finally {
        btnText.textContent = originalText;
        btn.disabled = false;
      }
    }

    function handleImportFile(e) {
      const file = e.target.files[0];
      if (!file) return;

      // Limit file size to 10MB
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        showToast('File too large. Maximum size: 10MB', 'error');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();

      reader.onerror = function() {
        console.error('Failed to read file:', reader.error);
        showToast('Failed to read file: ' + (reader.error?.message || 'Unknown error'), 'error');
        e.target.value = '';
      };

      reader.onload = function(event) {
        try {
          const data = JSON.parse(event.target.result);

          if (!data.routes || typeof data.routes !== 'object') {
            showToast('Invalid file format: missing routes object', 'error');
            return;
          }

          const routeCount = Object.keys(data.routes).length;
          if (routeCount === 0) {
            showToast('Import file contains no routes', 'error');
            return;
          }

          pendingImportData = data;

          // Show preview in modal
          document.getElementById('import-preview').textContent =
            'File contains ' + routeCount + ' routes' +
            (data.settings ? ' and settings.' : '.');

          // Open confirmation modal
          document.getElementById('import-modal').classList.add('active');
        } catch (err) {
          console.error('Failed to parse JSON:', err);
          showToast('Invalid JSON file: ' + (err.message || 'Parse error'), 'error');
        }
      };
      reader.readAsText(file);

      // Reset file input so same file can be selected again
      e.target.value = '';
    }

    function closeImportModal() {
      document.getElementById('import-modal').classList.remove('active');
      pendingImportData = null;
    }

    async function confirmImport() {
      if (!pendingImportData) return;

      const btn = document.getElementById('confirm-import-btn');
      const originalText = btn.textContent;
      btn.textContent = 'Importing...';
      btn.disabled = true;

      try {
        const res = await fetch(API_BASE + '/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingImportData)
        });

        const result = await res.json();

        if (!res.ok) {
          closeImportModal();
          showToast('Import failed: ' + (result.error || 'Unknown error'), 'error');
          return;
        }

        closeImportModal();
        loadRoutes();
        loadSettings();

        // Show success message
        showToast('Successfully imported ' + result.imported + ' routes', 'success');
      } catch (err) {
        console.error('Import failed:', err);
        closeImportModal();
        showToast('Failed to import configuration: ' + (err.message || 'Network error'), 'error');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }

    // Scroll to Top functionality
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    let scrollThreshold = 300; // Show after scrolling 300px

    // Show/hide button on scroll
    window.addEventListener('scroll', () => {
      if (window.scrollY > scrollThreshold) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
    });

    // Scroll to top on click
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  </script>
</body>
</html>`;
}
