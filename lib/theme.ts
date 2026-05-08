export type ThemeName = "dark" | "light" | "ocean" | "sunset";

export interface ThemePreview {
  bg: string;
  sidebar: string;
  card: string;
  accent: string;
  accent2: string;
  text: string;
}

export interface ThemeDef {
  label: string;
  description: string;
  preview: ThemePreview;
}

export const THEMES: Record<ThemeName, ThemeDef> = {
  dark: {
    label: "Dark",
    description: "Deep navy — Webby SG default",
    preview: {
      bg: "#070d18", sidebar: "#0c1522", card: "#101d2e",
      accent: "#38b6e8", accent2: "#ff6b47", text: "#cce4ff",
    },
  },
  light: {
    label: "Light",
    description: "Clean & bright for daylight work",
    preview: {
      bg: "#f0f7ff", sidebar: "#ffffff", card: "#ffffff",
      accent: "#38b6e8", accent2: "#ff6b47", text: "#0a1828",
    },
  },
  ocean: {
    label: "Ocean",
    description: "Midnight blue — focused and calm",
    preview: {
      bg: "#040c16", sidebar: "#071220", card: "#0b1a2c",
      accent: "#22d3ee", accent2: "#38b6e8", text: "#b8daff",
    },
  },
  sunset: {
    label: "Sunset",
    description: "Warm coral — creative energy",
    preview: {
      bg: "#0e0c08", sidebar: "#18140a", card: "#221c0e",
      accent: "#ff6b47", accent2: "#ff9a3e", text: "#fff0d8",
    },
  },
};

export const STORAGE_KEY = "agencyos-theme";

const CSS_VARS: Record<ThemeName, Record<string, string>> = {
  dark: {
    "--bg-base": "#070d18", "--bg-sidebar": "#0c1522", "--bg-card": "#101d2e",
    "--bg-surface": "#142233", "--border": "#1c3248", "--text": "#cce4ff",
    "--text-muted": "#4a7090", "--accent": "#38b6e8", "--accent-2": "#ff6b47",
    "--accent-rgb": "56, 182, 232",
  },
  light: {
    "--bg-base": "#f0f7ff", "--bg-sidebar": "#ffffff", "--bg-card": "#ffffff",
    "--bg-surface": "#e8f4ff", "--border": "#c8dff0", "--text": "#0a1828",
    "--text-muted": "#5a7a90", "--accent": "#38b6e8", "--accent-2": "#ff6b47",
    "--accent-rgb": "56, 182, 232",
  },
  ocean: {
    "--bg-base": "#040c16", "--bg-sidebar": "#071220", "--bg-card": "#0b1a2c",
    "--bg-surface": "#0e2035", "--border": "#153050", "--text": "#b8daff",
    "--text-muted": "#3a6080", "--accent": "#22d3ee", "--accent-2": "#38b6e8",
    "--accent-rgb": "34, 211, 238",
  },
  sunset: {
    "--bg-base": "#0e0c08", "--bg-sidebar": "#18140a", "--bg-card": "#221c0e",
    "--bg-surface": "#2a2210", "--border": "#3a3018", "--text": "#fff0d8",
    "--text-muted": "#907050", "--accent": "#ff6b47", "--accent-2": "#ff9a3e",
    "--accent-rgb": "255, 107, 71",
  },
};

export function getStoredTheme(): ThemeName {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem(STORAGE_KEY) as ThemeName) ?? "dark";
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  const vars = CSS_VARS[theme];
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val);
  }
  root.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function getThemeVarsScript(): string {
  return `(function(){
    var t=localStorage.getItem('${STORAGE_KEY}')||'dark';
    var v=${JSON.stringify(CSS_VARS)};
    var vars=v[t]||v['dark'];
    var r=document.documentElement;
    for(var k in vars){r.style.setProperty(k,vars[k]);}
    r.setAttribute('data-theme',t);
  })();`;
}
