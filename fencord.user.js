// ==UserScript==
// @name         Fencord
// @namespace    fencord
// @version      0.6
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
      "--primary-foreground": "#1e1e2e"
    }
  };

  const builtInThemes = {
    none: { name: 'None (Default)', vars: {} },
    hotpink: {
      name: 'Hot Pink',
      vars: {
        '--background': '#2b0010', '--foreground': '#ffffff',
        '--server-sidebar': '#1a0009', '--channel-sidebar': '#3d0016',
        '--main-chat-area': '#2b0010', '--member-list': '#1a0009',
        '--popups-and-modals': '#3d0016', '--borders-and-separators': '#ff0055',
        '--primary-action': '#ff007f', '--primary-hover': '#ff3399',
        '--secondary-button': '#660033', '--secondary-button-hover': '#99004d',
        '--accent-vibrant': '#ff007f', '--success-green': '#ff66aa',
        '--error-red': '#ff0000', '--warning-yellow': '#ff66aa',
        '--text-primary': '#ffffff', '--text-secondary': '#ffb3d1',
        '--text-muted': '#ff80b3', '--interactive-hover': '#ff007f',
        '--hover-overlay': '#ff007f22', '--active-overlay': '#ff007f33',
        '--primary-foreground': '#ffffff'
      }
    },
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
        '--primary-foreground': '#1e1e2e'
      }
    },
    dracula: {
      name: 'Dracula',
      vars: {
        '--background': '#282a36', '--foreground': '#f8f8f2',
        '--server-sidebar': '#21222c', '--channel-sidebar': '#282a36',
        '--main-chat-area': '#282a36', '--member-list': '#21222c',
        '--popups-and-modals': '#282a36', '--borders-and-separators': '#44475a',
        '--primary-action': '#bd93f9', '--primary-hover': '#a679f2',
        '--secondary-button': '#44475a', '--secondary-button-hover': '#565a72',
        '--accent-vibrant': '#ff79c6', '--success-green': '#50fa7b',
        '--error-red': '#ff5555', '--warning-yellow': '#f1fa8c',
        '--text-primary': '#f8f8f2', '--text-secondary': '#bfbfd1',
        '--text-muted': '#6272a4', '--interactive-hover': '#bd93f9',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#282a36'
      }
    },
    nord: {
      name: 'Nord',
      vars: {
        '--background': '#2e3440', '--foreground': '#eceff4',
        '--server-sidebar': '#242933', '--channel-sidebar': '#2e3440',
        '--main-chat-area': '#2e3440', '--member-list': '#242933',
        '--popups-and-modals': '#2e3440', '--borders-and-separators': '#4c566a',
        '--primary-action': '#88c0d0', '--primary-hover': '#8fbcbb',
        '--secondary-button': '#3b4252', '--secondary-button-hover': '#434c5e',
        '--accent-vibrant': '#81a1c1', '--success-green': '#a3be8c',
        '--error-red': '#bf616a', '--warning-yellow': '#ebcb8b',
        '--text-primary': '#eceff4', '--text-secondary': '#d8dee9',
        '--text-muted': '#7b88a1', '--interactive-hover': '#88c0d0',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#2e3440'
      }
    },
    gruvbox: {
      name: 'Gruvbox Dark',
      vars: {
        '--background': '#282828', '--foreground': '#ebdbb2',
        '--server-sidebar': '#1d2021', '--channel-sidebar': '#282828',
        '--main-chat-area': '#282828', '--member-list': '#1d2021',
        '--popups-and-modals': '#282828', '--borders-and-separators': '#3c3836',
        '--primary-action': '#fe8019', '--primary-hover': '#fb923c',
        '--secondary-button': '#3c3836', '--secondary-button-hover': '#504945',
        '--accent-vibrant': '#fabd2f', '--success-green': '#b8bb26',
        '--error-red': '#fb4934', '--warning-yellow': '#fabd2f',
        '--text-primary': '#ebdbb2', '--text-secondary': '#d5c4a1',
        '--text-muted': '#928374', '--interactive-hover': '#fe8019',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#282828'
      }
    },
    tokyonight: {
      name: 'Tokyo Night',
      vars: {
        '--background': '#1a1b26', '--foreground': '#c0caf5',
        '--server-sidebar': '#16161e', '--channel-sidebar': '#1a1b26',
        '--main-chat-area': '#1a1b26', '--member-list': '#16161e',
        '--popups-and-modals': '#1a1b26', '--borders-and-separators': '#292e42',
        '--primary-action': '#7aa2f7', '--primary-hover': '#89b4fa',
        '--secondary-button': '#292e42', '--secondary-button-hover': '#3b4261',
        '--accent-vibrant': '#bb9af7', '--success-green': '#9ece6a',
        '--error-red': '#f7768e', '--warning-yellow': '#e0af68',
        '--text-primary': '#c0caf5', '--text-secondary': '#a9b1d6',
        '--text-muted': '#565f89', '--interactive-hover': '#7aa2f7',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#1a1b26'
      }
    },
    vaporwave: {
      name: 'Vaporwave',
      vars: {
        '--background': '#241b2f', '--foreground': '#f8f0fb',
        '--server-sidebar': '#1a1424', '--channel-sidebar': '#2b2038',
        '--main-chat-area': '#241b2f', '--member-list': '#1a1424',
        '--popups-and-modals': '#2b2038', '--borders-and-separators': '#553c7b',
        '--primary-action': '#ff6ad5', '--primary-hover': '#ff8ade',
        '--secondary-button': '#3c2b52', '--secondary-button-hover': '#513a6d',
        '--accent-vibrant': '#8bd3ff', '--success-green': '#94ffb3',
        '--error-red': '#ff5c8a', '--warning-yellow': '#ffd76a',
        '--text-primary': '#f8f0fb', '--text-secondary': '#d3b8e8',
        '--text-muted': '#8d6fae', '--interactive-hover': '#ff6ad5',
        '--hover-overlay': '#ff6ad51a', '--active-overlay': '#ff6ad526',
        '--primary-foreground': '#241b2f'
      }
    },
    glitchcore: {
      name: 'Glitchcore',
      vars: {
        '--background': '#0a0a0f', '--foreground': '#e0fbff',
        '--server-sidebar': '#050507', '--channel-sidebar': '#0f0f16',
        '--main-chat-area': '#0a0a0f', '--member-list': '#050507',
        '--popups-and-modals': '#0f0f16', '--borders-and-separators': '#ff00e5',
        '--primary-action': '#00fff2', '--primary-hover': '#5affee',
        '--secondary-button': '#1a1a24', '--secondary-button-hover': '#2a2a38',
        '--accent-vibrant': '#ff00e5', '--success-green': '#39ff14',
        '--error-red': '#ff0037', '--warning-yellow': '#faff00',
        '--text-primary': '#e0fbff', '--text-secondary': '#9be8ff',
        '--text-muted': '#4d6b73', '--interactive-hover': '#ff00e5',
        '--hover-overlay': '#00fff21a', '--active-overlay': '#ff00e526',
        '--primary-foreground': '#0a0a0f'
      }
    },
    digicore: {
      name: 'Digicore',
      vars: {
        '--background': '#12101c', '--foreground': '#f1e8ff',
        '--server-sidebar': '#0b0a13', '--channel-sidebar': '#171425',
        '--main-chat-area': '#12101c', '--member-list': '#0b0a13',
        '--popups-and-modals': '#171425', '--borders-and-separators': '#3a2e5c',
        '--primary-action': '#c77dff', '--primary-hover': '#d896ff',
        '--secondary-button': '#241f3a', '--secondary-button-hover': '#332a52',
        '--accent-vibrant': '#7dfff0', '--success-green': '#7dffb0',
        '--error-red': '#ff5c7a', '--warning-yellow': '#ffe27d',
        '--text-primary': '#f1e8ff', '--text-secondary': '#c9b8ea',
        '--text-muted': '#6b5a94', '--interactive-hover': '#c77dff',
        '--hover-overlay': '#c77dff1a', '--active-overlay': '#c77dff26',
        '--primary-foreground': '#12101c'
      }
    },
    solarizedlight: {
      name: 'Solarized Light',
      vars: {
        '--background': '#fdf6e3', '--foreground': '#073642',
        '--server-sidebar': '#eee8d5', '--channel-sidebar': '#fdf6e3',
        '--main-chat-area': '#fdf6e3', '--member-list': '#eee8d5',
        '--popups-and-modals': '#fdf6e3', '--borders-and-separators': '#d3cbb7',
        '--primary-action': '#268bd2', '--primary-hover': '#2aa1f0',
        '--secondary-button': '#e4ddc8', '--secondary-button-hover': '#d8d0b8',
        '--accent-vibrant': '#2aa198', '--success-green': '#859900',
        '--error-red': '#dc322f', '--warning-yellow': '#b58900',
        '--text-primary': '#073642', '--text-secondary': '#4c6b70',
        '--text-muted': '#93a1a1', '--interactive-hover': '#268bd2',
        '--hover-overlay': '#00000012', '--active-overlay': '#0000001e',
        '--primary-foreground': '#fdf6e3'
      }
    },
    paperwhite: {
      name: 'Paper White',
      vars: {
        '--background': '#ffffff', '--foreground': '#1a1a1a',
        '--server-sidebar': '#f4f4f5', '--channel-sidebar': '#ffffff',
        '--main-chat-area': '#ffffff', '--member-list': '#f4f4f5',
        '--popups-and-modals': '#ffffff', '--borders-and-separators': '#e2e2e5',
        '--primary-action': '#3355ff', '--primary-hover': '#5470ff',
        '--secondary-button': '#eeeef0', '--secondary-button-hover': '#e2e2e6',
        '--accent-vibrant': '#3355ff', '--success-green': '#1f9d55',
        '--error-red': '#e0293e', '--warning-yellow': '#c98a11',
        '--text-primary': '#1a1a1a', '--text-secondary': '#55555a',
        '--text-muted': '#9a9aa0', '--interactive-hover': '#3355ff',
        '--hover-overlay': '#00000010', '--active-overlay': '#0000001c',
        '--primary-foreground': '#ffffff'
      }
    },
    midnightocean: {
      name: 'Midnight Ocean',
      vars: {
        '--background': '#031521', '--foreground': '#dff4ff',
        '--server-sidebar': '#020f18', '--channel-sidebar': '#04202f',
        '--main-chat-area': '#031521', '--member-list': '#020f18',
        '--popups-and-modals': '#04202f', '--borders-and-separators': '#0d3d54',
        '--primary-action': '#20b2c4', '--primary-hover': '#37c8d9',
        '--secondary-button': '#0a2c3d', '--secondary-button-hover': '#0f3a4f',
        '--accent-vibrant': '#3ee8e2', '--success-green': '#4de1a4',
        '--error-red': '#ff5c66', '--warning-yellow': '#ffcf5c',
        '--text-primary': '#dff4ff', '--text-secondary': '#9fd4e6',
        '--text-muted': '#4d7d90', '--interactive-hover': '#20b2c4',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#031521'
      }
    },
    sunsetpeach: {
      name: 'Sunset Peach',
      vars: {
        '--background': '#2b1a1f', '--foreground': '#ffe8dc',
        '--server-sidebar': '#201316', '--channel-sidebar': '#332026',
        '--main-chat-area': '#2b1a1f', '--member-list': '#201316',
        '--popups-and-modals': '#332026', '--borders-and-separators': '#5c3a3f',
        '--primary-action': '#ff9770', '--primary-hover': '#ffab8c',
        '--secondary-button': '#452a30', '--secondary-button-hover': '#593640',
        '--accent-vibrant': '#ffc785', '--success-green': '#a8d982',
        '--error-red': '#ff6b6b', '--warning-yellow': '#ffd166',
        '--text-primary': '#ffe8dc', '--text-secondary': '#e0b8ab',
        '--text-muted': '#8c6a63', '--interactive-hover': '#ff9770',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#2b1a1f'
      }
    },
    forestmoss: {
      name: 'Forest Moss',
      vars: {
        '--background': '#1a2419', '--foreground': '#e6f1e3',
        '--server-sidebar': '#131b12', '--channel-sidebar': '#202d1f',
        '--main-chat-area': '#1a2419', '--member-list': '#131b12',
        '--popups-and-modals': '#202d1f', '--borders-and-separators': '#3b4f38',
        '--primary-action': '#7fbf6b', '--primary-hover': '#94d180',
        '--secondary-button': '#2a3a28', '--secondary-button-hover': '#374a34',
        '--accent-vibrant': '#b4d97a', '--success-green': '#7fbf6b',
        '--error-red': '#e0655e', '--warning-yellow': '#dcbb5c',
        '--text-primary': '#e6f1e3', '--text-secondary': '#b6ccb1',
        '--text-muted': '#6b8266', '--interactive-hover': '#7fbf6b',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#1a2419'
      }
    },
    pastelcloud: {
      name: 'Pastel Cloud',
      vars: {
        '--background': '#f5f0fa', '--foreground': '#4a3f5c',
        '--server-sidebar': '#ece2f7', '--channel-sidebar': '#f5f0fa',
        '--main-chat-area': '#f5f0fa', '--member-list': '#ece2f7',
        '--popups-and-modals': '#f5f0fa', '--borders-and-separators': '#dccdec',
        '--primary-action': '#b09aef', '--primary-hover': '#c1aef4',
        '--secondary-button': '#e4d6f2', '--secondary-button-hover': '#d8c6ec',
        '--accent-vibrant': '#f6a6c1', '--success-green': '#8fd6a8',
        '--error-red': '#ef8a9c', '--warning-yellow': '#f3d089',
        '--text-primary': '#4a3f5c', '--text-secondary': '#786b8c',
        '--text-muted': '#ac9dc0', '--interactive-hover': '#b09aef',
        '--hover-overlay': '#00000010', '--active-overlay': '#0000001c',
        '--primary-foreground': '#ffffff'
      }
    },
    bloodmoon: {
      name: 'Blood Moon',
      vars: {
        '--background': '#160707', '--foreground': '#ffe2e2',
        '--server-sidebar': '#0d0404', '--channel-sidebar': '#200a0a',
        '--main-chat-area': '#160707', '--member-list': '#0d0404',
        '--popups-and-modals': '#200a0a', '--borders-and-separators': '#5c1a1a',
        '--primary-action': '#e0393f', '--primary-hover': '#f04c52',
        '--secondary-button': '#2e0f0f', '--secondary-button-hover': '#421414',
        '--accent-vibrant': '#ff6b6b', '--success-green': '#7fbf6b',
        '--error-red': '#ff2d2d', '--warning-yellow': '#e0a13f',
        '--text-primary': '#ffe2e2', '--text-secondary': '#d19a9a',
        '--text-muted': '#7a4a4a', '--interactive-hover': '#e0393f',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#160707'
      }
    },
    monochrome: {
      name: 'Monochrome',
      vars: {
        '--background': '#141414', '--foreground': '#eaeaea',
        '--server-sidebar': '#0d0d0d', '--channel-sidebar': '#1a1a1a',
        '--main-chat-area': '#141414', '--member-list': '#0d0d0d',
        '--popups-and-modals': '#1a1a1a', '--borders-and-separators': '#333333',
        '--primary-action': '#d9d9d9', '--primary-hover': '#ffffff',
        '--secondary-button': '#242424', '--secondary-button-hover': '#303030',
        '--accent-vibrant': '#bfbfbf', '--success-green': '#9ecb9e',
        '--error-red': '#d97a7a', '--warning-yellow': '#d9c47a',
        '--text-primary': '#eaeaea', '--text-secondary': '#a6a6a6',
        '--text-muted': '#5c5c5c', '--interactive-hover': '#d9d9d9',
        '--hover-overlay': '#ffffff0d', '--active-overlay': '#ffffff14',
        '--primary-foreground': '#141414'
      }
    }
  };

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
    return { ...builtInThemes, ...getCustomThemes() };
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
      return;
    }

    const rules = Object.entries(theme.vars)
      .map(([k, v]) => `${k}: ${v} !important;`)
      .join('\n');

    styleEl.textContent = `:root {\n${rules}\n}`;
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
      alert('Template copied to clipboard! Edit the hex values, then use Import.');
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
      '--primary-foreground': light ? '#ffffff' : bgHex
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

  function applyRgbToUsernames() {
    tickRgbColors();
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

  const presetFonts = [
    { id: 'default', label: 'Default', family: null, googleName: null },
    { id: 'inter', label: 'Inter', family: "'Inter', sans-serif", googleName: 'Inter:wght@400;600;700' },
    { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", googleName: 'Poppins:wght@400;600;700' },
    { id: 'jetbrains', label: 'JetBrains Mono', family: "'JetBrains Mono', monospace", googleName: 'JetBrains+Mono:wght@400;600;700' },
    { id: 'comicneue', label: 'Comic Neue', family: "'Comic Neue', cursive", googleName: 'Comic+Neue:wght@400;700' },
    { id: 'pressstart', label: 'Press Start 2P', family: "'Press Start 2P', system-ui", googleName: 'Press+Start+2P' },
    { id: 'spacemono', label: 'Space Mono', family: "'Space Mono', monospace", googleName: 'Space+Mono:wght@400;700' }
  ];

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
    const preset = presetFonts.find(f => f.id === presetId);
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

  // ---------------------------------------------------------------
  // SANDBOXED PLUGIN RUNNER
  // Plugins run inside a sandboxed iframe (allow-scripts only, NOT
  // allow-same-origin) so they physically cannot access document,
  // cookies, localStorage, or fetch as the real page. They can only
  // talk back to us via postMessage with a small safe command set.
  // ---------------------------------------------------------------

  const PLUGIN_STORAGE_KEY = 'fencord-plugins';
  const activePluginFrames = {};

  function getInstalledPlugins() {
    try {
      return JSON.parse(localStorage.getItem(PLUGIN_STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveInstalledPlugins(obj) {
    localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(obj));
  }

  // The sandboxed document injected into the iframe. It has a
  // `Fencord` object as the ONLY way to affect anything. No DOM,
  // no window.top access (sandbox blocks that), no fetch, no storage.
  function buildSandboxHTML(pluginCode) {
    return `
      <script>
        const Fencord = {
          addCSS(css) {
            parent.postMessage({ type: 'addCSS', css }, '*');
          },
          log(msg) {
            parent.postMessage({ type: 'log', msg: String(msg) }, '*');
          }
        };
        try {
          ${pluginCode}
        } catch (e) {
          parent.postMessage({ type: 'error', msg: e.message }, '*');
        }
      <\/script>
    `;
  }

  function runPluginInSandbox(pluginId, code) {
    stopPlugin(pluginId);

    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts'; // deliberately NOT allow-same-origin
    iframe.style.display = 'none';
    iframe.srcdoc = buildSandboxHTML(code);
    document.body.appendChild(iframe);

    activePluginFrames[pluginId] = iframe;
  }

  function stopPlugin(pluginId) {
    if (activePluginFrames[pluginId]) {
      activePluginFrames[pluginId].remove();
      delete activePluginFrames[pluginId];
    }
    const styleEl = document.getElementById('fencord-plugin-css-' + pluginId);
    if (styleEl) styleEl.remove();
  }

  window.addEventListener('message', (event) => {
    const pluginId = Object.keys(activePluginFrames).find(
      id => activePluginFrames[id].contentWindow === event.source
    );
    if (!pluginId) return;

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'addCSS' && typeof data.css === 'string') {
      let styleEl = document.getElementById('fencord-plugin-css-' + pluginId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'fencord-plugin-css-' + pluginId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = data.css;
    } else if (data.type === 'log') {
      console.log('[Fencord plugin ' + pluginId + ']', data.msg);
    } else if (data.type === 'error') {
      console.error('[Fencord plugin ' + pluginId + ' error]', data.msg);
    }
  });

  function createSettingsUI() {
    const settingsBtn = document.querySelector('button[title="Settings"]');
    if (!settingsBtn) {
      setTimeout(createSettingsUI, 1000);
      return;
    }

    if (document.getElementById('fencord-btn')) return;

    const btn = settingsBtn.cloneNode(true);
    btn.id = 'fencord-btn';
    btn.title = 'Fencord Settings';
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
      for (const [key, theme] of Object.entries(themes)) {
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '4px',
          maxWidth: '420px'
        });

        const option = document.createElement('div');
        option.textContent = theme.name;
        Object.assign(option.style, {
          flex: '1',
          padding: '10px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          background: getSavedTheme() === key ? 'var(--hover-overlay)' : 'transparent'
        });
        option.addEventListener('mouseenter', () => option.style.background = 'var(--hover-overlay)');
        option.addEventListener('mouseleave', () => {
          option.style.background = getSavedTheme() === key ? 'var(--hover-overlay)' : 'transparent';
        });
        option.addEventListener('click', () => {
          applyTheme(key);
          saveTheme(key);
          renderPanel();
        });
        row.appendChild(option);

        if (key.startsWith('custom_')) {
          const delBtn = document.createElement('div');
          delBtn.textContent = '🗑️';
          Object.assign(delBtn.style, {
            padding: '10px 14px',
            borderRadius: '6px',
            cursor: 'pointer'
          });
          delBtn.title = 'Delete theme';
          delBtn.addEventListener('mouseenter', () => delBtn.style.background = 'var(--danger-secondary-button)');
          delBtn.addEventListener('mouseleave', () => delBtn.style.background = '');
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
          row.appendChild(delBtn);
        }

        body.appendChild(row);
      }

      const divider = document.createElement('div');
      Object.assign(divider.style, { borderTop: '1px solid var(--borders-and-separators)', margin: '20px 0', maxWidth: '420px' });
      body.appendChild(divider);

      const actionsRow = document.createElement('div');
      Object.assign(actionsRow.style, { display: 'flex', gap: '10px', flexWrap: 'wrap', maxWidth: '420px' });

      const importBtn = document.createElement('div');
      importBtn.textContent = '📥 Import Theme';
      Object.assign(importBtn.style, {
        padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', background: 'var(--secondary-button)', color: 'var(--text-primary)'
      });
      importBtn.addEventListener('mouseenter', () => importBtn.style.background = 'var(--secondary-button-hover)');
      importBtn.addEventListener('mouseleave', () => importBtn.style.background = 'var(--secondary-button)');
      importBtn.addEventListener('click', () => importThemeFlow(renderPanel));
      actionsRow.appendChild(importBtn);

      const templateBtn = document.createElement('div');
      templateBtn.textContent = '📋 Copy Template';
      Object.assign(templateBtn.style, {
        padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', background: 'var(--secondary-button)', color: 'var(--text-primary)'
      });
      templateBtn.addEventListener('mouseenter', () => templateBtn.style.background = 'var(--secondary-button-hover)');
      templateBtn.addEventListener('mouseleave', () => templateBtn.style.background = 'var(--secondary-button)');
      templateBtn.addEventListener('click', copyTemplate);
      actionsRow.appendChild(templateBtn);

      const quickBtn = document.createElement('div');
      quickBtn.textContent = '🎨 Quick 2-Color Theme';
      Object.assign(quickBtn.style, {
        padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
        background: 'var(--primary-action)', color: 'var(--primary-foreground)', fontWeight: 'bold'
      });
      quickBtn.addEventListener('mouseenter', () => quickBtn.style.background = 'var(--primary-hover)');
      quickBtn.addEventListener('mouseleave', () => quickBtn.style.background = 'var(--primary-action)');
      quickBtn.addEventListener('click', () => openQuickThemeUI(renderPanel));
      actionsRow.appendChild(quickBtn);

      body.appendChild(actionsRow);
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
      presetFonts.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.label;
        fontSelect.appendChild(opt);
      });
      // Reflect current selection if it matches a preset
      if (savedFont) {
        const match = presetFonts.find(f => f.label === savedFont.label);
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
        padding: '0 14px 24px 14px',
        color: 'var(--primary-action)',
        textShadow: '0 0 12px var(--hover-overlay)'
      });
      sidebar.appendChild(logo);

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

  // Try to learn the user's real username by checking the settings/profile
  // area once on load. Best-effort: if we can't find it, the override simply
  // won't have anything to replace yet, and the user can set it via prompt.
  function tryDetectRealUsername() {
    if (getMyRealUsername()) return;
    // Common pattern: a "My Account" section or profile button often has
    // the user's own name nearby. This is best-effort and safe to fail.
    const candidate = document.querySelector('[data-fencord-self-name]');
    if (candidate && candidate.textContent.trim()) {
      localStorage.setItem(ORIGINAL_NAME_KEY, candidate.textContent.trim());
    }
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

  function tickImageBlur() {
    document.querySelectorAll('img').forEach(img => {
      // Skip tiny images (likely icons/avatars/emoji, not attachments)
      if (img.naturalWidth && img.naturalWidth < 64) return;
      if (img.dataset.fencordBlurred === '1') return;

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
    });
  }

  function revertImageBlur() {
    document.querySelectorAll('[data-fencord-blurred="1"]').forEach(img => {
      img.style.filter = '';
      img.style.cursor = '';
      img.title = '';
      delete img.dataset.fencordBlurred;
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

  const CURRENT_VERSION = '0.6';
  const REPO_RAW_BASE = 'https://cdn.jsdelivr.net/gh/fencord/fencord@main';
  const VERSION_CHECK_URL = `${REPO_RAW_BASE}/version.json`;
  const SCRIPT_UPDATE_URL = `${REPO_RAW_BASE}/fencord.user.js`;
  const REPO_PAGE_URL = 'https://github.com/fencord/fencord';

  let updateCheckResult = null; // { available: bool, latestVersion: string } | null while unknown

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

  async function checkForUpdate() {
    if (updateCheckResult !== null) return updateCheckResult;
    try {
      const res = await fetch(VERSION_CHECK_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const latest = data.version;
      const available = typeof latest === 'string' && compareVersions(latest, CURRENT_VERSION) > 0;
      updateCheckResult = { available, latestVersion: latest };
    } catch (e) {
      // Network/repo not set up yet, or offline — fail silently, no nag.
      updateCheckResult = { available: false, latestVersion: null };
    }
    return updateCheckResult;
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
      closeBtn.addEventListener('click', () => banner.remove());
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
    noBtn.addEventListener('click', () => banner.remove());
    btnRow.appendChild(noBtn);

    banner.appendChild(btnRow);

    return banner;
  }

  async function createUpdateCheckToast() {
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
      if (banner.parentElement) banner.remove();
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
    watermark.title = 'FENCORD';
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
  }

  function init() {
    applyTheme(getSavedTheme());
    initFont();
    createSettingsUI();
    if (isRgbEnabled()) setRgbEnabled(true);
    if (getDisplayNameOverride()) setDisplayNameEnabled(true);
    initTimestampFormat();
    if (isImageBlurEnabled()) setImageBlurEnabled(true);
    createFencordWatermark();
    checkForUpdate().then(() => createUpdateCheckToast());
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
