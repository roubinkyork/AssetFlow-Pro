import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Download, 
  Filter, 
  History, 
  Layers, 
  Plus, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Wrench, 
  Zap,
  Thermometer,
  ArrowUpRight,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  Asset, 
  LanguageCode, 
  UserSession, 
  FailureRecord, 
  PredictiveServiceSuggestion, 
  PredictiveDashboardData 
} from '../types';
import { translations } from '../i18n/translations';

interface PredictiveMaintenanceDashboardProps {
  currentUser: UserSession;
  currentLanguage: LanguageCode;
  assets: Asset[];
  onRefreshAssets?: () => void;
  showExplanations?: boolean;
  onToggleExplanations?: () => void;
}

export const PredictiveMaintenanceDashboard: React.FC<PredictiveMaintenanceDashboardProps> = ({
  currentUser,
  currentLanguage,
  assets,
  onRefreshAssets,
  showExplanations = true,
  onToggleExplanations,
}) => {
  const t = translations[currentLanguage];
  const [localExplanations, setLocalExplanations] = useState(showExplanations);
  const activeExplanations = onToggleExplanations ? showExplanations : localExplanations;
  const toggleExp = onToggleExplanations || (() => setLocalExplanations(!localExplanations));

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<PredictiveDashboardData | null>(null);
  const [selectedCriticality, setSelectedCriticality] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'suggestions' | 'failures' | 'lifecycle'>('suggestions');
  
  // Work Order Scheduling Modal State
  const [schedulingSuggestion, setSchedulingSuggestion] = useState<PredictiveServiceSuggestion | null>(null);
  const [scheduleDateInput, setScheduleDateInput] = useState('');
  const [scheduleNotesInput, setScheduleNotesInput] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [scheduleSuccessMessage, setScheduleSuccessMessage] = useState<string | null>(null);

  // Log Historical Failure Modal State
  const [showLogFailureModal, setShowLogFailureModal] = useState(false);
  const [newFailureAssetId, setNewFailureAssetId] = useState(assets[0]?.id || '');
  const [newFailureMode, setNewFailureMode] = useState('');
  const [newFailureComponent, setNewFailureComponent] = useState('');
  const [newFailureSeverity, setNewFailureSeverity] = useState<'minor' | 'moderate' | 'critical' | 'catastrophic'>('moderate');
  const [newFailureOperatingHours, setNewFailureOperatingHours] = useState('4200');
  const [newFailureDowntime, setNewFailureDowntime] = useState('6');
  const [newFailureCost, setNewFailureCost] = useState('1500');
  const [newFailureRootCause, setNewFailureRootCause] = useState('');
  const [newFailureCorrectiveAction, setNewFailureCorrectiveAction] = useState('');
  const [isSubmittingFailure, setIsSubmittingFailure] = useState(false);

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/predictive/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to load predictive dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Work Order Approval / Service Scheduling
  const handleApproveWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingSuggestion) return;

    try {
      setIsSubmittingSchedule(true);
      const res = await fetch('/api/predictive/schedule-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name
        },
        body: JSON.stringify({
          assetId: schedulingSuggestion.assetId,
          scheduledDate: scheduleDateInput || schedulingSuggestion.suggestedServiceDate,
          notes: scheduleNotesInput,
          workOrderType: 'scheduled'
        })
      });

      if (res.ok) {
        setScheduleSuccessMessage(t.serviceScheduledSuccess);
        setTimeout(() => {
          setScheduleSuccessMessage(null);
          setSchedulingSuggestion(null);
        }, 2200);
        await fetchDashboardData();
        if (onRefreshAssets) onRefreshAssets();
      }
    } catch (err) {
      console.error('Failed to schedule service:', err);
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  // Handle Logging New Historical Failure
  const handleLogFailureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingFailure(true);
      const res = await fetch('/api/predictive/failures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name
        },
        body: JSON.stringify({
          assetId: newFailureAssetId,
          failureMode: newFailureMode,
          component: newFailureComponent,
          severity: newFailureSeverity,
          operatingHoursAtFailure: Number(newFailureOperatingHours),
          downtimeHours: Number(newFailureDowntime),
          repairCost: Number(newFailureCost),
          rootCause: newFailureRootCause,
          correctiveAction: newFailureCorrectiveAction
        })
      });

      if (res.ok) {
        setShowLogFailureModal(false);
        // Reset form
        setNewFailureMode('');
        setNewFailureComponent('');
        setNewFailureRootCause('');
        setNewFailureCorrectiveAction('');
        await fetchDashboardData();
        if (onRefreshAssets) onRefreshAssets();
      }
    } catch (err) {
      console.error('Failed to log failure event:', err);
    } finally {
      setIsSubmittingFailure(false);
    }
  };

  // Filtered Suggestions
  const filteredSuggestions = dashboardData?.suggestions.filter(s => {
    const matchesSearch = 
      s.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.targetComponent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.predictedFailureMode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCriticality = 
      selectedCriticality === 'ALL' || 
      (selectedCriticality === 'A' && s.criticality === 'A_MISSION_CRITICAL') ||
      (selectedCriticality === 'B' && s.criticality === 'B_ESSENTIAL') ||
      (selectedCriticality === 'C' && s.criticality === 'C_NON_CRITICAL');

    const matchesUrgency = 
      selectedUrgency === 'ALL' || s.urgency === selectedUrgency;

    return matchesSearch && matchesCriticality && matchesUrgency;
  }) || [];

  // Export Schedule to CSV
  const exportScheduleCsv = () => {
    if (!dashboardData) return;
    const headers = ["Asset Tag", "Asset Name", "Criticality", "Suggested Service Date", "Target Component", "Predicted Failure Mode", "30-Day Risk %", "Confidence %", "Avoided Downtime (€)"];
    const rows = dashboardData.suggestions.map(s => [
      `"${s.assetTag}"`,
      `"${s.assetName}"`,
      `"${s.criticality}"`,
      `"${s.suggestedServiceDate}"`,
      `"${s.targetComponent}"`,
      `"${s.predictedFailureMode}"`,
      `"${s.failureProbabilityNext30Days}%"`,
      `"${s.confidenceScore}%"`,
      `"€${s.estimatedSavings.toLocaleString()}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ISO55001_Predictive_Maintenance_Schedule_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>ISO 55001:2024 Clause 8.1 & 10.2 Asset Lifecycle Assurance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t.predictiveTitle}
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t.predictiveSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowLogFailureModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.logFailureTitle}</span>
            </button>
            <button
              onClick={exportScheduleCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t.exportSchedule}</span>
            </button>
            <button
              onClick={toggleExp}
              title={activeExplanations ? t.hideExplanations : t.showExplanations}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                activeExplanations
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/80'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {activeExplanations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-indigo-400" />}
              <span className="hidden sm:inline">{activeExplanations ? t.hideExplanations : t.showExplanations}</span>
            </button>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Refresh Telemetry & Forecasts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Notice (optionally visible) */}
        {activeExplanations && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.simulatedFailureNotice}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Weibull Parameter β = 2.1 (Wear-out Phase)</span>
              <span>•</span>
              <span>GDPR Data Pseudonymized</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fleet Reliability */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.fleetReliabilityIndex}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {dashboardData ? `${dashboardData.metrics.fleetReliabilityIndex}%` : '--'}
              </span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Target ≥93%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">ISO 55001 Benchmark Performance</p>
          </div>
        </div>

        {/* Critical Assets At Risk */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.criticalAssetsAtRisk}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {dashboardData ? dashboardData.metrics.criticalAssetsAtRisk : '--'}
              </span>
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                Tier A & B
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Intervention required &lt;30 days</p>
          </div>
        </div>

        {/* Average MTBF */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.avgMtbfHours}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {dashboardData ? `${dashboardData.metrics.avgMtbfHours.toLocaleString()}h` : '--'}
              </span>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                Mean Between Failures
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Across active production machinery</p>
          </div>
        </div>

        {/* Avoided Downtime Cost */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.estimatedSavings}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-indigo-600">
                {dashboardData ? `€${dashboardData.metrics.estimatedDowntimeCostAvoided.toLocaleString()}` : '--'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Catastrophic outage costs averted</p>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('suggestions')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'suggestions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t.suggestedServiceDates}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSubTab === 'suggestions' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {filteredSuggestions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('failures')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'failures'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{t.historicalFailures}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSubTab === 'failures' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {dashboardData?.historicalFailures.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('lifecycle')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'lifecycle'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t.reliabilityCurveTitle}</span>
          </button>
        </div>

        {/* ISO 55001 Badge */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ISO 55001 Cl. 8.1 Reliability Centered Maintenance</span>
        </div>
      </div>

      {/* Tab 1: Forecasted Service Interventions */}
      {activeSubTab === 'suggestions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs text-slate-800 focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Criticality Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setSelectedCriticality('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    selectedCriticality === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.allCriticalities}
                </button>
                <button
                  onClick={() => setSelectedCriticality('A')}
                  className={`px-2 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    selectedCriticality === 'A' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tier A
                </button>
                <button
                  onClick={() => setSelectedCriticality('B')}
                  className={`px-2 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                    selectedCriticality === 'B' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tier B
                </button>
              </div>

              {/* Urgency Filter */}
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="due_soon">{t.urgencyDueSoon}</option>
                <option value="scheduled">{t.urgencyScheduled}</option>
                <option value="healthy">{t.urgencyOptimal}</option>
              </select>
            </div>
          </div>

          {/* Service Suggestions Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSuggestions.map((suggestion) => {
              const isUrgent = suggestion.urgency === 'due_soon' || suggestion.failureProbabilityNext30Days > 60;
              const isCriticalTier = suggestion.criticality === 'A_MISSION_CRITICAL';

              return (
                <div 
                  key={suggestion.assetId} 
                  className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isUrgent ? 'border-amber-300 ring-1 ring-amber-400/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {suggestion.assetTag}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                            suggestion.criticality === 'A_MISSION_CRITICAL'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : suggestion.criticality === 'B_ESSENTIAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {suggestion.criticality === 'A_MISSION_CRITICAL' ? 'Tier A' : suggestion.criticality === 'B_ESSENTIAL' ? 'Tier B' : 'Tier C'}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            suggestion.urgency === 'due_soon'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : suggestion.urgency === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {suggestion.urgency === 'due_soon' ? t.urgencyDueSoon : suggestion.urgency === 'scheduled' ? t.urgencyScheduled : t.urgencyOptimal}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                          {suggestion.assetName}
                        </h3>
                      </div>

                      {/* Avoided Cost Tag */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">{t.estimatedSavings}</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          +€{suggestion.estimatedSavings.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Target Component & Predicted Failure Mode */}
                    <div className="mt-3.5 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">{t.targetComponent}:</span>
                        <span className="font-semibold text-slate-800 text-right truncate max-w-[220px]">
                          {suggestion.targetComponent}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">{t.predictedFailureMode}:</span>
                        <span className="text-amber-800 font-medium text-right truncate max-w-[220px]">
                          {suggestion.predictedFailureMode}
                        </span>
                      </div>
                    </div>

                    {/* Operational Metrics: Failure Probability, Health, MTBF */}
                    <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-center">
                      <div className="p-2 rounded-lg bg-slate-50">
                        <span className="text-[10px] text-slate-500 block truncate">{t.failureProbability30d}</span>
                        <span className={`text-xs font-extrabold ${
                          suggestion.failureProbabilityNext30Days > 50 ? 'text-red-600' : 'text-slate-800'
                        }`}>
                          {suggestion.failureProbabilityNext30Days}%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <span className="text-[10px] text-slate-500 block truncate">{t.healthIndex}</span>
                        <span className={`text-xs font-extrabold ${
                          suggestion.currentHealthIndex < 75 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {suggestion.currentHealthIndex}%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50">
                        <span className="text-[10px] text-slate-500 block truncate">MTBF</span>
                        <span className="text-xs font-extrabold text-blue-700">
                          {suggestion.mtbfHours.toLocaleString()}h
                        </span>
                      </div>
                    </div>

                    {/* ISO 55001 Recommended Action Notice */}
                    <div className="mt-3 text-xs text-slate-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        <strong>ISO Action:</strong> {suggestion.recommendedAction}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.suggestedServiceDates}:</span>
                      <strong className="text-indigo-700 font-bold">{suggestion.suggestedServiceDate}</strong>
                    </div>

                    <button
                      onClick={() => {
                        setSchedulingSuggestion(suggestion);
                        setScheduleDateInput(suggestion.suggestedServiceDate);
                        setScheduleNotesInput(suggestion.recommendedAction);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{t.approveWorkOrder}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSuggestions.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No assets currently matching the filter criteria.</p>
              <p className="text-xs text-slate-400 mt-1">All registered equipment is operating within nominal ISO 55001 thresholds.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Historical Failure Log & RCA */}
      {activeSubTab === 'failures' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.historicalFailures}</h3>
              <p className="text-xs text-slate-500">
                Audited failure records used by Weibull hazard modeling to forecast component degradation
              </p>
            </div>
            <button
              onClick={() => setShowLogFailureModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.logFailureTitle}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Event ID / Date</th>
                  <th className="py-3 px-4">Asset & Component</th>
                  <th className="py-3 px-4">{t.failureSeverity}</th>
                  <th className="py-3 px-4">{t.operatingHours}</th>
                  <th className="py-3 px-4">{t.downtimeHours}</th>
                  <th className="py-3 px-4">{t.repairCost}</th>
                  <th className="py-3 px-4">Root Cause & ISO 55001 Action</th>
                  <th className="py-3 px-4">Telemetry Anomaly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardData?.historicalFailures.map((failure) => (
                  <tr key={failure.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      <div>{failure.id}</div>
                      <div className="text-[10px] text-slate-400">{new Date(failure.timestamp).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{failure.assetName}</div>
                      <div className="text-indigo-600 font-medium text-[11px]">{failure.component}</div>
                      <span className="font-mono text-[10px] text-slate-400">{failure.assetTag}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        failure.severity === 'catastrophic'
                          ? 'bg-purple-100 text-purple-800'
                          : failure.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : failure.severity === 'moderate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {failure.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {failure.operatingHoursAtFailure.toLocaleString()}h
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {failure.downtimeHours}h
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      €{failure.repairCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 line-clamp-1">{failure.rootCause}</div>
                      <div className="text-[11px] text-emerald-700 line-clamp-1">
                        <strong>Corrective:</strong> {failure.correctiveAction}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{failure.iso55001Clause}</div>
                    </td>
                    <td className="py-3 px-4">
                      {failure.telemetryAnomalyBeforeFailure ? (
                        <div className="space-y-0.5 font-mono text-[10px]">
                          <div className="text-amber-700">Vib: {failure.telemetryAnomalyBeforeFailure.vibrationRms} mm/s</div>
                          <div className="text-red-700">Temp: {failure.telemetryAnomalyBeforeFailure.bearingTempCelsius}°C</div>
                          <div className="text-slate-500">Harmonic: {failure.telemetryAnomalyBeforeFailure.harmonicCurrentPercent}%</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None logged</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Weibull Reliability & Degradation Curves */}
      {activeSubTab === 'lifecycle' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.reliabilityCurveTitle}</h3>
              <p className="text-xs text-slate-500 max-w-2xl">
                Weibull lifecycle survival probability comparison: Run-to-Failure degradation vs. Planned ISO 55001 condition-based restoration.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <span className="text-slate-700 font-medium">Actual / Forecasted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-slate-500">Unmaintained Run-to-Failure</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 font-medium">ISO Target (≥93%)</span>
              </div>
            </div>
          </div>

          {/* SVG Multi-Line Chart */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="h-64 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[0.25, 0.5, 0.75, 1.0].map((level, i) => (
                  <line 
                    key={i} 
                    x1="40" 
                    y1={240 - level * 200} 
                    x2="780" 
                    y2={240 - level * 200} 
                    stroke="#e2e8f0" 
                    strokeDasharray="4 4" 
                  />
                ))}

                {/* ISO Target Threshold line */}
                <line 
                  x1="40" 
                  y1={240 - 0.93 * 200} 
                  x2="780" 
                  y2={240 - 0.93 * 200} 
                  stroke="#10b981" 
                  strokeWidth="2" 
                  strokeDasharray="6 3" 
                />

                {/* Unmaintained Curve */}
                {dashboardData && (
                  <polyline
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    points={dashboardData.degradationCurves.map((d, index) => {
                      const x = 50 + index * ((760 - 50) / 11);
                      const y = 240 - (d.unmaintainedCurve / 100) * 200;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                )}

                {/* Actual & ISO Forecasted Curve */}
                {dashboardData && (
                  <polyline
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3.5"
                    points={dashboardData.degradationCurves.map((d, index) => {
                      const x = 50 + index * ((760 - 50) / 11);
                      const y = 240 - (d.actualReliability / 100) * 200;
                      return `${x},${y}`;
                    }).join(" ")}
                  />
                )}

                {/* Data Points */}
                {dashboardData?.degradationCurves.map((d, index) => {
                  const x = 50 + index * ((760 - 50) / 11);
                  const yActual = 240 - (d.actualReliability / 100) * 200;
                  return (
                    <g key={index}>
                      <circle cx={x} cy={yActual} r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  );
                })}
              </svg>

              {/* Month Labels under chart */}
              <div className="flex justify-between text-[11px] text-slate-500 mt-2 px-6">
                {dashboardData?.degradationCurves.map((d, i) => (
                  <span key={i} className="text-center font-medium">{d.month}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ISO 55001 Lifecycle Principles Explanatory Card (optionally visible) */}
          {activeExplanations && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-fade-in">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Clause 6.2 Objectives</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Replaces calendar-based servicing with dynamic condition risk indices to balance financial CapEx with equipment reliability.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <span>Clause 8.1 Control</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Triggers preemptive work orders before Weibull hazard rate crosses critical boundaries, protecting sensitive assets from unexpected outages.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Clause 10.2 Improvement</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Logs historical root causes (micro-fatigue, sensor anomalies, heat peaks) to refine MTBF algorithms and lifecycle optimization.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve Work Order / Schedule Intervention Modal */}
      {schedulingSuggestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.approveWorkOrder}</h3>
                  <p className="text-xs text-slate-500 font-mono">{schedulingSuggestion.assetTag}</p>
                </div>
              </div>
              <button
                onClick={() => setSchedulingSuggestion(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {scheduleSuccessMessage ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">{scheduleSuccessMessage}</h4>
                <p className="text-xs text-slate-500">Asset record and ISO 55001 audit register updated.</p>
              </div>
            ) : (
              <form onSubmit={handleApproveWorkOrder} className="mt-4 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Asset:</span>
                    <span className="font-bold text-slate-800">{schedulingSuggestion.assetName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Component:</span>
                    <span className="text-indigo-700 font-medium">{schedulingSuggestion.targetComponent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Forecasted Downtime Avoidance:</span>
                    <span className="text-emerald-700 font-bold">€{schedulingSuggestion.estimatedSavings.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled Intervention Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleDateInput}
                    onChange={(e) => setScheduleDateInput(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Suggested based on current health degradation rate</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Order Instructions & ISO Maintenance Procedure
                  </label>
                  <textarea
                    rows={3}
                    value={scheduleNotesInput}
                    onChange={(e) => setScheduleNotesInput(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                    placeholder="Enter maintenance protocols, replacement parts, or calibration requirements..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSchedulingSuggestion(null)}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSchedule}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    {isSubmittingSchedule ? 'Registering...' : t.confirm}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Log Historical Failure Modal */}
      {showLogFailureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.logFailureTitle}</h3>
                  <p className="text-xs text-slate-500">ISO 55001 Clause 10.2 Corrective Action Record</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogFailureModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogFailureSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Asset</label>
                <select
                  value={newFailureAssetId}
                  onChange={(e) => setNewFailureAssetId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetTag} - {asset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Failed Component</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ceramic Spindle Bearing"
                    value={newFailureComponent}
                    onChange={(e) => setNewFailureComponent(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.failureSeverity}</label>
                  <select
                    value={newFailureSeverity}
                    onChange={(e) => setNewFailureSeverity(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="critical">Critical</option>
                    <option value="catastrophic">Catastrophic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Failure Mode</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High harmonic vibration & bearing race fatigue"
                  value={newFailureMode}
                  onChange={(e) => setNewFailureMode(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.operatingHours}</label>
                  <input
                    type="number"
                    required
                    value={newFailureOperatingHours}
                    onChange={(e) => setNewFailureOperatingHours(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.downtimeHours}</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newFailureDowntime}
                    onChange={(e) => setNewFailureDowntime(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.repairCost}</label>
                  <input
                    type="number"
                    required
                    value={newFailureCost}
                    onChange={(e) => setNewFailureCost(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.rootCauseAnalysis}</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe failure mechanism, lubrication breakdown, material defect..."
                  value={newFailureRootCause}
                  onChange={(e) => setNewFailureRootCause(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.correctiveActionISO}</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Preventive redesign, vibration sensor installation, updated SOP..."
                  value={newFailureCorrectiveAction}
                  onChange={(e) => setNewFailureCorrectiveAction(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogFailureModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFailure}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md shadow-red-600/20"
                >
                  {isSubmittingFailure ? 'Saving...' : t.confirm}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
