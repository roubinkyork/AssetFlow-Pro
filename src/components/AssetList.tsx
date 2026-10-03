import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Lock, 
  Unlock, 
  Eye, 
  Edit, 
  QrCode, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Plus, 
  FileText,
  Shield,
  Layers,
  Sparkles,
  EyeOff,
  GitFork,
  CornerDownRight,
  LayoutGrid,
  Table as TableIcon,
  Network,
  ChevronRight,
  ExternalLink,
  Activity,
  Check,
  Tag,
  X,
  CheckCircle2,
  FolderPlus
} from 'lucide-react';
import { Asset, AssetCriticality, AssetLifecycleStage, AssetStatus, LanguageCode, UserSession } from '../types';
import { translations } from '../i18n/translations';
import { getAppLocale } from '../i18n/appTranslations';
import { getDefaultImageForCategory } from '../lib/assetPresets';
import { getAllCategories, addCustomCategory, formatCategoryName, getCategoryBadgeStyle } from '../lib/categoryService';

interface AssetListProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onOpenCreateModal: () => void;
  onOpenQrModal: (asset: Asset) => void;
  currentLanguage: LanguageCode;
  currentUser: UserSession;
  showExplanations?: boolean;
  onToggleExplanations?: () => void;
}

export const AssetList: React.FC<AssetListProps> = ({
  assets,
  onSelectAsset,
  onOpenCreateModal,
  onOpenQrModal,
  currentLanguage,
  currentUser,
  showExplanations = true,
  onToggleExplanations,
}) => {
  const t = translations[currentLanguage];
  const appLocale = getAppLocale(currentLanguage);
  const listT = appLocale.assetList;
  const [localExplanations, setLocalExplanations] = useState(showExplanations);
  const activeExplanations = onToggleExplanations ? showExplanations : localExplanations;
  const toggleExp = onToggleExplanations || (() => setLocalExplanations(!localExplanations));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [hierarchyFilter, setHierarchyFilter] = useState<'all' | 'primary' | 'sub_assets'>('all');
  const [vaultUnlocked, setVaultUnlocked] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'hierarchy'>('cards');

  // Category Management State
  const [showCategoryManagerModal, setShowCategoryManagerModal] = useState<boolean>(false);
  const [catMgrName, setCatMgrName] = useState('');
  const [catMgrDesc, setCatMgrDesc] = useState('');
  const [catMgrColor, setCatMgrColor] = useState('purple');
  const [catMgrNotice, setCatMgrNotice] = useState<string | null>(null);
  const [categoriesVersion, setCategoriesVersion] = useState<number>(0);

  // Compute available categories with real asset counts
  const availableCategories = React.useMemo(() => {
    const registered = getAllCategories();
    const catMap = new Map<string, { id: string; name: string; description?: string; color?: string; count: number; isCustom?: boolean }>();
    
    for (const c of registered) {
      catMap.set(c.id, { 
        id: c.id, 
        name: c.name, 
        description: c.description,
        color: c.color,
        count: 0, 
        isCustom: c.isCustom 
      });
    }

    for (const a of assets) {
      if (catMap.has(a.category)) {
        catMap.get(a.category)!.count += 1;
      } else {
        catMap.set(a.category, {
          id: a.category,
          name: formatCategoryName(a.category),
          count: 1,
          isCustom: true,
        });
      }
    }

    return Array.from(catMap.values());
  }, [assets, categoriesVersion]);

  // Handle adding new custom category from AssetList
  const handleCreateCategoryFromList = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!catMgrName.trim()) return;
    try {
      const created = await addCustomCategory({
        name: catMgrName.trim(),
        description: catMgrDesc.trim(),
        color: catMgrColor,
      });
      setCategoriesVersion(v => v + 1);
      setSelectedCategory(created.id);
      setCatMgrName('');
      setCatMgrDesc('');
      setCatMgrNotice(`Category "${created.name}" created! Filter updated.`);
      setTimeout(() => setCatMgrNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error creating category');
    }
  };

  // RBAC checks with dynamic permissions support
  const userPerms = (currentUser as any).permissions;
  const canCreateAsset = userPerms ? Boolean(userPerms.canCreateAsset) : (currentUser.role === 'admin' || currentUser.role === 'manager');
  const canUnlockFinancialVault = userPerms ? Boolean(userPerms.canUnlockFinancialVault) : (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'auditor');

  // Filter logic
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.custodian.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.parentAssetTag && asset.parentAssetTag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    const matchesCriticality = selectedCriticality === 'all' || asset.criticality === selectedCriticality;
    const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;
    const matchesStage = selectedStage === 'all' || asset.lifecycleStage === selectedStage;
    const matchesHierarchy = 
      hierarchyFilter === 'all' ? true :
      hierarchyFilter === 'primary' ? !asset.parentAssetId :
      Boolean(asset.parentAssetId);

    return matchesSearch && matchesCategory && matchesCriticality && matchesStatus && matchesStage && matchesHierarchy;
  });

  // Calculate high-level financial valuations
  const totalBookValue = assets.reduce((acc, a) => acc + (a.financials?.currentBookValue || 0), 0);
  const totalOriginalCost = assets.reduce((acc, a) => acc + (a.financials?.purchasePrice || 0), 0);
  const averageHealth = Math.round(assets.reduce((acc, a) => acc + a.healthIndex, 0) / (assets.length || 1));

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'in_service':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">{t.statusInService}</span>;
      case 'in_transit':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{t.statusInTransit}</span>;
      case 'maintenance':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">{t.statusMaintenance}</span>;
      case 'audited':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">{t.statusAudited}</span>;
      case 'quarantine':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">{t.statusQuarantine}</span>;
      case 'decommissioned':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 border border-slate-300">{t.statusDecommissioned}</span>;
      default:
        return null;
    }
  };

  const getCriticalityBadge = (crit: AssetCriticality) => {
    switch (crit) {
      case 'A_MISSION_CRITICAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">{listT.tierCritical}</span>;
      case 'B_ESSENTIAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">{listT.tierEssential}</span>;
      case 'C_NON_CRITICAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">{listT.tierStandard}</span>;
    }
  };

  // Hierarchy grouping for tree view
  const primaryAssets = filteredAssets.filter(a => !a.parentAssetId);
  const orphanChildAssets = filteredAssets.filter(a => a.parentAssetId && !assets.some(p => p.id === a.parentAssetId));

  return (
    <div className="space-y-6">
      {/* High Level Key Metrics Bento (Compact & Clean) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{listT.registeredAssets}</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{assets.length}</div>
          <div className="text-xs text-slate-400 mt-1">{listT.registryTitle}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{listT.avgHealth}</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{averageHealth}%</div>
          <div className="text-xs text-slate-400 mt-1">{listT.conditionWeighted}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{listT.netBookValue}</span>
            <div className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-cyan-600" />
              <span className="text-[10px] text-cyan-600 font-mono">AES-256</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {vaultUnlocked ? `$${totalBookValue.toLocaleString()}` : '••••••••'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {vaultUnlocked ? `Original: $${totalOriginalCost.toLocaleString()}` : listT.encryptedStorage}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{listT.vaultAccess}</span>
            {vaultUnlocked ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-slate-400" />}
          </div>
          <button
            onClick={() => {
              if (canUnlockFinancialVault) {
                setVaultUnlocked(!vaultUnlocked);
              } else {
                alert('Access Denied: Role "field_staff" cannot unlock sensitive financial valuation vault under ISO/GDPR access controls.');
              }
            }}
            className={`mt-2 w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              vaultUnlocked
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {vaultUnlocked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>{listT.lockVault}</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>{listT.unlockVault}</span>
              </>
            )}
          </button>
          <div className="text-[10px] text-slate-400 mt-1 text-center">
            {canUnlockFinancialVault ? listT.authorizedRbac : listT.restrictedRbac}
          </div>
        </div>
      </div>

      {/* Action Header & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden bg-slate-50/50"
            />
          </div>

          {/* View Mode Switcher & Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Mode Selector Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Cards View — Comprehensive visual asset cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Table View — Dense spreadsheet overview"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('hierarchy')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'hierarchy'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Hierarchy Tree — Parent systems and connected sub-components"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Hierarchy</span>
              </button>
            </div>

            <button
              onClick={toggleExp}
              title={activeExplanations ? t.hideExplanations : t.showExplanations}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                activeExplanations
                  ? 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              {activeExplanations ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-blue-600" />}
              <span className="hidden sm:inline">{activeExplanations ? t.hideExplanations : t.showExplanations}</span>
            </button>
            {canCreateAsset && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addNewAsset}</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-400 text-xs mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{listT.filters}:</span>
          </div>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white"
          >
            <option value="all">{listT.allCategories} ({assets.length})</option>
            <optgroup label="Standard ISO 55001 Categories">
              {availableCategories.filter(c => !c.isCustom).map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
              ))}
            </optgroup>
            {availableCategories.some(c => c.isCustom) && (
              <optgroup label="Custom Registered Categories">
                {availableCategories.filter(c => c.isCustom).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Manage Categories Action Button */}
          <button
            type="button"
            onClick={() => setShowCategoryManagerModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Manage asset categories and register new taxonomies"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Manage Categories</span>
          </button>

          {/* Criticality */}
          <select
            value={selectedCriticality}
            onChange={(e) => setSelectedCriticality(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white"
          >
            <option value="all">{listT.allCriticality}</option>
            <option value="A_MISSION_CRITICAL">{listT.tierCritical}</option>
            <option value="B_ESSENTIAL">{listT.tierEssential}</option>
            <option value="C_NON_CRITICAL">{listT.tierStandard}</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white"
          >
            <option value="all">{listT.allStatuses}</option>
            <option value="in_service">{t.statusInService}</option>
            <option value="in_transit">{t.statusInTransit}</option>
            <option value="maintenance">{t.statusMaintenance}</option>
            <option value="audited">{t.statusAudited}</option>
            <option value="quarantine">{t.statusQuarantine}</option>
          </select>

          {/* Lifecycle Stage */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white"
          >
            <option value="all">{listT.allStages}</option>
            <option value="acquisition">{t.stageAcquisition}</option>
            <option value="operation">{t.stageOperation}</option>
            <option value="maintenance">{t.stageMaintenance}</option>
            <option value="overhaul">{t.stageOverhaul}</option>
            <option value="decommissioning">{t.stageDecommissioning}</option>
          </select>

          {/* Hierarchy Filter */}
          <select
            value={hierarchyFilter}
            onChange={(e) => setHierarchyFilter(e.target.value as any)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white"
          >
            <option value="all">Hierarchy: All Levels</option>
            <option value="primary">Primary Systems Only (Parents)</option>
            <option value="sub_assets">Sub-Assets & Components Only</option>
          </select>

          <span className="text-xs text-slate-400 font-mono ml-2">
            Showing {filteredAssets.length} of {assets.length} assets
          </span>

          {(selectedCategory !== 'all' || selectedCriticality !== 'all' || selectedStatus !== 'all' || selectedStage !== 'all' || hierarchyFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedCriticality('all');
                setSelectedStatus('all');
                setSelectedStage('all');
                setHierarchyFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer ml-auto"
            >
              {listT.resetFilters}
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW MODE 1: COMPREHENSIVE ASSET CARDS GRID (DEFAULT)    */}
      {/* ======================================================== */}
      {viewMode === 'cards' && (
        <div>
          {filteredAssets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">{listT.noAssetsFound}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No registered equipment matches the selected search filters. Try resetting search criteria or add a new asset.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedCriticality('all');
                  setSelectedStatus('all');
                  setSelectedStage('all');
                  setHierarchyFilter('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredAssets.map((asset) => {
                const childCount = assets.filter(a => a.parentAssetId === asset.id || (asset.childAssetIds && asset.childAssetIds.includes(a.id))).length;
                const parentAsset = asset.parentAssetId ? assets.find(a => a.id === asset.parentAssetId) : null;
                const healthColor = asset.healthIndex >= 85 ? 'text-emerald-600 bg-emerald-500' :
                                   asset.healthIndex >= 60 ? 'text-amber-600 bg-amber-500' : 'text-rose-600 bg-rose-500';

                return (
                  <div
                    key={asset.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* TOP: Image & Visual Badges Overlay */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden shrink-0 border-b border-slate-100">
                      <img
                        src={asset.imageUrl || getDefaultImageForCategory(asset.category)}
                        alt={asset.name}
                        onClick={() => onSelectAsset(asset)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getDefaultImageForCategory(asset.category);
                        }}
                        title="Click to view full ISO dossier"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10 pointer-events-none">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getCriticalityBadge(asset.criticality)}
                          <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                            {asset.assetTag}
                          </span>
                        </div>
                        <div className="pointer-events-auto">
                          {getStatusBadge(asset.status)}
                        </div>
                      </div>

                      {/* Bottom Floating Info Pill */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                        <span className="text-[10px] font-semibold text-slate-800 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-xs border border-slate-200/60 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-purple-600" />
                          <span>{formatCategoryName(asset.category)}</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenQrModal(asset);
                          }}
                          className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 backdrop-blur-xs shadow-xs border border-slate-200/60 transition-colors cursor-pointer"
                          title="Print QR / Barcode Tag"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* MIDDLE: Card Content Body */}
                    <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                      {/* Name & Manufacturer */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>Barcode: {asset.barcode}</span>
                          {asset.serialNumber && <span>S/N: {asset.serialNumber}</span>}
                        </div>

                        <h3 
                          onClick={() => onSelectAsset(asset)}
                          className="font-bold text-slate-900 text-sm mt-1 leading-snug group-hover:text-blue-600 transition-colors cursor-pointer"
                          title={asset.name}
                        >
                          {asset.name}
                        </h3>

                        <p className="text-xs text-slate-500 mt-0.5">
                          {asset.manufacturer} · Model: {asset.model}
                        </p>

                        {asset.isoComplianceGroup && (
                          <div className="mt-1 text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-medium">
                            {asset.isoComplianceGroup}
                          </div>
                        )}
                      </div>

                      {/* Hierarchy Connection Badge (Parent or Child) */}
                      {asset.parentAssetId ? (
                        <div className="p-2 rounded-xl bg-indigo-50/90 border border-indigo-100 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CornerDownRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-indigo-500 uppercase font-semibold block leading-none">
                                Sub-Asset ({asset.relationshipType || 'component'})
                              </span>
                              <span className="font-semibold text-indigo-950 truncate block mt-0.5">
                                Part of {asset.parentAssetTag} ({asset.parentAssetName || parentAsset?.name || 'Primary System'})
                              </span>
                            </div>
                          </div>
                          {parentAsset && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectAsset(parentAsset);
                              }}
                              className="text-[10px] text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-1 rounded font-semibold shrink-0 cursor-pointer shadow-2xs"
                              title="Inspect parent system dossier"
                            >
                              Parent
                            </button>
                          )}
                        </div>
                      ) : childCount > 0 ? (
                        <div className="p-2 rounded-xl bg-emerald-50/90 border border-emerald-100 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <GitFork className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <span className="text-[10px] text-emerald-600 uppercase font-semibold block leading-none">
                                Master System
                              </span>
                              <span className="font-semibold text-emerald-950 block mt-0.5">
                                {childCount} Sub-Assemblies & Components Attached
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(asset.assetTag);
                              setHierarchyFilter('all');
                            }}
                            className="text-[10px] text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-2 py-1 rounded font-semibold shrink-0 cursor-pointer shadow-2xs"
                            title="Filter asset list to this system's sub-assets"
                          >
                            Filter Sub-Assets
                          </button>
                        </div>
                      ) : null}

                      {/* ISO 55001 Health Gauge & Condition */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-semibold flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                            <span>ISO 55001 Health</span>
                          </span>
                          <span className="font-bold text-slate-900">
                            {asset.healthIndex}% <span className="text-[11px] font-normal text-slate-500">Grade {asset.conditionGrade}/5</span>
                          </span>
                        </div>

                        {/* Health Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              asset.healthIndex >= 85 ? 'bg-emerald-500' :
                              asset.healthIndex >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${asset.healthIndex}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>Risk RPN: <strong>{asset.riskAssessment.rpn} / 25</strong></span>
                          <span className="capitalize font-medium text-slate-700">Stage: {asset.lifecycleStage}</span>
                        </div>
                      </div>

                      {/* Location & Custodian Row */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>Location</span>
                          </span>
                          <div className="font-medium text-slate-800 truncate" title={`${asset.location.facility} - ${asset.location.name}`}>
                            {asset.location.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {asset.location.facility}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                            <Shield className="w-3 h-3 text-slate-400" />
                            <span>Custodian</span>
                          </span>
                          <div className="font-medium text-slate-800 truncate" title={asset.custodian.name}>
                            {asset.custodian.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {asset.custodian.department}
                          </div>
                        </div>
                      </div>

                      {/* Encrypted Financial Book Value */}
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Net Book Value (AES-256)
                          </span>
                          <span className="font-mono font-bold text-sm text-cyan-300">
                            {vaultUnlocked ? `${asset.financials.currency} ${asset.financials.currentBookValue.toLocaleString()}` : '••••••••'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">
                            {vaultUnlocked ? `Cost: ${asset.financials.currency} ${asset.financials.purchasePrice.toLocaleString()}` : 'Vault Locked'}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                            {vaultUnlocked ? 'Verified' : 'Encrypted'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM: Action Bar */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectAsset(asset)}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View ISO Dossier</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenQrModal(asset)}
                        className="py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Print Barcode & QR Tag"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">QR</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 2: TABLE VIEW (SPREADSHEET DENSE LIST)        */}
      {/* ======================================================== */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[260px]">{listT.assetCol}</th>
                  <th className="py-3 px-4 min-w-[180px]">{listT.categoryCol}</th>
                  <th className="py-3 px-4 min-w-[160px]">{listT.healthCol}</th>
                  <th className="py-3 px-4 min-w-[160px]">{listT.statusCol}</th>
                  <th className="py-3 px-4 min-w-[150px]">{listT.netBookValue}</th>
                  <th className="py-3 px-4 min-w-[160px]">{listT.custodianCol}</th>
                  <th className="py-3 px-4 text-right min-w-[140px]">{listT.actionsCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {listT.noAssetsFound}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const childCount = assets.filter(a => a.parentAssetId === asset.id || (asset.childAssetIds && asset.childAssetIds.includes(a.id))).length;
                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Identification */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={asset.imageUrl || getDefaultImageForCategory(asset.category)}
                              alt={asset.name}
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => onSelectAsset(asset)}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getDefaultImageForCategory(asset.category);
                              }}
                              title="Click to view asset details"
                            />
                            <div>
                              <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{asset.assetTag}</span>
                                {getCriticalityBadge(asset.criticality)}
                              </div>
                              <div className="text-slate-800 font-semibold text-xs mt-0.5 line-clamp-1" title={asset.name}>
                                {asset.name}
                              </div>
                              
                              {/* Parent Hierarchy or Sub-Assets badge */}
                              {asset.parentAssetId ? (
                                <div className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 w-fit mt-0.5 border border-indigo-200/60">
                                  <CornerDownRight className="w-2.5 h-2.5 text-indigo-500" />
                                  <span>↳ {asset.relationshipType || 'component'} of <strong>{asset.parentAssetTag}</strong></span>
                                </div>
                              ) : childCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery(asset.assetTag);
                                    setHierarchyFilter('all');
                                  }}
                                  className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 mt-0.5 w-fit cursor-pointer"
                                  title="Filter table to see sub-assets"
                                >
                                  <GitFork className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>{childCount} Sub-Assets Attached</span>
                                </button>
                              ) : (
                                <div className="text-[10px] text-slate-400 font-mono">Barcode: {asset.barcode}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category & Model */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">
                            {formatCategoryName(asset.category)}
                          </div>
                          {asset.isoComplianceGroup && (
                            <div className="text-[10px] text-purple-700 font-medium line-clamp-1" title={asset.isoComplianceGroup}>
                              {asset.isoComplianceGroup}
                            </div>
                          )}
                          <div className="text-slate-500 text-[11px]">{asset.manufacturer} · {asset.model}</div>
                        </td>

                        {/* ISO 55001 Health & Condition */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  asset.healthIndex >= 85 ? 'bg-emerald-500' :
                                  asset.healthIndex >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${asset.healthIndex}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900">{asset.healthIndex}%</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Grade {asset.conditionGrade} / 5 ({t[`conditionGrade${asset.conditionGrade}` as keyof typeof t] || 'Standard'})
                          </div>
                          <div className="text-[10px] text-slate-400">
                            RPN: {asset.riskAssessment.rpn} / 25
                          </div>
                        </td>

                        {/* Status & Location */}
                        <td className="py-3.5 px-4">
                          <div className="mb-1">{getStatusBadge(asset.status)}</div>
                          <div className="flex items-center gap-1 text-slate-700 text-[11px] font-medium" title={`${asset.location.facility} - ${asset.location.name}`}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{asset.location.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {asset.location.facility}
                          </div>
                        </td>

                        {/* Encrypted Financial Book Value */}
                        <td className="py-3.5 px-4">
                          {vaultUnlocked ? (
                            <div>
                              <div className="font-mono font-bold text-slate-900">
                                {asset.financials.currency} {asset.financials.currentBookValue.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Cost: {asset.financials.currency} {asset.financials.purchasePrice.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                <span>AES-256 Verified</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400">
                              <Lock className="w-3 h-3 text-cyan-600" />
                              <span className="font-mono tracking-widest text-[11px]">••••••••</span>
                            </div>
                          )}
                        </td>

                        {/* GDPR Custodian */}
                        <td className="py-3.5 px-4">
                          <div className={`font-medium ${asset.custodian.isAnonymized ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                            {asset.custodian.name}
                          </div>
                          <div className="text-[10px] text-slate-500">{asset.custodian.department}</div>
                          {asset.custodian.isAnonymized ? (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">GDPR Art. 17 Forgotten</span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">Consent Verified</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenQrModal(asset)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                              title={t.printBarcode}
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onSelectAsset(asset)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors cursor-pointer"
                              title={t.viewDetails}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ISO Dossier</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 3: HIERARCHY TREE VIEW (SYSTEMS & SUB-ASSETS)  */}
      {/* ======================================================== */}
      {viewMode === 'hierarchy' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
              <GitFork className="w-4 h-4 text-blue-600" />
              <span>ISO 55001 Asset Breakdown Structure (ABS) & Hierarchy Tree</span>
            </div>
            <p className="text-slate-600">
              Primary production systems and tooling are displayed as root systems, with their direct sub-assemblies, drive units, and telemetry nodes nested underneath.
            </p>
          </div>

          <div className="space-y-4">
            {primaryAssets.map((primary) => {
              const children = assets.filter(a => a.parentAssetId === primary.id);

              return (
                <div key={primary.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  {/* Primary System Master Header */}
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={primary.imageUrl || getDefaultImageForCategory(primary.category)}
                        alt={primary.name}
                        onClick={() => onSelectAsset(primary)}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-90"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">{primary.assetTag}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wide">
                            Level 1 Primary System
                          </span>
                          {getCriticalityBadge(primary.criticality)}
                          {getStatusBadge(primary.status)}
                        </div>
                        <h4 
                          onClick={() => onSelectAsset(primary)}
                          className="font-bold text-slate-900 text-sm mt-0.5 hover:text-blue-600 cursor-pointer"
                        >
                          {primary.name}
                        </h4>
                        <div className="text-xs text-slate-500">
                          {primary.manufacturer} · {primary.model} · Location: {primary.location.name} ({primary.location.facility})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <div className="text-right mr-2 hidden sm:block">
                        <div className="text-xs font-bold text-slate-900">Health {primary.healthIndex}%</div>
                        <div className="text-[10px] text-slate-400">Condition Grade {primary.conditionGrade}/5</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenQrModal(primary)}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        title="Print QR Tag"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectAsset(primary)}
                        className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Master</span>
                      </button>
                    </div>
                  </div>

                  {/* Connected Sub-Components */}
                  <div className="p-4 bg-white">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CornerDownRight className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Attached Sub-Assemblies & Components ({children.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectAsset(primary)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer border border-indigo-200 shadow-2xs"
                        title="Open master asset dossier to attach or register new components"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Attach Components</span>
                      </button>
                    </div>

                    {children.length === 0 ? (
                      <div className="p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No sub-assets attached to this primary system.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 sm:pl-4 border-l-2 border-indigo-200 my-2">
                        {children.map(child => (
                          <div
                            key={child.id}
                            className="p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 transition-colors flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={child.imageUrl || getDefaultImageForCategory(child.category)}
                                alt={child.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-900 text-xs">{child.assetTag}</span>
                                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 capitalize">
                                    {child.relationshipType || 'component'}
                                  </span>
                                </div>
                                <div className="font-semibold text-slate-800 text-xs truncate" title={child.name}>
                                  {child.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Health: <strong className="text-slate-700">{child.healthIndex}%</strong> · Grade {child.conditionGrade}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectAsset(child)}
                              className="py-1 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-blue-700 font-semibold text-xs shrink-0 cursor-pointer shadow-2xs"
                            >
                              Inspect
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Orphan / Standalone Sub-Assets */}
            {orphanChildAssets.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-amber-800 text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Standalone / Sub-Assets with Unresolved Parent Links ({orphanChildAssets.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orphanChildAssets.map(asset => (
                    <div key={asset.id} className="p-3 rounded-xl bg-amber-50/30 border border-amber-200/60 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-mono font-bold text-xs text-slate-900">{asset.assetTag}</span>
                        <div className="font-semibold text-slate-800 text-xs truncate">{asset.name}</div>
                        <div className="text-[10px] text-slate-500">Parent Ref: {asset.parentAssetTag || asset.parentAssetId}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectAsset(asset)}
                        className="py-1 px-2 rounded-lg bg-white border border-slate-200 text-blue-700 text-xs font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CATEGORY MANAGER & CUSTOM TAXONOMY REGISTRATION   */}
      {/* ======================================================== */}
      {showCategoryManagerModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Asset Category Taxonomy Manager</h3>
                  <p className="text-[11px] text-slate-500">ISO 55001 Asset Structuring & Classification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryManagerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification if added */}
            {catMgrNotice && (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{catMgrNotice}</span>
              </div>
            )}

            {/* Body */}
            <div className="overflow-y-auto space-y-5 text-xs flex-1 pr-1">
              {/* Add New Category Card */}
              <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                  <Plus className="w-4 h-4 text-purple-600" />
                  <span>Register a New Asset Category</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Create a custom category for specialized asset portfolios (e.g., Renewable Energy, HVAC Systems, Cleanroom Tooling, Mining Excavators).
                </p>

                <form onSubmit={handleCreateCategoryFromList} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Category Title *</label>
                      <input
                        type="text"
                        required
                        value={catMgrName}
                        onChange={(e) => setCatMgrName(e.target.value)}
                        placeholder="e.g. Renewable Energy & Solar"
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Color Theme</label>
                      <select
                        value={catMgrColor}
                        onChange={(e) => setCatMgrColor(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                      >
                        <option value="purple">Purple Theme</option>
                        <option value="blue">Blue Theme</option>
                        <option value="indigo">Indigo Theme</option>
                        <option value="emerald">Emerald Theme</option>
                        <option value="amber">Amber Theme</option>
                        <option value="rose">Rose Theme</option>
                        <option value="teal">Teal Theme</option>
                        <option value="cyan">Cyan Theme</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                    <input
                      type="text"
                      value={catMgrDesc}
                      onChange={(e) => setCatMgrDesc(e.target.value)}
                      placeholder="e.g. Photovoltaic arrays, micro-inverters, and energy storage batteries"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!catMgrName.trim()}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Category</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Categories List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                    Current Registered Categories ({availableCategories.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">Standard + Custom</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {availableCategories.map(cat => {
                    const style = getCategoryBadgeStyle(cat.id);
                    return (
                      <div
                        key={cat.id}
                        className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-3 h-3 rounded-full shrink-0 ${style.dot}`}></span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-xs">{cat.name}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                                {cat.isCustom ? 'Custom' : 'Standard ISO'}
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5" title={cat.description}>
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {cat.count} {cat.count === 1 ? 'asset' : 'assets'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setShowCategoryManagerModal(false);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                          >
                            Filter by this
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Categories are saved locally and synced with enterprise ISO asset vaults.
              </span>
              <button
                type="button"
                onClick={() => setShowCategoryManagerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
