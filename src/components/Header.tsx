import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Bell, 
  Globe, 
  User, 
  Smartphone, 
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  ChevronDown,
  MapPin,
  X,
  LogOut,
  KeyRound,
  UserPlus,
  LogIn,
  Download
} from 'lucide-react';
import { UserRole, LanguageCode, UserSession, UrgentAlert } from '../types';
import { translations } from '../i18n/translations';
import { getAppLocale } from '../i18n/appTranslations';
import { locationService, SavedLocationData } from '../lib/locationService';

interface HeaderProps {
  currentUser: UserSession;
  onSwitchRole: (role: UserRole) => void;
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  pendingOfflineCount: number;
  onSyncNow: () => void;
  isSyncing: boolean;
  alerts: UrgentAlert[];
  onOpenAlerts: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  showExplanations: boolean;
  onToggleExplanations: () => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
  onOpenPermissions?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchRole,
  currentLanguage,
  onLanguageChange,
  isOnline,
  onToggleOnline,
  pendingOfflineCount,
  onSyncNow,
  isSyncing,
  alerts,
  onOpenAlerts,
  activeTab,
  onSelectTab,
  showExplanations,
  onToggleExplanations,
  onOpenAuth,
  onOpenPermissions,
  onLogout,
}) => {
  const t = translations[currentLanguage];
  const appLocale = getAppLocale(currentLanguage);
  const locT = appLocale.location;
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showVaultPopover, setShowVaultPopover] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [savedLoc, setSavedLoc] = useState<SavedLocationData | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setSavedLoc(locationService.getSavedLocation());
  }, []);

  const handleAcquireFreshGps = async () => {
    setIsGettingGps(true);
    try {
      const loc = await locationService.getLocation({ forcePrompt: true });
      setSavedLoc(loc);
      setLocationSuccessMsg(locT.statusGranted);
      setTimeout(() => setLocationSuccessMsg(null), 3000);
    } catch (e) {
      console.warn('GPS acquire failed:', e);
    } finally {
      setIsGettingGps(false);
    }
  };

  const handleUseFacilityDefault = () => {
    locationService.savePreference('facility_default');
    const loc = locationService.saveLocation({
      lat: 48.77584,
      lng: 9.18293,
      accuracy: 5,
      name: 'Central Operations Hub (Facility A)',
      address: 'Industriestraße 42, 70565 Stuttgart, Germany',
      source: 'facility_default',
    });
    setSavedLoc(loc);
    setLocationSuccessMsg(locT.statusFacility);
    setTimeout(() => setLocationSuccessMsg(null), 3000);
  };

  const handleResetLocation = () => {
    locationService.resetLocation();
    setSavedLoc(null);
    setLocationSuccessMsg(locT.resetSaved);
    setTimeout(() => setLocationSuccessMsg(null), 3000);
  };

  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
        setShowLangDropdown(false);
        setShowVaultPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  const languages: { code: LanguageCode; label: string; sublabel: string; flag: string; isRtl?: boolean }[] = [
    { code: 'en', label: 'English', sublabel: 'English (US/UK)', flag: '🇬🇧' },
    { code: 'es', label: 'Español', sublabel: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', sublabel: 'French', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', sublabel: 'German', flag: '🇩🇪' },
    { code: 'ja', label: '日本語', sublabel: 'Japanese', flag: '🇯🇵' },
    { code: 'ar', label: 'العربية', sublabel: 'Arabic', flag: '🇦🇪', isRtl: true },
    { code: 'pt', label: 'Português', sublabel: 'Portuguese', flag: '🇧🇷' },
    { code: 'hy', label: 'Հայերեն', sublabel: 'Eastern Armenian', flag: '🇦🇲' },
    { code: 'hyw', label: 'Արեւմտահայերէն', sublabel: 'Western Armenian', flag: '🇦🇲' },
  ];

  const currentLangObj = languages.find(l => l.code === currentLanguage);

  const filteredLanguages = languages.filter(l => 
    l.label.toLowerCase().includes(langSearch.toLowerCase()) || 
    l.sublabel.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'admin', label: t.roleAdmin, desc: 'Full permissions & GDPR DPO controller' },
    { role: 'manager', label: t.roleManager, desc: 'Asset lifecycle planning & approvals' },
    { role: 'field_staff', label: t.roleFieldStaff, desc: 'Mobile barcode scan & field status' },
    { role: 'auditor', label: t.roleAuditor, desc: 'ISO 55001 & GDPR audit review' },
  ];

  return (
    <header ref={navRef} className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Utility & Status Bar */}
      <div className="bg-slate-900 text-slate-200 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.iso55001Standard}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-300">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">{t.dataAtRestTransit}</span>
            <span className="sm:hidden">AES-256</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Online/Offline Status Pill & Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleOnline}
              title="Click to simulate offline / online network state"
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                isOnline 
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                  : 'bg-amber-950/90 text-amber-300 border border-amber-800 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <Wifi className="w-3 h-3" />
                  <span className="hidden md:inline">{t.online}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <WifiOff className="w-3 h-3" />
                  <span>{t.offlineMode}</span>
                </>
              )}
            </button>

            {/* Offline Pending Sync Badge */}
            {pendingOfflineCount > 0 && (
              <button
                onClick={onSyncNow}
                disabled={!isOnline || isSyncing}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingOfflineCount} {t.syncPendingCount}</span>
              </button>
            )}
          </div>

          {/* Location & Geolocation Persistence Pill */}
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 cursor-pointer transition-colors"
            title={locT.modalTitle}
          >
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline font-medium">{savedLoc ? locT.badgeSaved : locT.badgeActive}</span>
          </button>

          {/* Cryptographic Vault Status Indicator */}
          <div className="relative">
            <button
              onClick={() => setShowVaultPopover(!showVaultPopover)}
              className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
              title="AES-256-GCM Cryptographic Vault Status"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="hidden lg:inline">{t.encryptedVault}</span>
            </button>

            {showVaultPopover && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 z-50 text-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 font-semibold text-cyan-400 text-sm">
                    <Lock className="w-4 h-4" />
                    <span>{t.encryptedVault}</span>
                  </div>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">ACTIVE</span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <p className="text-slate-400">{t.privacyNotice}</p>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cipher:</span>
                      <span className="text-emerald-400">AES-256-GCM (128-bit MAC)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">In Transit:</span>
                      <span className="text-emerald-400">TLS 1.3 Encrypted</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Financial Data:</span>
                      <span className="text-cyan-400">Hardware Vault Encrypted</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Images:</span>
                      <span className="text-cyan-400">Encrypted Blob Store</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowVaultPopover(false)}
                  className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-1 text-xs rounded transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-700 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  {t.appName}
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  ISO 55001:2024
                </span>
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  GDPR Art. 30
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Controls: Language, Alerts, User Role, Field Mode Shortcut */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Mobile Field Mode Shortcut Button */}
            <button
              onClick={() => onSelectTab('field_staff')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'field_staff'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
              title="Switch to Mobile Field Staff Scanner Mode"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">{t.tabFieldStaff}</span>
            </button>

            {/* Explanations Toggle */}
            <button
              onClick={onToggleExplanations}
              title={showExplanations ? t.hideExplanations : t.showExplanations}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                showExplanations
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-2xs'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {showExplanations ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden md:inline">
                {showExplanations ? t.showExplanations : t.hideExplanations}
              </span>
            </button>

            {/* Enhanced Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLangDropdown(!showLangDropdown);
                  setShowRoleDropdown(false);
                  setLangSearch('');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors cursor-pointer bg-white shadow-2xs"
                aria-label="Select Language"
              >
                <span className="text-base leading-none">{currentLangObj?.flag || '🌐'}</span>
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700">{currentLanguage}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showLangDropdown && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Enterprise Language
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      9 Locales
                    </span>
                  </div>

                  {/* Search filter for languages */}
                  <div className="p-2 border-b border-slate-100">
                    <input
                      type="text"
                      placeholder="Search language / idioma..."
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
                    {filteredLanguages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          onLanguageChange(l.code);
                          setShowLangDropdown(false);
                          setLangSearch('');
                        }}
                        className={`w-full text-left rtl:text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                          currentLanguage === l.code ? 'bg-blue-50/80 text-blue-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base leading-none">{l.flag}</span>
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">{l.label}</div>
                            <div className="text-[10px] text-slate-400 leading-tight">{l.sublabel}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {l.isRtl && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              RTL
                            </span>
                          )}
                          {currentLanguage === l.code && <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />}
                        </div>
                      </button>
                    ))}
                    {filteredLanguages.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No languages matching "{langSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Urgent Alerts Bell */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Urgent Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Permissions Matrix Button */}
            {onOpenPermissions && (
              <button
                onClick={() => onOpenPermissions()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer bg-white"
                title="Configure ISO 55001 & RBAC Role Permissions"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden lg:inline">Permissions</span>
              </button>
            )}

            {/* Direct Export ZIP for GitHub / Cloud Deployment */}
            <a
              href="/api/download-source"
              download="Asset-Flow-Source.zip"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-semibold text-emerald-700 transition-colors cursor-pointer bg-emerald-50/60 shadow-2xs"
              title="Download full project source code ZIP to upload to GitHub"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Download ZIP</span>
            </a>

            {/* Role Switcher & User Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowRoleDropdown(!showRoleDropdown);
                  setShowLangDropdown(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentUser.role[0].toUpperCase()}
                </div>
                <div className="text-left rtl:text-right hidden md:block">
                  <div className="font-semibold text-slate-900 leading-tight">
                    {translations[currentLanguage][`role${currentUser.role === 'field_staff' ? 'FieldStaff' : currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'manager' ? 'Manager' : 'Auditor'}` as keyof typeof translations[typeof currentLanguage]] || currentUser.role}
                  </div>
                  <div className="text-[10px] text-slate-500">{t.switchRole}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold capitalize">
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                    {currentUser.department && (
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser.department}</div>
                    )}
                  </div>

                  <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {t.switchRole} (Fast RBAC)
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        onSwitchRole(r.role);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left rtl:text-right px-3.5 py-1.5 text-xs flex flex-col hover:bg-slate-50 transition-colors cursor-pointer ${
                        currentUser.role === r.role ? 'bg-blue-50/70 border-l-2 rtl:border-l-0 rtl:border-r-2 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${currentUser.role === r.role ? 'text-blue-700' : 'text-slate-800'}`}>
                          {r.label}
                        </span>
                        {currentUser.role === r.role && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500">{r.desc}</span>
                    </button>
                  ))}

                  {/* Permissions & User Account Management Actions */}
                  <div className="pt-1.5 mt-1 border-t border-slate-100 space-y-0.5 px-1.5">
                    {onOpenPermissions && (
                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          onOpenPermissions();
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-blue-50 text-blue-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        <span>Manage Role Permissions (RBAC)</span>
                      </button>
                    )}

                    {onOpenAuth && (
                      <>
                        <button
                          onClick={() => {
                            setShowRoleDropdown(false);
                            onOpenAuth('register');
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                          <span>Register New Enterprise User</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowRoleDropdown(false);
                            onOpenAuth('login');
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <LogIn className="w-3.5 h-3.5 text-slate-500" />
                          <span>Switch Account / Sign In</span>
                        </button>
                      </>
                    )}

                    {onLogout && (
                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          onLogout();
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>Log Out Active Session</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs - RTL friendly gap */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-t border-slate-100 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: 'dashboard', label: t.tabDashboard || 'Dashboard' },
            { id: 'assets', label: t.tabAssets },
            { id: 'predictive', label: t.tabPredictive, highlight: true },
            { id: 'field_staff', label: t.tabFieldStaff },
            { id: 'tracking', label: t.tabRealtimeTrack },
            { id: 'reports', label: t.tabReports },
            { id: 'compliance', label: t.tabCompliance },
            { id: 'audit_logs', label: t.tabAuditLogs },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : tab.highlight
                  ? 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.highlight && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Persistent Location & Geolocation Management Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in text-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{locT.modalTitle}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{locT.modalSubtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Coordinates Dossier */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {locT.currentCoords}
              </div>
              {savedLoc ? (
                <div className="space-y-1">
                  <div className="font-mono text-sm font-bold text-slate-900 flex items-center justify-between">
                    <span>{savedLoc.lat} N</span>
                    <span>{savedLoc.lng} E</span>
                  </div>
                  <div className="text-xs font-medium text-slate-700">{savedLoc.name}</div>
                  {savedLoc.address && (
                    <div className="text-[11px] text-slate-500">{savedLoc.address}</div>
                  )}
                  <div className="text-[10px] text-emerald-700 flex items-center gap-1.5 pt-1 border-t border-slate-200">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>{locT.statusGranted}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-1">
                  No cached coordinates found. Select a preset or calibrate.
                </div>
              )}
            </div>

            {/* Feedback alert */}
            {locationSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{locationSuccessMsg}</span>
              </div>
            )}

            {/* Remember Choice Note */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-blue-900">{locT.rememberChoice}</div>
                <div className="text-blue-700 text-[11px] mt-0.5">{locT.rememberChoiceDesc}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleAcquireFreshGps}
                disabled={isGettingGps}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
                <span>{isGettingGps ? 'Querying Browser GPS...' : locT.recalibrateNow}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleUseFacilityDefault}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {locT.useFacilityDefault}
                </button>

                <button
                  type="button"
                  onClick={handleResetLocation}
                  className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {locT.resetSaved}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {locT.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
