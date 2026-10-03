/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw } from 'lucide-react';
import { 
  Asset, 
  AuditLogEntry, 
  LanguageCode, 
  UrgentAlert, 
  UserRole, 
  UserSession, 
  AssetStatus 
} from './types';
import { translations } from './i18n/translations';
import { Header } from './components/Header';
import { AssetList } from './components/AssetList';
import { FieldStaffView } from './components/FieldStaffView';
import { TrackingMap } from './components/TrackingMap';
import { AutomatedReports } from './components/AutomatedReports';
import { ComplianceAuditView } from './components/ComplianceAuditView';
import { PredictiveMaintenanceDashboard } from './components/PredictiveMaintenanceDashboard';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { AssetDetailModal } from './components/AssetDetailModal';
import { CreateEditAssetModal } from './components/CreateEditAssetModal';
import { QrPrintModal } from './components/QrPrintModal';
import { NotificationCenter } from './components/NotificationCenter';
import { AuthModal } from './components/AuthModal';
import { RolePermissionsModal } from './components/RolePermissionsModal';
import { 
  getOfflineQueue, 
  clearOfflineQueue, 
  queueOfflineMutation, 
  sendPushNotification 
} from './lib/cryptoClient';
import { soundEffects } from './lib/sound';

export default function App() {
  // Localization & Session State with localStorage persistence
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iso55001_language');
      if (saved && ['en', 'es', 'fr', 'de', 'ja', 'ar', 'pt', 'hy', 'hyw'].includes(saved)) {
        return saved as LanguageCode;
      }
    }
    return 'en';
  });

  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iso55001_session');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return {
      id: 'USR-001',
      name: 'Sarah Jenkins',
      email: 'admin@asset-enterprise.com',
      role: 'admin',
      language: 'en',
      dpoOfficer: true,
      token: 'tok_active_session',
      department: 'Enterprise Asset Governance & DPO',
    };
  });

  // Sync document language, direction (RTL for Arabic), and persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iso55001_language', currentLanguage);
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    }
    setCurrentUser(prev => ({ ...prev, language: currentLanguage }));
  }, [currentLanguage]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'predictive' | 'field_staff' | 'tracking' | 'reports' | 'compliance' | 'audit_logs'>('dashboard');

  // Core Data
  const [assets, setAssets] = useState<Asset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Network & Offline Queue
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Modals & Drawers
  const [selectedAssetForDossier, setSelectedAssetForDossier] = useState<Asset | null>(null);
  const [selectedAssetForQr, setSelectedAssetForQr] = useState<Asset | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [subAssetParent, setSubAssetParent] = useState<Asset | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Urgent Alerts
  const [alerts, setAlerts] = useState<UrgentAlert[]>([
    {
      id: 'ALT-1',
      title: 'Calibration Interval Due',
      message: 'CNC Milling Center (AST-8491) is within 7 days of ISO 55001 preventive calibration cycle.',
      severity: 'critical',
      assetTag: 'AST-8491',
      category: 'maintenance_overdue',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      read: false,
    },
    {
      id: 'ALT-2',
      title: 'Geofence Exit Recorded',
      message: 'Mercedes Sprinter Van (AST-2104) crossed Lyon logistics corridor perimeter.',
      severity: 'warning',
      assetTag: 'AST-2104',
      category: 'unauthorized_movement',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      read: false,
    }
  ]);

  // Global Explanation / ISO 55001 Guide Visibility Toggle
  const [showExplanations, setShowExplanations] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem('omni_show_explanations') !== 'false';
      }
    } catch (e) {
      // fallback
    }
    return true;
  });

  const handleToggleExplanations = useCallback(() => {
    setShowExplanations(prev => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('omni_show_explanations', String(next));
        }
      } catch (e) {
        // ignore
      }
      return next;
    });
  }, []);

  const t = translations[currentLanguage];

  // Update pending queue count
  const refreshQueueCount = useCallback(() => {
    setPendingSyncCount(getOfflineQueue().length);
  }, []);

  // Fetch initial assets from API
  const fetchAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.warn('Network error fetching assets (offline mode active):', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.warn('Error fetching audit logs:', err);
    }
  }, []);

  // Initial load & network event listeners
  useEffect(() => {
    fetchAssets();
    fetchAuditLogs();
    refreshQueueCount();

    const handleOnline = () => {
      setIsOnline(true);
      handleSyncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchAssets, fetchAuditLogs, refreshQueueCount]);

  // Sync Offline Queue to Server
  const handleSyncOfflineQueue = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mutations: queue }),
      });

      if (res.ok) {
        clearOfflineQueue();
        refreshQueueCount();
        soundEffects.playSuccessChime();
        await fetchAssets();
        await fetchAuditLogs();
      }
    } catch (err) {
      console.error('Failed to sync offline queue:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Status Update from Field Staff or Asset Table
  const handleStatusUpdate = async (
    assetId: string, 
    newStatus: AssetStatus, 
    notes: string, 
    location?: { name: string; coordinates: { lat: number; lng: number } }
  ) => {
    // If offline, store in offline queue
    if (!isOnline) {
      queueOfflineMutation({
        type: 'status_update',
        assetId,
        timestamp: new Date().toISOString(),
        payload: { status: newStatus, notes, location, updatedBy: currentUser.name },
      });
      refreshQueueCount();

      // Optimistic local update
      setAssets(prev => prev.map(a => {
        if (a.id === assetId) {
          return {
            ...a,
            status: newStatus,
            location: location ? { ...a.location, ...location, lastPing: new Date().toISOString() } : a.location,
          };
        }
        return a;
      }));
      return;
    }

    try {
      const res = await fetch(`/api/assets/${assetId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          location,
          notes,
          updatedBy: currentUser.name,
        }),
      });

      if (res.ok) {
        const updatedAsset = await res.json();
        setAssets(prev => prev.map(a => a.id === assetId ? updatedAsset : a));
        if (selectedAssetForDossier?.id === assetId) {
          setSelectedAssetForDossier(updatedAsset);
        }
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Update asset coordinates (telemetry / tracking)
  const handleUpdateCoordinates = async (assetId: string, lat: number, lng: number, locationName: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: { lat, lng },
          locationName,
          accuracyMeters: 3,
          actor: currentUser.name,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
      }
    } catch (err) {
      console.error('Error updating coordinates:', err);
    }
  };

  // Auth Handlers
  const handleSwitchRole = async (role: UserRole) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, language: currentLanguage }),
      });
      if (res.ok) {
        const userSession = await res.json();
        setCurrentUser(userSession);
        if (typeof window !== 'undefined') {
          localStorage.setItem('iso55001_session', JSON.stringify(userSession));
        }
        fetchAuditLogs();
        return;
      }
    } catch (e) {
      console.warn('Fast role switch fallback:', e);
    }
    setCurrentUser(prev => ({ ...prev, role }));
  };

  const handleLoginSuccess = (userSession: UserSession) => {
    setCurrentUser(userSession);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iso55001_session', JSON.stringify(userSession));
    }
    soundEffects.playSuccessChime();
    fetchAssets();
    fetchAuditLogs();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name }),
      });
    } catch (e) {
      console.warn('Logout notification error:', e);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('iso55001_session');
    }
    // Set to demo/logged-out state and prompt login modal
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
    fetchAuditLogs();
  };

  // Create new asset
  const handleCreateAsset = async (assetData: Partial<Asset>) => {
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify(assetData),
      });

      if (res.ok) {
        const created = await res.json();
        setAssets(prev => [created, ...prev]);
        soundEffects.playSuccessChime();
        fetchAssets(); // Refresh assets so parent-child links update
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Error creating asset:', err);
    }
  };

  // GDPR Right to be Forgotten (Article 17)
  const handleExecuteGdprErasure = async (assetId: string) => {
    try {
      const res = await fetch(`/api/gdpr/erasure/${assetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedBy: currentUser.name }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAssets(prev => prev.map(a => a.id === assetId ? updated : a));
        if (selectedAssetForDossier?.id === assetId) {
          setSelectedAssetForDossier(updated);
        }
        soundEffects.playSuccessChime();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Error running GDPR erasure:', err);
    }
  };

  // GDPR Data Portability Export (Article 20)
  const handleExportGdprDossier = async (assetId: string) => {
    try {
      const res = await fetch(`/api/gdpr/export/${assetId}`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GDPR_Article_20_Export_${assetId}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Error exporting GDPR dossier:', err);
    }
  };

  // Trigger Urgent Push Notification Alert
  const handleTriggerTestAlert = async () => {
    const alertId = `ALT-${Date.now().toString().slice(-4)}`;
    const randomAsset = assets[Math.floor(Math.random() * assets.length)] || assets[0];
    const newAlert: UrgentAlert = {
      id: alertId,
      title: 'Urgent Inventory Anomaly Detected',
      message: `Immediate condition inspection requested for ${randomAsset?.name || 'Critical Equipment'} (${randomAsset?.assetTag || 'AST-0000'}) under ISO 55001 protocol.`,
      severity: 'critical',
      assetTag: randomAsset?.assetTag,
      category: 'inventory_anomaly',
      timestamp: new Date().toISOString(),
      read: false,
    };

    setAlerts(prev => [newAlert, ...prev]);
    sendPushNotification(newAlert.title, {
      body: newAlert.message,
    });
  };

  return (
    <div
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* Top Header with Multi-Language, Role Switcher, Vault & Navigation */}
      <Header
        currentUser={currentUser}
        onSwitchRole={(role: UserRole) => setCurrentUser(prev => ({ ...prev, role }))}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
        pendingOfflineCount={pendingSyncCount}
        onSyncNow={handleSyncOfflineQueue}
        isSyncing={isSyncing}
        alerts={alerts}
        onOpenAlerts={() => setIsNotificationsOpen(true)}
        activeTab={activeTab}
        onSelectTab={(tab: string) => {
          setActiveTab(tab as any);
          soundEffects.playScanBeep();
        }}
        showExplanations={showExplanations}
        onToggleExplanations={handleToggleExplanations}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <RotateCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Loading ISO 55001 Asset Registry & Decrypting Vault...</p>
          </div>
        ) : (
          <>
            {/* TAB 0: EXECUTIVE DASHBOARD */}
            {activeTab === 'dashboard' && (
              <ExecutiveDashboard
                assets={assets}
                auditLogs={auditLogs}
                currentLanguage={currentLanguage}
                currentUser={currentUser}
                showExplanations={showExplanations}
                onToggleExplanations={handleToggleExplanations}
                onSelectAsset={(asset) => setSelectedAssetForDossier(asset)}
                onNavigateTab={(tab) => setActiveTab(tab as any)}
                onCreateAsset={() => setIsCreateModalOpen(true)}
                onOpenQr={(asset) => setSelectedAssetForQr(asset)}
              />
            )}

            {/* TAB 1: ASSET REGISTRY & TABLE */}
            {activeTab === 'assets' && (
              <AssetList
                assets={assets}
                onSelectAsset={(asset) => setSelectedAssetForDossier(asset)}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onOpenQrModal={(asset) => setSelectedAssetForQr(asset)}
                currentLanguage={currentLanguage}
                currentUser={currentUser}
                showExplanations={showExplanations}
                onToggleExplanations={handleToggleExplanations}
              />
            )}

            {/* TAB: PREDICTIVE MAINTENANCE DASHBOARD (ISO 55001) */}
            {activeTab === 'predictive' && (
              <PredictiveMaintenanceDashboard
                currentUser={currentUser}
                currentLanguage={currentLanguage}
                assets={assets}
                onRefreshAssets={fetchAssets}
                showExplanations={showExplanations}
                onToggleExplanations={handleToggleExplanations}
              />
            )}

            {/* TAB 2: FIELD STAFF MOBILE SCANNER & 1-TAP STATUS */}
            {activeTab === 'field_staff' && (
              <FieldStaffView
                assets={assets}
                onUpdateAssetStatus={async (assetId, status, conditionGrade, notes, coordinates) => {
                  await handleStatusUpdate(
                    assetId, 
                    status, 
                    notes || '', 
                    coordinates ? { name: 'GPS Field Location', coordinates } : undefined
                  );
                }}
                isOnline={isOnline}
                pendingOfflineCount={pendingSyncCount}
                onSyncNow={handleSyncOfflineQueue}
                currentLanguage={currentLanguage}
                currentUser={currentUser}
              />
            )}

            {/* TAB 3: REAL-TIME TRACKING & SATELLITE BEACONS */}
            {activeTab === 'tracking' && (
              <TrackingMap
                assets={assets}
                onSelectAsset={(asset) => setSelectedAssetForDossier(asset)}
                onUpdateCoordinates={handleUpdateCoordinates}
                currentLanguage={currentLanguage}
              />
            )}

            {/* TAB 4: AUTOMATED REPORTS & AUDIT GENERATOR */}
            {activeTab === 'reports' && (
              <AutomatedReports
                assets={assets}
                currentLanguage={currentLanguage}
                currentUser={currentUser}
                showExplanations={showExplanations}
                onToggleExplanations={handleToggleExplanations}
              />
            )}

            {/* TAB 5 & 6: COMPLIANCE, GDPR & ISO 55001 AUDIT TRAIL */}
            {(activeTab === 'compliance' || activeTab === 'audit_logs') && (
              <ComplianceAuditView
                auditLogs={auditLogs}
                currentLanguage={currentLanguage}
                currentUser={currentUser}
                showExplanations={showExplanations}
                onToggleExplanations={handleToggleExplanations}
                activeTab={activeTab}
                onRefreshLogs={fetchAuditLogs}
              />
            )}
          </>
        )}
      </main>

      {/* MODAL 1: ISO 55001 & GDPR Asset Dossier */}
      {selectedAssetForDossier && (
        <AssetDetailModal
          asset={selectedAssetForDossier}
          onClose={() => setSelectedAssetForDossier(null)}
          onExecuteGdprErasure={handleExecuteGdprErasure}
          onExportGdprDossier={handleExportGdprDossier}
          onUpdateAsset={(updated) => {
            setAssets(prev => prev.map(a => a.id === updated.id ? updated : a));
            setSelectedAssetForDossier(updated);
          }}
          currentLanguage={currentLanguage}
          currentUser={currentUser}
          showExplanations={showExplanations}
          auditLogs={auditLogs}
          onRefreshLogs={fetchAuditLogs}
          allAssets={assets}
          onSelectAsset={(asset) => setSelectedAssetForDossier(asset)}
          onOpenCreateSubAsset={(parent) => {
            setSubAssetParent(parent);
            setIsCreateModalOpen(true);
          }}
        />
      )}

      {/* MODAL 2: Create New Asset Modal */}
      {isCreateModalOpen && (
        <CreateEditAssetModal
          onClose={() => {
            setIsCreateModalOpen(false);
            setSubAssetParent(null);
          }}
          onSubmit={async (assetData) => {
            await handleCreateAsset(assetData);
            setSubAssetParent(null);
          }}
          currentLanguage={currentLanguage}
          showExplanations={showExplanations}
          existingAssets={assets}
          initialParentAssetId={subAssetParent ? subAssetParent.id : ''}
        />
      )}

      {/* MODAL 3: QR Code & Physical Barcode Print Tag */}
      {selectedAssetForQr && (
        <QrPrintModal
          asset={selectedAssetForQr}
          onClose={() => setSelectedAssetForQr(null)}
          currentLanguage={currentLanguage}
        />
      )}

      {/* DRAWER: Real-Time Urgent Notifications & Push Alerts */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        alerts={alerts}
        onMarkAllRead={() => setAlerts(prev => prev.map(a => ({ ...a, read: true })))}
        onTriggerTestAlert={handleTriggerTestAlert}
        currentLanguage={currentLanguage}
      />

      {/* Bottom Compliance & Security Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ISO 55001:2024</span>
            <span>•</span>
            <span>GDPR Art. 30 / Art. 17 Compliant</span>
            <span>•</span>
            <span className="font-mono text-emerald-700">AES-256-GCM Vault Active</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Small Business Enterprise Asset Management</span>
            <span>•</span>
            <span>Role: <strong className="text-slate-700 capitalize">{currentUser.role}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
