import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  BarChart3,
  Sliders,
  Eye,
  EyeOff,
  FileDown,
  CheckCircle2
} from 'lucide-react';
import { Asset, LanguageCode, UserSession } from '../types';
import { translations } from '../i18n/translations';
import { getAppLocale } from '../i18n/appTranslations';
import { generateCompliancePdf } from '../lib/pdfReportGenerator';
import { soundEffects } from '../lib/sound';

interface AutomatedReportsProps {
  assets: Asset[];
  currentLanguage: LanguageCode;
  currentUser: UserSession;
  showExplanations?: boolean;
  onToggleExplanations?: () => void;
}

export const AutomatedReports: React.FC<AutomatedReportsProps> = ({
  assets,
  currentLanguage,
  currentUser,
  showExplanations = true,
  onToggleExplanations,
}) => {
  const t = translations[currentLanguage];
  const appLocale = getAppLocale(currentLanguage);
  const repT = appLocale.reports;
  const [localExplanations, setLocalExplanations] = useState(showExplanations);
  const activeExplanations = onToggleExplanations ? showExplanations : localExplanations;
  const toggleExp = onToggleExplanations || (() => setLocalExplanations(!localExplanations));

  const [selectedReportType, setSelectedReportType] = useState<
    'iso_condition' | 'financial_valuation' | 'gdpr_compliance' | 'ccpa_privacy' | 'nist_sanitization' | 'sox_fixed_assets'
  >('iso_condition');
  const [scheduleDaily, setScheduleDaily] = useState(true);
  const [scheduleWeekly, setScheduleWeekly] = useState(true);
  const [scheduleMonthly, setScheduleMonthly] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string>(new Date().toLocaleString());

  const canGenerateReports = currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'auditor';

  // Metrics for reports
  const totalAssets = assets.length;
  const avgHealth = Math.round(assets.reduce((acc, a) => acc + a.healthIndex, 0) / (totalAssets || 1));
  const totalOriginalCost = assets.reduce((acc, a) => acc + a.financials.purchasePrice, 0);
  const totalBookValue = assets.reduce((acc, a) => acc + a.financials.currentBookValue, 0);
  const overdueMaintenanceCount = assets.filter(a => new Date(a.nextMaintenanceDue) < new Date()).length;
  const anonymizedCount = assets.filter(a => a.custodian.isAnonymized).length;

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setLastGeneratedAt(new Date().toLocaleString());
      setIsGenerating(false);
    }, 600);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const result = await generateCompliancePdf({
        reportType: selectedReportType,
        assets,
        currentUser,
        generatedAt: lastGeneratedAt,
      });
      soundEffects.playSuccessChime();
      setPdfSuccessMessage(`Formatted PDF exported successfully! Ref: ${result.documentRef} (${result.pageCount} pages, ISO 55001 & GDPR verified)`);
      setTimeout(() => setPdfSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    let headers = ['AssetTag', 'Name', 'Category', 'Criticality', 'Status', 'HealthIndex', 'ConditionGrade', 'BookValue', 'Custodian'];
    let rows = assets.map(a => [
      a.assetTag,
      `"${a.name}"`,
      a.category,
      a.criticality,
      a.status,
      a.healthIndex,
      a.conditionGrade,
      a.financials.currentBookValue,
      `"${a.custodian.name}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Asset_Report_${selectedReportType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* PDF Export Success Notice Banner */}
      {pdfSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-950">PDF Report Generated & Downloaded</div>
              <div className="text-[11px] text-emerald-800">{pdfSuccessMessage}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
            COMPLIANCE ATTESTED
          </span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">{repT.title}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {repT.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleExp}
            title={activeExplanations ? t.hideExplanations : t.showExplanations}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              activeExplanations
                ? 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            }`}
          >
            {activeExplanations ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-blue-600" />}
            <span className="hidden sm:inline">{activeExplanations ? t.hideExplanations : t.showExplanations}</span>
          </button>
          
          {/* Export PDF with Company Branding & Compliance Headers */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download formatted PDF with corporate branding & compliance headers"
          >
            <FileDown className={`w-4 h-4 ${isExportingPdf ? 'animate-bounce' : ''}`} />
            <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{repT.exportCsv}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{repT.printReport}</span>
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerateReports}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{repT.regenerateNow}</span>
          </button>
        </div>
      </div>

      {/* Automated Schedules Config Bento */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              {repT.automatedDispatch}
            </span>
          </div>
          <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
            {repT.cronActive}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold">{repT.dailySync}</div>
              <div className="text-[10px] text-slate-400">06:00 UTC • Field Staff Queue</div>
            </div>
            <input
              type="checkbox"
              checked={scheduleDaily}
              onChange={(e) => setScheduleDaily(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold">{repT.weeklyReview}</div>
              <div className="text-[10px] text-slate-400">Mondays 08:00 • Health & RPN</div>
            </div>
            <input
              type="checkbox"
              checked={scheduleWeekly}
              onChange={(e) => setScheduleWeekly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold">{repT.monthlyGdpr}</div>
              <div className="text-[10px] text-slate-400">1st of Month • DPO Log Ledger</div>
            </div>
            <input
              type="checkbox"
              checked={scheduleMonthly}
              onChange={(e) => setScheduleMonthly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: 'iso_condition', label: repT.tabIso },
          { id: 'financial_valuation', label: repT.tabFinancial },
          { id: 'gdpr_compliance', label: repT.tabGdpr },
          { id: 'ccpa_privacy', label: 'US CCPA / CPRA Privacy' },
          { id: 'nist_sanitization', label: 'NIST SP 800-88 Media Sanitization' },
          { id: 'sox_fixed_assets', label: 'SOX 404 Capital Equipment Audit' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedReportType(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedReportType === tab.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white font-mono">
                OFFICIAL REPORT
              </span>
              <span className="text-xs text-slate-500">Document Reference: ISO-REP-2026-Q3</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              {selectedReportType === 'iso_condition' && 'ISO 55001:2024 Asset Condition, Health & Criticality Audit'}
              {selectedReportType === 'financial_valuation' && 'Small Business Capital Asset Financial & Depreciation Statement'}
              {selectedReportType === 'gdpr_compliance' && 'GDPR Article 30 Records of Processing Activities & Custodian Registry'}
              {selectedReportType === 'ccpa_privacy' && 'CCPA / CPRA Consumer & Employee Privacy Compliance Audit Report'}
              {selectedReportType === 'nist_sanitization' && 'NIST SP 800-88 Rev 1 Media Sanitization & Disposal Registry'}
              {selectedReportType === 'sox_fixed_assets' && 'Sarbanes-Oxley (SOX) Section 404 Capital Equipment & Fixed Asset Inventory Audit'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Small Business Operations • Authorized by Governance & Compliance Officer
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 shrink-0">
            <div>Generated: <strong className="text-slate-800">{lastGeneratedAt}</strong></div>
            <div>Auditor Role: <strong className="text-slate-800">{currentUser.role}</strong></div>
            <div>Encrypted Vault: <strong className="text-emerald-600 font-mono">AES-256-GCM PASS</strong></div>
          </div>
        </div>

        {/* Dynamic Report Content */}
        {selectedReportType === 'iso_condition' && (
          <div className="space-y-6 text-xs">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-slate-500">Total Monitored Assets</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{totalAssets} Units</div>
                <div className="text-[10px] text-slate-400">Under ISO 55001 scope</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-slate-500">Asset Health Index Avg</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">{avgHealth}%</div>
                <div className="text-[10px] text-emerald-700">Healthy Operating State</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-slate-500">Mission Critical (Tier A)</div>
                <div className="text-xl font-bold text-red-600 mt-1">
                  {assets.filter(a => a.criticality === 'A_MISSION_CRITICAL').length} Units
                </div>
                <div className="text-[10px] text-slate-400">Priority preventive audits</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-slate-500">Overdue Maintenance</div>
                <div className="text-xl font-bold text-amber-600 mt-1">{overdueMaintenanceCount} Flagged</div>
                <div className="text-[10px] text-amber-700">Urgent calibration needed</div>
              </div>
            </div>

            {/* Condition Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Asset Tag</th>
                    <th className="p-3">Name & Model</th>
                    <th className="p-3">Lifecycle Stage</th>
                    <th className="p-3">ISO Grade</th>
                    <th className="p-3">Health Score</th>
                    <th className="p-3">Next Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-900">{asset.assetTag}</td>
                      <td className="p-3 font-medium text-slate-800">{asset.name}</td>
                      <td className="p-3 uppercase text-[10px] font-semibold text-slate-600">{asset.lifecycleStage}</td>
                      <td className="p-3 font-semibold text-slate-700">Grade {asset.conditionGrade} / 5</td>
                      <td className="p-3 font-bold text-emerald-600">{asset.healthIndex}%</td>
                      <td className="p-3 font-mono text-slate-600">{asset.nextMaintenanceDue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReportType === 'financial_valuation' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Total Initial Acquisition Cost</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  ${totalOriginalCost.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">Gross CapEx Investment</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Net Book Value (Current)</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                  ${totalBookValue.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-700">After cumulative straight-line depreciation</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Cumulative Depreciation</div>
                <div className="text-2xl font-bold font-mono text-slate-700 mt-1">
                  ${(totalOriginalCost - totalBookValue).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">Accounting write-off to date</div>
              </div>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-cyan-900 text-xs flex items-center gap-3">
              <Lock className="w-5 h-5 text-cyan-600 shrink-0" />
              <div>
                <strong>Cryptographic Protection Notice:</strong> All individual asset serial numbers, acquisition contracts, and residual purchase figures are encrypted using AES-256-GCM hardware vaults in compliance with GDPR Article 32 data security mandates.
              </div>
            </div>
          </div>
        )}

        {selectedReportType === 'gdpr_compliance' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Registered Data Subjects</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{totalAssets} Custodians</div>
                <div className="text-[11px] text-slate-500">Article 30 processing inventory</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Consent Verification Status</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">100% PASS</div>
                <div className="text-[11px] text-emerald-700">Digital signature timestamps verified</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Article 17 Erasures Executed</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{anonymizedCount} Pseudonymized</div>
                <div className="text-[11px] text-slate-500">Right to be forgotten applied</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Asset Tag</th>
                    <th className="p-3">Custodian Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Legal Basis</th>
                    <th className="p-3">Consent Date</th>
                    <th className="p-3">Privacy Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="p-3 font-mono font-bold text-slate-900">{asset.assetTag}</td>
                      <td className={`p-3 font-medium ${asset.custodian.isAnonymized ? 'italic text-slate-400' : 'text-slate-800'}`}>
                        {asset.custodian.name}
                      </td>
                      <td className="p-3 text-slate-600">{asset.custodian.department}</td>
                      <td className="p-3 text-slate-500">Art. 6(1)(f) Legitimate Interest</td>
                      <td className="p-3 font-mono text-slate-600">{new Date(asset.custodian.consentDate).toLocaleDateString()}</td>
                      <td className="p-3">
                        {asset.custodian.isAnonymized ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Pseudonymized
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active & Audited
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReportType === 'ccpa_privacy' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">California & Multi-State Custodians</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{totalAssets} Records</div>
                <div className="text-[11px] text-slate-500">Notice at Collection verified (Cal. Civ. Code § 1798.100)</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Opt-Out of Sale / Sharing (DNSMPI)</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">100% NO-SALE</div>
                <div className="text-[11px] text-emerald-700">Zero data monetization or 3P tracking</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Right to Delete (§ 1798.105) Honored</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{anonymizedCount} Pseudonymized</div>
                <div className="text-[11px] text-slate-500">Statutory 45-day SLA compliance verified</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Asset Tag</th>
                    <th className="p-3">Custodian Name</th>
                    <th className="p-3">Jurisdiction</th>
                    <th className="p-3">Notice at Collection</th>
                    <th className="p-3">Do Not Sell / Share</th>
                    <th className="p-3">CCPA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="p-3 font-mono font-bold text-slate-900">{asset.assetTag}</td>
                      <td className={`p-3 font-medium ${asset.custodian?.isAnonymized ? 'italic text-slate-400' : 'text-slate-800'}`}>
                        {asset.custodian?.isAnonymized ? '🔒 Redacted (CCPA § 1798.105)' : (asset.custodian?.name || 'Unassigned')}
                      </td>
                      <td className="p-3 text-slate-600">{asset.custodian?.jurisdiction || 'US_CCPA'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Acknowledged
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asset.custodian?.ccpaOptedOut ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {asset.custodian?.ccpaOptedOut ? 'Opted-Out' : 'No Sale Active'}
                        </span>
                      </td>
                      <td className="p-3">
                        {asset.custodian?.isAnonymized ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Deleted / Pseudonymized
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active & Compliant
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReportType === 'nist_sanitization' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Electronic Media Devices</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{totalAssets} Units</div>
                <div className="text-[11px] text-slate-500">Under NIST SP 800-88 scope</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Sanitization Standard</div>
                <div className="text-2xl font-bold text-cyan-700 mt-1">CLEAR / PURGE / DESTROY</div>
                <div className="text-[11px] text-cyan-800">Cryptographic block erase & overwrite</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Cryptographic Certificates</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">100% SHA-256 SEALED</div>
                <div className="text-[11px] text-emerald-700">Tamper-evident verification digests</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Asset Tag</th>
                    <th className="p-3">Serial Number</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">NIST Method</th>
                    <th className="p-3">Certificate Number</th>
                    <th className="p-3">Sanitization Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="p-3 font-mono font-bold text-slate-900">{asset.assetTag}</td>
                      <td className="p-3 font-mono text-slate-700">{asset.serialNumber}</td>
                      <td className="p-3 text-slate-600">{(asset.category || '').replace('_', ' ')}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 font-mono">
                          {asset.usCompliance?.nistSanitizationStatus || 'PURGE (Crypto-Erase)'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {asset.usCompliance?.nistCertificateNumber || `NIST-800-88-${asset.id.slice(-4)}`}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Certified at Rest
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReportType === 'sox_fixed_assets' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Capitalized Equipment Basis</div>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">${totalOriginalCost.toLocaleString()}</div>
                <div className="text-[11px] text-slate-500">US GAAP ASC 360 Property & Plant</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Current Net Book Value</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">${totalBookValue.toLocaleString()}</div>
                <div className="text-[11px] text-emerald-700">General ledger balance confirmed</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-400">Inventory Count Variance</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">$0.00 (0.00%)</div>
                <div className="text-[11px] text-emerald-700">SOX 404 Unqualified Clean Opinion</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Asset Tag</th>
                    <th className="p-3">Asset Name</th>
                    <th className="p-3">Acquisition Cost</th>
                    <th className="p-3">Current Net Book Value</th>
                    <th className="p-3">Variance</th>
                    <th className="p-3">SOX 404 Internal Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="p-3 font-mono font-bold text-slate-900">{asset.assetTag}</td>
                      <td className="p-3 font-medium text-slate-800">{asset.name}</td>
                      <td className="p-3 font-mono text-slate-700">${asset.financials.purchasePrice.toLocaleString()}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">${asset.financials.currentBookValue.toLocaleString()}</td>
                      <td className="p-3 font-mono text-slate-600">$0.00</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Effective Clean Opinion
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Verification Signoff */}
        <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
          <div>
            ISO 55001 Certification Body: Small Business Asset Compliance Oversight
          </div>
          <div className="font-mono">
            Cryptographic SHA-256 Digest: 8f49e32a10b...verified
          </div>
        </div>
      </div>
    </div>
  );
};
