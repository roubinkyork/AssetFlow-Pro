import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Check, 
  Save, 
  RotateCcw, 
  AlertCircle, 
  Info, 
  Fingerprint, 
  Shield, 
  Users, 
  KeyRound,
  FileCheck2,
  Clock
} from 'lucide-react';
import { PermissionsMatrix, RolePermissions, UserRole, UserSession, LanguageCode } from '../types';
import { translations } from '../i18n/translations';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  currentLanguage: LanguageCode;
  onPermissionsSaved?: (newPermissions: PermissionsMatrix) => void;
}

const DEFAULT_PERMISSIONS: PermissionsMatrix = {
  admin: {
    canCreateAsset: true,
    canEditAsset: true,
    canDeleteAsset: true,
    canUnlockFinancialVault: true,
    canApproveWorkOrders: true,
    canUpdateFieldStatus: true,
    canManageGdprData: true,
    canManagePermissions: true,
    canExportAuditLogs: true,
    canLinkAssetHierarchy: true
  },
  manager: {
    canCreateAsset: true,
    canEditAsset: true,
    canDeleteAsset: false,
    canUnlockFinancialVault: true,
    canApproveWorkOrders: true,
    canUpdateFieldStatus: true,
    canManageGdprData: false,
    canManagePermissions: false,
    canExportAuditLogs: true,
    canLinkAssetHierarchy: true
  },
  field_staff: {
    canCreateAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canUnlockFinancialVault: false,
    canApproveWorkOrders: false,
    canUpdateFieldStatus: true,
    canManageGdprData: false,
    canManagePermissions: false,
    canExportAuditLogs: false,
    canLinkAssetHierarchy: false
  },
  auditor: {
    canCreateAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canUnlockFinancialVault: true,
    canApproveWorkOrders: false,
    canUpdateFieldStatus: false,
    canManageGdprData: true,
    canManagePermissions: false,
    canExportAuditLogs: true,
    canLinkAssetHierarchy: false
  }
};

