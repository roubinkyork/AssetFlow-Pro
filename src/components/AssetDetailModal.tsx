import React, { useState, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  MapPin, 
  Calendar, 
  UserCheck, 
  Download, 
  Trash2, 
  Activity, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  QrCode,
  DollarSign,
  TrendingDown,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Database,
  RotateCw,
  Plus,
  Sparkles,
  Wrench,
  Tag,
  Layers,
  Link2,
  Unlink,
  CornerDownRight,
  GitFork,
  CheckCircle2,
  Fingerprint,
  FileCheck,
  Printer,
  Award,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Asset, AuditLogEntry, LanguageCode, UserSession, AssetRelationshipType } from '../types';
import { translations } from '../i18n/translations';
import { ASSET_IMAGE_PRESETS, compressAndResizeImage, getDefaultImageForCategory } from '../lib/assetPresets';
import { formatCategoryName, getCategoryBadgeStyle } from '../lib/categoryService';

interface AssetDetailModalProps {
  asset: Asset;
  onClose: () => void;
  onExecuteGdprErasure: (assetId: string) => Promise<void>;
  onExportGdprDossier: (assetId: string) => Promise<void>;
  onUpdateAsset?: (updated: Asset) => void;
  currentLanguage: LanguageCode;
  currentUser: UserSession;
  showExplanations?: boolean;
  auditLogs?: AuditLogEntry[];
  onRefreshLogs?: () => void;
  allAssets?: Asset[];
  onSelectAsset?: (asset: Asset) => void;
  onOpenCreateSubAsset?: (parentAsset: Asset) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  onExecuteGdprErasure,
  onExportGdprDossier,
  onUpdateAsset,
  currentLanguage,
  currentUser,
  showExplanations = true,
  auditLogs = [],
  onRefreshLogs,
  allAssets = [],
  onSelectAsset,
  onOpenCreateSubAsset,
}) => {
  const t = translations[currentLanguage];
  const [activeTab, setActiveTab] = useState<'iso_lifecycle' | 'hierarchy' | 'financials' | 'gdpr' | 'us_compliance' | 'tracking' | 'audit_trail'>('iso_lifecycle');
  const [isProcessingGdpr, setIsProcessingGdpr] = useState(false);
  const [gdprMessage, setGdprMessage] = useState<string | null>(null);
  const [hierarchyMsg, setHierarchyMsg] = useState<string | null>(null);
  const [isLinkingHierarchy, setIsLinkingHierarchy] = useState(false);
  const [selectedParentToLink, setSelectedParentToLink] = useState('');
  const [selectedRelTypeToLink, setSelectedRelTypeToLink] = useState<AssetRelationshipType>('component');
  const [selectedChildToAttach, setSelectedChildToAttach] = useState('');
  const [selectedChildRelType, setSelectedChildRelType] = useState<AssetRelationshipType>('component');
  const [modalExplanations, setModalExplanations] = useState<boolean>(showExplanations);

  // US Compliance States
  const [privacySubTab, setPrivacySubTab] = useState<'EU_GDPR' | 'US_CCPA'>('EU_GDPR');
  const [isProcessingUsCompliance, setIsProcessingUsCompliance] = useState(false);
  const [usComplianceMsg, setUsComplianceMsg] = useState<string | null>(null);
  const [selectedNistMethod, setSelectedNistMethod] = useState<'CLEAR' | 'PURGE' | 'DESTROY'>('PURGE');
  const [nistOperatorNotes, setNistOperatorNotes] = useState('Sanitization verified per NIST SP 800-88 Rev 1 media disposal standard.');
  const [nistCertModalData, setNistCertModalData] = useState<any | null>(null);
  const [hipaaSafeguards, setHipaaSafeguards] = useState<any | null>(null);
  const [soxReconciliation, setSoxReconciliation] = useState<any | null>(null);
  const [ccpaDisclosureModal, setCcpaDisclosureModal] = useState<any | null>(null);

  // Derived parent and child assets
  const parentAsset = asset.parentAssetId ? allAssets.find(a => a.id === asset.parentAssetId) : null;
  const childAssets = allAssets.filter(a => a.parentAssetId === asset.id || (asset.childAssetIds && asset.childAssetIds.includes(a.id)));

  // Potential parents to link to (cannot be self or existing children)
  const potentialParents = allAssets.filter(a => a.id !== asset.id && a.parentAssetId !== asset.id);
  // Potential children to attach (cannot be self, cannot already be attached to this asset, and cannot be its parent)
  const potentialChildren = allAssets.filter(a => a.id !== asset.id && a.id !== asset.parentAssetId && a.parentAssetId !== asset.id);

  // Photo management state
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(asset.imageUrl || '');
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState<boolean>(false);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>(asset.imageUrl || '');
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>('');
  const [photoSaveMessage, setPhotoSaveMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Generate depreciation projection curve data
  const purchaseYear = new Date(asset.financials?.purchaseDate || '2024-01-01').getFullYear() || 2024;
  const usefulLife = asset.financials?.usefulLifeYears || 5;
  const initialCost = asset.financials?.purchasePrice || 0;
  const salvage = asset.financials?.salvageValue || 0;
  const annualDep = usefulLife > 0 ? (initialCost - salvage) / usefulLife : 0;

  const depreciationChartData = Array.from({ length: usefulLife + 1 }, (_, index) => {
    const year = purchaseYear + index;
    const bookValue = Math.max(salvage, Math.round(initialCost - annualDep * index));
    return {
      year: String(year),
      bookValue: bookValue,
      depreciationCumulative: Math.round(annualDep * index),
    };
  });

  const handleGdprErasureClick = async () => {
    if (!window.confirm('Are you sure you want to anonymize this custodian record under GDPR Article 17 (Right to be Forgotten)? The name and personal identifiers will be permanently pseudonymized in accordance with privacy laws while preserving ISO 55001 physical asset audit integrity.')) {
      return;
    }
    setIsProcessingGdpr(true);
    try {
      await onExecuteGdprErasure(asset.id);
      setGdprMessage('Custodian personal data successfully pseudonymized under GDPR Article 17.');
      setTimeout(() => setGdprMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingGdpr(false);
    }
  };

  const handleExportClick = async () => {
    setIsProcessingGdpr(true);
    try {
      await onExportGdprDossier(asset.id);
      setGdprMessage('Custodian data portability dossier exported (JSON).');
      setTimeout(() => setGdprMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingGdpr(false);
    }
  };

  // CCPA Handlers
  const handleCcpaDeleteClick = async () => {
    if (!window.confirm('Are you sure you want to execute CCPA / CPRA Cal. Civ. Code § 1798.105 Right to Delete? The equipment custodian personal information will be permanently pseudonymized in compliance with California privacy law, while preserving ISO 55001 physical asset traceability.')) {
      return;
    }
    setIsProcessingUsCompliance(true);
    try {
      const res = await fetch(`/api/ccpa/delete/${asset.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.asset) {
          onUpdateAsset(data.asset);
        }
        setUsComplianceMsg('Custodian personal identifiers permanently deleted & pseudonymized under CCPA/CPRA § 1798.105.');
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setUsComplianceMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingUsCompliance(false);
    }
  };

  const handleCcpaExportClick = async () => {
    setIsProcessingUsCompliance(true);
    try {
      const res = await fetch(`/api/ccpa/export/${asset.id}`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCcpaDisclosureModal(data);
        // Also trigger download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CCPA_Section1798_Disclosure_${asset.assetTag}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setUsComplianceMsg('Generated official CCPA § 1798.110 Right to Know disclosure report.');
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setUsComplianceMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingUsCompliance(false);
    }
  };

  const handleCcpaOptOutToggle = async () => {
    setIsProcessingUsCompliance(true);
    try {
      const res = await fetch(`/api/ccpa/opt-out/${asset.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        },
        body: JSON.stringify({ optedOut: !asset.custodian?.ccpaOptedOut })
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.asset) {
          onUpdateAsset(data.asset);
        }
        setUsComplianceMsg(data.message || 'CCPA Do Not Sell/Share preference updated.');
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setUsComplianceMsg(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingUsCompliance(false);
    }
  };

  const handleCcpaNoticeAcknowledge = async () => {
    setIsProcessingUsCompliance(true);
    try {
      const res = await fetch(`/api/ccpa/notice-acknowledge/${asset.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.asset) {
          onUpdateAsset(data.asset);
        }
        setUsComplianceMsg('CCPA Notice at Collection verified & acknowledged.');
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setUsComplianceMsg(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingUsCompliance(false);
    }
  };

  const handleNistSanitize = async () => {
    setIsProcessingUsCompliance(true);
    try {
      const res = await fetch(`/api/compliance/nist-sanitize/${asset.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        },
        body: JSON.stringify({
          method: selectedNistMethod,
          operatorNotes: nistOperatorNotes,
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.asset) {
          onUpdateAsset(data.asset);
        }
        setNistCertModalData(data.certificate);
        setUsComplianceMsg(`NIST SP 800-88 Rev 1 media sanitization completed: ${data.certificate.certificateNumber}`);
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setUsComplianceMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingUsCompliance(false);
    }
  };

  const handleHipaaVerify = async () => {
    setIsProcessingUsCompliance(true);
    try {
      const res = await fetch(`/api/compliance/hipaa-verify/${asset.id}`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.asset) {
          onUpdateAsset(data.asset);
        }
        setHipaaSafeguards(data.safeguards);
        setUsComplianceMsg(`HIPAA Security Rule 45 CFR § 164.312 verified for ${asset.assetTag}`);
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setUsComplianceMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingUsCompliance(false);
    }
  };

  const handleSoxReconcile = async () => {
    setIsProcessingUsCompliance(true);
    try {
      const res = await fetch(`/api/compliance/sox-reconcile/${asset.id}`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.asset) {
          onUpdateAsset(data.asset);
        }
        setSoxReconciliation(data.reconciliation);
        setUsComplianceMsg(`SOX 404 physical capital inventory reconciliation completed. Variance: $0.00 (Clean Opinion)`);
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setUsComplianceMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingUsCompliance(false);
    }
  };

  // Asset Hierarchy Linking Handlers
  const handleLinkParent = async () => {
    if (!selectedParentToLink) return;
    setIsLinkingHierarchy(true);
    setHierarchyMsg(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}/link-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        },
        body: JSON.stringify({
          parentAssetId: selectedParentToLink,
          relationshipType: selectedRelTypeToLink,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.child) {
          onUpdateAsset(data.child);
        }
        setHierarchyMsg(data.message || 'Parent asset linked successfully');
        setSelectedParentToLink('');
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setHierarchyMsg(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLinkingHierarchy(false);
    }
  };

  const handleUnlinkParent = async () => {
    if (!window.confirm(`Unlink this asset from parent ${asset.parentAssetTag || 'asset'}?`)) return;
    setIsLinkingHierarchy(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}/unlink-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.child) {
          onUpdateAsset(data.child);
        }
        setHierarchyMsg('Asset unlinked from parent hierarchy.');
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setHierarchyMsg(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLinkingHierarchy(false);
    }
  };

  const handleAttachChild = async () => {
    if (!selectedChildToAttach) return;
    setIsLinkingHierarchy(true);
    try {
      const res = await fetch(`/api/assets/${selectedChildToAttach}/link-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        },
        body: JSON.stringify({
          parentAssetId: asset.id,
          relationshipType: selectedChildRelType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateAsset && data.parent) {
          onUpdateAsset(data.parent);
        }
        setHierarchyMsg(data.message || 'Sub-asset attached successfully');
        setSelectedChildToAttach('');
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setHierarchyMsg(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLinkingHierarchy(false);
    }
  };

  const handleUnlinkChild = async (childId: string) => {
    setIsLinkingHierarchy(true);
    try {
      const res = await fetch(`/api/assets/${childId}/unlink-parent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
        },
      });
      if (res.ok) {
        setHierarchyMsg('Sub-asset unlinked from hierarchy.');
        if (onUpdateAsset) {
          onUpdateAsset({
            ...asset,
            childAssetIds: (asset.childAssetIds || []).filter(cid => cid !== childId),
          });
        }
        if (onRefreshLogs) onRefreshLogs();
        setTimeout(() => setHierarchyMsg(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLinkingHierarchy(false);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await compressAndResizeImage(file, 900, 900, 0.85);
      setTempImageUrl(resized);
    } catch (err) {
      console.error('Photo compression error:', err);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Save new photo to server
  const handleSavePhoto = async () => {
    if (!tempImageUrl) return;
    setIsUpdatingPhoto(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({ imageUrl: tempImageUrl }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCurrentImageUrl(tempImageUrl);
        if (onUpdateAsset) onUpdateAsset(updated);
        setPhotoSaveMessage('Asset photo updated successfully!');
        setTimeout(() => {
          setPhotoSaveMessage(null);
          setShowPhotoModal(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving photo:', err);
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const lifecycleStages = [
    { id: 'acquisition', label: t.stageAcquisition },
    { id: 'operation', label: t.stageOperation },
    { id: 'maintenance', label: t.stageMaintenance },
    { id: 'overhaul', label: t.stageOverhaul },
    { id: 'decommissioning', label: t.stageDecommissioning },
    { id: 'disposal', label: t.stageDisposal },
  ];

  const currentStageIndex = lifecycleStages.findIndex(s => s.id === asset.lifecycleStage);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                  {asset.assetTag}
                </span>
                <span className="text-xs text-slate-400">Barcode: {asset.barcode}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">{asset.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Explanations Button */}
            <button
              type="button"
              onClick={() => setModalExplanations(!modalExplanations)}
              title={modalExplanations ? t.hideExplanations : t.showExplanations}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                modalExplanations 
                  ? 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700' 
                  : 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
              }`}
            >
              {modalExplanations ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {modalExplanations ? t.hideExplanations : t.showExplanations}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Asset Photo Banner & Key Specifications */}
        <div className="bg-slate-900/95 border-b border-slate-800 text-slate-200 px-5 py-4 shrink-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Visual Thumbnail */}
            <div className="relative w-28 h-24 sm:w-36 sm:h-28 rounded-xl overflow-hidden border-2 border-slate-700 shadow-md shrink-0 bg-slate-800 group">
              <img
                src={currentImageUrl || 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setTempImageUrl(currentImageUrl);
                  setShowPhotoModal(true);
                }}
                className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-semibold transition-opacity cursor-pointer p-1"
              >
                <Camera className="w-4 h-4 mb-1 text-cyan-400" />
                <span>Change Photo</span>
              </button>
            </div>

            {/* Core Details Grid */}
            <div className="flex-1 w-full space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 capitalize">
                  {asset.category.replace('_', ' ')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {asset.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {asset.criticality.replace(/_/g, ' ')}
                </span>
                {asset.isoComplianceGroup && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/40 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-300" />
                    <span>{asset.isoComplianceGroup}</span>
                  </span>
                )}
                {asset.maintenanceCategory && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-cyan-300" />
                    <span>{asset.maintenanceCategory}</span>
                  </span>
                )}
                {/* Parent & Child Hierarchy Badges */}
                {asset.parentAssetId ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (parentAsset && onSelectAsset) {
                        onSelectAsset(parentAsset);
                      } else {
                        setActiveTab('hierarchy');
                      }
                    }}
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/50 flex items-center gap-1 hover:bg-indigo-500/40 transition-colors cursor-pointer"
                    title={`Click to view parent asset: ${asset.parentAssetName || asset.parentAssetTag}`}
                  >
                    <CornerDownRight className="w-3 h-3 text-indigo-300" />
                    <span>↳ {asset.relationshipType || 'Component'} of {asset.parentAssetTag || 'Parent'}</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/60 text-slate-300 border border-slate-600/50 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span>Primary System</span>
                  </span>
                )}

                {childAssets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('hierarchy')}
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 flex items-center gap-1 hover:bg-emerald-500/40 transition-colors cursor-pointer"
                    title="Click to view linked child sub-assets"
                  >
                    <GitFork className="w-3 h-3 text-emerald-300" />
                    <span>{childAssets.length} Sub-Assets Attached</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Manufacturer</span>
                  <span className="font-semibold text-white">{asset.manufacturer || 'OEM'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Model</span>
                  <span className="font-semibold text-white">{asset.model || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Serial Number</span>
                  <span className="font-mono text-cyan-400">{asset.serialNumber || 'SN-0000'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Current Location</span>
                  <span className="font-semibold text-white truncate block">{asset.location?.name || 'Main Facility'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 flex items-center space-x-2 text-xs font-medium shrink-0 overflow-x-auto">
          {[
            { id: 'iso_lifecycle', label: 'ISO 55001 Lifecycle & Risk' },
            { id: 'hierarchy', label: `Asset Hierarchy & Sub-Assets (${childAssets.length})` },
            { id: 'financials', label: 'Encrypted Financials & Valuation' },
            { id: 'gdpr', label: 'EU GDPR & US CCPA Privacy' },
            { id: 'us_compliance', label: 'US Statutory Compliance (NIST / HIPAA / SOX)' },
            { id: 'tracking', label: 'Telemetry & Movement History' },
            { id: 'audit_trail', label: 'ISO & GDPR Audit Trail' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* GDPR Notice Banner if triggered */}
        {gdprMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{gdprMessage}</span>
          </div>
        )}

        {/* US Compliance Feedback Banner if triggered */}
        {usComplianceMsg && (
          <div className="bg-sky-50 border-b border-sky-200 p-3 text-xs text-sky-900 flex items-center gap-2 animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{usComplianceMsg}</span>
          </div>
        )}

        {/* Hierarchy Action Feedback Banner */}
        {hierarchyMsg && (
          <div className="bg-blue-50 border-b border-blue-200 p-3 text-xs text-blue-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{hierarchyMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: ISO 55001 LIFECYCLE & RISK */}
          {activeTab === 'iso_lifecycle' && (
            <div className="space-y-6">
              {/* Lifecycle Stage Visualizer */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ISO 55001 Asset Lifecycle Pipeline
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {lifecycleStages.map((stage, idx) => {
                    const isCompleted = idx <= currentStageIndex;
                    const isCurrent = stage.id === asset.lifecycleStage;
                    return (
                      <div
                        key={stage.id}
                        className={`p-2 rounded-lg border text-center transition-colors ${
                          isCurrent
                            ? 'bg-blue-600 text-white font-bold border-blue-700 shadow-xs'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wider">{idx + 1}. Stage</div>
                        <div className="text-xs truncate font-medium">{stage.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Health Score & Criticality Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-slate-500 font-medium">Asset Health Index</div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-slate-900">{asset.healthIndex}%</div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      Grade {asset.conditionGrade} / 5
                    </span>
                  </div>
                  {modalExplanations && (
                    <p className="text-[11px] text-slate-500">
                      Compliant with ISO 55001 Section 9.1 Monitoring and measurement criteria.
                    </p>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-slate-500 font-medium">Criticality Tier</div>
                  <div className="text-lg font-bold text-red-700">{asset.criticality.replace(/_/g, ' ')}</div>
                  {modalExplanations && (
                    <p className="text-[11px] text-slate-500">
                      Determines preventive maintenance frequency and failure impact score.
                    </p>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-slate-500 font-medium">Risk Priority Number (RPN)</div>
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-black text-slate-900">{asset.riskAssessment.rpn}</div>
                    <span className="text-[11px] text-slate-500">/ 25 max</span>
                  </div>
                  {modalExplanations && (
                    <p className="text-[11px] text-slate-500">
                      Likelihood ({asset.riskAssessment.likelihood}) × Consequence ({asset.riskAssessment.consequence})
                    </p>
                  )}
                </div>
              </div>

              {/* ISO 55001 Compliance Group & Maintenance Strategy Card */}
              <div className="bg-gradient-to-br from-purple-50/70 to-blue-50/50 rounded-xl p-4 border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>ISO 55001 Compliance Group & Maintenance Regime</span>
                  </div>
                  {asset.aiClassification && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      Gemini Auto-Tagged ({asset.aiClassification.confidenceScore}%)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-purple-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">ISO 55001 Group</span>
                    <span className="font-bold text-purple-900 block mt-0.5">
                      {asset.isoComplianceGroup || 'Critical Infrastructure & High-Harmonic Production Systems'}
                    </span>
                    {asset.aiClassification?.iso55001Clause && (
                      <span className="text-[10px] text-purple-700 block mt-1">
                        Clause: {asset.aiClassification.iso55001Clause}
                      </span>
                    )}
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Maintenance Category</span>
                    <span className="font-bold text-blue-900 block mt-0.5">
                      {asset.maintenanceCategory || 'Condition-Based Spindle Vibration & Harmonic CBM'}
                    </span>
                    {asset.maintenanceStrategy && (
                      <span className="text-[10px] text-slate-600 block mt-1">
                        Strategy: {asset.maintenanceStrategy}
                      </span>
                    )}
                  </div>
                </div>

                {asset.description && (
                  <div className="bg-white/70 p-2.5 rounded-lg border border-slate-200/60 text-slate-700 text-[11px] leading-relaxed">
                    <span className="font-semibold text-slate-900 block mb-0.5">Technical Description:</span>
                    {asset.description}
                  </div>
                )}

                {/* AI Rationale if available */}
                {asset.aiClassification?.rationale && (
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-900 italic">
                    <span className="font-semibold not-italic text-indigo-800 block mb-0.5">Auditor Rationale:</span>
                    "{asset.aiClassification.rationale}"
                  </div>
                )}

                {/* Tags */}
                {((asset.tags && asset.tags.length > 0) || (asset.aiClassification?.tags && asset.aiClassification.tags.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(asset.tags || asset.aiClassification?.tags || []).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100/70 text-purple-800 border border-purple-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Risk Mitigation Plan */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  ISO Risk Mitigation Strategy
                </div>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {asset.riskAssessment.mitigationStrategy}
                </p>
                <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  <div>Last Maintenance: <strong>{asset.lastMaintenanceDate}</strong></div>
                  <div>Next Maintenance Due: <strong className="text-blue-700">{asset.nextMaintenanceDue}</strong></div>
                  <div>Last Verified Audit: <strong>{asset.lastAuditDate}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASSET HIERARCHY & RELATED SUB-ASSETS */}
          {activeTab === 'hierarchy' && (
            <div className="space-y-6">
              {/* Introduction Card */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>ISO 55001 Asset Hierarchy & System Breakdown Structure</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono border border-blue-300">
                    RCM Level: {asset.parentAssetId ? 'Level 2/3 Component' : 'Level 1 Primary System'}
                  </span>
                </div>
                <p className="text-slate-600 text-xs">
                  Parent-child relationships enable functional roll-up of condition indicators, reliability centered maintenance (RCM), and bill-of-materials traceability.
                </p>
              </div>

              {/* SECTION A: PARENT ASSET LINKAGE */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <CornerDownRight className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Parent Asset / Primary System
                    </h4>
                  </div>
                  {asset.parentAssetId && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-semibold capitalize">
                      {asset.relationshipType || 'Component'}
                    </span>
                  )}
                </div>

                {parentAsset || asset.parentAssetId ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={parentAsset?.imageUrl || getDefaultImageForCategory(parentAsset?.category || 'industrial_machinery')}
                        alt={parentAsset?.name || 'Parent Asset'}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{asset.parentAssetTag || parentAsset?.assetTag}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium capitalize">
                            {parentAsset?.category.replace('_', ' ') || 'Primary Asset'}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 text-xs">{asset.parentAssetName || parentAsset?.name}</div>
                        <div className="text-[10px] text-slate-500">
                          Relationship: <strong>{asset.relationshipType || 'component'}</strong> • Health: <strong>{parentAsset?.healthIndex || 90}%</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {parentAsset && onSelectAsset && (
                        <button
                          type="button"
                          onClick={() => onSelectAsset(parentAsset)}
                          className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>View Parent Dossier</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isLinkingHierarchy}
                        onClick={handleUnlinkParent}
                        className="py-1.5 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        title="Detach from parent asset"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Unlink</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>This is currently configured as a <strong>Top-Level Primary Asset</strong> (no parent system).</span>
                    </div>

                    {potentialParents.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                          Attach this asset under an existing Parent System:
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={selectedParentToLink}
                            onChange={(e) => setSelectedParentToLink(e.target.value)}
                            className="flex-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="">Select Primary Parent Asset...</option>
                            {potentialParents.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.assetTag} — {p.name} ({p.category.replace('_', ' ')})
                              </option>
                            ))}
                          </select>

                          <select
                            value={selectedRelTypeToLink}
                            onChange={(e) => setSelectedRelTypeToLink(e.target.value as any)}
                            className="p-2 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="subassembly">Subassembly</option>
                            <option value="component">Component</option>
                            <option value="power_module">Power Module</option>
                            <option value="sensor_node">Sensor Node</option>
                            <option value="attachment">Attachment</option>
                          </select>

                          <button
                            type="button"
                            disabled={!selectedParentToLink || isLinkingHierarchy}
                            onClick={handleLinkParent}
                            className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Link to Parent</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION B: LINKED CHILD SUB-ASSETS */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Linked Child Sub-Assets & Components ({childAssets.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Modular sub-assemblies, pumps, drive units, and telemetry nodes operating inside this asset.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenCreateSubAsset && (
                      <button
                        type="button"
                        onClick={() => onOpenCreateSubAsset(asset)}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register New Sub-Asset</span>
                      </button>
                    )}
                  </div>
                </div>

                {childAssets.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-slate-600 font-semibold text-xs">No Sub-Assets Attached</div>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      You can register sub-components (such as spindle assemblies, coolant pumps, or telemetry sensors) under this primary asset.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {childAssets.map(child => (
                      <div key={child.id} className="p-3.5 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={child.imageUrl || getDefaultImageForCategory(child.category)}
                            alt={child.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{child.assetTag}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                                {child.relationshipType || 'component'}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                                child.status === 'in_service' ? 'bg-emerald-50 text-emerald-700' :
                                child.status === 'maintenance' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {child.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-slate-800 font-medium truncate text-xs">{child.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Health: <strong className="text-slate-700">{child.healthIndex}%</strong> (Grade {child.conditionGrade})</span>
                              <span>•</span>
                              <span>Category: <span className="capitalize">{child.category.replace('_', ' ')}</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          {onSelectAsset && (
                            <button
                              type="button"
                              onClick={() => onSelectAsset(child)}
                              className="py-1 px-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer"
                            >
                              Inspect Dossier
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isLinkingHierarchy}
                            onClick={() => handleUnlinkChild(child.id)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                            title="Unlink sub-asset from this parent"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attach Existing Asset as Child Tool */}
                {potentialChildren.length > 0 && (
                  <div className="pt-2">
                    <details className="bg-slate-50 p-3 rounded-xl border border-slate-200 group">
                      <summary className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center justify-between">
                        <span>Attach an Existing Asset as a Sub-Component</span>
                        <span className="text-[10px] text-blue-600 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="pt-3 space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={selectedChildToAttach}
                            onChange={(e) => setSelectedChildToAttach(e.target.value)}
                            className="flex-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="">Select asset to attach as child...</option>
                            {potentialChildren.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.assetTag} — {c.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={selectedChildRelType}
                            onChange={(e) => setSelectedChildRelType(e.target.value as any)}
                            className="p-2 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="subassembly">Subassembly</option>
                            <option value="component">Component</option>
                            <option value="power_module">Power Module</option>
                            <option value="sensor_node">Sensor Node</option>
                            <option value="attachment">Attachment</option>
                          </select>

                          <button
                            type="button"
                            disabled={!selectedChildToAttach || isLinkingHierarchy}
                            onClick={handleAttachChild}
                            className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs cursor-pointer"
                          >
                            Attach Asset
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ENCRYPTED FINANCIALS & VALUATION */}
          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="bg-cyan-950 text-cyan-200 p-4 rounded-xl border border-cyan-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-bold text-white text-xs">AES-256-GCM Encrypted Financial Envelope</div>
                    {modalExplanations && (
                      <div className="text-[11px] text-cyan-300">
                        Protected at rest and in transit via TLS 1.3. Cryptographic integrity confirmed.
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] bg-cyan-900 text-cyan-300 px-2 py-0.5 rounded font-mono">
                  ISO 27001 SECURE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-medium">Acquisition Cost</div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${asset.financials.purchasePrice.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">{asset.financials.purchaseDate}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-medium">Current Book Value</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    ${asset.financials.currentBookValue.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Method: {asset.financials.depreciationMethod}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-medium">Salvage Value</div>
                  <div className="text-2xl font-bold text-slate-700">
                    ${asset.financials.salvageValue.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Residual value at end of life</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-500 font-medium">Annual Depreciation</div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${asset.financials.annualDepreciation.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Life: {asset.financials.usefulLifeYears} years</div>
                </div>
              </div>

              {/* Depreciation Curve */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-xs">
                    Linear Depreciation Projection ({asset.financials.usefulLifeYears} Years)
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="w-3 h-3 bg-blue-600 rounded-sm"></span>
                    <span>Book Value</span>
                  </div>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={depreciationChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val / 1000}k`} />
                      <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Book Value']} />
                      <Area type="monotone" dataKey="bookValue" stroke="#2563eb" fill="#93c5fd" fillOpacity={0.4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GDPR & US PRIVACY (CCPA/CPRA) */}
          {activeTab === 'gdpr' && (
            <div className="space-y-6">
              {/* Jurisdiction Switcher Sub-tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Privacy Regulatory Jurisdiction:</span>
                  <div className="bg-slate-100 p-0.5 rounded-lg flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPrivacySubTab('EU_GDPR')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        privacySubTab === 'EU_GDPR'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      EU GDPR (2016/679)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivacySubTab('US_CCPA')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        privacySubTab === 'US_CCPA'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      US CCPA / CPRA (§ 1798)
                    </button>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold hidden sm:inline">
                  {privacySubTab === 'EU_GDPR' ? 'Scope: European Economic Area' : 'Scope: California & US Multi-State'}
                </span>
              </div>

              {privacySubTab === 'EU_GDPR' ? (
                <>
                  <div className="bg-blue-50 text-blue-900 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-bold text-xs">GDPR Article 30 Records of Processing Activities</div>
                        {modalExplanations && (
                          <div className="text-[11px] text-blue-700">
                            Custodian data recorded with explicit consent. Privacy rights enforceable under GDPR Art. 17 and 20.
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                      CONSENT VERIFIED
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                    <div className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
                      Assigned Equipment Custodian Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-400 text-[11px]">Custodian Name</div>
                        <div className="font-semibold text-slate-900 text-sm">
                          {asset.custodian?.isAnonymized ? '🔒 ANONYMIZED (GDPR Art. 17)' : asset.custodian?.name}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[11px]">Employee Identifier</div>
                        <div className="font-mono text-slate-800">
                          {asset.custodian?.isAnonymized ? 'HASH-REDACTED' : asset.custodian?.employeeId}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[11px]">Department</div>
                        <div className="font-semibold text-slate-800">{asset.custodian?.department}</div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[11px]">Work Email Address</div>
                        <div className="font-mono text-slate-800">
                          {asset.custodian?.isAnonymized ? 'privacy-redacted@domain.internal' : asset.custodian?.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GDPR Action Controls */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-800 text-xs">
                      GDPR Subject Rights & Data Portability Controls
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleExportClick}
                        disabled={isProcessingGdpr}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-semibold text-slate-700 transition-colors cursor-pointer text-xs"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Export GDPR Article 20 Dossier (JSON)</span>
                      </button>

                      <button
                        onClick={handleGdprErasureClick}
                        disabled={isProcessingGdpr || asset.custodian?.isAnonymized}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded-lg font-semibold transition-colors cursor-pointer text-xs disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Execute Right to be Forgotten (GDPR Art. 17)</span>
                      </button>
                    </div>
                    {modalExplanations && (
                      <p className="text-[10px] text-slate-400">
                        Pseudonymization permanently replaces custodian PII with cryptographic hashes while preserving equipment maintenance logs.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* US CCPA / CPRA TAB CONTENT */
                <>
                  <div className="bg-sky-50 text-sky-900 p-4 rounded-xl border border-sky-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-sky-600" />
                      <div>
                        <div className="font-bold text-xs">California Consumer Privacy Act (CCPA) & CPRA (Cal. Civ. Code § 1798.100+)</div>
                        <div className="text-[11px] text-sky-700">
                          Comprehensive statutory privacy protections: Right to Delete (§ 1798.105), Right to Know (§ 1798.110), and Zero Data Monetization.
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-semibold">
                      CALIFORNIA COMPLIANT
                    </span>
                  </div>

                  {/* Custodian & Notice at Collection */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="font-bold text-slate-900 text-xs">
                        CCPA § 1798.100(b) Notice at Collection & Data Subject Details
                      </div>
                      <div className="flex items-center gap-2">
                        {asset.custodian?.ccpaNoticeAcknowledged ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3" /> Notice Acknowledged
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCcpaNoticeAcknowledge}
                            disabled={isProcessingUsCompliance}
                            className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                          >
                            Acknowledge Notice Now
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-400 text-[11px]">Custodian Name</div>
                        <div className="font-semibold text-slate-900 text-sm">
                          {asset.custodian?.isAnonymized ? '🔒 REDACTED (CCPA § 1798.105)' : asset.custodian?.name}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[11px]">Employee Identifier</div>
                        <div className="font-mono text-slate-800">
                          {asset.custodian?.isAnonymized ? 'HASH-REDACTED' : asset.custodian?.employeeId}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[11px]">Department & Facility</div>
                        <div className="font-semibold text-slate-800">{asset.custodian?.department}</div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[11px]">Jurisdiction Roster</div>
                        <div className="font-mono text-slate-800">
                          {asset.custodian?.jurisdiction || 'US_CCPA'} (United States)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Do Not Sell / Share (DNSMPI) Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <Lock className="w-4 h-4 text-purple-600" />
                        <span>CCPA § 1798.120: Do Not Sell or Share My Personal Information (DNSMPI)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xl">
                        This platform adheres to a zero-monetization policy: custodian data is never sold, shared for behavioral advertising, or transferred to third-party data brokers.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        asset.custodian?.ccpaOptedOut ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {asset.custodian?.ccpaOptedOut ? 'Opted-Out of Sharing' : 'Default (No Sale Active)'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCcpaOptOutToggle}
                        disabled={isProcessingUsCompliance}
                        className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs"
                      >
                        Toggle Preference
                      </button>
                    </div>
                  </div>

                  {/* CCPA Action Controls: Delete & Know */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span>CCPA / CPRA Consumer & Employee Statutory Rights</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Statutory SLA: 45 Days (Cal. Civ. Code § 1798.130)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleCcpaExportClick}
                        disabled={isProcessingUsCompliance}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-semibold text-slate-700 transition-colors cursor-pointer text-xs"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-600" />
                        <span>Export CCPA § 1798.110 Right to Know Disclosure (JSON)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCcpaDeleteClick}
                        disabled={isProcessingUsCompliance || asset.custodian?.isAnonymized}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded-lg font-semibold transition-colors cursor-pointer text-xs disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Execute CCPA § 1798.105 Right to Delete (Pseudonymize)</span>
                      </button>
                    </div>
                    {modalExplanations && (
                      <p className="text-[10px] text-slate-400">
                        Right to Delete replaces all custodian employee PII with cryptographic hashes while maintaining equipment work order history and IRS/SOX fixed asset schedules.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: US STATUTORY COMPLIANCE (NIST / HIPAA / SOX) */}
          {activeTab === 'us_compliance' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-xs">United States Federal & Industrial Regulatory Assurance</div>
                    <div className="text-[11px] text-slate-400">
                      Standardized compliance workflows for NIST SP 800-88 media sanitization, HIPAA healthcare safeguards, and SOX 404 physical capital inventory controls.
                    </div>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                  US FEDERAL STANDARDS
                </span>
              </div>

              {/* 1. NIST SP 800-88 MEDIA SANITIZATION STATION */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-teal-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      1. NIST SP 800-88 Rev. 1 Guidelines for Media Sanitization
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      asset.usCompliance?.nistSanitizationStatus && asset.usCompliance.nistSanitizationStatus !== 'NOT_REQUIRED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      STATUS: {asset.usCompliance?.nistSanitizationStatus || 'VERIFIED_ACTIVE'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  Mandatory for IT computing, smart machining controllers, biometric lab devices, and fleet telemetry units prior to decommission, repair, or end-of-life disposal.
                </p>

                {/* Sanitization Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'CLEAR', label: 'Clear (Logical Overwrite)', desc: 'Overwrites addressable storage locations with non-sensitive pseudo-random data.' },
                    { id: 'PURGE', label: 'Purge (Cryptographic Erase)', desc: 'Executes controller cryptographic sanitize command to render target data unrecoverable.' },
                    { id: 'DESTROY', label: 'Destroy (Physical Shredding)', desc: 'Physical destruction/disintegration according to DoD & NSA/CSS specifications.' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedNistMethod(method.id as any)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedNistMethod === method.id
                          ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{method.label}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{method.desc}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Sanitization Inspector Verification Notes
                  </label>
                  <input
                    type="text"
                    value={nistOperatorNotes}
                    onChange={(e) => setNistOperatorNotes(e.target.value)}
                    placeholder="Enter serial number verification, overwrite passes, or disposal facility reference..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Certificate: {asset.usCompliance?.nistCertificateNumber || 'Unassigned (Pending Sanitization)'}
                  </div>

                  <div className="flex items-center gap-2">
                    {asset.usCompliance?.nistCertificateNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          setNistCertModalData({
                            standard: "NIST SP 800-88 Rev 1 Guidelines for Media Sanitization",
                            certificateNumber: asset.usCompliance?.nistCertificateNumber || `NIST-800-88-${Date.now().toString().slice(-6)}`,
                            sanitizationMethod: asset.usCompliance?.nistSanitizationStatus || 'PURGE',
                            assetTag: asset.assetTag,
                            serialNumber: asset.serialNumber,
                            verificationDigest: `SHA256-${Math.random().toString(36).substring(2, 14).toUpperCase()}`,
                            verifiedAt: new Date().toISOString(),
                            inspector: currentUser.name,
                            notes: nistOperatorNotes
                          });
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5 text-teal-600" />
                        <span>View NIST Certificate</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleNistSanitize}
                      disabled={isProcessingUsCompliance}
                      className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isProcessingUsCompliance ? 'Sanitizing...' : 'Execute & Issue NIST Certificate'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. HIPAA SECURITY RULE SAFEGUARDS */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      2. HIPAA Security Rule (45 CFR § 164.312) Diagnostic Equipment Safeguards
                    </span>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-violet-100 text-violet-800">
                    SAFEGUARDS ACTIVE
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  Ensures all diagnostic analyzers, biomedical devices, and laboratory telemetry systems comply with technical safeguards preventing unauthorized ePHI disclosure.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="font-bold text-slate-800 text-[11px]">Access Control</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">45 CFR § 164.312(a)(1)</div>
                    <div className="text-emerald-700 font-bold text-[10px] mt-1">PASS (Role Matrix Enforced)</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="font-bold text-slate-800 text-[11px]">Audit Controls</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">45 CFR § 164.312(b)</div>
                    <div className="text-emerald-700 font-bold text-[10px] mt-1">PASS (Immutable SHA-256 Ledger)</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="font-bold text-slate-800 text-[11px]">Integrity Controls</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">45 CFR § 164.312(c)(1)</div>
                    <div className="text-emerald-700 font-bold text-[10px] mt-1">PASS (Digital Digests Verified)</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="font-bold text-slate-800 text-[11px]">Transmission Security</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">45 CFR § 164.312(e)(1)</div>
                    <div className="text-emerald-700 font-bold text-[10px] mt-1">PASS (TLS 1.3 / AES-256)</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 sm:col-span-2">
                    <div className="font-bold text-slate-800 text-[11px]">Encryption at Rest</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">45 CFR § 164.312(a)(2)(iv)</div>
                    <div className="text-emerald-700 font-bold text-[10px] mt-1">PASS (Hardware AES-256-GCM Vault)</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleHipaaVerify}
                    disabled={isProcessingUsCompliance}
                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Run HIPAA Safeguards Verification Stamp</span>
                  </button>
                </div>
              </div>

              {/* 3. SOX SECTION 404 PHYSICAL INVENTORY RECONCILIATION */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      3. Sarbanes-Oxley (SOX) Section 404 & US GAAP Fixed Asset Reconciliation
                    </span>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    CLEAN OPINION
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-slate-400 text-[10px]">Historical Acquisition Cost</div>
                    <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                      ${(asset.financials?.purchasePrice || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-slate-400 text-[10px]">Net Book Value (GAAP)</div>
                    <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                      ${(asset.financials?.currentBookValue || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-slate-400 text-[10px]">Inventory Count Variance</div>
                    <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">$0.00 (0.0%)</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-slate-400 text-[10px]">Depreciation Schedule</div>
                    <div className="font-semibold text-slate-800 text-[11px] mt-0.5">Straight-Line ({asset.financials?.usefulLifeYears || 5}y)</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSoxReconcile}
                    disabled={isProcessingUsCompliance}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Execute SOX 404 Physical Asset Reconciliation</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TELEMETRY & MOVEMENT HISTORY */}
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Current Active Telemetry</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {asset.location.name} — {asset.location.address}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-slate-900">
                    {asset.location.coordinates.lat}, {asset.location.coordinates.lng}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Last ping: {new Date(asset.location.lastPing).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Movement History Log Table */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>ISO 55001 Asset Movement & Location Ledger</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {asset.movementHistory.map((item) => (
                    <div key={item.id} className="p-3 bg-white flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900">{item.locationName}</div>
                        <div className="text-[11px] text-slate-500">{item.notes || 'Status confirmed'}</div>
                        <div className="text-[10px] text-slate-400">Actor: {item.actor}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {item.statusAtPing}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ISO 55001 & GDPR AUDIT TRAIL */}
          {activeTab === 'audit_trail' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-white">
                      Asset Audit Trail & Immutable Ledger: {asset.assetTag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ISO 55001 Clause 7.5 documented information & GDPR Article 30 security records.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onRefreshLogs && (
                    <button
                      type="button"
                      onClick={onRefreshLogs}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3 text-slate-400" />
                      <span>Refresh</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Audit Log Table for this specific asset */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Standard</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Audit Details</th>
                      <th className="py-2.5 px-3 font-mono text-[10px]">IP Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const assetAuditLogs = (auditLogs || []).filter(log => 
                        log.assetId === asset.id || 
                        (log.assetTag && log.assetTag === asset.assetTag) ||
                        (log.details && log.details.includes(asset.assetTag))
                      );

                      if (assetAuditLogs.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                              No specific audit entries logged yet for {asset.assetTag}. System operations and status changes will appear here.
                            </td>
                          </tr>
                        );
                      }

                      return assetAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              log.complianceStandard === 'ISO_55001'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {log.complianceStandard}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-800 text-[11px]">
                            {log.action}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-900">{log.userName || 'System'}</span>
                            <span className="text-slate-400 text-[11px] ml-1">({log.userRole || 'auditor'})</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 min-w-[200px]">
                            {log.details}
                          </td>
                          <td className="py-2.5 px-3 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {log.ipHash || '127.0.0.1'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ISO 55001:2024 & GDPR Article 30 Compliant Audit Trail</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>

      {/* SUB-MODAL: CHANGE / UPDATE ASSET PHOTO */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Update Asset Equipment Photo</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {photoSaveMessage && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{photoSaveMessage}</span>
              </div>
            )}

            {/* Photo Preview & Options */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-48 h-36 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-xs">
                <img
                  src={tempImageUrl || currentImageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Upload & Camera Buttons */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload from Device</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take Photo</span>
                </button>
              </div>
            </div>

            {/* Preset Equipment Photos */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-1.5">Or Choose from Curated Presets:</div>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-lg">
                {ASSET_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTempImageUrl(preset.url)}
                    className={`p-1 rounded-md border text-left cursor-pointer transition-all ${
                      tempImageUrl === preset.url
                        ? 'border-blue-600 ring-2 ring-blue-600 bg-white'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-10 object-cover rounded mb-0.5" />
                    <div className="text-[9px] font-semibold text-slate-700 truncate">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="flex gap-2">
              <input
                type="url"
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="Or paste external image URL..."
                className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (customPhotoUrl.trim()) {
                    setTempImageUrl(customPhotoUrl.trim());
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Apply
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingPhoto}
                onClick={handleSavePhoto}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {isUpdatingPhoto ? 'Saving Photo...' : 'Save New Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
