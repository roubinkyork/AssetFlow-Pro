import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Server,
  Wrench,
  Stethoscope,
  Cpu,
  Lock,
  UserCheck,
  MapPin,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Plus,
  FileSpreadsheet,
  RotateCw,
  Eye,
  EyeOff,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  Sparkles,
  QrCode
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Asset, AuditLogEntry, LanguageCode, UserSession } from '../types';
import { translations } from '../i18n/translations';
import { getDashboardLocale } from '../i18n/dashboardTranslations';

interface ExecutiveDashboardProps {
  assets: Asset[];
  auditLogs: AuditLogEntry[];
  currentLanguage: LanguageCode;
  currentUser: UserSession;
  showExplanations?: boolean;
  onToggleExplanations?: () => void;
  onSelectAsset: (asset: Asset) => void;
  onNavigateTab: (tabId: string) => void;
  onCreateAsset: () => void;
  onOpenQr?: (asset: Asset) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  industrial_machinery: 'Machinery & CNC',
  fleet_vehicle: 'Fleet Logistics',
  it_computing: 'IT & Datacenter',
  medical_lab: 'Medical & Diagnostic',
  facility_tooling: 'Precision Tooling',
};

const STATUS_COLORS: Record<string, string> = {
  in_service: '#10b981', // emerald
  maintenance: '#f59e0b', // amber
  in_transit: '#3b82f6', // blue
  depreciated: '#8b5cf6', // purple
  decommissioned: '#ef4444', // rose
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  assets,
  auditLogs,
  currentLanguage,
  currentUser,
  showExplanations = true,
  onToggleExplanations,
  onSelectAsset,
  onNavigateTab,
  onCreateAsset,
  onOpenQr,
}) => {
  const t = translations[currentLanguage];
  const d = getDashboardLocale(currentLanguage);
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'year' | 'all'>('30d');
  const [localExplanations, setLocalExplanations] = useState(showExplanations);

  const activeExplanations = onToggleExplanations ? showExplanations : localExplanations;
  const toggleExp = onToggleExplanations || (() => setLocalExplanations(!localExplanations));

  // Facilities list derived from current assets
  const facilities = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.location?.facility) set.add(a.location.facility);
      else if (a.location?.name) set.add(a.location.name);
    });
    return Array.from(set);
  }, [assets]);

  // Filtered assets by facility
  const filteredAssets = useMemo(() => {
    if (selectedFacility === 'ALL') return assets;
    return assets.filter(
      (a) => a.location?.facility === selectedFacility || a.location?.name === selectedFacility
    );
  }, [assets, selectedFacility]);

  // Executive KPI Calculations
  const stats = useMemo(() => {
    const totalCount = filteredAssets.length;
    if (totalCount === 0) {
      return {
        totalPurchase: 0,
        totalBookValue: 0,
        totalDepreciation: 0,
        depreciationPct: 0,
        avgHealth: 0,
        criticalCount: 0,
        maintenanceCount: 0,
        inServiceCount: 0,
        inTransitCount: 0,
        compliancePct: 100,
        gdprProtectedCount: 0,
        overdueServiceCount: 0,
      };
    }

    let purchase = 0;
    let bookValue = 0;
    let healthSum = 0;
    let criticalA = 0;
    let inService = 0;
    let inTransit = 0;
    let inMaint = 0;
    let gdprProtected = 0;
    let overdue = 0;

    const now = new Date();

    filteredAssets.forEach((a) => {
      purchase += a.financials?.purchasePrice || 0;
      bookValue += a.financials?.currentBookValue || 0;
      healthSum += a.healthIndex || 0;

      if (a.criticality === 'A_MISSION_CRITICAL') criticalA++;
      if (a.status === 'in_service') inService++;
      else if (a.status === 'in_transit') inTransit++;
      else if (a.status === 'maintenance') inMaint++;

      if (a.custodian?.consentRecorded) gdprProtected++;

      if (a.nextMaintenanceDue) {
        const dueDate = new Date(a.nextMaintenanceDue);
        if (dueDate < now || a.healthIndex < 60) {
          overdue++;
        }
      }
    });

    const totalDeprec = purchase - bookValue;
    const deprecPct = purchase > 0 ? Math.round((totalDeprec / purchase) * 100) : 0;
    const avgHealth = Math.round(healthSum / totalCount);
    const compliancePct = Math.round(
      ((totalCount - overdue) / Math.max(1, totalCount)) * 100
    );

    return {
      totalPurchase: purchase,
      totalBookValue: bookValue,
      totalDepreciation: totalDeprec,
      depreciationPct: deprecPct,
      avgHealth,
      criticalCount: criticalA,
      maintenanceCount: inMaint,
      inServiceCount: inService,
      inTransitCount: inTransit,
      compliancePct,
      gdprProtectedCount: gdprProtected,
      overdueServiceCount: overdue,
    };
  }, [filteredAssets]);

  // Chart Data 1: Category Health & Asset Breakdown
  const categoryHealthData = useMemo(() => {
    const map: Record<string, { count: number; totalHealth: number; totalBookValue: number }> = {};
    filteredAssets.forEach((a) => {
      const cat = a.category;
      if (!map[cat]) {
        map[cat] = { count: 0, totalHealth: 0, totalBookValue: 0 };
      }
      map[cat].count++;
      map[cat].totalHealth += a.healthIndex || 0;
      map[cat].totalBookValue += a.financials?.currentBookValue || 0;
    });

    return Object.entries(map).map(([key, val]) => ({
      categoryKey: key,
      name: d.categories[key as keyof typeof d.categories] || CATEGORY_LABELS[key] || key.replace('_', ' '),
      assetsCount: val.count,
      avgHealth: Math.round(val.totalHealth / val.count),
      bookValueK: Math.round(val.totalBookValue / 1000),
    }));
  }, [filteredAssets, d]);

  // Chart Data 2: 5-Year Financial Depreciation & Replacement Curve
  const depreciationCurveData = useMemo(() => {
    const currentVal = stats.totalBookValue;
    const initialVal = stats.totalPurchase;
    const salvageVal = filteredAssets.reduce((acc, a) => acc + (a.financials?.salvageValue || 0), 0);

    return [
      { year: 'Acquisition', bookValue: initialVal, salvageReserve: salvageVal },
      { year: 'Year 1', bookValue: Math.round(initialVal * 0.82), salvageReserve: salvageVal },
      { year: 'Year 2 (Current)', bookValue: currentVal, salvageReserve: salvageVal },
      { year: 'Year 3 (Est)', bookValue: Math.round(currentVal * 0.72), salvageReserve: salvageVal },
      { year: 'Year 4 (Est)', bookValue: Math.round(currentVal * 0.50), salvageReserve: salvageVal },
      { year: 'Year 5 (Salvage)', bookValue: salvageVal, salvageReserve: salvageVal },
    ];
  }, [stats.totalBookValue, stats.totalPurchase, filteredAssets]);

  // Operational status localized label helper
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'in_service': return t.statusInService;
      case 'in_transit': return t.statusInTransit;
      case 'maintenance': return t.statusMaintenance;
      case 'audited': return t.statusAudited;
      case 'quarantine': return t.statusQuarantine;
      case 'decommissioned': return t.statusDecommissioned;
      default: return status.replace('_', ' ').toUpperCase();
    }
  };

  // Chart Data 3: Operational Status Breakdown
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAssets.forEach((a) => {
      counts[a.status] = (counts[a.status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      statusKey: status,
      name: getStatusLabel(status),
      value: count,
      color: STATUS_COLORS[status] || '#64748b',
    }));
  }, [filteredAssets, t]);

  // Actionable Priority List: Low health or service due soon
  const urgentAssets = useMemo(() => {
    return [...filteredAssets]
      .sort((a, b) => (a.healthIndex || 0) - (b.healthIndex || 0))
      .slice(0, 4);
  }, [filteredAssets]);

  // Live Telemetry stream items (Fleet & Mobile assets)
  const telemetryFeed = useMemo(() => {
    return [...filteredAssets]
      .filter((a) => a.location?.coordinates?.lat && a.location?.coordinates?.lng)
      .slice(0, 4);
  }, [filteredAssets]);

  // Recent Audit Trail snippet
  const recentAudits = useMemo(() => {
    return (auditLogs || []).slice(0, 5);
  }, [auditLogs]);

  return (
    <div className="space-y-6">
      {/* Top Executive Header & Filter Ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
                <Layers className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {d.dashboardTitle}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {d.dashboardSubtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Facility Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">{d.allFacilities} ({assets.length} {d.units})</option>
                {facilities.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Scope */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl text-xs">
              {(['30d', '90d', 'year', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    timeRange === range
                      ? 'bg-white shadow-2xs text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range === '30d' ? d.timeRange30d : range === '90d' ? d.timeRange90d : range === 'year' ? d.timeRangeYear : d.timeRangeAll}
                </button>
              ))}
            </div>

            {/* Quick Register Button */}
            <button
              onClick={onCreateAsset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addNewAsset}</span>
            </button>

            {/* Explanations Toggle */}
            <button
              type="button"
              onClick={toggleExp}
              title={activeExplanations ? t.hideExplanations : t.showExplanations}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                activeExplanations
                  ? 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              {activeExplanations ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-blue-600" />}
              <span className="hidden sm:inline">{activeExplanations ? t.hideExplanations : t.showExplanations}</span>
            </button>
          </div>
        </div>

        {/* Informational Banner (when explanations enabled) */}
        {activeExplanations && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{d.auditBanner}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-[11px]">
              <span>{d.hardwareVault}: <strong className="text-cyan-700">AES-256-GCM</strong></span>
              <span>·</span>
              <span>{d.activeCustodians}: <strong className="text-slate-800">{stats.gdprProtectedCount} {d.verified}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* TOP ROW: 5 High-Impact Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Metric 1: Net Book Valuation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{d.portfolioBookValue}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              €{stats.totalBookValue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span>{d.original}: €{stats.totalPurchase.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>{d.depreciated}</span>
              <span>{stats.depreciationPct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.depreciationPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Asset Health Index */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{d.fleetHealthIndex}</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              stats.avgHealth >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight flex items-baseline gap-2">
              <span>{stats.avgHealth}%</span>
              <span className={`text-xs font-semibold ${
                stats.avgHealth >= 80 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {stats.avgHealth >= 80 ? d.optimal : d.serviceDue}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.criticalCount} {d.missionCritical}
            </p>
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>{d.targetStandard}</span>
              <span>&ge; 85%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  stats.avgHealth >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, stats.avgHealth)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 3: Active Fleet & Operational Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{d.operationalAssets}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {filteredAssets.length} <span className="text-sm font-normal text-slate-500">{d.units}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.inServiceCount} {t.statusInService} · {stats.inTransitCount} {t.statusInTransit}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {Math.round((stats.inServiceCount / Math.max(1, filteredAssets.length)) * 100)}% {d.available}
            </span>
            {stats.maintenanceCount > 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                {stats.maintenanceCount} {d.inShop}
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: ISO 55001 Compliance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{d.isoConformance}</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats.compliancePct}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {d.clauseActive}
            </p>
          </div>
          <div className="pt-1">
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
              {d.zeroNonConformance}
            </span>
          </div>
        </div>

        {/* Metric 5: Predictive & Security Shield */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{d.predictiveAttention}</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight flex items-baseline gap-1.5">
              <span>{stats.overdueServiceCount}</span>
              <span className="text-xs font-normal text-slate-500">{d.actionRequired}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {d.preventingDowntime}
            </p>
          </div>
          <div className="pt-1">
            <button
              onClick={() => onNavigateTab('predictive')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>{d.reviewSuggestions}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Category Health & Capital Asset Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {d.assetHealthChartTitle}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {d.assetHealthChartDesc}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                <span>{d.healthIndexLegend}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                <span>{d.bookValueLegend}</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryHealthData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-10} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [
                    name === 'avgHealth' ? `${value}%` : `€${value}k`,
                    name === 'avgHealth' ? d.healthIndexLegend : d.bookValueLegend,
                  ]}
                />
                <Bar dataKey="avgHealth" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="bookValueK" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Operational Status Distribution (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">{d.fleetStatusChartTitle}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {d.fleetStatusChartDesc}
            </p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}</span>
                <span className="font-bold text-slate-900 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5-Year Capital Depreciation Curve & Replacement Horizon */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                {d.depreciationChartTitle}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {d.depreciationChartDesc}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              <span>{d.netBookProjection}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" />
              <span>{d.salvageReserve}</span>
            </span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={depreciationCurveData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBook" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `€${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [`€${Number(val).toLocaleString()}`, 'Value']}
              />
              <Area type="monotone" dataKey="bookValue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBook)" />
              <Area type="monotone" dataKey="salvageReserve" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LOWER GRID: Action Radar & Live Telemetry Stream & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Action Radar (Low Health / Overdue Service) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">{d.priorityRadarTitle}</h3>
            </div>
            <button
              onClick={() => onNavigateTab('predictive')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              {d.viewAll}
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {urgentAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/80 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {asset.assetTag}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      asset.criticality === 'A_MISSION_CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {asset.criticality.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 text-xs truncate mt-0.5">
                    {asset.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {d.dueLabel}: {asset.nextMaintenanceDue || d.imminentInspection}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-xs font-bold ${
                    (asset.healthIndex || 0) < 60 ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {asset.healthIndex}% {d.healthLabel}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {d.gradeLabel} {asset.conditionGrade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Field Telemetry Snapshot */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              <h3 className="font-bold text-slate-900 text-sm">{d.liveGpsTitle}</h3>
            </div>
            <button
              onClick={() => onNavigateTab('tracking')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              {d.fullMap}
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {telemetryFeed.map((asset) => (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/80 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{asset.location?.name || t.statusInTransit}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                    {asset.assetTag} · {asset.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {d.custodianLabel}: {asset.custodian?.name || d.unassigned}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {d.liveFix}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {asset.location?.coordinates?.lat?.toFixed(3)}, {asset.location?.coordinates?.lng?.toFixed(3)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Immutable Audit Stream */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">{d.securityAuditTitle}</h3>
            </div>
            <button
              onClick={() => onNavigateTab('audit_logs')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              {d.fullLedger}
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentAudits.map((log) => (
              <div key={log.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                    log.complianceStandard === 'ISO_55001' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {log.complianceStandard}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-slate-800 font-medium line-clamp-1">
                  {log.details}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{d.actorLabel}: {log.userName}</span>
                  <span className="font-mono bg-slate-100 px-1 rounded">{log.ipHash?.substring(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK COMMAND LAUNCHPAD */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-sm tracking-wide">{d.enterpriseLaunchpadTitle}</span>
          </div>
          <p className="text-xs text-slate-400">
            {d.enterpriseLaunchpadDesc}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => onNavigateTab('field_staff')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>{d.mobileScannerBtn}</span>
          </button>

          <button
            onClick={() => onNavigateTab('predictive')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>{d.predictiveBtn}</span>
          </button>

          <button
            onClick={() => onNavigateTab('reports')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            <span>{d.isoReportsBtn}</span>
          </button>

          <button
            onClick={() => onNavigateTab('compliance')}
            className="px-3.5 py-2 rounded-xl bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-xs font-semibold flex items-center gap-2 border border-cyan-700 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-300" />
            <span>{d.vaultSecurityBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
