import { useEffect, useMemo, useState } from "react";
import { FadeIn } from "@/lib/magic-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/app/PageState";
import { analyticsService, type AnalyticsDashboard } from "@/services/analyticsService";
import { Activity, BriefcaseBusiness, Laptop, MonitorSmartphone, Smartphone, Workflow } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import indiaMapAsset from "@/assets/india-admin1.svg?raw";
import { useI18n } from "@/hooks/useI18n";
import { autoTranslateUiText } from "@/lib/i18n";
import { useAppStore } from "@/store";

const DEFAULT_INDIA_VIEWBOX = { minX: 0, minY: 0, width: 1000, height: 1000 };

type MapPoint = { x: number; y: number };
type MapMetadata = {
  points: Map<string, MapPoint>;
  pathIds: Map<string, string>;
};

const REGION_ALIASES = new Map<string, string>([
  ["odisha", "orissa"],
  ["uttarakhand", "uttaranchal"],
]);

function normalizeRegionName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
  return REGION_ALIASES.get(normalized) || normalized;
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return "Just now";
  return new Date(value).toLocaleString("en-IN");
}

function extractSvgGroup(svg: string, groupId: string) {
  const match = svg.match(new RegExp(`<g id="${groupId}">([\\s\\S]*?)<\\/g>`));
  return match?.[1] || "";
}

function getIndiaViewBox(svg: string) {
  const match = svg.match(/viewBox="([^"]+)"|viewbox="([^"]+)"/i);
  const raw = match?.[1] || match?.[2];
  if (!raw) return DEFAULT_INDIA_VIEWBOX;

  const [minX, minY, width, height] = raw.split(/\s+/).map(Number);
  if ([minX, minY, width, height].some((value) => Number.isNaN(value))) {
    return DEFAULT_INDIA_VIEWBOX;
  }

  return { minX, minY, width, height };
}

