import { apiClient } from "./apiClient";
import { useAppStore } from "@/store";

const VISITOR_KEY = "aol_visitor_id";
const SESSION_KEY = "aol_session_id";
const LAST_TRACK_KEY = "aol_last_track";
const GEO_CACHE_KEY = "aol_geo_cache";
const GEO_FAILURE_CACHE_MS = 1000 * 60 * 30;

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const next = randomId();
    localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = randomId();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

function shouldSkipTrack(path: string) {
  if (typeof window === "undefined") return true;
  const now = Date.now();
  const key = `${path}::${document.title || ""}`;
  try {
    const raw = sessionStorage.getItem(LAST_TRACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { key?: string; ts?: number };
      if (parsed.key === key && typeof parsed.ts === "number" && (now - parsed.ts) < 5000) {
        return true;
      }
    }
    sessionStorage.setItem(LAST_TRACK_KEY, JSON.stringify({ key, ts: now }));
  } catch {
    // ignore
  }
  return false;
}

type ClientGeo = {
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  city_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

type CachedGeo = {
  ts?: number;
  data?: ClientGeo | null;
  failed?: boolean;
};

function getBrowserPosition(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000 * 60 * 10,
      },
    );
  });
}

async function reverseGeocode(latitude: number, longitude: number): Promise<ClientGeo | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const payload: any = await response.json();
    return {
      country_code: payload?.countryCode ? String(payload.countryCode) : null,
      country_name: payload?.countryName ? String(payload.countryName) : null,
      region_name: payload?.principalSubdivision ? String(payload.principalSubdivision) : null,
      city_name: payload?.city ? String(payload.city) : payload?.locality ? String(payload.locality) : null,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

async function getClientGeo(): Promise<ClientGeo | null> {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as CachedGeo;
      if (parsed?.ts && parsed?.data && Date.now() - parsed.ts < 1000 * 60 * 60 * 12) {
        return parsed.data;
      }
      if (parsed?.ts && parsed?.failed && Date.now() - parsed.ts < GEO_FAILURE_CACHE_MS) {
        return null;
      }
    }
  } catch {
    // ignore cache read failures
  }

  try {
    const browserPosition = await getBrowserPosition();
    if (browserPosition) {
      const precise = await reverseGeocode(browserPosition.latitude, browserPosition.longitude);
      if (precise?.country_code || precise?.region_name || precise?.city_name) {
        try {
          localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: precise }));
        } catch {
          // ignore cache write failures
        }
        return precise;
      }
    }

    const response = await fetch("https://ipwho.is/", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      try {
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: null, failed: true }));
      } catch {
        // ignore cache write failures
      }
      return null;
    }
    const payload: any = await response.json();
    if (payload?.success === false) {
      try {
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: null, failed: true }));
      } catch {
        // ignore cache write failures
      }
      return null;
    }
    const data: ClientGeo = {
      country_code: payload?.country_code ? String(payload.country_code) : null,
      country_name: payload?.country ? String(payload.country) : null,
      region_name: payload?.region ? String(payload.region) : null,
      city_name: payload?.city ? String(payload.city) : null,
      latitude: Number.isFinite(Number(payload?.latitude)) ? Number(payload.latitude) : null,
      longitude: Number.isFinite(Number(payload?.longitude)) ? Number(payload.longitude) : null,
    };
    try {
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // ignore cache write failures
    }
    return data;
  } catch {
    try {
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: null, failed: true }));
    } catch {
      // ignore cache write failures
    }
    return null;
  }
}

type AnalyticsOverview = {
  generated_at: string;
  totals: {
    registered_users: number;
    verified_users: number;
    active_cases: number;
    successful_runs_30d: number;
    page_views_30d: number;
    unique_visitors_30d: number;
    active_visitors_24h: number;
    mobile_visitors_30d: number;
    desktop_visitors_30d: number;
    iphone_visitors_30d: number;
  };
  devices: Array<{ key: string; label: string; page_views: number; visitors: number; share: number }>;
  platforms: Array<{ key: string; label: string; page_views: number; visitors: number }>;
  views_by_day: Array<{ day: string; page_views: number; visitors: number }>;
  top_pages: Array<{ path: string; page_views: number; visitors: number }>;
};

type AnalyticsDashboard = AnalyticsOverview & {
  browsers: Array<{ key: string; label: string; page_views: number; visitors: number }>;
  trends_14d: Array<{ day: string; page_views: number; visitors: number; runs: number }>;
  my_usage: { page_views_30d: number; sessions_30d: number; cases_total: number; runs_total: number };
  india_regions: Array<{
    region: string;
    users: number;
    views: number;
    share: number;
    latitude: number | null;
    longitude: number | null;
  }>;
};

export const analyticsService = {
  async trackPageView(path: string, title?: string) {
    if (typeof window === "undefined") return;
    const normalizedPath = String(path || window.location.pathname || "/").trim() || "/";
    if (shouldSkipTrack(normalizedPath)) return;

    const token = useAppStore.getState().authToken;
    const geo = await getClientGeo();
    const payload = {
      event_name: "page_view",
      path: normalizedPath,
      title: title || document.title || normalizedPath,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      referrer: document.referrer || null,
      locale: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      viewport_width: window.innerWidth || null,
      viewport_height: window.innerHeight || null,
      screen_width: window.screen?.width || null,
      screen_height: window.screen?.height || null,
      country_code: geo?.country_code || null,
      country_name: geo?.country_name || null,
      region_name: geo?.region_name || null,
      city_name: geo?.city_name || null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
    };

    try {
      const url = `${apiClient.baseUrl}/analytics/track`;
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon && !token) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return;
      }
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(url, {
        method: "POST",
        headers,
        body,
        keepalive: true,
        credentials: "omit",
      });
    } catch {
      // ignore analytics transport failures
    }
  },

  async enrichCurrentVisitorGeo(path: string, title?: string) {
    if (typeof window === "undefined") return false;
    const geo = await getClientGeo();
    if (!geo?.country_code && !geo?.region_name && !geo?.city_name && geo?.latitude == null && geo?.longitude == null) {
      return false;
    }

    const token = useAppStore.getState().authToken;
    const payload = {
      event_name: "geo_ping",
      path: String(path || window.location.pathname || "/").trim() || "/",
      title: title || document.title || "Geo enrichment",
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      referrer: document.referrer || null,
      locale: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      viewport_width: window.innerWidth || null,
      viewport_height: window.innerHeight || null,
      screen_width: window.screen?.width || null,
      screen_height: window.screen?.height || null,
      country_code: geo.country_code || null,
      country_name: geo.country_name || null,
      region_name: geo.region_name || null,
      city_name: geo.city_name || null,
      latitude: geo.latitude ?? null,
      longitude: geo.longitude ?? null,
    };

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`${apiClient.baseUrl}/analytics/track`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "omit",
      });
      return true;
    } catch {
      return false;
    }
  },

  getOverview() {
    return apiClient.get<AnalyticsOverview>("/analytics/overview", { skipAuth: true });
  },

  getDashboard() {
    return apiClient.get<AnalyticsDashboard>("/analytics/dashboard");
  },
};

export type { AnalyticsDashboard, AnalyticsOverview };