const PERMISSION_DEFINITIONS: { key: keyof RolePermissions; label: string; desc: string }[] = [
  { key: 'canCreateAsset', label: 'Create New Assets', desc: 'Register physical & digital assets into ISO 55001 registry' },
  { key: 'canEditAsset', label: 'Edit Asset Specifications', desc: 'Modify lifecycle stage, criticality, condition grade, and technical notes' },
  { key: 'canLinkAssetHierarchy', label: 'Manage Parent-Child Hierarchy', desc: 'Attach sub-assemblies, components, sensor nodes, and parent systems' },
  { key: 'canUnlockFinancialVault', label: 'Decrypt Financial Valuation Vault', desc: 'Access AES-256-GCM purchase prices, contracts, and depreciation books' },
  { key: 'canApproveWorkOrders', label: 'Approve ISO 55001 Work Orders', desc: 'Schedule predictive maintenance and approve component replacements' },
  { key: 'canUpdateFieldStatus', label: 'Mobile Field Status Pings', desc: 'Barcode scan check-ins, location updates, and condition inspections' },
  { key: 'canManageGdprData', label: 'GDPR Data Controller & Erasure', desc: 'Execute Article 17 Right to be Forgotten and export Article 20 records' },
  { key: 'canManagePermissions', label: 'Manage RBAC Security Roles', desc: 'Configure enterprise roles and save access control policies' },
  { key: 'canExportAuditLogs', label: 'Export Immutable Audit Trails', desc: 'Download cryptographically signed SHA-256 compliance logs' },
  { key: 'canDeleteAsset', label: 'Decommission & Dispose Assets', desc: 'Permanently archive or decommission assets per ISO 55001 lifecycle' },
];

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLanguage,
  onPermissionsSaved,
}) => {
  const t = translations[currentLanguage];
  const [permissions, setPermissions] = useState<PermissionsMatrix>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [savedPolicyHash, setSavedPolicyHash] = useState<string | null>(null);
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch current permissions on mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchPermissions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/permissions');
        if (res.ok) {
          const data = await res.json();
          if (data.permissions) {
            setPermissions(data.permissions);
          }
          if (data.policyHash) {
            setSavedPolicyHash(data.policyHash);
          }
        }
      } catch (e) {
        console.warn('Could not load permissions from server, using defaults:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [isOpen]);

  if (!isOpen) return null;

  const canModify = currentUser.role === 'admin' || currentUser.role === 'manager';

  const handleToggle = (role: UserRole, key: keyof RolePermissions) => {
    if (!canModify) return;
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role][key]
      }
    }));
    // Clear previous save message if editing
    setSaveSuccessMessage(null);
  };

  const handleResetDefaults = () => {
    setPermissions(DEFAULT_PERMISSIONS);
    setSaveSuccessMessage(null);
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/permissions', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ permissions }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save permissions');
      }

      const result = await res.json();
      // Explicit Save Permissions Message requested by user
      setSaveSuccessMessage(result.message || 'Permissions saved successfully! ISO 55001 & RBAC security policy updated and active across all enterprise sessions.');
      setSavedPolicyHash(result.policyHash);
      setSavedTimestamp(result.savedAt || new Date().toISOString());

      if (onPermissionsSaved) {
        onPermissionsSaved(result.permissions || permissions);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving role permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const rolesList: { role: UserRole; title: string; color: string }[] = [
    { role: 'admin', title: 'Administrator', color: 'text-purple-700 bg-purple-50 border-purple-200' },
    { role: 'manager', title: 'Asset Manager', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { role: 'field_staff', title: 'Field Staff', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { role: 'auditor', title: 'ISO Auditor', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Role Permissions & Access Control (RBAC)</h2>
                <span className="text-[10px] bg-blue-950 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-800">
                  ISO 55001 Cl. 5.3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Define fine-grained operational permissions per organizational role
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROMINENT SAVE PERMISSIONS CONFIRMATION MESSAGE (Requested by User) */}
        {saveSuccessMessage && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-900 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-xs sm:text-sm text-emerald-950 flex items-center gap-1.5">
                    <span>{saveSuccessMessage}</span>
                  </h3>
                  {savedTimestamp && (
                    <span className="text-[11px] text-emerald-700 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(savedTimestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-emerald-800">
                  <span>Authorized by: <strong>{currentUser.name}</strong></span>
                  <span>•</span>
                  <span>Active Session Policy Sync: <strong className="text-emerald-900">Enforced</strong></span>
                  {savedPolicyHash && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[10px] bg-emerald-100/90 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-300">
                        SHA-256: {savedPolicyHash.substring(0, 16)}...
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Non-admin notice */}
        {!canModify && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center gap-2 shrink-0">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Read-Only View: Only Administrators and Operations Managers can modify and save RBAC permissions.</span>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 font-bold text-slate-700 min-w-[240px]">
                      Capability / Security Permission
                    </th>
                    {rolesList.map((r) => (
                      <th key={r.role} className="py-3 px-3 text-center min-w-[110px]">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${r.color}`}>
                          {r.title}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_DEFINITIONS.map((perm) => (
                    <tr key={perm.key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{perm.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{perm.desc}</div>
                      </td>
                      {rolesList.map((r) => {
                        const isGranted = Boolean(permissions[r.role]?.[perm.key]);
                        return (
                          <td key={r.role} className="py-3 px-3 text-center align-middle">
                            <button
                              type="button"
                              disabled={!canModify}
                              onClick={() => handleToggle(r.role, perm.key)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                                isGranted
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-300 border border-slate-200'
                              } ${canModify ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-75'}`}
                              title={`${isGranted ? 'Revoke' : 'Grant'} ${perm.label} for ${r.title}`}
                            >
                              {isGranted ? <Check className="w-4 h-4 stroke-[2.5]" /> : <span className="text-slate-300 text-xs">—</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer with Save Permissions Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
            <span>Every permission modification is recorded into the immutable ISO 55001 audit ledger.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {canModify && (
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={isSaving}
                className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>

            {canModify && (
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Policy...' : 'Save Permissions'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
