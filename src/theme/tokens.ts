import type { AppRole } from "@/store";

export type RoleThemeKey = "lawyer" | "business" | "student" | "normal";

export const roleThemeMap: Record<Exclude<AppRole, null>, RoleThemeKey> = {
  Lawyer: "lawyer",
  "Business/Corporate": "business",
  "Law Student": "student",
  "Normal Person": "normal",
  Individual: "normal",
};

export const roleAccentGradients: Record<RoleThemeKey, string> = {
  lawyer: "from-blue-500 via-indigo-500 to-sky-400",
  business: "from-teal-500 via-emerald-500 to-cyan-400",
  student: "from-violet-500 via-fuchsia-500 to-indigo-400",
  normal: "from-sky-500 via-blue-500 to-cyan-400",
};

export const roleBackdropPalette: Record<
  RoleThemeKey,
  {
    a: string;
    b: string;
    c: string;
    d: string;
    lineA: string;
    lineB: string;
  }
> = {
  lawyer: {
    a: "59,130,246",
    b: "99,102,241",
    c: "56,189,248",
    d: "20,184,166",
    lineA: "59,130,246",
    lineB: "99,102,241",
  },
  business: {
    a: "20,184,166",
    b: "16,185,129",
    c: "34,197,94",
    d: "6,182,212",
    lineA: "20,184,166",
    lineB: "16,185,129",
  },
  student: {
    a: "139,92,246",
    b: "217,70,239",
    c: "99,102,241",
    d: "59,130,246",
    lineA: "139,92,246",
    lineB: "217,70,239",
  },
  normal: {
    a: "14,165,233",
    b: "59,130,246",
    c: "6,182,212",
    d: "99,102,241",
    lineA: "14,165,233",
    lineB: "59,130,246",
  },
};

export const roleScenePalette: Record<
  RoleThemeKey,
  {
    light: {
      primary: string;
      secondary: string;
      accent: string;
      fog: string;
    };
    dark: {
      primary: string;
      secondary: string;
      accent: string;
      fog: string;
    };
  }
> = {
  lawyer: {
    light: { primary: "#2f6df6", secondary: "#6172f3", accent: "#33c7f6", fog: "#edf5ff" },
    dark: { primary: "#60a5fa", secondary: "#818cf8", accent: "#22d3ee", fog: "#08111f" },
  },
  business: {
    light: { primary: "#14b8a6", secondary: "#10b981", accent: "#06b6d4", fog: "#ecfdf8" },
    dark: { primary: "#2dd4bf", secondary: "#34d399", accent: "#22d3ee", fog: "#071611" },
  },
  student: {
    light: { primary: "#8b5cf6", secondary: "#d946ef", accent: "#5b7cfa", fog: "#f6f0ff" },
    dark: { primary: "#a78bfa", secondary: "#e879f9", accent: "#60a5fa", fog: "#11081d" },
  },
  normal: {
    light: { primary: "#0ea5e9", secondary: "#3b82f6", accent: "#06b6d4", fog: "#eef8ff" },
    dark: { primary: "#38bdf8", secondary: "#60a5fa", accent: "#22d3ee", fog: "#081321" },
  },
};

export const backdropLayerOpacity = {
  gridLight: 0.06,
  gridDark: 0.05,
  noiseLight: 0.022,
  noiseDark: 0.02,
};

export const shadowLevels = {
  card: "0 18px 50px -28px rgba(15,23,42,0.20)",
  cardDark: "0 22px 54px -30px rgba(2,6,23,0.48)",
  glow: "0 24px 80px -42px rgba(59,130,246,0.30)",
};

export const borderTokens = {
  softLight: "rgba(255,255,255,0.40)",
  softDark: "rgba(255,255,255,0.06)",
};

export function resolveRoleThemeKey(role: AppRole): RoleThemeKey {
  if (!role) return "lawyer";
  return roleThemeMap[role] ?? "lawyer";
}

export function getRoleBackdropVars(role: AppRole) {
  const key = resolveRoleThemeKey(role);
  const p = roleBackdropPalette[key];
  return {
    "--tb-a": p.a,
    "--tb-b": p.b,
    "--tb-c": p.c,
    "--tb-d": p.d,
    "--tb-line-a": p.lineA,
    "--tb-line-b": p.lineB,
  } as Record<string, string>;
}

export function getRoleScenePalette(role: AppRole, theme: "light" | "dark") {
  const key = resolveRoleThemeKey(role);
  return roleScenePalette[key][theme];
}