function buildIndiaMapMarkup(
  activeRegions: Array<{ region: string; users: number }>,
  activeRegionName: string | null,
  metadata: MapMetadata,
) {
  const featureMarkup = extractSvgGroup(indiaMapAsset, "features");
  const viewBox = getIndiaViewBox(indiaMapAsset);
  const strongest = Math.max(...activeRegions.map((region) => region.users), 1);
  const activePathIds = new Map<string, { ratio: number; focused: boolean }>();

  for (const region of activeRegions) {
    const pathId = metadata.pathIds.get(normalizeRegionName(region.region));
    if (!pathId) continue;
    activePathIds.set(pathId, {
      ratio: Math.max(region.users / strongest, 0.2),
      focused: normalizeRegionName(region.region) === normalizeRegionName(activeRegionName || ""),
    });
  }

  const styledFeatures = featureMarkup.replace(/<path\b([^>]*?)id="([^"]+)"([^>]*)>/g, (_match, before, pathId, after) => {
    const active = activePathIds.get(pathId);
    const fill = active ? `rgba(37,99,235,${active.focused ? 0.36 : Math.min(0.12 + active.ratio * 0.22, 0.26)})` : "transparent";
    const stroke = active?.focused ? "#60a5fa" : "currentColor";
    const strokeWidth = active?.focused ? "3.6" : active ? "2.8" : "2.25";
    return `<path${before}id="${pathId}"${after} fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke">`;
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}" preserveAspectRatio="xMidYMid meet" style="shape-rendering:geometricPrecision">
      <g fill="none" stroke-linejoin="round" stroke-linecap="round">
        ${styledFeatures}
      </g>
    </svg>
  `;
}

function getIndiaMapMetadata(): MapMetadata {
  const pointsMarkup = extractSvgGroup(indiaMapAsset, "label_points");
  const circlePattern = /<circle class="([^"]+)" cx="([^"]+)" cy="([^"]+)" id="([^"]+)">/g;
  const pointMap = new Map<string, MapPoint>();
  const pathIds = new Map<string, string>();

  let match: RegExpExecArray | null = circlePattern.exec(pointsMarkup);
  while (match) {
    const [, name, cx, cy, id] = match;
    const normalized = normalizeRegionName(name);
    pointMap.set(normalized, {
      x: Number(cx),
      y: Number(cy),
    });
    pathIds.set(normalized, id);
    match = circlePattern.exec(pointsMarkup);
  }

  return { points: pointMap, pathIds };
}

function IndiaUsageMap({
  regions,
  totals,
  translateUi,
  t,
}: {
  regions: AnalyticsDashboard["india_regions"];
  totals: AnalyticsDashboard["totals"];
  translateUi: (value: string) => string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const displayRegions = regions.length
    ? regions
    : [
        {
          region: "India",
          users: Number(totals.unique_visitors_30d || 0),
          views: Number(totals.active_cases || 0),
          share: 100,
          latitude: 22.9734,
          longitude: 78.6569,
        },
      ];
  const strongest = displayRegions[0]?.users || 1;
  const [activeRegion, setActiveRegion] = useState(displayRegions[0] || null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const indiaViewBox = useMemo(() => getIndiaViewBox(indiaMapAsset), []);
  const mapMetadata = useMemo(() => getIndiaMapMetadata(), []);
  const mapMarkup = useMemo(
    () => buildIndiaMapMarkup(displayRegions, activeRegion?.region || null, mapMetadata),
    [activeRegion?.region, displayRegions, mapMetadata],
  );
  const activeStatesCount = displayRegions.filter((region) => region.region !== "India").length;
  const totalCases = displayRegions.reduce((sum, region) => sum + Number(region.views || 0), 0);

  const resolveRegionPoint = (region: (typeof displayRegions)[number]) => {
    const svgPoint = mapMetadata.points.get(normalizeRegionName(region.region));
    if (svgPoint) return svgPoint;
    return { x: 510, y: 520 };
  };

  useEffect(() => {
    setActiveRegion(displayRegions[0] || null);
    if (displayRegions[0]) {
      setHoverPoint(resolveRegionPoint(displayRegions[0]));
    } else {
      setHoverPoint(null);
    }
  }, [displayRegions, mapMetadata]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white/35 p-0 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="relative flex h-[28rem] w-full items-center justify-center overflow-hidden bg-transparent">
          <div className="relative h-full w-full max-w-[42rem] text-slate-900 dark:text-white/90">
            <div
              className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:bg-transparent dark:[&_svg_g:first-of-type_path]:stroke-white"
              dangerouslySetInnerHTML={{ __html: mapMarkup }}
            />

            {activeRegion && hoverPoint ? (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200/90 bg-white/96 px-3 py-2 text-sm shadow-[0_22px_48px_-30px_rgba(15,23,42,0.2)] backdrop-blur dark:border-white/12 dark:bg-slate-950/92"
                style={{
                  left: `${((hoverPoint.x - indiaViewBox.minX) / indiaViewBox.width) * 100}%`,
                  top: `${((hoverPoint.y - indiaViewBox.minY) / indiaViewBox.height) * 100}%`,
                }}
              >
                <div className="font-semibold text-slate-950 dark:text-white">{activeRegion.region}</div>
                <div className="mt-1 flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <span>{activeRegion.users.toLocaleString("en-IN")} {t("analytics.users")}</span>
                  <span>{activeRegion.views.toLocaleString("en-IN")} {t("analytics.casesLower")}</span>
                </div>
              </div>
            ) : null}

            <div className="absolute left-4 top-4 z-10 rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-3 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10 dark:bg-slate-950/68">
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t("analytics.stateAdoption")}</div>
              <div className="mt-2 flex items-end gap-6">
                <div>
                  <div className="text-[1.75rem] font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">{activeStatesCount || 1}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t("analytics.activeStates")}</div>
                </div>
                <div>
                  <div className="text-[1.75rem] font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">{totalCases.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t("analytics.regionalCases")}</div>
                </div>
              </div>
            </div>

            <svg
              viewBox={`${indiaViewBox.minX} ${indiaViewBox.minY} ${indiaViewBox.width} ${indiaViewBox.height}`}
              className="relative z-[1] h-full w-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {displayRegions.map((region) => {
                const point = resolveRegionPoint(region);
                const size = 18 + (region.users / strongest) * 34;
                const isActive = activeRegion?.region === region.region;
                return (
                  <g
                    key={region.region}
                    onMouseEnter={() => {
                      setActiveRegion(region);
                      setHoverPoint(point);
                    }}
                    onClick={() => {
                      setActiveRegion(region);
                      setHoverPoint(point);
                    }}
                    className="cursor-pointer"
                  >
                    <circle cx={point.x} cy={point.y} r={size} fill="rgb(37 99 235)" fillOpacity={isActive ? "0.16" : "0.1"} />
                    <circle cx={point.x} cy={point.y} r={Math.max(8, size * 0.44)} fill={isActive ? "rgb(29 78 216)" : "rgb(37 99 235)"} />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={Math.max(12, size * 0.72)}
                      fill="none"
                      stroke="rgb(37 99 235)"
                      strokeOpacity={isActive ? "0.55" : "0.3"}
                      strokeWidth={isActive ? "4" : "2.5"}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function Analytics() {
  const [mode, setMode] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [geoRepairTried, setGeoRepairTried] = useState(false);
  const { t } = useI18n();
  const language = useAppStore((state) => state.language);
  const translateUi = (value: string) => autoTranslateUiText(value, language);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setMode("loading");
      try {
        let result = await analyticsService.getDashboard();
        if (cancelled) return;

        if (!geoRepairTried && Number(result?.totals?.page_views_30d || 0) > 0 && !(result.india_regions || []).length) {
          setGeoRepairTried(true);
          const enriched = await analyticsService.enrichCurrentVisitorGeo("/app/analytics", t("nav.analytics"));
          if (!cancelled && enriched) {
            result = await analyticsService.getDashboard();
          }
        }

        if (cancelled) return;
        setData(result);
        const hasAnySignal =
          Number(result?.totals?.page_views_30d || 0) > 0 ||
          Number(result?.totals?.successful_runs_30d || 0) > 0 ||
          Number(result?.totals?.active_cases || 0) > 0;
        setMode(hasAnySignal ? "ready" : "empty");
      } catch {
        if (cancelled) return;
        setMode("error");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [geoRepairTried]);

  const heroStats = useMemo(() => {
    const totals = data?.totals;
    return [
      { label: t("analytics.activeNow"), value: Number(totals?.active_visitors_24h || 0), icon: Activity },
      { label: t("analytics.desktop"), value: Number(totals?.desktop_visitors_30d || 0), icon: Laptop },
      { label: t("analytics.mobile"), value: Number(totals?.mobile_visitors_30d || 0), icon: Smartphone },
      { label: t("analytics.iphone"), value: Number(totals?.iphone_visitors_30d || 0), icon: MonitorSmartphone },
      { label: t("analytics.runs"), value: Number(totals?.successful_runs_30d || 0), icon: Workflow },
      { label: t("analytics.cases"), value: Number(totals?.active_cases || 0), icon: BriefcaseBusiness },
    ];
  }, [data, t]);

  const trendRows = useMemo(() => (data?.trends_14d || []).map((row) => ({ ...row })), [data]);
  const myUsageRows = useMemo(
    () => [
      { label: t("analytics.mySessions"), value: data?.my_usage.sessions_30d || 0 },
      { label: t("analytics.myCases"), value: data?.my_usage.cases_total || 0 },
      { label: t("analytics.myRuns"), value: data?.my_usage.runs_total || 0 },
    ],
    [data, t],
  );
  return (
    <div className="mx-auto max-w-[92rem] px-4 py-4 md:px-8 md:py-6">
      {mode === "loading" ? <LoadingState title={t("analytics.loading")} description={t("analytics.loadingDescription")} /> : null}
      {mode === "error" ? <ErrorState title={t("analytics.unavailable")} description={t("analytics.unavailableDescription")} /> : null}
      {mode === "empty" ? <EmptyState title={t("analytics.empty")} description={t("analytics.emptyDescription")} /> : null}

      {mode === "ready" && data ? (
        <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_40px_100px_-62px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.9))]">
          <FadeIn>
            <section className="px-5 py-6 md:px-8 md:py-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[52rem]">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">{translateUi(t("analytics.product"))}</div>
                  <h1 className="mt-3 text-[2.7rem] font-semibold leading-[0.95] tracking-[-0.07em] text-slate-950 md:text-[4.4rem] dark:text-white">
                    {translateUi(t("analytics.heroTitle"))}
                  </h1>
                  <p className="mt-4 max-w-[42rem] text-[1rem] leading-8 text-slate-600 dark:text-slate-300">
                    {translateUi(t("analytics.heroBody"))}
                  </p>
                </div>

                <div className="grid gap-4 text-sm text-slate-500 lg:min-w-[14rem] dark:text-slate-400">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em]">{translateUi(t("analytics.updated"))}</div>
                    <div className="mt-2 font-medium text-slate-900 dark:text-white">{formatUpdatedAt(data.generated_at)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-y border-slate-200/80 py-5 dark:border-white/10">
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-6 xl:gap-8">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        <stat.icon className="h-3.5 w-3.5 text-sky-700 dark:text-sky-300" />
                        {stat.label}
                      </div>
                      <div className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 md:text-[2.35rem] dark:text-white">
                        {stat.value.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </FadeIn>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
            <FadeIn delay={0.05}>
              <section className="border-b border-slate-200/80 px-5 py-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-8 dark:border-white/10">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{translateUi(t("analytics.workflowTrend"))}</div>
                    <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">{translateUi(t("analytics.runTrend"))}</h2>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{translateUi(t("analytics.last14Days"))}</div>
                </div>

                <div className="mt-4 h-[22rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendRows} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.26} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="runsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.22)" />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "18px",
                          border: "1px solid rgba(148,163,184,0.22)",
                          background: "rgba(255,255,255,0.96)",
                          color: "#020617",
                          boxShadow: "0 24px 60px -32px rgba(15,23,42,0.28)",
                        }}
                        labelStyle={{ color: "#0f172a" }}
                      />
                      <Area type="monotone" dataKey="runs" name={t("analytics.runs")} stroke="#0ea5e9" strokeWidth={2} fill="url(#runsFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                    {translateUi(t("analytics.workflowRuns"))}
                  </span>
                </div>
              </section>
            </FadeIn>

            <FadeIn delay={0.09}>
              <section className="px-5 py-6 lg:px-8 lg:py-8">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{translateUi(t("analytics.myUsage"))}</div>
                <h2 className="mt-2 text-[1.85rem] font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">{translateUi(t("analytics.myActivity"))}</h2>
                <div className="mt-5 divide-y divide-slate-200/80 dark:divide-white/10">
                  {myUsageRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-4">
                      <div className="text-sm text-slate-500 dark:text-slate-400">{row.label}</div>
                      <div className="text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                        {row.value.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>
          </div>

          <FadeIn delay={0.12}>
            <section className="border-t border-slate-200/80 px-5 py-6 md:px-8 md:py-8 dark:border-white/10">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-[40rem]">
                  <h2 className="text-[2.15rem] font-semibold tracking-[-0.055em] text-slate-950 dark:text-white">
                    {translateUi(t("analytics.adoptionIndia"))}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    {translateUi(t("analytics.adoptionIndiaBody"))}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {translateUi(t("analytics.liveRegionalTelemetry"))}
                </div>
              </div>

              <IndiaUsageMap regions={data.india_regions || []} totals={data.totals} translateUi={translateUi} t={t} />
            </section>
          </FadeIn>
        </div>
      ) : null}
    </div>
  );
}

