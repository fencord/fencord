// ==UserScript==
// @name         Fencord
// @namespace    fencord
// @version      1.24
// @description  Theme manager for Fenrid
// @match        https://fenrid.com/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/fencord/fencord/main/fencord.user.js
// @downloadURL  https://raw.githubusercontent.com/fencord/fencord/main/fencord.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'fencord-active-theme';
  const CUSTOM_THEMES_KEY = 'fencord-custom-themes';
  const CREDITS_TEXT = 'made by @123 and @702 on fenrid';

  function makeCreditNote({ compact = false, maxWidth = '420px' } = {}) {
    const note = document.createElement('div');
    note.className = 'fencord-credits';
    note.textContent = CREDITS_TEXT;
    Object.assign(note.style, {
      fontSize: compact ? '12px' : '13px',
      color: 'var(--text-muted)',
      opacity: '0.9',
      marginTop: compact ? '10px' : '16px',
      maxWidth,
      lineHeight: '1.35',
      userSelect: 'none',
      fontWeight: '600'
    });
    return note;
  }

  const TEMPLATE_THEME = {
    name: "My Theme",
    vars: {
      "--background": "#1e1e2e",
      "--foreground": "#cdd6f4",
      "--server-sidebar": "#181825",
      "--channel-sidebar": "#1e1e2e",
      "--main-chat-area": "#1e1e2e",
      "--member-list": "#181825",
      "--popups-and-modals": "#1e1e2e",
      "--borders-and-separators": "#313244",
      "--primary-action": "#89b4fa",
      "--primary-hover": "#74a8f9",
      "--secondary-button": "#313244",
      "--secondary-button-hover": "#45475a",
      "--accent-vibrant": "#89b4fa",
      "--success-green": "#a6e3a1",
      "--error-red": "#f38ba8",
      "--warning-yellow": "#f9e2af",
      "--text-primary": "#cdd6f4",
      "--text-secondary": "#a6adc8",
      "--text-muted": "#6c7086",
      "--interactive-hover": "#89b4fa",
      "--hover-overlay": "#ffffff0d",
      "--active-overlay": "#ffffff14",
      "--primary-foreground": "#1e1e2e",
      "--matrix-rain": "#00ff00"
    }
  };

  const THEMES_CACHE_KEY = 'fencord-remote-themes';
  let remoteThemes = null;
  let refreshSettingsPanel = null;

  const FALLBACK_THEMES = {
    none: { name: 'None (Default)', vars: {} },
    catppuccin: {
      name: 'Catppuccin Mocha',
      vars: {
        '--background': '#1e1e2e', '--foreground': '#cdd6f4',
        '--server-sidebar': '#181825', '--channel-sidebar': '#1e1e2e',
        '--main-chat-area': '#1e1e2e', '--member-list': '#181825',
        '--popups-and-modals': '#1e1e2e', '--borders-and-separators': '#313244',
        '--primary-action': '#89b4fa', '--primary-hover': '#74a8f9',
        '--secondary-button': '#313244', '--secondary-button-hover': '#45475a',
        '--accent-vibrant': '#89b4fa', '--success-green': '#a6e3a1',
        '--error-red': '#f38ba8', '--warning-yellow': '#f9e2af',
        '--text-primary': '#cdd6f4', '--text-secondary': '#a6adc8',
        '--text-muted': '#6c7086', '--interactive-hover': '#89b4fa',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#1e1e2e',
        '--matrix-rain': '#a6e3a1',
      }
    }
  };

  function getCachedThemes() {
    try {
      const parsed = JSON.parse(localStorage.getItem(THEMES_CACHE_KEY) || 'null');
      if (parsed && typeof parsed === 'object' && parsed.none) return parsed;
    } catch (e) {}
    return null;
  }

  function saveCachedThemes(themes) {
    localStorage.setItem(THEMES_CACHE_KEY, JSON.stringify(themes));
  }

  function getBuiltInThemes() {
    return remoteThemes || getCachedThemes() || FALLBACK_THEMES;
  }


  function getCustomThemes() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveCustomThemes(obj) {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(obj));
  }

  function getAllThemes() {
    return { ...getBuiltInThemes(), ...getCustomThemes() };
  }

  function hexToRgba(hex, alpha) {
    const raw = String(hex || '').replace('#', '').trim();
    if (raw.length !== 3 && raw.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
    const full = raw.length === 3
      ? raw.split('').map((c) => c + c).join('')
      : raw;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return `rgba(0, 0, 0, ${alpha})`;
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getActiveThemeVars() {
    const theme = getAllThemes()[getSavedTheme()];
    return (theme && theme.vars) || {};
  }

  function getMatrixRainColor() {
    const vars = getActiveThemeVars();
    return (
      vars['--matrix-rain'] ||
      vars['--accent-vibrant'] ||
      vars['--primary-action'] ||
      '#00ff00'
    );
  }

  function fillEffectBackdropStyle(style) {
    if (!style) return;

    const vars = getActiveThemeVars();
    const bg = vars['--background'] || '#000000';
    const server = vars['--server-sidebar'] || bg;
    const channel = vars['--channel-sidebar'] || bg;
    const chat = vars['--main-chat-area'] || bg;
    const members = vars['--member-list'] || server;
    const popups = vars['--popups-and-modals'] || channel;

    style.textContent = `
      html, body {
        background: #000 !important;
      }
      :root {
        --background: ${hexToRgba(bg, 0.72)} !important;
        --server-sidebar: ${hexToRgba(server, 0.78)} !important;
        --channel-sidebar: ${hexToRgba(channel, 0.72)} !important;
        --main-chat-area: ${hexToRgba(chat, 0.65)} !important;
        --member-list: ${hexToRgba(members, 0.78)} !important;
        --popups-and-modals: ${hexToRgba(popups, 0.92)} !important;
      }
    `;
  }

  function updateMatrixBackdropStyle() {
    fillEffectBackdropStyle(document.getElementById(MATRIX_STYLE_ID));
  }

  function updateRainBackdropStyle() {
    fillEffectBackdropStyle(document.getElementById(RAIN_STYLE_ID));
  }

  function refreshEffectBackdrops() {
    for (const id of [MATRIX_STYLE_ID, RAIN_STYLE_ID, FIRE_STYLE_ID]) {
      const style = document.getElementById(id);
      if (!style) continue;
      fillEffectBackdropStyle(style);
      document.head.appendChild(style);
    }
  }

  function applyTheme(key) {
    let styleEl = document.getElementById('fencord-theme');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'fencord-theme';
      document.head.appendChild(styleEl);
    }

    const theme = getAllThemes()[key];
    if (!theme || key === 'none') {
      styleEl.textContent = '';
    } else {
      const vars = { ...theme.vars };
      // Older cached themes may lack --matrix-rain; derive from accent.
      if (!vars['--matrix-rain']) {
        vars['--matrix-rain'] =
          vars['--accent-vibrant'] || vars['--primary-action'] || '#00ff00';
      }
      const rules = Object.entries(vars)
        .map(([k, v]) => `${k}: ${v} !important;`)
        .join('\n');
      styleEl.textContent = `:root {\n${rules}\n}`;
    }

    refreshEffectBackdrops();
  }

  function getSavedTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'none';
  }

  function saveTheme(key) {
    localStorage.setItem(STORAGE_KEY, key);
  }

  function importThemeFlow(rerenderPanel) {
    const input = prompt(
      'Paste your theme JSON below:\n\n(Use the "Copy Template" button to get a starting point)'
    );
    if (!input) return;

    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
      return;
    }

    if (!parsed.name || !parsed.vars || typeof parsed.vars !== 'object') {
      alert('Theme JSON must have a "name" string and a "vars" object.');
      return;
    }

    const key = 'custom_' + parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const custom = getCustomThemes();
    custom[key] = { name: parsed.name, vars: parsed.vars };
    saveCustomThemes(custom);

    alert(`Imported "${parsed.name}"! Select it from the theme list.`);
    rerenderPanel();
  }

  function copyTemplate() {
    const text = JSON.stringify(TEMPLATE_THEME, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert(`Template copied to clipboard! Edit the hex values, then use Import.`);
    }).catch(() => {
      prompt('Copy this template manually:', text);
    });
  }

  function shade(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + Math.round(2.55 * percent);
    let g = ((num >> 8) & 0x00FF) + Math.round(2.55 * percent);
    let b = (num & 0x0000FF) + Math.round(2.55 * percent);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  function isLight(hex) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
  }

  function deriveThemeFromTwoColors(bgHex, accentHex) {
    const light = isLight(bgHex);
    const textPrimary = light ? '#181825' : '#ffffff';
    const textSecondary = light ? shade(textPrimary, 40) : shade(textPrimary, -20);
    const textMuted = light ? shade(textPrimary, 60) : shade(textPrimary, -40);

    return {
      '--background': bgHex,
      '--foreground': textPrimary,
      '--server-sidebar': shade(bgHex, light ? -8 : -10),
      '--channel-sidebar': shade(bgHex, light ? -4 : 4),
      '--main-chat-area': bgHex,
      '--member-list': shade(bgHex, light ? -8 : -10),
      '--popups-and-modals': shade(bgHex, light ? -4 : 4),
      '--borders-and-separators': shade(bgHex, light ? -15 : 15),
      '--primary-action': accentHex,
      '--primary-hover': shade(accentHex, -15),
      '--secondary-button': shade(bgHex, light ? -15 : 15),
      '--secondary-button-hover': shade(bgHex, light ? -25 : 25),
      '--accent-vibrant': accentHex,
      '--success-green': '#a6e3a1',
      '--error-red': '#f38ba8',
      '--warning-yellow': '#f9e2af',
      '--text-primary': textPrimary,
      '--text-secondary': textSecondary,
      '--text-muted': textMuted,
      '--interactive-hover': accentHex,
      '--hover-overlay': light ? '#0000000d' : '#ffffff0d',
      '--active-overlay': light ? '#00000014' : '#ffffff14',
      '--primary-foreground': light ? '#ffffff' : bgHex,
      '--matrix-rain': accentHex
    };
  }

  function openQuickThemeUI(rerenderPanel) {
    const modalOverlay = document.createElement('div');
    Object.assign(modalOverlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.6)',
      zIndex: 1000001, display: 'flex', alignItems: 'center', justifyContent: 'center'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: 'var(--popups-and-modals)', color: 'var(--text-primary)', padding: '24px', borderRadius: '10px',
      fontFamily: 'inherit', width: '300px', display: 'flex', flexDirection: 'column', gap: '14px',
      border: '1px solid var(--borders-and-separators)'
    });

    box.innerHTML = `
      <div style="font-weight:bold;font-size:16px;">Quick 2-Color Theme</div>
      <label style="display:flex;flex-direction:column;gap:4px;">
        Background color
        <input type="color" id="fencord-bg-color" value="#1e1e2e" style="width:100%;height:36px;border:none;cursor:pointer;">
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        Accent color
        <input type="color" id="fencord-accent-color" value="#89b4fa" style="width:100%;height:36px;border:none;cursor:pointer;">
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;">
        Theme name
        <input type="text" id="fencord-theme-name" placeholder="My Cool Theme" style="padding:8px;border-radius:6px;border:1px solid var(--borders-and-separators);background:var(--secondary-button);color:var(--text-primary);">
      </label>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button id="fencord-quick-save" style="flex:1;padding:10px;border-radius:6px;border:none;background:var(--primary-action);color:var(--primary-foreground);cursor:pointer;font-weight:bold;">Save</button>
        <button id="fencord-quick-cancel" style="flex:1;padding:10px;border-radius:6px;border:none;background:var(--secondary-button);color:var(--text-primary);cursor:pointer;">Cancel</button>
      </div>
      <div style="font-size:11px;color:var(--text-muted);user-select:none;">made by @123 and @702 on fenrid</div>
    `;

    modalOverlay.appendChild(box);
    document.body.appendChild(modalOverlay);

    box.querySelector('#fencord-quick-cancel').addEventListener('click', () => modalOverlay.remove());
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.remove();
    });

    box.querySelector('#fencord-quick-save').addEventListener('click', () => {
      const bg = box.querySelector('#fencord-bg-color').value;
      const accent = box.querySelector('#fencord-accent-color').value;
      const name = box.querySelector('#fencord-theme-name').value.trim() || 'Quick Theme';

      const vars = deriveThemeFromTwoColors(bg, accent);
      const key = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();

      const custom = getCustomThemes();
      custom[key] = { name, vars };
      saveCustomThemes(custom);

      applyTheme(key);
      saveTheme(key);

      modalOverlay.remove();
      rerenderPanel();
    });
  }

  const RGB_USERNAMES_KEY = 'fencord-rgb-usernames';
  let rgbObserver = null;
  let rgbInterval = null;
  const rgbColors = ['#ff0000', '#ff9900', '#ffee00', '#00ff66', '#00ccff', '#cc00ff'];

  function tickRgbColors() {
    const now = Date.now();
    // Only target actual clickable username spans (they carry cursor-pointer),
    // not the "font-semibold" date-divider spans that share the same base class.
    document.querySelectorAll('span.font-semibold.cursor-pointer').forEach((el, i) => {
      // offset each username slightly so they don't all flash in sync
      const step = Math.floor((now / 600) + i) % rgbColors.length;
      el.style.setProperty('color', rgbColors[step], 'important');
      el.dataset.fencordRgb = '1';
    });
  }

  function removeRgbFromUsernames() {
    document.querySelectorAll('[data-fencord-rgb]').forEach(el => {
      el.style.removeProperty('color');
      delete el.dataset.fencordRgb;
    });
  }

  function isRgbEnabled() {
    return localStorage.getItem(RGB_USERNAMES_KEY) === 'true';
  }

  function setRgbEnabled(enabled) {
    localStorage.setItem(RGB_USERNAMES_KEY, enabled ? 'true' : 'false');
    if (enabled) {
      if (!rgbInterval) {
        rgbInterval = setInterval(tickRgbColors, 150);
      }
      if (!rgbObserver) {
        rgbObserver = new MutationObserver(() => tickRgbColors());
        rgbObserver.observe(document.body, { childList: true, subtree: true });
      }
    } else {
      removeRgbFromUsernames();
      if (rgbInterval) {
        clearInterval(rgbInterval);
        rgbInterval = null;
      }
      if (rgbObserver) {
        rgbObserver.disconnect();
        rgbObserver = null;
      }
    }
  }

  // ---------------------------------------------------------------
  // FONT PLUGIN
  // Injects a Google Fonts <link> and applies the chosen font-family
  // to the whole app via a !important style rule. Supports a preset
  // list plus a custom Google Font name typed by the user.
  // ---------------------------------------------------------------

  const FONT_KEY = 'fencord-active-font';
  const FONT_LINK_ID = 'fencord-font-link';
  const FONT_STYLE_ID = 'fencord-font-style';
  const FONTS_CACHE_KEY = 'fencord-remote-fonts';
  let remoteFonts = null;

  const FALLBACK_FONTS = [
    { id: 'default', label: 'Default', family: null, googleName: null },
    { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", googleName: 'Inter:wght@400;600;700' },
    { id: 'couriernew', label: 'Courier New', family: "'Courier New', Courier, monospace", googleName: null }
  ];

  function getCachedFonts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FONTS_CACHE_KEY) || 'null');
      if (Array.isArray(parsed) && parsed.length && parsed[0].id === 'default') return parsed;
    } catch (e) {}
    return null;
  }

  function saveCachedFonts(fonts) {
    localStorage.setItem(FONTS_CACHE_KEY, JSON.stringify(fonts));
  }

  function getPresetFonts() {
    return remoteFonts || getCachedFonts() || FALLBACK_FONTS;
  }

  function getSavedFont() {
    try {
      return JSON.parse(localStorage.getItem(FONT_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveFont(fontData) {
    localStorage.setItem(FONT_KEY, JSON.stringify(fontData));
  }

  function loadGoogleFont(googleName) {
    let link = document.getElementById(FONT_LINK_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${googleName}&display=swap`;
  }

  function applyFont(fontData) {
    let styleEl = document.getElementById(FONT_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = FONT_STYLE_ID;
      document.head.appendChild(styleEl);
    }

    if (!fontData || !fontData.family) {
      styleEl.textContent = '';
      const link = document.getElementById(FONT_LINK_ID);
      if (link) link.remove();
      return;
    }

    if (fontData.googleName) {
      loadGoogleFont(fontData.googleName);
    }

    styleEl.textContent = `* { font-family: ${fontData.family} !important; }`;
  }

  function setPresetFont(presetId) {
    const preset = getPresetFonts().find(f => f.id === presetId);
    if (!preset) return;
    const fontData = preset.family ? { family: preset.family, googleName: preset.googleName, label: preset.label } : null;
    saveFont(fontData);
    applyFont(fontData);
  }

  function setCustomFont(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Google Fonts URLs want spaces as +
    const googleName = trimmed.replace(/\s+/g, '+');
    const fontData = { family: `'${trimmed}', sans-serif`, googleName, label: trimmed };
    saveFont(fontData);
    applyFont(fontData);
  }

  function initFont() {
    const saved = getSavedFont();
    if (saved) applyFont(saved);
  }


  function createSettingsUI() {
    const settingsBtn = document.querySelector('button[title="Settings"]');
    if (!settingsBtn) {
      setTimeout(createSettingsUI, 1000);
      return;
    }

    if (document.getElementById('fencord-btn')) return;

    const btn = settingsBtn.cloneNode(true);
    btn.id = 'fencord-btn';
    btn.title = `Fencord Settings — ${CREDITS_TEXT}`;
    const svg = btn.querySelector('svg');
    if (svg) svg.outerHTML = '🛠️';

    settingsBtn.parentElement.insertBefore(btn, settingsBtn);

    // --- full-screen overlay ---
    const overlay = document.createElement('div');
    overlay.id = 'fencord-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'var(--background)',
      color: 'var(--text-primary)',
      fontFamily: 'inherit',
      zIndex: 999999,
      display: 'none'
    });

    const layout = document.createElement('div');
    Object.assign(layout.style, {
      display: 'flex',
      width: '100%',
      height: '100%',
      maxWidth: '1100px',
      margin: '0 auto'
    });

    const sidebar = document.createElement('div');
    Object.assign(sidebar.style, {
      width: '240px',
      flexShrink: '0',
      background: 'var(--channel-sidebar)',
      padding: '32px 12px',
      boxSizing: 'border-box'
    });

    const content = document.createElement('div');
    Object.assign(content.style, {
      flex: '1',
      padding: '48px 56px',
      overflowY: 'auto',
      boxSizing: 'border-box'
    });

    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      position: 'fixed',
      top: '28px',
      right: '36px',
      fontSize: '22px',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      zIndex: 1000000
    });
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = 'var(--text-primary)');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'var(--text-muted)');
    closeBtn.addEventListener('click', () => overlay.style.display = 'none');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });

    layout.appendChild(sidebar);
    layout.appendChild(content);
    overlay.appendChild(layout);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    let activeTab = 'themes';

    function renderThemesTab(body) {
      if (updateCheckResult && updateCheckResult.available) {
        const banner = buildUpdateBanner({ dismissible: true, compact: true });
        Object.assign(banner.style, { marginBottom: '20px' });
        body.appendChild(banner);
      }

      const themes = getAllThemes();
      const entries = Object.entries(themes).sort(([keyA, themeA], [keyB, themeB]) => {
        const customA = keyA.startsWith('custom_');
        const customB = keyB.startsWith('custom_');
        if (keyA === 'none') return -1;
        if (keyB === 'none') return 1;
        if (customA !== customB) return customA ? 1 : -1;
        return themeA.name.localeCompare(themeB.name);
      });

      for (const [key, theme] of entries) {
        const selected = getSavedTheme() === key;
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '4px',
          maxWidth: '420px',
          width: '100%'
        });

        const option = document.createElement('div');
        option.textContent = theme.name;
        Object.assign(option.style, {
          flex: '1',
          minWidth: '0',
          padding: '10px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          background: selected ? 'var(--hover-overlay)' : 'transparent',
          color: 'var(--text-primary)'
        });
        option.addEventListener('mouseenter', () => { option.style.background = 'var(--hover-overlay)'; });
        option.addEventListener('mouseleave', () => {
          option.style.background = getSavedTheme() === key ? 'var(--hover-overlay)' : 'transparent';
        });
        option.addEventListener('click', () => {
          applyTheme(key);
          saveTheme(key);
          renderPanel();
        });
        row.appendChild(option);

        const trailing = document.createElement('div');
        Object.assign(trailing.style, {
          width: '40px',
          flexShrink: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        });

        if (key.startsWith('custom_')) {
          const delBtn = document.createElement('div');
          delBtn.textContent = '✕';
          Object.assign(delBtn.style, {
            width: '100%',
            textAlign: 'center',
            padding: '10px 0',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: '700'
          });
          delBtn.title = 'Delete theme';
          delBtn.addEventListener('mouseenter', () => {
            delBtn.style.background = 'var(--danger-secondary-button)';
            delBtn.style.color = 'var(--text-primary)';
          });
          delBtn.addEventListener('mouseleave', () => {
            delBtn.style.background = '';
            delBtn.style.color = 'var(--text-muted)';
          });
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!confirm(`Delete theme "${theme.name}"?`)) return;

            const custom = getCustomThemes();
            delete custom[key];
            saveCustomThemes(custom);

            if (getSavedTheme() === key) {
              applyTheme('none');
              saveTheme('none');
            }

            renderPanel();
          });
          trailing.appendChild(delBtn);
        }

        row.appendChild(trailing);
        body.appendChild(row);
      }

      const divider = document.createElement('div');
      Object.assign(divider.style, { borderTop: '1px solid var(--borders-and-separators)', margin: '20px 0', maxWidth: '420px' });
      body.appendChild(divider);

      const actionsRow = document.createElement('div');
      Object.assign(actionsRow.style, {
        display: 'flex',
        gap: '8px',
        maxWidth: '420px',
        width: '100%'
      });

      function makeActionBtn(label, onClick) {
        const btn = document.createElement('div');
        btn.textContent = label;
        Object.assign(btn.style, {
          flex: '1',
          textAlign: 'center',
          padding: '10px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          background: 'var(--secondary-button)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          whiteSpace: 'nowrap'
        });
        btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--secondary-button-hover)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'var(--secondary-button)'; });
        btn.addEventListener('click', onClick);
        return btn;
      }

      actionsRow.appendChild(makeActionBtn('Import Theme', () => importThemeFlow(renderPanel)));
      actionsRow.appendChild(makeActionBtn('Copy Template', copyTemplate));
      actionsRow.appendChild(makeActionBtn('Quick 2-Color', () => openQuickThemeUI(renderPanel)));
      body.appendChild(actionsRow);
      body.appendChild(makeCreditNote());
    }

    function renderPluginsTab(body) {
      if (updateCheckResult && updateCheckResult.available) {
        const banner = buildUpdateBanner({ dismissible: true, compact: true });
        Object.assign(banner.style, { marginBottom: '16px' });
        body.appendChild(banner);
      }

      const notice = document.createElement('div');
      notice.textContent = '💡 If a toggle doesn\'t fully undo (e.g. RGB Usernames), refresh the page to clean it up.';
      Object.assign(notice.style, {
        fontSize: '12px',
        color: 'var(--text-muted)',
        background: 'var(--hover-overlay)',
        padding: '10px 14px',
        borderRadius: '6px',
        marginBottom: '16px',
        maxWidth: '420px'
      });
      body.appendChild(notice);

      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: '8px',
        background: 'var(--secondary-button)',
        maxWidth: '420px'
      });

      const label = document.createElement('div');
      label.innerHTML = `<div style="font-weight:600;">RGB Usernames</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Cycles usernames through rainbow colors</div>`;
      row.appendChild(label);

      const toggle = document.createElement('div');
      const enabled = isRgbEnabled();
      Object.assign(toggle.style, {
        width: '42px',
        height: '24px',
        borderRadius: '12px',
        background: enabled ? 'var(--primary-action)' : 'var(--borders-and-separators)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: '0',
        transition: 'background 0.15s'
      });

      const knob = document.createElement('div');
      Object.assign(knob.style, {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: '3px',
        left: enabled ? '21px' : '3px',
        transition: 'left 0.15s'
      });
      toggle.appendChild(knob);

      toggle.addEventListener('click', () => {
        const newState = !isRgbEnabled();
        setRgbEnabled(newState);
        toggle.style.background = newState ? 'var(--primary-action)' : 'var(--borders-and-separators)';
        knob.style.left = newState ? '21px' : '3px';
      });

      row.appendChild(toggle);
      body.appendChild(row);

      // --- Font plugin section ---
      const fontDivider = document.createElement('div');
      Object.assign(fontDivider.style, { borderTop: '1px solid var(--borders-and-separators)', margin: '20px 0', maxWidth: '420px' });
      body.appendChild(fontDivider);

      const fontSection = document.createElement('div');
      Object.assign(fontSection.style, {
        padding: '14px 16px',
        borderRadius: '8px',
        background: 'var(--secondary-button)',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      });

      const fontLabel = document.createElement('div');
      const savedFont = getSavedFont();
      fontLabel.innerHTML = `<div style="font-weight:600;">Font</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Change the app-wide font${savedFont ? ' — currently: ' + savedFont.label : ''}</div>`;
      fontSection.appendChild(fontLabel);

      const fontSelect = document.createElement('select');
      Object.assign(fontSelect.style, {
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid var(--borders-and-separators)',
        background: 'var(--popups-and-modals)',
        color: 'var(--text-primary)',
        cursor: 'pointer'
      });
      getPresetFonts().forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.label;
        fontSelect.appendChild(opt);
      });
      // Reflect current selection if it matches a preset
      if (savedFont) {
        const match = getPresetFonts().find(f => f.label === savedFont.label);
        if (match) fontSelect.value = match.id;
      } else {
        fontSelect.value = 'default';
      }
      fontSelect.addEventListener('change', () => {
        setPresetFont(fontSelect.value);
        renderPanel();
      });
      fontSection.appendChild(fontSelect);

      const customRow = document.createElement('div');
      Object.assign(customRow.style, { display: 'flex', gap: '8px' });

      const customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.placeholder = 'Custom Google Font name…';
      Object.assign(customInput.style, {
        flex: '1',
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid var(--borders-and-separators)',
        background: 'var(--popups-and-modals)',
        color: 'var(--text-primary)'
      });
      customRow.appendChild(customInput);

      const customBtn = document.createElement('div');
      customBtn.textContent = 'Apply';
      Object.assign(customBtn.style, {
        padding: '8px 14px',
        borderRadius: '6px',
        cursor: 'pointer',
        background: 'var(--primary-action)',
        color: 'var(--primary-foreground)',
        fontWeight: 'bold',
        whiteSpace: 'nowrap'
      });
      customBtn.addEventListener('mouseenter', () => customBtn.style.background = 'var(--primary-hover)');
      customBtn.addEventListener('mouseleave', () => customBtn.style.background = 'var(--primary-action)');
      customBtn.addEventListener('click', () => {
        if (!customInput.value.trim()) return;
        setCustomFont(customInput.value);
        renderPanel();
      });
      customRow.appendChild(customBtn);

      fontSection.appendChild(customRow);

      const fontHint = document.createElement('div');
      fontHint.textContent = 'Must be an exact Google Fonts name, e.g. "Roboto Slab" or "Bebas Neue".';
      Object.assign(fontHint.style, { fontSize: '11px', color: 'var(--text-muted)' });
      fontSection.appendChild(fontHint);

      body.appendChild(fontSection);

      // --- Display Name Override section ---
      const nameDivider = document.createElement('div');
      Object.assign(nameDivider.style, { borderTop: '1px solid var(--borders-and-separators)', margin: '20px 0', maxWidth: '420px' });
      body.appendChild(nameDivider);

      const nameSection = document.createElement('div');
      Object.assign(nameSection.style, {
        padding: '14px 16px', borderRadius: '8px', background: 'var(--secondary-button)',
        maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px'
      });

      const currentOverride = getDisplayNameOverride();
      const nameLabel = document.createElement('div');
      nameLabel.innerHTML = `<div style="font-weight:600;">Display Name (local only)</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Only changes what YOU see. Others still see your real name.</div>`;
      nameSection.appendChild(nameLabel);

      const nameRow = document.createElement('div');
      Object.assign(nameRow.style, { display: 'flex', gap: '8px' });

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Your real username (as shown in chat)';
      nameInput.value = getMyRealUsername() || '';
      Object.assign(nameInput.style, {
        flex: '1', padding: '8px', borderRadius: '6px',
        border: '1px solid var(--borders-and-separators)',
        background: 'var(--popups-and-modals)', color: 'var(--text-primary)'
      });
      nameRow.appendChild(nameInput);
      nameSection.appendChild(nameRow);

      const overrideRow = document.createElement('div');
      Object.assign(overrideRow.style, { display: 'flex', gap: '8px' });

      const overrideInput = document.createElement('input');
      overrideInput.type = 'text';
      overrideInput.placeholder = 'Show as…';
      overrideInput.value = currentOverride;
      Object.assign(overrideInput.style, {
        flex: '1', padding: '8px', borderRadius: '6px',
        border: '1px solid var(--borders-and-separators)',
        background: 'var(--popups-and-modals)', color: 'var(--text-primary)'
      });
      overrideRow.appendChild(overrideInput);

      const nameApplyBtn = document.createElement('div');
      nameApplyBtn.textContent = 'Apply';
      Object.assign(nameApplyBtn.style, {
        padding: '8px 14px', borderRadius: '6px', cursor: 'pointer',
        background: 'var(--primary-action)', color: 'var(--primary-foreground)',
        fontWeight: 'bold', whiteSpace: 'nowrap'
      });
      nameApplyBtn.addEventListener('mouseenter', () => nameApplyBtn.style.background = 'var(--primary-hover)');
      nameApplyBtn.addEventListener('mouseleave', () => nameApplyBtn.style.background = 'var(--primary-action)');
      nameApplyBtn.addEventListener('click', () => {
        const real = nameInput.value.trim();
        const override = overrideInput.value.trim();
        if (real) localStorage.setItem(ORIGINAL_NAME_KEY, real);
        saveDisplayNameOverride(override);
        setDisplayNameEnabled(!!override);
        renderPanel();
      });
      overrideRow.appendChild(nameApplyBtn);
      nameSection.appendChild(overrideRow);

      if (currentOverride) {
        const clearBtn = document.createElement('div');
        clearBtn.textContent = '✕ Clear override';
        Object.assign(clearBtn.style, { fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' });
        clearBtn.addEventListener('click', () => {
          saveDisplayNameOverride('');
          setDisplayNameEnabled(false);
          renderPanel();
        });
        nameSection.appendChild(clearBtn);
      }

      body.appendChild(nameSection);

      // --- Timestamp Format section ---
      const tsDivider = document.createElement('div');
      Object.assign(tsDivider.style, { borderTop: '1px solid var(--borders-and-separators)', margin: '20px 0', maxWidth: '420px' });
      body.appendChild(tsDivider);

      const tsSection = document.createElement('div');
      Object.assign(tsSection.style, {
        padding: '14px 16px', borderRadius: '8px', background: 'var(--secondary-button)',
        maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px'
      });

      const tsLabel = document.createElement('div');
      tsLabel.innerHTML = `<div style="font-weight:600;">Timestamp Format</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Change how message times are displayed</div>`;
      tsSection.appendChild(tsLabel);

      const tsSelect = document.createElement('select');
      Object.assign(tsSelect.style, {
        padding: '8px', borderRadius: '6px',
        border: '1px solid var(--borders-and-separators)',
        background: 'var(--popups-and-modals)', color: 'var(--text-primary)', cursor: 'pointer'
      });
      [
        { id: 'default', label: 'Default (app default)' },
        { id: '12h', label: '12-hour (e.g. 3:45 PM)' },
        { id: '24h', label: '24-hour (e.g. 15:45)' },
        { id: 'relative', label: 'Relative (e.g. "5m ago")' }
      ].forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.label;
        tsSelect.appendChild(opt);
      });
      tsSelect.value = getTimestampFormat();
      tsSelect.addEventListener('change', () => {
        setTimestampFormat(tsSelect.value);
      });
      tsSection.appendChild(tsSelect);
      body.appendChild(tsSection);

      // --- Image Blur / Spoiler section ---
      const blurDivider = document.createElement('div');
      Object.assign(blurDivider.style, { borderTop: '1px solid var(--borders-and-separators)', margin: '20px 0', maxWidth: '420px' });
      body.appendChild(blurDivider);

      const blurRow = document.createElement('div');
      Object.assign(blurRow.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: '8px', background: 'var(--secondary-button)', maxWidth: '420px'
      });

      const blurLabel = document.createElement('div');
      blurLabel.innerHTML = `<div style="font-weight:600;">Blur Images</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Hides images until clicked (spoiler-style)</div>`;
      blurRow.appendChild(blurLabel);

      const blurToggle = document.createElement('div');
      const blurEnabled = isImageBlurEnabled();
      Object.assign(blurToggle.style, {
        width: '42px', height: '24px', borderRadius: '12px',
        background: blurEnabled ? 'var(--primary-action)' : 'var(--borders-and-separators)',
        position: 'relative', cursor: 'pointer', flexShrink: '0', transition: 'background 0.15s'
      });

      const blurKnob = document.createElement('div');
      Object.assign(blurKnob.style, {
        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
        position: 'absolute', top: '3px', left: blurEnabled ? '21px' : '3px', transition: 'left 0.15s'
      });
      blurToggle.appendChild(blurKnob);

      blurToggle.addEventListener('click', () => {
        const newState = !isImageBlurEnabled();
        setImageBlurEnabled(newState);
        blurToggle.style.background = newState ? 'var(--primary-action)' : 'var(--borders-and-separators)';
        blurKnob.style.left = newState ? '21px' : '3px';
      });

      blurRow.appendChild(blurToggle);
      body.appendChild(blurRow);

      // --- Background Effect (Matrix / Rain / Fire) ---
      const fxDivider = document.createElement('div');
      Object.assign(fxDivider.style, { borderTop: '1px solid var(--borders-and-separators)', margin: '20px 0', maxWidth: '420px' });
      body.appendChild(fxDivider);

      const fxSection = document.createElement('div');
      Object.assign(fxSection.style, {
        padding: '14px 16px', borderRadius: '8px', background: 'var(--secondary-button)',
        maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px'
      });

      const fxLabel = document.createElement('div');
      fxLabel.innerHTML = `<div style="font-weight:600;">Background Effect</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Animated backdrop behind the app (one at a time)</div>`;
      fxSection.appendChild(fxLabel);

      const fxSelect = document.createElement('select');
      Object.assign(fxSelect.style, {
        padding: '8px', borderRadius: '6px',
        border: '1px solid var(--borders-and-separators)',
        background: 'var(--popups-and-modals)', color: 'var(--text-primary)', cursor: 'pointer'
      });
      [
        { id: 'none', label: 'None' },
        { id: 'matrix', label: 'Matrix — digital rain (--matrix-rain)' },
        { id: 'rain', label: 'Rain — falling streaks (theme accent)' },
        { id: 'fire', label: 'Fire — rising embers (warm / accent)' }
      ].forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.label;
        fxSelect.appendChild(opt);
      });
      fxSelect.value = getBackgroundEffect();
      fxSelect.addEventListener('change', () => {
        setBackgroundEffect(fxSelect.value);
      });
      fxSection.appendChild(fxSelect);
      body.appendChild(fxSection);

      // --- Call Timer section ---
      const callDivider = document.createElement('div');
      Object.assign(callDivider.style, { borderTop: '1px solid var(--borders-and-separators)', margin: '20px 0', maxWidth: '420px' });
      body.appendChild(callDivider);

      const callRow = document.createElement('div');
      Object.assign(callRow.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: '8px', background: 'var(--secondary-button)', maxWidth: '420px'
      });

      const callLabel = document.createElement('div');
      callLabel.innerHTML = `<div style="font-weight:600;">Call Timer <span style="color:var(--warning-yellow);font-size:11px;font-weight:700;">⚠ not working — fix later</span></div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Shows how long you've been in the current call</div>`;
      callRow.appendChild(callLabel);

      const callToggle = document.createElement('div');
      const callEnabled = isCallTimerEnabled();
      Object.assign(callToggle.style, {
        width: '42px', height: '24px', borderRadius: '12px',
        background: callEnabled ? 'var(--primary-action)' : 'var(--borders-and-separators)',
        position: 'relative', cursor: 'pointer', flexShrink: '0', transition: 'background 0.15s',
        opacity: '0.45'
      });

      const callKnob = document.createElement('div');
      Object.assign(callKnob.style, {
        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
        position: 'absolute', top: '3px', left: callEnabled ? '21px' : '3px', transition: 'left 0.15s'
      });
      callToggle.appendChild(callKnob);

      callToggle.title = 'Not working — fix later';
      callToggle.addEventListener('click', () => {
        const newState = !isCallTimerEnabled();
        setCallTimerEnabled(newState);
        callToggle.style.background = newState ? 'var(--primary-action)' : 'var(--borders-and-separators)';
        callKnob.style.left = newState ? '21px' : '3px';
      });

      callRow.appendChild(callToggle);
      body.appendChild(callRow);
      body.appendChild(makeCreditNote());
    }

    function renderPanel() {
      sidebar.innerHTML = '';
      content.innerHTML = '';

      const logo = document.createElement('div');
      logo.textContent = 'FENCORD';
      Object.assign(logo.style, {
        fontWeight: '800',
        fontSize: '22px',
        letterSpacing: '1px',
        padding: '0 14px 8px 14px',
        color: 'var(--primary-action)',
        textShadow: '0 0 12px var(--hover-overlay)'
      });
      sidebar.appendChild(logo);

      const sidebarCredits = makeCreditNote({ compact: true, maxWidth: '180px' });
      Object.assign(sidebarCredits.style, {
        padding: '0 14px 20px 14px',
        marginTop: '0',
        fontSize: '11px',
        lineHeight: '1.3'
      });
      sidebar.appendChild(sidebarCredits);

      const tabs = [
        { id: 'themes', label: '🎨 Themes' },
        { id: 'plugins', label: '🧩 Plugins' }
      ];

      tabs.forEach(tab => {
        const tabBtn = document.createElement('div');
        tabBtn.textContent = tab.label;
        Object.assign(tabBtn.style, {
          padding: '10px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '4px',
          fontSize: '14px',
          background: activeTab === tab.id ? 'var(--hover-overlay)' : 'transparent',
          color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)'
        });
        tabBtn.addEventListener('mouseenter', () => {
          if (activeTab !== tab.id) tabBtn.style.background = 'var(--hover-overlay)';
        });
        tabBtn.addEventListener('mouseleave', () => {
          if (activeTab !== tab.id) tabBtn.style.background = 'transparent';
        });
        tabBtn.addEventListener('click', () => {
          activeTab = tab.id;
          renderPanel();
        });
        sidebar.appendChild(tabBtn);
      });

      const heading = document.createElement('div');
      heading.textContent = activeTab === 'themes' ? 'Themes' : 'Plugins';
      Object.assign(heading.style, {
        fontSize: '26px',
        fontWeight: 'bold',
        marginBottom: '28px'
      });
      content.appendChild(heading);

      const body = document.createElement('div');
      content.appendChild(body);

      if (activeTab === 'themes') {
        renderThemesTab(body);
      } else if (activeTab === 'plugins') {
        renderPluginsTab(body);
      }
    }

    renderPanel();
    refreshSettingsPanel = renderPanel;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = overlay.style.display !== 'none';
      overlay.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) renderPanel();
    });
  }

  // ---------------------------------------------------------------
  // DISPLAY NAME OVERRIDE (local only)
  // Replaces your own username text in the DOM with a custom name.
  // Purely cosmetic and client-side; does not touch what's sent or
  // what other users see.
  // ---------------------------------------------------------------

  const DISPLAY_NAME_KEY = 'fencord-display-name-override';
  const ORIGINAL_NAME_KEY = 'fencord-original-name-cache';
  let displayNameObserver = null;

  function getDisplayNameOverride() {
    return localStorage.getItem(DISPLAY_NAME_KEY) || '';
  }

  function saveDisplayNameOverride(name) {
    if (name) {
      localStorage.setItem(DISPLAY_NAME_KEY, name);
    } else {
      localStorage.removeItem(DISPLAY_NAME_KEY);
    }
  }

  function getMyRealUsername() {
    // Best-effort: look at any cached original name, else null (unknown yet).
    return localStorage.getItem(ORIGINAL_NAME_KEY) || null;
  }

  function tickDisplayNameOverride() {
    const override = getDisplayNameOverride();
    if (!override) return;

    const myOriginal = getMyRealUsername();
    if (!myOriginal) return; // haven't learned the real name yet, skip safely

    document.querySelectorAll('span.font-semibold.cursor-pointer').forEach(el => {
      if (el.dataset.fencordNameOverridden === '1') return;
      if (el.textContent.trim() === myOriginal) {
        el.dataset.fencordOriginalName = myOriginal;
        el.dataset.fencordNameOverridden = '1';
        el.textContent = override;
      }
    });
  }

  function revertDisplayNameOverride() {
    document.querySelectorAll('[data-fencord-name-overridden="1"]').forEach(el => {
      el.textContent = el.dataset.fencordOriginalName || el.textContent;
      delete el.dataset.fencordNameOverridden;
      delete el.dataset.fencordOriginalName;
    });
  }

  function setDisplayNameEnabled(enabled) {
    if (enabled) {
      tickDisplayNameOverride();
      if (!displayNameObserver) {
        displayNameObserver = new MutationObserver(() => tickDisplayNameOverride());
        displayNameObserver.observe(document.body, { childList: true, subtree: true });
      }
    } else {
      revertDisplayNameOverride();
      if (displayNameObserver) {
        displayNameObserver.disconnect();
        displayNameObserver = null;
      }
    }
  }

  // Try to learn the user's real username automatically. Best-effort:
  // looks for the account panel near the settings/mute buttons (the
  // bottom-left user bar), which reliably shows your own display name.
  function tryDetectRealUsername(attemptsLeft = 10) {
    if (getMyRealUsername()) return;

    const settingsBtn = document.querySelector('button[title="Settings"]');
    if (!settingsBtn) {
      // Settings button may not be mounted yet on first paint; retry briefly,
      // mirroring createSettingsUI's own retry loop.
      if (attemptsLeft > 0) setTimeout(() => tryDetectRealUsername(attemptsLeft - 1), 1000);
      return;
    }

    // walk up to the user panel container and look for a name-like span
    let panel = settingsBtn.closest('div');
    for (let i = 0; i < 4 && panel; i++) {
      const nameSpan = panel.querySelector('span.font-semibold');
      if (nameSpan && nameSpan.textContent.trim()) {
        localStorage.setItem(ORIGINAL_NAME_KEY, nameSpan.textContent.trim());
        if (getDisplayNameOverride()) tickDisplayNameOverride();
        return;
      }
      panel = panel.parentElement;
    }

    // Found the button but no name span nearby this time — worth one more
    // try in case the panel renders its contents a moment later.
    if (attemptsLeft > 0) setTimeout(() => tryDetectRealUsername(attemptsLeft - 1), 1000);
  }

  // ---------------------------------------------------------------
  // TIMESTAMP FORMAT PLUGIN
  // Reformats message timestamps to 12h, 24h, or relative ("5m ago").
  // ---------------------------------------------------------------

  const TIMESTAMP_FORMAT_KEY = 'fencord-timestamp-format';
  let timestampInterval = null;
  let timestampObserver = null;

  function getTimestampFormat() {
    return localStorage.getItem(TIMESTAMP_FORMAT_KEY) || 'default';
  }

  function saveTimestampFormat(fmt) {
    localStorage.setItem(TIMESTAMP_FORMAT_KEY, fmt);
  }

  function formatRelative(date) {
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  }

  function formatTimestamp(date, fmt) {
    if (fmt === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (fmt === '12h') {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (fmt === 'relative') {
      return formatRelative(date);
    }
    return null; // 'default' = leave untouched
  }

  function tickTimestamps() {
    const fmt = getTimestampFormat();
    if (fmt === 'default') return;

    document.querySelectorAll('time[datetime]').forEach(el => {
      const iso = el.getAttribute('datetime');
      if (!iso) return;
      const date = new Date(iso);
      if (isNaN(date.getTime())) return;

      if (!el.dataset.fencordOriginalText) {
        el.dataset.fencordOriginalText = el.textContent;
      }
      const formatted = formatTimestamp(date, fmt);
      if (formatted) el.textContent = formatted;
    });
  }

  function revertTimestamps() {
    document.querySelectorAll('[data-fencord-original-text]').forEach(el => {
      el.textContent = el.dataset.fencordOriginalText;
      delete el.dataset.fencordOriginalText;
    });
  }

  function setTimestampFormat(fmt) {
    saveTimestampFormat(fmt);
    revertTimestamps();

    if (fmt === 'default') {
      if (timestampInterval) { clearInterval(timestampInterval); timestampInterval = null; }
      if (timestampObserver) { timestampObserver.disconnect(); timestampObserver = null; }
      return;
    }

    tickTimestamps();
    if (!timestampInterval) {
      // re-tick periodically so "relative" times keep counting up
      timestampInterval = setInterval(tickTimestamps, 30000);
    }
    if (!timestampObserver) {
      timestampObserver = new MutationObserver(() => tickTimestamps());
      timestampObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  function initTimestampFormat() {
    const fmt = getTimestampFormat();
    if (fmt !== 'default') setTimestampFormat(fmt);
  }

  // ---------------------------------------------------------------
  // IMAGE SPOILER / BLUR PLUGIN
  // Blurs image attachments until clicked. Purely visual (CSS filter
  // + click-to-reveal), doesn't stop images from loading.
  // ---------------------------------------------------------------

  const IMAGE_BLUR_KEY = 'fencord-blur-images';
  let imageBlurObserver = null;

  function isImageBlurEnabled() {
    return localStorage.getItem(IMAGE_BLUR_KEY) === 'true';
  }

  function shouldSkipBlur(img) {
    // Use rendered size first (available immediately, even pre-load) as a
    // fast skip for obviously-small elements like avatars/emoji.
    const renderedWidth = img.width || img.clientWidth || 0;
    const renderedHeight = img.height || img.clientHeight || 0;
    if (renderedWidth && renderedWidth < 64) return true;
    if (renderedHeight && renderedHeight < 64) return true;

    // If the image has already finished loading, we can trust naturalWidth.
    if (img.complete && img.naturalWidth) {
      return img.naturalWidth < 64;
    }

    // Not loaded yet and no rendered size to go on — don't decide yet.
    return null;
  }

  function blurSingleImage(img) {
    img.dataset.fencordBlurred = '1';
    img.style.filter = 'blur(24px)';
    img.style.cursor = 'pointer';
    img.style.transition = 'filter 0.2s';
    img.title = 'Click to reveal';

    img.addEventListener('click', function revealHandler(e) {
      if (img.style.filter === 'none') return;
      e.preventDefault();
      e.stopPropagation();
      img.style.filter = 'none';
    }, { capture: true });
  }

  function tickImageBlur() {
    document.querySelectorAll('img').forEach(img => {
      if (img.dataset.fencordBlurred === '1') return;
      if (img.dataset.fencordBlurSkipped === '1') return;

      const skip = shouldSkipBlur(img);

      if (skip === true) {
        img.dataset.fencordBlurSkipped = '1';
        return;
      }

      if (skip === false) {
        blurSingleImage(img);
        return;
      }

      // skip === null: size unknown yet, wait for the image to actually load
      // then decide for real, instead of guessing based on naturalWidth === 0.
      if (!img.dataset.fencordBlurPending) {
        img.dataset.fencordBlurPending = '1';
        img.addEventListener('load', () => {
          delete img.dataset.fencordBlurPending;
          if (img.naturalWidth && img.naturalWidth < 64) {
            img.dataset.fencordBlurSkipped = '1';
          } else if (!img.dataset.fencordBlurred) {
            blurSingleImage(img);
          }
        }, { once: true });
      }
    });
  }

  function revertImageBlur() {
    document.querySelectorAll('[data-fencord-blurred="1"]').forEach(img => {
      img.style.filter = '';
      img.style.cursor = '';
      img.title = '';
      delete img.dataset.fencordBlurred;
    });
    document.querySelectorAll('[data-fencord-blur-skipped]').forEach(img => {
      delete img.dataset.fencordBlurSkipped;
    });
    document.querySelectorAll('[data-fencord-blur-pending]').forEach(img => {
      delete img.dataset.fencordBlurPending;
    });
  }

  function setImageBlurEnabled(enabled) {
    localStorage.setItem(IMAGE_BLUR_KEY, enabled ? 'true' : 'false');
    if (enabled) {
      tickImageBlur();
      if (!imageBlurObserver) {
        imageBlurObserver = new MutationObserver(() => tickImageBlur());
        imageBlurObserver.observe(document.body, { childList: true, subtree: true });
      }
    } else {
      revertImageBlur();
      if (imageBlurObserver) {
        imageBlurObserver.disconnect();
        imageBlurObserver = null;
      }
    }
  }

  // ---------------------------------------------------------------
  // BACKGROUND EFFECTS (Matrix / Rain / Fire)
  // One shared dropdown selects a single animated backdrop.
  // ---------------------------------------------------------------

  const BG_EFFECT_KEY = 'fencord-bg-effect';
  const MATRIX_BG_KEY = 'fencord-matrix-bg'; // legacy
  const RAIN_BG_KEY = 'fencord-rain-bg'; // legacy
  const FIRE_BG_KEY = 'fencord-fire-bg'; // legacy

  function getBackgroundEffect() {
    const saved = localStorage.getItem(BG_EFFECT_KEY);
    if (saved === 'none' || saved === 'matrix' || saved === 'rain' || saved === 'fire') return saved;
    // Migrate old per-effect toggles.
    if (localStorage.getItem(MATRIX_BG_KEY) === 'true') return 'matrix';
    if (localStorage.getItem(RAIN_BG_KEY) === 'true') return 'rain';
    if (localStorage.getItem(FIRE_BG_KEY) === 'true') return 'fire';
    return 'none';
  }

  function setBackgroundEffect(effect) {
    const next = (effect === 'matrix' || effect === 'rain' || effect === 'fire') ? effect : 'none';
    localStorage.setItem(BG_EFFECT_KEY, next);
    localStorage.removeItem(MATRIX_BG_KEY);
    localStorage.removeItem(RAIN_BG_KEY);
    localStorage.removeItem(FIRE_BG_KEY);

    stopMatrixBg();
    stopRainBg();
    stopFireBg();

    if (next === 'matrix') startMatrixBg();
    else if (next === 'rain') startRainBg();
    else if (next === 'fire') startFireBg();
    else applyTheme(getSavedTheme());
  }

  const MATRIX_CANVAS_ID = 'fencord-matrix-canvas';
  const MATRIX_STYLE_ID = 'fencord-matrix-style';
  const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let matrixRaf = null;
  let matrixResizeHandler = null;
  let matrixDrops = null;

  function stopMatrixBg() {
    if (matrixRaf != null) {
      cancelAnimationFrame(matrixRaf);
      matrixRaf = null;
    }
    if (matrixResizeHandler) {
      window.removeEventListener('resize', matrixResizeHandler);
      matrixResizeHandler = null;
    }
    matrixDrops = null;
    const canvas = document.getElementById(MATRIX_CANVAS_ID);
    if (canvas) canvas.remove();
    const style = document.getElementById(MATRIX_STYLE_ID);
    if (style) style.remove();
  }

  function startMatrixBg() {
    stopMatrixBg();

    const style = document.createElement('style');
    style.id = MATRIX_STYLE_ID;
    document.head.appendChild(style);
    updateMatrixBackdropStyle();

    const canvas = document.createElement('canvas');
    canvas.id = MATRIX_CANVAS_ID;
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      pointerEvents: 'none'
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    const fontSize = 14;
    let columns = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.max(1, Math.floor(canvas.width / fontSize));
      matrixDrops = new Array(columns).fill(0).map(() => Math.random() * -50);
    }

    matrixResizeHandler = resize;
    window.addEventListener('resize', resize);
    resize();

    function draw() {
      if (!document.getElementById(MATRIX_CANVAS_ID)) return;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = getMatrixRainColor();
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < matrixDrops.length; i++) {
        const x = i * fontSize;
        const y = matrixDrops[i] * fontSize;
        ctx.fillText(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)], x, y);
        if (y > canvas.height && Math.random() > 0.975) matrixDrops[i] = 0;
        matrixDrops[i]++;
      }

      matrixRaf = requestAnimationFrame(draw);
    }

    matrixRaf = requestAnimationFrame(draw);
  }

  // ---------------------------------------------------------------
  // RAIN BACKGROUND
  // Weather-style falling rain streaks (theme accent for drop color).
  // ---------------------------------------------------------------

  const RAIN_CANVAS_ID = 'fencord-rain-canvas';
  const RAIN_STYLE_ID = 'fencord-rain-style';

  let rainRaf = null;
  let rainResizeHandler = null;
  let rainDrops = null;

  function getRainColor() {
    const vars = getActiveThemeVars();
    return (
      vars['--accent-vibrant'] ||
      vars['--primary-action'] ||
      vars['--matrix-rain'] ||
      '#7ec8ff'
    );
  }

  function stopRainBg() {
    if (rainRaf != null) {
      cancelAnimationFrame(rainRaf);
      rainRaf = null;
    }
    if (rainResizeHandler) {
      window.removeEventListener('resize', rainResizeHandler);
      rainResizeHandler = null;
    }
    rainDrops = null;
    const canvas = document.getElementById(RAIN_CANVAS_ID);
    if (canvas) canvas.remove();
    const style = document.getElementById(RAIN_STYLE_ID);
    if (style) style.remove();
  }

  function startRainBg() {
    stopRainBg();

    const style = document.createElement('style');
    style.id = RAIN_STYLE_ID;
    document.head.appendChild(style);
    updateRainBackdropStyle();

    const canvas = document.createElement('canvas');
    canvas.id = RAIN_CANVAS_ID;
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      pointerEvents: 'none'
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');

    function spawnDrop(canvasH) {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvasH - canvasH,
        len: 12 + Math.random() * 18,
        speed: 6 + Math.random() * 10,
        thickness: 1 + Math.random() * 1.5,
        alpha: 0.35 + Math.random() * 0.5
      };
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.max(60, Math.floor(canvas.width / 6));
      rainDrops = Array.from({ length: count }, () => spawnDrop(canvas.height));
    }

    rainResizeHandler = resize;
    window.addEventListener('resize', resize);
    resize();

    function draw() {
      if (!document.getElementById(RAIN_CANVAS_ID)) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const color = getRainColor();
      for (let i = 0; i < rainDrops.length; i++) {
        const d = rainDrops[i];
        ctx.strokeStyle = color;
        ctx.globalAlpha = d.alpha;
        ctx.lineWidth = d.thickness;
        ctx.beginPath();
        // Slight diagonal like wind-blown rain
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.15, d.y + d.len);
        ctx.stroke();

        d.y += d.speed;
        d.x -= d.speed * 0.15;
        if (d.y > canvas.height + 20) {
          rainDrops[i] = spawnDrop(0);
          rainDrops[i].y = -20;
        }
      }
      ctx.globalAlpha = 1;

      rainRaf = requestAnimationFrame(draw);
    }

    rainRaf = requestAnimationFrame(draw);
  }

  // ---------------------------------------------------------------
  // FIRE BACKGROUND
  // Rising ember/flame particles (warm theme accents when available).
  // ---------------------------------------------------------------

  const FIRE_CANVAS_ID = 'fencord-fire-canvas';
  const FIRE_STYLE_ID = 'fencord-fire-style';

  let fireRaf = null;
  let fireResizeHandler = null;
  let fireParticles = null;

  function getFireColors() {
    const vars = getActiveThemeVars();
    const accent =
      vars['--accent-vibrant'] ||
      vars['--primary-action'] ||
      vars['--warning-yellow'] ||
      '#ff6a00';
    const tip = vars['--warning-yellow'] || vars['--error-red'] || '#ffe566';
    const core = vars['--error-red'] || accent || '#ff3b00';
    return { accent, tip, core };
  }

  function stopFireBg() {
    if (fireRaf != null) {
      cancelAnimationFrame(fireRaf);
      fireRaf = null;
    }
    if (fireResizeHandler) {
      window.removeEventListener('resize', fireResizeHandler);
      fireResizeHandler = null;
    }
    fireParticles = null;
    const canvas = document.getElementById(FIRE_CANVAS_ID);
    if (canvas) canvas.remove();
    const style = document.getElementById(FIRE_STYLE_ID);
    if (style) style.remove();
  }

  function startFireBg() {
    stopFireBg();

    const style = document.createElement('style');
    style.id = FIRE_STYLE_ID;
    document.head.appendChild(style);
    fillEffectBackdropStyle(style);

    const canvas = document.createElement('canvas');
    canvas.id = FIRE_CANVAS_ID;
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      pointerEvents: 'none'
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');

    function spawnParticle(fromBottom) {
      return {
        x: Math.random() * canvas.width,
        y: fromBottom ? canvas.height + Math.random() * 40 : Math.random() * canvas.height,
        r: 2 + Math.random() * 5,
        vy: -(1.5 + Math.random() * 3.5),
        vx: (Math.random() - 0.5) * 1.2,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.04 + Math.random() * 0.08
      };
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.max(80, Math.floor(canvas.width / 8));
      fireParticles = Array.from({ length: count }, () => spawnParticle(false));
    }

    fireResizeHandler = resize;
    window.addEventListener('resize', resize);
    resize();

    function draw() {
      if (!document.getElementById(FIRE_CANVAS_ID)) return;

      // Soft fade so trails look like heat haze
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const colors = getFireColors();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < fireParticles.length; i++) {
        const p = fireParticles[i];
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.6;
        p.y += p.vy;
        p.life -= p.decay;
        p.r *= 0.995;

        if (p.life <= 0 || p.y < -20) {
          fireParticles[i] = spawnParticle(true);
          continue;
        }

        const t = Math.max(0, Math.min(1, p.life));
        // Blend core → accent → tip as the ember rises / dies
        const color = t > 0.66 ? colors.core : t > 0.33 ? colors.accent : colors.tip;
        ctx.globalAlpha = Math.min(1, t * 0.9);
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(p.x, p.y, Math.max(0.5, p.r), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      fireRaf = requestAnimationFrame(draw);
    }

    fireRaf = requestAnimationFrame(draw);
  }

  // ---------------------------------------------------------------
  // CALL TIMER PLUGIN
  // Fenrid shows a "Voice Connected" footer (with a Disconnect button)
  // while in a voice channel. We poll for that chrome and inject a
  // live elapsed timer next to the label — no MutationObserver.
  // ---------------------------------------------------------------

  const CALL_TIMER_KEY = 'fencord-call-timer';
  const CALL_TIMER_EL_ID = 'fencord-call-timer';
  // Require a few consecutive misses before treating as left, so brief
  // React re-renders don't restart the clock.
  const CALL_LEAVE_CONFIRM_POLLS = 3;

  let callTimerPoll = null;
  let callJoinedAt = null;
  let callMissCount = 0;

  function isCallTimerEnabled() {
    return localStorage.getItem(CALL_TIMER_KEY) === 'true';
  }

  function findVoiceConnectedLabel() {
    // Exact Fenrid class set from their VoiceConnectedFooter.
    for (const el of document.querySelectorAll('span.text-xs.font-semibold.text-blue-500')) {
      if (el.textContent.trim() === 'Voice Connected') return el;
    }
    return null;
  }

  function isInCall() {
    if (findVoiceConnectedLabel()) return true;
    return !!document.querySelector('button[title="Disconnect"]');
  }

  function formatCallElapsed(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    if (hours > 0) return `${hours}:${mm}:${ss}`;
    return `${minutes}:${ss}`;
  }

  function ensureCallTimerEl() {
    let el = document.getElementById(CALL_TIMER_EL_ID);
    const label = findVoiceConnectedLabel();

    if (label && label.parentElement) {
      // Prefer sitting inline next to "Voice Connected".
      if (el && el.parentElement !== label.parentElement) {
        el.remove();
        el = null;
      }
      if (!el) {
        el = document.createElement('span');
        el.id = CALL_TIMER_EL_ID;
        Object.assign(el.style, {
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.2px',
          userSelect: 'none'
        });
        label.parentElement.insertBefore(el, label.nextSibling);
      }
      return el;
    }

    // Fallback floating pill if the label isn't found but Disconnect is.
    if (el && el.tagName === 'SPAN' && el.parentElement !== document.body) {
      el.remove();
      el = null;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = CALL_TIMER_EL_ID;
      Object.assign(el.style, {
        position: 'fixed',
        bottom: '72px',
        left: '88px',
        zIndex: '999997',
        padding: '6px 12px',
        borderRadius: '8px',
        background: 'var(--popups-and-modals)',
        color: 'var(--text-primary)',
        border: '1px solid var(--primary-action)',
        fontSize: '13px',
        fontWeight: '600',
        fontFamily: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.3px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
        userSelect: 'none'
      });
      document.body.appendChild(el);
    }
    return el;
  }

  function removeCallTimerEl() {
    const el = document.getElementById(CALL_TIMER_EL_ID);
    if (el) el.remove();
  }

  function updateCallTimerDisplay() {
    if (callJoinedAt == null) return;
    const el = ensureCallTimerEl();
    if (!el) return;
    const time = formatCallElapsed(Date.now() - callJoinedAt);
    // Inline next to the label is just the time; floating gets a prefix.
    el.textContent = el.tagName === 'SPAN' ? time : `Call · ${time}`;
  }

  function startCallClock() {
    if (callJoinedAt != null) return;
    callJoinedAt = Date.now();
    callMissCount = 0;
    updateCallTimerDisplay();
  }

  function stopCallClock() {
    callJoinedAt = null;
    callMissCount = 0;
    removeCallTimerEl();
  }

  function tickCallTimer() {
    if (!isCallTimerEnabled()) return;

    if (isInCall()) {
      callMissCount = 0;
      if (callJoinedAt == null) startCallClock();
      else updateCallTimerDisplay();
      return;
    }

    if (callJoinedAt == null) return;

    callMissCount += 1;
    if (callMissCount >= CALL_LEAVE_CONFIRM_POLLS) {
      stopCallClock();
    } else {
      updateCallTimerDisplay();
    }
  }

  function setCallTimerEnabled(enabled) {
    localStorage.setItem(CALL_TIMER_KEY, enabled ? 'true' : 'false');
    if (enabled) {
      tickCallTimer();
      if (!callTimerPoll) {
        callTimerPoll = setInterval(tickCallTimer, 1000);
      }
    } else {
      stopCallClock();
      if (callTimerPoll) {
        clearInterval(callTimerPoll);
        callTimerPoll = null;
      }
    }
  }


  // ---------------------------------------------------------------
  // FENCORD WATERMARK
  // Small persistent theme-aware label in the corner of the app,
  // visible outside the settings panel.
  // ---------------------------------------------------------------

  // ---------------------------------------------------------------
  // UPDATE CHECK TOAST
  // Shows a dismissible banner once per page load pointing people to
  // the Fenrid link for updates. Never auto-navigates.
  // ---------------------------------------------------------------

  // ---------------------------------------------------------------
  // UPDATE CHECK SYSTEM
  // Fetches version.json from the GitHub repo and compares against
  // the local @version. Only shows the update prompt if the repo
  // actually has something newer — never a fake/always-on nag.
  // ---------------------------------------------------------------

  const CURRENT_VERSION = '1.24';
  // raw.githubusercontent.com refreshes ~every 5m; jsDelivr can lag much longer on @main.
  const REPO_RAW_BASE = 'https://raw.githubusercontent.com/fencord/fencord/main';
  const VERSION_CHECK_URL = `${REPO_RAW_BASE}/version.json`;
  const SCRIPT_UPDATE_URL = `${REPO_RAW_BASE}/fencord.user.js`;
  const THEMES_URL = `${REPO_RAW_BASE}/themes.json`;
  const FONTS_URL = `${REPO_RAW_BASE}/fonts.json`;
  const REPO_PAGE_URL = 'https://github.com/fencord/fencord';
  // Re-check while the tab stays open. ~5m matches GitHub raw CDN cache.
  const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

  let updateCheckResult = null; // { available: bool, latestVersion: string } | null while unknown
  let updateCheckInFlight = null;
  let updateToastDismissed = false;
  let themesLoadInFlight = null;
  let fontsLoadInFlight = null;

  function isValidThemesCatalog(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    if (!data.none || typeof data.none !== 'object') return false;
    for (const theme of Object.values(data)) {
      if (!theme || typeof theme !== 'object') return false;
      if (typeof theme.name !== 'string') return false;
      if (!theme.vars || typeof theme.vars !== 'object') return false;
    }
    return true;
  }

  function isValidFontsCatalog(data) {
    if (!Array.isArray(data) || !data.length) return false;
    return data.every((f) =>
      f && typeof f === 'object' &&
      typeof f.id === 'string' &&
      typeof f.label === 'string' &&
      ('family' in f) &&
      ('googleName' in f)
    );
  }

  async function loadThemes() {
    if (themesLoadInFlight) return themesLoadInFlight;

    themesLoadInFlight = (async () => {
      try {
        const res = await fetch(`${THEMES_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('bad response');
        const data = await res.json();
        if (!isValidThemesCatalog(data)) throw new Error('invalid themes catalog');
        remoteThemes = data;
        saveCachedThemes(data);
        const active = getSavedTheme();
        if (getAllThemes()[active]) applyTheme(active);
        if (typeof refreshSettingsPanel === 'function') refreshSettingsPanel();
        return data;
      } catch (e) {
        // Offline / CDN miss — keep cache or FALLBACK_THEMES.
        return getBuiltInThemes();
      } finally {
        themesLoadInFlight = null;
      }
    })();

    return themesLoadInFlight;
  }

  async function loadFonts() {
    if (fontsLoadInFlight) return fontsLoadInFlight;

    fontsLoadInFlight = (async () => {
      try {
        const res = await fetch(`${FONTS_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('bad response');
        const data = await res.json();
        if (!isValidFontsCatalog(data)) throw new Error('invalid fonts catalog');
        remoteFonts = data;
        saveCachedFonts(data);
        if (typeof refreshSettingsPanel === 'function') refreshSettingsPanel();
        return data;
      } catch (e) {
        return getPresetFonts();
      } finally {
        fontsLoadInFlight = null;
      }
    })();

    return fontsLoadInFlight;
  }

  function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0, nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  async function checkForUpdate({ force = false } = {}) {
    if (!force && updateCheckResult !== null) return updateCheckResult;
    if (updateCheckInFlight) return updateCheckInFlight;

    updateCheckInFlight = (async () => {
      try {
        const res = await fetch(`${VERSION_CHECK_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('bad response');
        const data = await res.json();
        const latest = data.version;
        const available = typeof latest === 'string' && compareVersions(latest, CURRENT_VERSION) > 0;
        updateCheckResult = { available, latestVersion: latest };
      } catch (e) {
        // Network/repo not set up yet, or offline — fail silently, no nag.
        // Don't cache failures forever so the next interval can retry.
        if (updateCheckResult === null) {
          updateCheckResult = { available: false, latestVersion: null };
        }
      } finally {
        updateCheckInFlight = null;
      }
      return updateCheckResult;
    })();

    return updateCheckInFlight;
  }

  function startUpdateChecker() {
    const run = () => checkForUpdate({ force: true }).then(() => createUpdateCheckToast());
    run();
    setInterval(run, UPDATE_CHECK_INTERVAL_MS);
  }

  function buildUpdateBanner({ dismissible = true, compact = false } = {}) {
    const banner = document.createElement('div');
    banner.className = 'fencord-update-banner';
    Object.assign(banner.style, {
      background: 'var(--popups-and-modals)',
      color: 'var(--text-primary)',
      border: '1px solid var(--primary-action)',
      borderRadius: '10px',
      padding: compact ? '10px 14px' : '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontSize: '13px',
      fontFamily: 'inherit',
      boxShadow: compact ? 'none' : '0 6px 20px rgba(0,0,0,0.35)',
      maxWidth: compact ? '420px' : '360px'
    });

    const headerRow = document.createElement('div');
    Object.assign(headerRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' });

    const heading = document.createElement('div');
    heading.textContent = '⚠️ New Fencord update available!';
    Object.assign(heading.style, { fontWeight: '700', color: 'var(--primary-action)' });
    headerRow.appendChild(heading);

    if (dismissible) {
      const closeBtn = document.createElement('div');
      closeBtn.textContent = '✕';
      Object.assign(closeBtn.style, { cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1', flexShrink: '0' });
      closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = 'var(--text-primary)');
      closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'var(--text-muted)');
      closeBtn.addEventListener('click', () => {
        updateToastDismissed = true;
        banner.remove();
      });
      headerRow.appendChild(closeBtn);
    }

    banner.appendChild(headerRow);

    const bodyText = document.createElement('div');
    bodyText.textContent = updateCheckResult && updateCheckResult.latestVersion
      ? `Version ${updateCheckResult.latestVersion} is out (you're on ${CURRENT_VERSION}). Would you like to update?`
      : 'A new version is out. Would you like to update?';
    Object.assign(bodyText.style, { color: 'var(--text-secondary)' });
    banner.appendChild(bodyText);

    const urlText = document.createElement('div');
    urlText.textContent = REPO_PAGE_URL;
    Object.assign(urlText.style, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: 'var(--text-primary)',
      background: 'var(--secondary-button)',
      padding: '6px 8px',
      borderRadius: '5px',
      wordBreak: 'break-all'
    });
    banner.appendChild(urlText);

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '10px', marginTop: '4px' });

    const yesBtn = document.createElement('div');
    yesBtn.textContent = 'Yes, take me there';
    Object.assign(yesBtn.style, {
      padding: '7px 14px', borderRadius: '6px', cursor: 'pointer',
      background: 'var(--primary-action)', color: 'var(--primary-foreground)',
      fontWeight: 'bold', fontSize: '12px'
    });
    yesBtn.addEventListener('mouseenter', () => yesBtn.style.background = 'var(--primary-hover)');
    yesBtn.addEventListener('mouseleave', () => yesBtn.style.background = 'var(--primary-action)');
    yesBtn.addEventListener('click', () => {
      window.open(SCRIPT_UPDATE_URL, '_blank', 'noopener,noreferrer');
    });
    btnRow.appendChild(yesBtn);

    const noBtn = document.createElement('div');
    noBtn.textContent = 'Not now';
    Object.assign(noBtn.style, {
      padding: '7px 14px', borderRadius: '6px', cursor: 'pointer',
      background: 'var(--secondary-button)', color: 'var(--text-primary)', fontSize: '12px'
    });
    noBtn.addEventListener('mouseenter', () => noBtn.style.background = 'var(--secondary-button-hover)');
    noBtn.addEventListener('mouseleave', () => noBtn.style.background = 'var(--secondary-button)');
    noBtn.addEventListener('click', () => {
      updateToastDismissed = true;
      banner.remove();
    });
    btnRow.appendChild(noBtn);

    banner.appendChild(btnRow);

    return banner;
  }

  async function createUpdateCheckToast() {
    if (updateToastDismissed) return;
    if (document.getElementById('fencord-update-toast')) return;

    const result = await checkForUpdate();
    if (!result.available) return; // no nag if already up to date or check failed

    const banner = buildUpdateBanner({ dismissible: true });
    banner.id = 'fencord-update-toast';
    Object.assign(banner.style, {
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '1000002'
    });

    document.body.appendChild(banner);

    // auto-dismiss after 15s so it doesn't linger forever
    setTimeout(() => {
      if (banner.parentElement) {
        updateToastDismissed = true;
        banner.remove();
      }
    }, 15000);
  }

  function createFencordWatermark() {
    if (document.getElementById('fencord-watermark')) return;

    const watermark = document.createElement('a');
    watermark.id = 'fencord-watermark';
    watermark.textContent = 'FENCORD';
    watermark.href = 'https://fenrid.com/iAZw7Qfu';
    watermark.target = '_blank';
    watermark.rel = 'noopener noreferrer';
    watermark.title = `FENCORD — ${CREDITS_TEXT}`;
    Object.assign(watermark.style, {
      position: 'fixed',
      bottom: '10px',
      right: '12px',
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '1px',
      color: 'var(--text-muted)',
      opacity: '0.55',
      zIndex: '999998',
      userSelect: 'none',
      fontFamily: 'inherit',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'opacity 0.2s, color 0.2s'
    });
    watermark.addEventListener('mouseenter', () => watermark.style.opacity = '1');
    watermark.addEventListener('mouseleave', () => watermark.style.opacity = '0.55');
    document.body.appendChild(watermark);

    if (!document.getElementById('fencord-credits-corner')) {
      const corner = document.createElement('div');
      corner.id = 'fencord-credits-corner';
      corner.textContent = CREDITS_TEXT;
      Object.assign(corner.style, {
        position: 'fixed',
        bottom: '28px',
        left: '12px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        opacity: '0.7',
        zIndex: '1000000',
        userSelect: 'none',
        fontFamily: 'inherit',
        pointerEvents: 'none',
        fontWeight: '600'
      });
      document.body.appendChild(corner);
    }

  }

  function init() {
    applyTheme(getSavedTheme());
    initFont();
    createSettingsUI();
    loadThemes();
    loadFonts();
    tryDetectRealUsername();
    if (isRgbEnabled()) setRgbEnabled(true);
    if (getDisplayNameOverride()) setDisplayNameEnabled(true);
    initTimestampFormat();
    if (isImageBlurEnabled()) setImageBlurEnabled(true);
    setBackgroundEffect(getBackgroundEffect());
    // Call Timer is marked non-working; do not auto-start even if previously enabled.
    // if (isCallTimerEnabled()) setCallTimerEnabled(true);
    createFencordWatermark();
    startUpdateChecker();
  }

  if (document.body) {
    init();
  } else {
    new MutationObserver((_, obs) => {
      if (document.body) {
        init();
        obs.disconnect();
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
