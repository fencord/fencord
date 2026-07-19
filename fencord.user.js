// ==UserScript==
// @name         Fencord
// @namespace    fencord
// @version      3.4
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

  // Theme values are injected into a <style> block. Only allow plain colors so
  // imports can't smuggle url()/(@)import/JS or break out of the declaration.
  const SAFE_THEME_VAR_NAME = /^--[a-z0-9-]+$/i;
  const SAFE_HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const SAFE_RGB_COLOR = /^rgba?\(\s*(?:(?:\d{1,3}|100%|\d{1,2}%)\s*,\s*){2}(?:\d{1,3}|100%|\d{1,2}%)(?:\s*,\s*(?:0|1|0?\.\d+|100%|\d{1,2}%))?\s*\)$/i;
  const SAFE_THEME_COLOR_KEYWORDS = new Set(['transparent', 'currentcolor', 'inherit', 'initial', 'unset']);

  function isSafeThemeVarName(name) {
    return typeof name === 'string' && SAFE_THEME_VAR_NAME.test(name) && name.length <= 64;
  }

  function isSafeThemeColorValue(value) {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v || v.length > 64) return false;
    // Hard reject anything that can fetch, import, execute, or break out of CSS.
    if (/url\s*\(|@import|expression\s*\(|javascript:|data:|behavior\s*:|-moz-binding|<|>|[{};\\]|\/\*|\*\//i.test(v)) {
      return false;
    }
    if (SAFE_THEME_COLOR_KEYWORDS.has(v.toLowerCase())) return true;
    if (SAFE_HEX_COLOR.test(v)) return true;
    if (SAFE_RGB_COLOR.test(v)) return true;
    return false;
  }

  function sanitizeThemeVars(vars) {
    if (!vars || typeof vars !== 'object' || Array.isArray(vars)) {
      return { ok: false, vars: {}, errors: ['vars must be an object'] };
    }
    const clean = {};
    const errors = [];
    for (const [key, value] of Object.entries(vars)) {
      if (!isSafeThemeVarName(key)) {
        errors.push(`blocked var name: ${key}`);
        continue;
      }
      if (typeof value !== 'string' || !isSafeThemeColorValue(value)) {
        errors.push(`blocked value for ${key}: ${String(value)}`);
        continue;
      }
      clean[key] = value.trim();
    }
    return { ok: errors.length === 0, vars: clean, errors };
  }

  function sanitizeThemeObject(theme) {
    if (!theme || typeof theme !== 'object') {
      return { ok: false, theme: null, errors: ['theme must be an object'] };
    }
    if (typeof theme.name !== 'string' || !theme.name.trim() || theme.name.length > 80) {
      return { ok: false, theme: null, errors: ['theme name must be a short string'] };
    }
    if (/[<>]/.test(theme.name)) {
      return { ok: false, theme: null, errors: ['theme name contains blocked characters'] };
    }
    const cleaned = sanitizeThemeVars(theme.vars);
    if (!cleaned.ok) {
      return { ok: false, theme: null, errors: cleaned.errors };
    }
    return {
      ok: true,
      theme: { name: theme.name.trim(), vars: cleaned.vars },
      errors: []
    };
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
      const cleaned = sanitizeThemeVars(theme.vars || {});
      const vars = { ...cleaned.vars };
      // Older cached themes may lack --matrix-rain; derive from accent.
      if (!vars['--matrix-rain']) {
        const fallback =
          vars['--accent-vibrant'] || vars['--primary-action'] || '#00ff00';
        if (isSafeThemeColorValue(fallback)) vars['--matrix-rain'] = fallback;
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

    const sanitized = sanitizeThemeObject(parsed);
    if (!sanitized.ok) {
      alert(
        'Theme blocked — only safe color values are allowed (hex / rgb / rgba).\n\n' +
        'Rejected:\n' + sanitized.errors.slice(0, 8).join('\n')
      );
      return;
    }

    const key = 'custom_' + sanitized.theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const custom = getCustomThemes();
    custom[key] = sanitized.theme;
    saveCustomThemes(custom);

    alert(`Imported "${sanitized.theme.name}"! Select it from the theme list.`);
    rerenderPanel();
  }

  function copyTextFallback(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  function exportThemeFlow(theme) {
    const text = JSON.stringify({ name: theme.name, vars: theme.vars }, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('"' + theme.name + '" copied to clipboard! Use Import Theme to load it elsewhere.');
      }).catch(() => {
        const ok = copyTextFallback(text);
        prompt(ok ? 'Copied! You can also grab it here:' : 'Copy the JSON manually:', text);
      });
    } else {
      const ok = copyTextFallback(text);
      prompt(ok ? '"' + theme.name + '" copied! You can also grab it here:' : 'Copy the JSON manually:', text);
    }
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
      const sanitized = sanitizeThemeObject({ name, vars });
      if (!sanitized.ok) {
        alert('Could not save theme — colors failed safety checks.');
        return;
      }
      const key = 'custom_' + sanitized.theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();

      const custom = getCustomThemes();
      custom[key] = sanitized.theme;
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

  // Plugin string safety: fonts/names are injected into CSS or URLs.
  function isSafeFontFamily(family) {
    if (family == null) return true;
    if (typeof family !== 'string') return false;
    const v = family.trim();
    if (!v || v.length > 120) return false;
    if (/url\s*\(|@import|expression\s*\(|javascript:|data:|<|>|[{};\\]|\/\*|\*\//i.test(v)) return false;
    return /^[a-zA-Z0-9\s,'"_-]+$/.test(v);
  }

  function isSafeGoogleFontName(name) {
    if (name == null) return true;
    if (typeof name !== 'string') return false;
    const v = name.trim();
    if (!v || v.length > 80) return false;
    if (/url\s*\(|https?:|\/\/|<|>|[{}\\'"]/i.test(v)) return false;
    // e.g. Inter:wght@400;600;700 or Press+Start+2P
    return /^[A-Za-z0-9]+(?:[+ ][A-Za-z0-9]+)*(?::wght@[0-9;]+)?$/.test(v);
  }

  function sanitizePlainLabel(text, maxLen = 32) {
    if (typeof text !== 'string') return '';
    let t = text.replace(/[\u0000-\u001F\u007F<>&`"\\]/g, '').trim();
    if (t.length > maxLen) t = t.slice(0, maxLen);
    return t;
  }

  function sanitizeFontPreset(f) {
    if (!f || typeof f !== 'object') return null;
    if (typeof f.id !== 'string' || !/^[a-z0-9_-]+$/i.test(f.id) || f.id.length > 40) return null;
    if (typeof f.label !== 'string' || !f.label.trim() || f.label.length > 60 || /[<>]/.test(f.label)) return null;
    if (!('family' in f) || !('googleName' in f)) return null;
    if (f.family != null && !isSafeFontFamily(f.family)) return null;
    if (f.googleName != null && !isSafeGoogleFontName(f.googleName)) return null;
    return {
      id: f.id,
      label: f.label.trim(),
      family: f.family == null ? null : String(f.family).trim(),
      googleName: f.googleName == null ? null : String(f.googleName).trim()
    };
  }

  function sanitizeSavedFontData(fontData) {
    if (!fontData || typeof fontData !== 'object') return null;
    if (!fontData.family) return null;
    if (!isSafeFontFamily(fontData.family)) return null;
    if (fontData.googleName != null && !isSafeGoogleFontName(fontData.googleName)) return null;
    const label = sanitizePlainLabel(typeof fontData.label === 'string' ? fontData.label : 'Custom', 60);
    return {
      family: fontData.family.trim(),
      googleName: fontData.googleName == null ? null : String(fontData.googleName).trim(),
      label: label || 'Custom'
    };
  }

  function getCachedFonts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FONTS_CACHE_KEY) || 'null');
      if (!Array.isArray(parsed) || !parsed.length) return null;
      const cleaned = parsed.map(sanitizeFontPreset).filter(Boolean);
      if (!cleaned.length || cleaned[0].id !== 'default') return null;
      return cleaned;
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
      return sanitizeSavedFontData(JSON.parse(localStorage.getItem(FONT_KEY) || 'null'));
    } catch (e) {
      return null;
    }
  }

  function saveFont(fontData) {
    if (!fontData) {
      localStorage.removeItem(FONT_KEY);
      return;
    }
    const clean = sanitizeSavedFontData(fontData);
    if (!clean) {
      localStorage.removeItem(FONT_KEY);
      return;
    }
    localStorage.setItem(FONT_KEY, JSON.stringify(clean));
  }

  function loadGoogleFont(googleName) {
    if (!isSafeGoogleFontName(googleName)) return;
    let link = document.getElementById(FONT_LINK_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    // Keep Google's expected family=Name:wght@... shape; value is allowlisted above.
    link.href = `https://fonts.googleapis.com/css2?family=${googleName}&display=swap`;
  }

  function applyFont(fontData) {
    let styleEl = document.getElementById(FONT_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = FONT_STYLE_ID;
      document.head.appendChild(styleEl);
    }

    const clean = sanitizeSavedFontData(fontData);
    if (!clean || !clean.family) {
      styleEl.textContent = '';
      const link = document.getElementById(FONT_LINK_ID);
      if (link) link.remove();
      return;
    }

    if (clean.googleName) {
      loadGoogleFont(clean.googleName);
    } else {
      const link = document.getElementById(FONT_LINK_ID);
      if (link) link.remove();
    }

    styleEl.textContent = `* { font-family: ${clean.family} !important; }`;
  }

  function setPresetFont(presetId) {
    if (typeof presetId !== 'string' || !/^[a-z0-9_-]+$/i.test(presetId)) return;
    const preset = getPresetFonts().find(f => f.id === presetId);
    if (!preset) return;
    const fontData = preset.family
      ? sanitizeSavedFontData({ family: preset.family, googleName: preset.googleName, label: preset.label })
      : null;
    saveFont(fontData);
    applyFont(fontData);
  }

  function setCustomFont(name) {
    const trimmed = sanitizePlainLabel(typeof name === 'string' ? name.trim() : '', 60);
    if (!trimmed) return;
    const googleName = trimmed.replace(/\s+/g, '+');
    if (!isSafeGoogleFontName(googleName)) {
      alert('Font blocked — use a plain Google Fonts name (letters/numbers/spaces only).');
      return;
    }
    const fontData = sanitizeSavedFontData({
      family: `'${trimmed}', sans-serif`,
      googleName,
      label: trimmed
    });
    if (!fontData) {
      alert('Font blocked — unsafe font-family value.');
      return;
    }
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
          flexShrink: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px'
        });

        if (key.startsWith('custom_')) {
          const expBtn = document.createElement('div');
          expBtn.textContent = '↑';
          Object.assign(expBtn.style, {
            width: '32px',
            textAlign: 'center',
            padding: '10px 0',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: '700'
          });
          expBtn.title = 'Export theme (copy JSON)';
          expBtn.addEventListener('mouseenter', () => {
            expBtn.style.background = 'var(--secondary-button-hover)';
            expBtn.style.color = 'var(--text-primary)';
          });
          expBtn.addEventListener('mouseleave', () => {
            expBtn.style.background = '';
            expBtn.style.color = 'var(--text-muted)';
          });
          expBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportThemeFlow(theme);
          });
          trailing.appendChild(expBtn);

          const delBtn = document.createElement('div');
          delBtn.textContent = '✕';
          Object.assign(delBtn.style, {
            width: '32px',
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
      const fxTitle = document.createElement('div');
      fxTitle.style.fontWeight = '600';
      fxTitle.textContent = 'Background Effect';
      const fxSub = document.createElement('div');
      Object.assign(fxSub.style, { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' });
      fxSub.textContent = 'Animated backdrop behind the app (one at a time)';
      fxLabel.appendChild(fxTitle);
      fxLabel.appendChild(fxSub);
      fxSection.appendChild(fxLabel);

      const fxSelect = document.createElement('select');
      Object.assign(fxSelect.style, {
        padding: '8px', borderRadius: '6px',
        border: '1px solid var(--borders-and-separators)',
        background: 'var(--popups-and-modals)', color: 'var(--text-primary)', cursor: 'pointer'
      });
      getBackgroundEffects().forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.id === 'none'
          ? o.label
          : `${o.label} — needs a theme or it may not be visible`;
        fxSelect.appendChild(opt);
      });
      fxSelect.value = getBackgroundEffect();
      fxSelect.addEventListener('change', () => {
        setBackgroundEffect(fxSelect.value);
      });
      fxSection.appendChild(fxSelect);

      const fxHint = document.createElement('div');
      fxHint.textContent = 'Turn on a theme first — without one, effects may not be visible.';
      Object.assign(fxHint.style, {
        fontSize: '11px',
        color: 'var(--text-muted)',
        lineHeight: '1.35'
      });
      fxSection.appendChild(fxHint);
      body.appendChild(fxSection);

      body.appendChild(makeCreditNote());
    }

    function renderPluginsTab(body) {
      if (updateCheckResult && updateCheckResult.available) {
        const banner = buildUpdateBanner({ dismissible: true, compact: true });
        Object.assign(banner.style, { marginBottom: '14px', maxWidth: '100%' });
        body.appendChild(banner);
      }

      const noticeRow = document.createElement('div');
      Object.assign(noticeRow.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '0 2px 12px',
        width: '100%',
        boxSizing: 'border-box'
      });

      const pluginsCompact = isPluginsCompact();

      const notice = document.createElement('div');
      notice.textContent = pluginsCompact
        ? 'Compact mode — expand for Soft Tap options, Font, and more.'
        : 'If a toggle doesn\'t fully undo (e.g. RGB Usernames), refresh the page.';
      Object.assign(notice.style, {
        fontSize: '12px',
        color: 'var(--text-muted)',
        minWidth: '0',
        flex: '1',
        lineHeight: '1.35'
      });
      noticeRow.appendChild(notice);

      const compactBtn = document.createElement('div');
      compactBtn.textContent = pluginsCompact ? 'Expanded' : 'Compact';
      Object.assign(compactBtn.style, {
        padding: '6px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        background: pluginsCompact ? 'var(--primary-action)' : 'var(--secondary-button)',
        color: pluginsCompact ? 'var(--primary-foreground)' : 'var(--text-primary)',
        fontSize: '12px',
        fontWeight: '650',
        flexShrink: '0',
        border: '1px solid var(--borders-and-separators)',
        userSelect: 'none'
      });
      compactBtn.title = 'Toggle compact plugin cards (icons + toggles)';
      compactBtn.addEventListener('click', () => {
        setPluginsCompact(!isPluginsCompact());
        renderPanel();
      });
      noticeRow.appendChild(compactBtn);
      body.appendChild(noticeRow);

      const disclaimerRow = document.createElement('div');
      disclaimerRow.textContent = "Fencord is an unofficial, community-made tool. It is not built by the Fenrid team, but the owner is aware of it and has said it's fine to use. Fenrid is developed and paid for out of pocket by its owner — if you enjoy the platform, please consider supporting the official paid plan when it launches. It directly keeps this running for everyone.";
      Object.assign(disclaimerRow.style, {
        fontSize: '11px',
        color: 'var(--warning-yellow)',
        background: 'var(--secondary-button)',
        padding: '8px',
        borderRadius: '6px',
        marginBottom: '12px',
        lineHeight: '1.4',
        border: '1px solid var(--borders-and-separators)'
      });
      body.appendChild(disclaimerRow);

      const pluginGrid = document.createElement('div');
      Object.assign(pluginGrid.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gridAutoRows: pluginsCompact ? 'auto' : '1fr',
        gap: pluginsCompact ? '8px' : '10px',
        width: '100%',
        alignItems: 'stretch'
      });

      function styleField(el) {
        Object.assign(el.style, {
          width: '100%',
          minWidth: '0',
          padding: '8px 10px',
          borderRadius: '6px',
          border: '1px solid var(--borders-and-separators)',
          background: 'var(--popups-and-modals)',
          color: 'var(--text-primary)',
          boxSizing: 'border-box',
          fontSize: '13px'
        });
      }

      function makeToggle(enabled, onChange, { dimmed = false } = {}) {
        const toggle = document.createElement('div');
        Object.assign(toggle.style, {
          width: '42px',
          height: '24px',
          borderRadius: '12px',
          background: enabled ? 'var(--primary-action)' : 'var(--borders-and-separators)',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: '0',
          transition: 'background 0.15s',
          opacity: dimmed ? '0.45' : '1'
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
          const next = onChange();
          toggle.style.background = next ? 'var(--primary-action)' : 'var(--borders-and-separators)';
          knob.style.left = next ? '21px' : '3px';
        });
        return toggle;
      }

      function makePluginCard({ icon, title, desc, badge, enabled, onToggle, dimmed, wide, build, forceFull }) {
        const compact = pluginsCompact && !forceFull;
        const card = document.createElement('div');
        Object.assign(card.style, {
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? '0' : '10px',
          padding: compact ? '10px 12px' : '14px',
          borderRadius: '10px',
          background: 'var(--secondary-button)',
          border: '1px solid var(--borders-and-separators)',
          minWidth: '0',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          minHeight: compact ? '52px' : (onToggle && !build ? '92px' : '0'),
          justifyContent: compact ? 'center' : 'flex-start',
          gridColumn: wide && !compact ? '1 / -1' : 'auto'
        });

        const head = document.createElement('div');
        Object.assign(head.style, {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        });

        const textWrap = document.createElement('div');
        Object.assign(textWrap.style, {
          minWidth: '0',
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        });

        if (icon) {
          const iconEl = document.createElement('div');
          iconEl.textContent = icon;
          Object.assign(iconEl.style, {
            fontSize: compact ? '16px' : '15px',
            lineHeight: '1',
            flexShrink: '0',
            width: '22px',
            textAlign: 'center'
          });
          textWrap.appendChild(iconEl);
        }

        const textCol = document.createElement('div');
        Object.assign(textCol.style, { minWidth: '0', flex: '1' });

        const titleEl = document.createElement('div');
        Object.assign(titleEl.style, {
          fontWeight: '650',
          fontSize: compact ? '13px' : '14px',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        });
        titleEl.appendChild(document.createTextNode(title));
        if (badge && !compact) {
          const badgeEl = document.createElement('span');
          badgeEl.textContent = badge;
          Object.assign(badgeEl.style, {
            fontSize: '10px',
            fontWeight: '700',
            color: 'var(--warning-yellow)',
            letterSpacing: '0.02em'
          });
          titleEl.appendChild(badgeEl);
        }
        textCol.appendChild(titleEl);

        if (desc && !compact) {
          const descEl = document.createElement('div');
          descEl.textContent = desc;
          Object.assign(descEl.style, {
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '4px',
            lineHeight: '1.35'
          });
          textCol.appendChild(descEl);
        }

        textWrap.appendChild(textCol);
        head.appendChild(textWrap);
        if (typeof enabled === 'boolean' && typeof onToggle === 'function') {
          head.appendChild(makeToggle(enabled, onToggle, { dimmed }));
        }
        card.appendChild(head);

        if (!compact && typeof build === 'function') {
          const controls = document.createElement('div');
          Object.assign(controls.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '2px'
          });
          build(controls, styleField);
          card.appendChild(controls);
        }

        pluginGrid.appendChild(card);
        return card;
      }

      // Toggles first — even 2×2 grid
      makePluginCard({
        icon: '🌈',
        title: 'RGB Usernames',
        desc: 'Cycle chat usernames through rainbow colors',
        enabled: isRgbEnabled(),
        onToggle: () => {
          const next = !isRgbEnabled();
          setRgbEnabled(next);
          return next;
        }
      });

      makePluginCard({
        icon: '🔊',
        title: 'Soft Tap Sounds',
        desc: 'Quiet taps when typing or clicking',
        enabled: isSoftTapsEnabled(),
        onToggle: () => {
          const next = !isSoftTapsEnabled();
          setSoftTapsEnabled(next);
          return next;
        },
        build: (controls, styleField) => {
          const styleSelect = document.createElement('select');
          styleField(styleSelect);
          styleSelect.style.cursor = 'pointer';
          getSoftTapStyles().forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.label;
            styleSelect.appendChild(opt);
          });
          styleSelect.value = getSoftTapStyle();
          styleSelect.addEventListener('change', () => {
            setSoftTapStyle(styleSelect.value);
            if (isSoftTapsEnabled()) playSoftTap({ kind: 'click' });
          });
          controls.appendChild(styleSelect);

          const triggerSelect = document.createElement('select');
          styleField(triggerSelect);
          triggerSelect.style.cursor = 'pointer';
          getSoftTapTriggers().forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.label;
            triggerSelect.appendChild(opt);
          });
          triggerSelect.value = getSoftTapTrigger();
          triggerSelect.addEventListener('change', () => {
            setSoftTapTrigger(triggerSelect.value);
          });
          controls.appendChild(triggerSelect);

          const volumeSelect = document.createElement('select');
          styleField(volumeSelect);
          volumeSelect.style.cursor = 'pointer';
          getSoftTapVolumes().forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.label;
            volumeSelect.appendChild(opt);
          });
          volumeSelect.value = getSoftTapVolume();
          volumeSelect.addEventListener('change', () => {
            setSoftTapVolume(volumeSelect.value);
            if (isSoftTapsEnabled()) playSoftTap({ kind: 'click' });
          });
          controls.appendChild(volumeSelect);
        }
      });

      makePluginCard({
        icon: '🌫️',
        title: 'Blur Images',
        desc: 'Hide images until clicked (spoiler-style)',
        enabled: isImageBlurEnabled(),
        onToggle: () => {
          const next = !isImageBlurEnabled();
          setImageBlurEnabled(next);
          return next;
        }
      });

      makePluginCard({
        icon: '⏱️',
        title: 'Call Timer',
        desc: 'Show how long you\'ve been in the current call',
        enabled: isCallTimerEnabled(),
        onToggle: () => {
          const next = !isCallTimerEnabled();
          setCallTimerEnabled(next);
          return next;
        }
      });

      makePluginCard({
        icon: '✨',
        title: 'UI Animations',
        desc: 'Add smooth transitions and pop-in animations to the app',
        enabled: isUiAnimationsEnabled(),
        onToggle: () => {
          const next = !isUiAnimationsEnabled();
          setUiAnimationsEnabled(next);
          return next;
        }
      });

      makePluginCard({
        icon: '🕵️',
        title: 'Username Hider',
        desc: 'Scramble all usernames into random characters',
        enabled: getUsernameHiderMode() !== 'off',
        onToggle: () => {
          const next = getUsernameHiderMode() === 'off' ? 'both' : 'off';
          setUsernameHiderMode(next);
          return next !== 'off';
        }
      });

      // Settings cards (hidden in compact — toggles-only view)
      if (!pluginsCompact) {
      makePluginCard({
        icon: '🔤',
        title: 'Font',
        desc: getSavedFont()
          ? `App-wide font — ${getSavedFont().label}`
          : 'Change the app-wide font',
        build: (controls, styleField) => {
          const fontSelect = document.createElement('select');
          styleField(fontSelect);
          fontSelect.style.cursor = 'pointer';
          getPresetFonts().forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.label;
            fontSelect.appendChild(opt);
          });
          const savedFont = getSavedFont();
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
          controls.appendChild(fontSelect);

          const customRow = document.createElement('div');
          Object.assign(customRow.style, { display: 'flex', gap: '8px' });

          const customInput = document.createElement('input');
          customInput.type = 'text';
          customInput.placeholder = 'Custom Google Font…';
          styleField(customInput);
          customInput.style.flex = '1';
          customInput.style.width = 'auto';
          customRow.appendChild(customInput);

          const customBtn = document.createElement('div');
          customBtn.textContent = 'Apply';
          Object.assign(customBtn.style, {
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            background: 'var(--primary-action)',
            color: 'var(--primary-foreground)',
            fontWeight: '700',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center'
          });
          customBtn.addEventListener('mouseenter', () => customBtn.style.background = 'var(--primary-hover)');
          customBtn.addEventListener('mouseleave', () => customBtn.style.background = 'var(--primary-action)');
          customBtn.addEventListener('click', () => {
            if (!customInput.value.trim()) return;
            setCustomFont(customInput.value);
            if (getSavedFont()) renderPanel();
          });
          customRow.appendChild(customBtn);
          controls.appendChild(customRow);
        }
      });

      makePluginCard({
        icon: '🕐',
        title: 'Timestamp Format',
        desc: 'How message times are shown',
        build: (controls, styleField) => {
          const tsSelect = document.createElement('select');
          styleField(tsSelect);
          tsSelect.style.cursor = 'pointer';
          [
            { id: 'default', label: 'Default' },
            { id: '12h', label: '12-hour' },
            { id: '24h', label: '24-hour' },
            { id: 'relative', label: 'Relative' }
          ].forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.textContent = o.label;
            tsSelect.appendChild(opt);
          });
          tsSelect.value = getTimestampFormat();
          tsSelect.addEventListener('change', () => setTimestampFormat(tsSelect.value));
          controls.appendChild(tsSelect);
        }
      });

      makePluginCard({
        icon: '✏️',
        title: 'Display Name',
        desc: 'Local only — others still see your real name',
        wide: true,
        build: (controls, styleField) => {
          const currentOverride = getDisplayNameOverride();

          const nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.placeholder = 'Real username (as in chat)';
          nameInput.value = getMyRealUsername() || '';
          styleField(nameInput);
          controls.appendChild(nameInput);

          const overrideRow = document.createElement('div');
          Object.assign(overrideRow.style, { display: 'flex', gap: '8px' });

          const overrideInput = document.createElement('input');
          overrideInput.type = 'text';
          overrideInput.placeholder = 'Show as…';
          overrideInput.value = currentOverride;
          styleField(overrideInput);
          overrideInput.style.flex = '1';
          overrideInput.style.width = 'auto';
          overrideRow.appendChild(overrideInput);

          const nameApplyBtn = document.createElement('div');
          nameApplyBtn.textContent = 'Apply';
          Object.assign(nameApplyBtn.style, {
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            background: 'var(--primary-action)',
            color: 'var(--primary-foreground)',
            fontWeight: '700',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center'
          });
          nameApplyBtn.addEventListener('mouseenter', () => nameApplyBtn.style.background = 'var(--primary-hover)');
          nameApplyBtn.addEventListener('mouseleave', () => nameApplyBtn.style.background = 'var(--primary-action)');
          nameApplyBtn.addEventListener('click', () => {
            const real = sanitizePlainLabel(nameInput.value, 32);
            const override = sanitizePlainLabel(overrideInput.value, 32);
            if (real) localStorage.setItem(ORIGINAL_NAME_KEY, real);
            saveDisplayNameOverride(override);
            setDisplayNameEnabled(!!override);
            renderPanel();
          });
          overrideRow.appendChild(nameApplyBtn);
          controls.appendChild(overrideRow);

          if (currentOverride) {
            const clearBtn = document.createElement('div');
            clearBtn.textContent = 'Clear override';
            Object.assign(clearBtn.style, {
              fontSize: '12px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              width: 'fit-content'
            });
            clearBtn.addEventListener('click', () => {
              saveDisplayNameOverride('');
              setDisplayNameEnabled(false);
              renderPanel();
            });
            controls.appendChild(clearBtn);
          }
        }
      });

      }

      body.appendChild(pluginGrid);
      body.appendChild(makeCreditNote({ maxWidth: '100%' }));
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
    return sanitizePlainLabel(localStorage.getItem(DISPLAY_NAME_KEY) || '', 32);
  }

  function saveDisplayNameOverride(name) {
    const clean = sanitizePlainLabel(name, 32);
    if (clean) {
      localStorage.setItem(DISPLAY_NAME_KEY, clean);
    } else {
      localStorage.removeItem(DISPLAY_NAME_KEY);
    }
  }

  function getMyRealUsername() {
    const raw = localStorage.getItem(ORIGINAL_NAME_KEY);
    return raw ? sanitizePlainLabel(raw, 32) || null : null;
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
        const detected = sanitizePlainLabel(nameSpan.textContent, 32);
        if (detected) localStorage.setItem(ORIGINAL_NAME_KEY, detected);
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
  const ALLOWED_TIMESTAMP_FORMATS = new Set(['default', '12h', '24h', 'relative']);
  let timestampInterval = null;
  let timestampObserver = null;

  function getTimestampFormat() {
    const fmt = localStorage.getItem(TIMESTAMP_FORMAT_KEY) || 'default';
    return ALLOWED_TIMESTAMP_FORMATS.has(fmt) ? fmt : 'default';
  }

  function saveTimestampFormat(fmt) {
    localStorage.setItem(
      TIMESTAMP_FORMAT_KEY,
      ALLOWED_TIMESTAMP_FORMATS.has(fmt) ? fmt : 'default'
    );
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
    const next = ALLOWED_TIMESTAMP_FORMATS.has(fmt) ? fmt : 'default';
    saveTimestampFormat(next);
    revertTimestamps();

    if (next === 'default') {
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
  // SOFT TAP SOUNDS PLUGIN
  // Quiet synthesized taps on keypress and click (Web Audio — no files).
  // ---------------------------------------------------------------

  const SOFT_TAPS_KEY = 'fencord-soft-taps';
  const SOFT_TAP_STYLE_KEY = 'fencord-soft-tap-style';
  const SOFT_TAP_TRIGGER_KEY = 'fencord-soft-tap-trigger';
  const SOFT_TAP_VOLUME_KEY = 'fencord-soft-tap-volume';
  const PLUGINS_COMPACT_KEY = 'fencord-plugins-compact';

  const SOFT_TAP_STYLES = [
    { id: 'soft', label: 'Soft — gentle triangle tick' },
    { id: 'clicky', label: 'Clicky — sharp plastic click' },
    { id: 'thock', label: 'Thock — deep low tap' },
    { id: 'glass', label: 'Glass — bright sparkle' },
    { id: 'popcorn', label: 'Popcorn — tiny high pops' },
    { id: 'typewriter', label: 'Typewriter — mid mechanical clack' }
  ];

  const SOFT_TAP_TRIGGERS = [
    { id: 'both', label: 'Play on typing + clicks' },
    { id: 'keys', label: 'Typing only' },
    { id: 'clicks', label: 'Clicks only' }
  ];

  const SOFT_TAP_VOLUMES = [
    { id: 'quiet', label: 'Volume — Quiet', mult: 0.45 },
    { id: 'normal', label: 'Volume — Normal', mult: 1 },
    { id: 'loud', label: 'Volume — Loud', mult: 1.7 }
  ];

  let softTapsCtx = null;
  let softTapsKeyHandler = null;
  let softTapsClickHandler = null;
  let softTapsLastAt = 0;

  function getSoftTapStyles() { return SOFT_TAP_STYLES; }
  function getSoftTapTriggers() { return SOFT_TAP_TRIGGERS; }
  function getSoftTapVolumes() { return SOFT_TAP_VOLUMES; }

  function isPluginsCompact() {
    return localStorage.getItem(PLUGINS_COMPACT_KEY) === 'true';
  }

  function setPluginsCompact(enabled) {
    localStorage.setItem(PLUGINS_COMPACT_KEY, enabled ? 'true' : 'false');
  }

  function isSoftTapsEnabled() {
    return localStorage.getItem(SOFT_TAPS_KEY) === 'true';
  }

  function getSoftTapStyle() {
    const id = localStorage.getItem(SOFT_TAP_STYLE_KEY) || 'soft';
    return SOFT_TAP_STYLES.some(s => s.id === id) ? id : 'soft';
  }

  function setSoftTapStyle(id) {
    const next = SOFT_TAP_STYLES.some(s => s.id === id) ? id : 'soft';
    localStorage.setItem(SOFT_TAP_STYLE_KEY, next);
  }

  function getSoftTapTrigger() {
    const id = localStorage.getItem(SOFT_TAP_TRIGGER_KEY) || 'both';
    return SOFT_TAP_TRIGGERS.some(t => t.id === id) ? id : 'both';
  }

  function setSoftTapTrigger(id) {
    const next = SOFT_TAP_TRIGGERS.some(t => t.id === id) ? id : 'both';
    localStorage.setItem(SOFT_TAP_TRIGGER_KEY, next);
  }

  function getSoftTapVolume() {
    const id = localStorage.getItem(SOFT_TAP_VOLUME_KEY) || 'normal';
    return SOFT_TAP_VOLUMES.some(v => v.id === id) ? id : 'normal';
  }

  function setSoftTapVolume(id) {
    const next = SOFT_TAP_VOLUMES.some(v => v.id === id) ? id : 'normal';
    localStorage.setItem(SOFT_TAP_VOLUME_KEY, next);
  }

  function softTapVolumeMult() {
    const found = SOFT_TAP_VOLUMES.find(v => v.id === getSoftTapVolume());
    return found ? found.mult : 1;
  }

  function ensureSoftTapsAudio() {
    if (!softTapsCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      softTapsCtx = new AC();
    }
    if (softTapsCtx.state === 'suspended') softTapsCtx.resume().catch(() => {});
    return softTapsCtx;
  }

  function softTapProfile(kind) {
    const style = getSoftTapStyle();
    const click = kind === 'click';
    // freqStart, freqEnd, type, filterHz, peak, dur
    if (style === 'clicky') {
      return {
        type: 'square',
        freqStart: click ? 1400 : 1900,
        freqEnd: click ? 520 : 700,
        filterHz: 4200,
        peak: click ? 0.03 : 0.022,
        dur: 0.035
      };
    }
    if (style === 'thock') {
      return {
        type: 'sine',
        freqStart: click ? 220 : 280,
        freqEnd: click ? 90 : 110,
        filterHz: 900,
        peak: click ? 0.07 : 0.055,
        dur: 0.09
      };
    }
    if (style === 'glass') {
      return {
        type: 'sine',
        freqStart: click ? 2400 : 3200,
        freqEnd: click ? 1200 : 1600,
        filterHz: 6000,
        peak: click ? 0.028 : 0.02,
        dur: 0.06
      };
    }
    if (style === 'popcorn') {
      return {
        type: 'triangle',
        freqStart: click ? 2100 : 2600,
        freqEnd: click ? 900 : 1100,
        filterHz: 5000,
        peak: click ? 0.025 : 0.018,
        dur: 0.025
      };
    }
    if (style === 'typewriter') {
      return {
        type: 'sawtooth',
        freqStart: click ? 700 : 900,
        freqEnd: click ? 240 : 320,
        filterHz: 1800,
        peak: click ? 0.04 : 0.03,
        dur: 0.05
      };
    }
    // soft (default)
    return {
      type: 'triangle',
      freqStart: click ? 620 : 880,
      freqEnd: click ? 280 : 420,
      filterHz: 2400,
      peak: click ? 0.045 : 0.032,
      dur: 0.055
    };
  }

  function playSoftTap({ kind = 'key' } = {}) {
    const ctx = ensureSoftTapsAudio();
    if (!ctx) return;

    // Light rate-limit so held keys / burst clicks don't stack into noise.
    const now = performance.now();
    const minGap = kind === 'key' ? 28 : 40;
    if (now - softTapsLastAt < minGap) return;
    softTapsLastAt = now;

    const profile = softTapProfile(kind);
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = profile.type;
    osc.frequency.setValueAtTime(profile.freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, profile.freqEnd), t0 + profile.dur * 0.85);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(profile.filterHz, t0);

    const peak = Math.max(0.0002, profile.peak * softTapVolumeMult());
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + profile.dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + profile.dur + 0.02);
  }

  function startSoftTaps() {
    stopSoftTaps();

    softTapsKeyHandler = (e) => {
      if (!isSoftTapsEnabled()) return;
      const trigger = getSoftTapTrigger();
      if (trigger === 'clicks') return;
      if (e.repeat) return;
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
      playSoftTap({ kind: 'key' });
    };

    softTapsClickHandler = (e) => {
      if (!isSoftTapsEnabled()) return;
      const trigger = getSoftTapTrigger();
      if (trigger === 'keys') return;
      if (typeof e.button === 'number' && e.button !== 0) return;
      playSoftTap({ kind: 'click' });
    };

    document.addEventListener('keydown', softTapsKeyHandler, true);
    document.addEventListener('pointerdown', softTapsClickHandler, true);
  }

  function stopSoftTaps() {
    if (softTapsKeyHandler) {
      document.removeEventListener('keydown', softTapsKeyHandler, true);
      softTapsKeyHandler = null;
    }
    if (softTapsClickHandler) {
      document.removeEventListener('pointerdown', softTapsClickHandler, true);
      softTapsClickHandler = null;
    }
  }

  function setSoftTapsEnabled(enabled) {
    localStorage.setItem(SOFT_TAPS_KEY, enabled ? 'true' : 'false');
    if (enabled) startSoftTaps();
    else stopSoftTaps();
  }

  // ---------------------------------------------------------------
  // BACKGROUND EFFECTS (Matrix / Rain / Fire)
  // Catalog (labels) loads from effects.json on GitHub.
  // Engines + the user's selection stay client-side.
  // ---------------------------------------------------------------

  const BG_EFFECT_KEY = 'fencord-bg-effect';
  const MATRIX_BG_KEY = 'fencord-matrix-bg'; // legacy
  const RAIN_BG_KEY = 'fencord-rain-bg'; // legacy
  const FIRE_BG_KEY = 'fencord-fire-bg'; // legacy
  const EFFECTS_CACHE_KEY = 'fencord-remote-effects';
  const CLIENT_EFFECT_ENGINES = new Set(['matrix', 'rain', 'fire']);

  let remoteEffects = null;
  let effectsLoadInFlight = null;

  const FALLBACK_EFFECTS = [
    { id: 'none', label: 'None' },
    { id: 'matrix', label: 'Matrix — digital rain (--matrix-rain)' },
    { id: 'rain', label: 'Rain — falling streaks (theme accent)' },
    { id: 'fire', label: 'Fire — rising embers (warm / accent)' }
  ];

  function isValidEffectsCatalog(data) {
    if (!Array.isArray(data) || !data.length) return false;
    return data.every((e) =>
      e && typeof e === 'object' &&
      typeof e.id === 'string' &&
      typeof e.label === 'string' &&
      (e.id === 'none' || CLIENT_EFFECT_ENGINES.has(e.id))
    ) && data.some((e) => e.id === 'none');
  }

  function getCachedEffects() {
    try {
      const parsed = JSON.parse(localStorage.getItem(EFFECTS_CACHE_KEY) || 'null');
      if (isValidEffectsCatalog(parsed)) return parsed;
    } catch (e) {}
    return null;
  }

  function saveCachedEffects(effects) {
    localStorage.setItem(EFFECTS_CACHE_KEY, JSON.stringify(effects));
  }

  function getBackgroundEffects() {
    return remoteEffects || getCachedEffects() || FALLBACK_EFFECTS;
  }

  function isKnownEffectId(id) {
    return getBackgroundEffects().some((e) => e.id === id);
  }

  function getBackgroundEffect() {
    const saved = localStorage.getItem(BG_EFFECT_KEY);
    if (saved && isKnownEffectId(saved)) return saved;
    // Migrate old per-effect toggles.
    if (localStorage.getItem(MATRIX_BG_KEY) === 'true') return 'matrix';
    if (localStorage.getItem(RAIN_BG_KEY) === 'true') return 'rain';
    if (localStorage.getItem(FIRE_BG_KEY) === 'true') return 'fire';
    return 'none';
  }

  function setBackgroundEffect(effect) {
    const next = (effect && CLIENT_EFFECT_ENGINES.has(effect) && isKnownEffectId(effect))
      ? effect
      : 'none';
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

  function elementOwnText(el) {
    // Prefer the element's own text nodes so we don't match huge parents
    // whose textContent includes "Voice Connected" plus other chrome.
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    }
    return text.trim();
  }

  function findVoiceConnectedLabel() {
    // Exact Fenrid class set from their VoiceConnectedFooter (when present).
    for (const el of document.querySelectorAll('span.text-xs.font-semibold.text-blue-500')) {
      if (elementOwnText(el) === 'Voice Connected' || el.textContent.trim() === 'Voice Connected') {
        return el;
      }
    }

    // Prefer leaf-ish spans whose own text is exactly the label.
    for (const el of document.querySelectorAll('span')) {
      if (elementOwnText(el) === 'Voice Connected') return el;
    }

    // Last resort: a span/div whose full textContent is exactly the label
    // (single-child wrappers). Skip large containers.
    for (const el of document.querySelectorAll('span, div')) {
      if (el.childElementCount > 2) continue;
      if (el.textContent.trim() === 'Voice Connected') return el;
    }
    return null;
  }

  function isInCall() {
    // Keep this strict — broad "Leave" / class*=disconnect matches cause
    // false positives and a broken/flickering clock.
    if (findVoiceConnectedLabel()) return true;
    if (document.querySelector('button[title="Disconnect"]')) return true;
    if (document.querySelector('button[aria-label="Disconnect" i]')) return true;
    return false;
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

  function styleInlineCallTimer(el) {
    Object.assign(el.style, {
      position: '',
      bottom: '',
      left: '',
      zIndex: '',
      padding: '',
      borderRadius: '',
      background: '',
      border: '',
      boxShadow: '',
      pointerEvents: 'none',
      fontSize: '12px',
      fontWeight: '600',
      color: 'var(--text-muted)',
      marginLeft: '6px',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '0.2px',
      userSelect: 'none',
      fontFamily: 'inherit'
    });
  }

  function styleFloatingCallTimer(el) {
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
      userSelect: 'none',
      marginLeft: ''
    });
  }

  function ensureCallTimerEl() {
    let el = document.getElementById(CALL_TIMER_EL_ID);
    const label = findVoiceConnectedLabel();

    // Prefer sitting inline next to "Voice Connected".
    if (label && label.parentElement) {
      if (!el) {
        el = document.createElement('span');
        el.id = CALL_TIMER_EL_ID;
      } else if (el.tagName !== 'SPAN') {
        // Reuse the same node id without destroying/recreating every tick:
        // convert floating pill → inline span only when needed.
        const next = document.createElement('span');
        next.id = CALL_TIMER_EL_ID;
        next.textContent = el.textContent;
        el.replaceWith(next);
        el = next;
      }

      styleInlineCallTimer(el);

      if (el.parentElement !== label.parentElement) {
        label.parentElement.insertBefore(el, label.nextSibling);
      }
      return el;
    }

    // Fallback floating pill if the label isn't found but Disconnect is.
    if (!el) {
      el = document.createElement('div');
      el.id = CALL_TIMER_EL_ID;
      document.body.appendChild(el);
    } else if (el.tagName !== 'DIV') {
      const next = document.createElement('div');
      next.id = CALL_TIMER_EL_ID;
      next.textContent = el.textContent;
      el.replaceWith(next);
      el = next;
      document.body.appendChild(el);
    } else if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }

    styleFloatingCallTimer(el);
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
  // UI ANIMATIONS PLUGIN
  // Adds smooth transitions and pop-in effects.
  // ---------------------------------------------------------------

  const UI_ANIMATIONS_KEY = 'fencord-ui-animations';
  let uiAnimationsStyle = null;
  let uiAnimationsObserver = null;

  function isUiAnimationsEnabled() {
    return localStorage.getItem(UI_ANIMATIONS_KEY) === 'true';
  }

  function applyUiAnimations() {
    if (isUiAnimationsEnabled()) {
      if (!uiAnimationsStyle) {
        uiAnimationsStyle = document.createElement('style');
        uiAnimationsStyle.id = 'fencord-ui-animations-style';
        uiAnimationsStyle.textContent = `
          button, a, input, select {
            transition: background-color 0.15s ease, opacity 0.15s ease, border-color 0.15s ease !important;
          }
          @keyframes fencordPopIn {
            0% { opacity: 0; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1.02); }
            100% { opacity: 1; transform: scale(1); }
          }
          .fencord-anim-enter {
            animation: fencordPopIn 1s ease-in-out forwards !important;
          }
        `;
        document.head.appendChild(uiAnimationsStyle);
      }
      
      if (!uiAnimationsObserver) {
        uiAnimationsObserver = new MutationObserver((mutations) => {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.nodeType === 1) {
                if (node.tagName === 'DIV' || node.tagName === 'LI') {
                   node.classList.add('fencord-anim-enter');
                }
              }
            }
          }
        });
        uiAnimationsObserver.observe(document.body, { childList: true, subtree: true });
      }
    } else {
      if (uiAnimationsStyle) {
        uiAnimationsStyle.remove();
        uiAnimationsStyle = null;
      }
      if (uiAnimationsObserver) {
        uiAnimationsObserver.disconnect();
        uiAnimationsObserver = null;
      }
    }
  }

  function setUiAnimationsEnabled(enabled) {
    localStorage.setItem(UI_ANIMATIONS_KEY, enabled ? 'true' : 'false');
    applyUiAnimations();
  }

  // Init animations on startup
  applyUiAnimations();


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

  const CURRENT_VERSION = '2.1.2';
  // raw.githubusercontent.com refreshes ~every 5m; jsDelivr can lag much longer on @main.
  const REPO_RAW_BASE = 'https://raw.githubusercontent.com/fencord/fencord/main';
  const VERSION_CHECK_URL = `${REPO_RAW_BASE}/version.json`;
  const SCRIPT_UPDATE_URL = 'https://github.com/fencord/fencord/raw/main/fencord.user.js';
  const THEMES_URL = `${REPO_RAW_BASE}/themes.json`;
  const FONTS_URL = `${REPO_RAW_BASE}/fonts.json`;
  const EFFECTS_URL = `${REPO_RAW_BASE}/effects.json`;
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
      // Built-in/remote themes must also pass the color-only safety check.
      const cleaned = sanitizeThemeVars(theme.vars);
      if (Object.keys(theme.vars).length && !Object.keys(cleaned.vars).length) return false;
      if (cleaned.errors.length) return false;
    }
    return true;
  }

  function isValidFontsCatalog(data) {
    if (!Array.isArray(data) || !data.length) return false;
    const cleaned = data.map(sanitizeFontPreset).filter(Boolean);
    return cleaned.length === data.length && cleaned[0].id === 'default';
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
        const cleaned = data.map(sanitizeFontPreset).filter(Boolean);
        remoteFonts = cleaned;
        saveCachedFonts(cleaned);
        if (typeof refreshSettingsPanel === 'function') refreshSettingsPanel();
        return cleaned;
      } catch (e) {
        return getPresetFonts();
      } finally {
        fontsLoadInFlight = null;
      }
    })();

    return fontsLoadInFlight;
  }

  async function loadEffects() {
    if (effectsLoadInFlight) return effectsLoadInFlight;

    effectsLoadInFlight = (async () => {
      try {
        const res = await fetch(`${EFFECTS_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('bad response');
        const data = await res.json();
        if (!isValidEffectsCatalog(data)) throw new Error('invalid effects catalog');
        remoteEffects = data;
        saveCachedEffects(data);
        // Drop unknown/removed effect ids back to none.
        if (!isKnownEffectId(getBackgroundEffect())) setBackgroundEffect('none');
        if (typeof refreshSettingsPanel === 'function') refreshSettingsPanel();
        return data;
      } catch (e) {
        return getBackgroundEffects();
      } finally {
        effectsLoadInFlight = null;
      }
    })();

    return effectsLoadInFlight;
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

    const reminderText = document.createElement('div');
    reminderText.textContent = 'Note: If it says an update is available but you are ALREADY on the new version (e.g. 2.0), you need to completely delete the script and recreate it, not just click update.';
    Object.assign(reminderText.style, { color: 'var(--warning-yellow)', fontSize: '11px', marginTop: '2px', fontWeight: 'bold' });
    banner.appendChild(reminderText);

    const urlText = document.createElement('div');
    urlText.textContent = SCRIPT_UPDATE_URL;
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

    const yesBtn = document.createElement('a');
    yesBtn.textContent = 'Yes, install update';
    yesBtn.href = SCRIPT_UPDATE_URL;
    yesBtn.target = '_blank';
    yesBtn.rel = 'noopener noreferrer';
    Object.assign(yesBtn.style, {
      padding: '7px 14px', borderRadius: '6px', cursor: 'pointer',
      background: 'var(--primary-action)', color: 'var(--primary-foreground)',
      fontWeight: 'bold', fontSize: '12px', textDecoration: 'none', display: 'inline-block'
    });
    yesBtn.addEventListener('mouseenter', () => yesBtn.style.background = 'var(--primary-hover)');
    yesBtn.addEventListener('mouseleave', () => yesBtn.style.background = 'var(--primary-action)');
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

  function showBootDisclaimerToast() {
    const banner = document.createElement('div');
    Object.assign(banner.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '1000003',
      background: 'var(--popups-and-modals)',
      color: 'var(--text-primary)',
      border: '1px solid var(--warning-yellow)',
      borderRadius: '10px',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontSize: '13px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      maxWidth: '450px',
      lineHeight: '1.4'
    });

    const headerRow = document.createElement('div');
    Object.assign(headerRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

    const title = document.createElement('div');
    title.textContent = 'Unofficial Tool';
    Object.assign(title.style, { fontWeight: 'bold', color: 'var(--warning-yellow)' });
    
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, { cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' });
    closeBtn.onclick = () => banner.remove();

    headerRow.appendChild(title);
    headerRow.appendChild(closeBtn);
    banner.appendChild(headerRow);

    const bodyText = document.createElement('div');
    bodyText.textContent = "Fencord is an unofficial, community-made tool. It is not built by the Fenrid team, but the owner is aware of it and has said it's fine to use. Fenrid is developed and paid for out of pocket by its owner — if you enjoy the platform, please consider supporting the official paid plan when it launches. It directly keeps this running for everyone.";
    banner.appendChild(bodyText);

    document.body.appendChild(banner);

    setTimeout(() => {
      if (banner.parentElement) banner.remove();
    }, 10000);
  }

  // ---------------------------------------------------------------
  // USERNAME HIDER PLUGIN
  // Replaces visible username text with a random alphanumeric string
  // that re-scrambles every ~1.5 s. Three modes:
  //   mine   — only scramble the current user’s own name
  //   others — only scramble everyone else’s names
  //   both   — scramble all usernames
  // The scrambled text is a fixed-length string of random chars drawn
  // from [a-z0-9] so it looks like garbage but stays readable-width.
  // ---------------------------------------------------------------

  const USERNAME_HIDER_KEY = 'fencord-username-hider-mode';
  const ALLOWED_HIDER_MODES = new Set(['off', 'mine', 'others', 'both']);
  let usernameHiderInterval = null;

  const HIDER_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

  function randomScramble(length) {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += HIDER_CHARS[Math.floor(Math.random() * HIDER_CHARS.length)];
    }
    return out;
  }

  function getUsernameHiderMode() {
    const v = localStorage.getItem(USERNAME_HIDER_KEY) || 'off';
    return ALLOWED_HIDER_MODES.has(v) ? v : 'off';
  }

  function saveUsernameHiderMode(mode) {
    localStorage.setItem(USERNAME_HIDER_KEY, ALLOWED_HIDER_MODES.has(mode) ? mode : 'off');
  }

  function tickUsernameHider() {
    try {
      const mode = getUsernameHiderMode();
      if (mode === 'off') return;

      const myName = getMyRealUsername();

      document.querySelectorAll('span.font-semibold.cursor-pointer').forEach(el => {
        // Save original text once.
        if (!el.dataset.fencordHiderOriginal) {
          el.dataset.fencordHiderOriginal = el.textContent.trim();
        }
        const original = el.dataset.fencordHiderOriginal;
        const isMe = myName && original === myName;

        const shouldHide =
          mode === 'both' ||
          (mode === 'mine' && isMe) ||
          (mode === 'others' && !isMe);

        if (shouldHide) {
          el.dataset.fencordHiderActive = '1';
          el.textContent = randomScramble(original.length || 6);
        } else if (el.dataset.fencordHiderActive === '1') {
          // This element was previously scrambled but is no longer in scope
          // (e.g. mode changed to 'mine' and this is someone else).
          delete el.dataset.fencordHiderActive;
          el.textContent = original;
        }
      });
    } catch (e) {}
  }

  function revertUsernameHider() {
    document.querySelectorAll('[data-fencord-hider-original]').forEach(el => {
      el.textContent = el.dataset.fencordHiderOriginal;
      delete el.dataset.fencordHiderOriginal;
      delete el.dataset.fencordHiderActive;
    });
  }

  function setUsernameHiderMode(mode) {
    const clean = ALLOWED_HIDER_MODES.has(mode) ? mode : 'off';
    saveUsernameHiderMode(clean);

    // Always revert first so we start fresh.
    revertUsernameHider();

    if (clean === 'off') {
      if (usernameHiderInterval) { clearInterval(usernameHiderInterval); usernameHiderInterval = null; }
      return;
    }

    tickUsernameHider();

    if (!usernameHiderInterval) {
      usernameHiderInterval = setInterval(tickUsernameHider, 1500);
    }
  }

  function initUsernameHider() {
    const mode = getUsernameHiderMode();
    if (mode !== 'off') setUsernameHiderMode(mode);
  }

  function init() {
    applyTheme(getSavedTheme());
    initFont();
    createSettingsUI();
    loadThemes();
    loadFonts();
    loadEffects();
    tryDetectRealUsername();
    if (isRgbEnabled()) setRgbEnabled(true);
    if (getDisplayNameOverride()) setDisplayNameEnabled(true);
    initTimestampFormat();
    if (isImageBlurEnabled()) setImageBlurEnabled(true);
    if (isSoftTapsEnabled()) setSoftTapsEnabled(true);
    setBackgroundEffect(getBackgroundEffect());
    if (isCallTimerEnabled()) setCallTimerEnabled(true);
    initUsernameHider();
    createFencordWatermark();
    startUpdateChecker();
    showBootDisclaimerToast();
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
