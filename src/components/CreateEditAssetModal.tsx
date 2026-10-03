import React, { useState, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Plus, 
  Barcode, 
  DollarSign, 
  UserCheck, 
  MapPin, 
  AlertTriangle,
  Upload,
  Camera,
  Image as ImageIcon,
  Check,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Sparkles,
  Bot,
  Wrench,
  CheckCircle2,
  Cpu,
  Layers,
  Tag,
  RefreshCw,
  Info,
  CornerDownRight,
  GitFork
} from 'lucide-react';
import { Asset, AssetCriticality, AssetLifecycleStage, AssetStatus, ConditionGrade, LanguageCode, AiAssetClassification, AssetRelationshipType, AssetCategory, CategoryDefinition } from '../types';
import { translations } from '../i18n/translations';
import { ASSET_IMAGE_PRESETS, getDefaultImageForCategory, compressAndResizeImage } from '../lib/assetPresets';
import { getAllCategories, addCustomCategory, formatCategoryName, getCategoryBadgeStyle } from '../lib/categoryService';

interface CreateEditAssetModalProps {
  onClose: () => void;
  onSubmit: (assetData: Partial<Asset>) => Promise<void>;
  currentLanguage: LanguageCode;
  showExplanations?: boolean;
  existingAssets?: Asset[];
  initialParentAssetId?: string;
}

export const CreateEditAssetModal: React.FC<CreateEditAssetModalProps> = ({
  onClose,
  onSubmit,
  currentLanguage,
  showExplanations = true,
  existingAssets = [],
  initialParentAssetId = '',
}) => {
  const t = translations[currentLanguage];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalExplanations, setModalExplanations] = useState(showExplanations);

  // Categories State
  const [categoriesList, setCategoriesList] = useState<CategoryDefinition[]>(() => getAllCategories());
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatColor, setNewCatColor] = useState('purple');
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assetTag, setAssetTag] = useState(`AST-${Math.floor(1000 + Math.random() * 9000)}`);
  const [barcode, setBarcode] = useState(`${Math.floor(100000000000 + Math.random() * 900000000000)}`);
  const [category, setCategory] = useState<AssetCategory>('industrial_machinery');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState<AssetStatus>('in_service');
  const [lifecycleStage, setLifecycleStage] = useState<AssetLifecycleStage>('acquisition');
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>(1);
  const [criticality, setCriticality] = useState<AssetCriticality>('A_MISSION_CRITICAL');

  // Parent-Child Asset Relationship State
  const [parentAssetId, setParentAssetId] = useState<string>(initialParentAssetId);
  const [relationshipType, setRelationshipType] = useState<AssetRelationshipType>('component');

  // Resolved Parent Asset Object
  const parentAssetObj = existingAssets.find(a => a.id === parentAssetId);

  // ISO 55001 & AI Maintenance Classification State
  const [isoComplianceGroup, setIsoComplianceGroup] = useState<string>('Critical Infrastructure & High-Harmonic Production Systems');
  const [maintenanceCategory, setMaintenanceCategory] = useState<string>('Condition-Based Spindle Vibration & Harmonic CBM');
  const [maintenanceStrategy, setMaintenanceStrategy] = useState<string>('Predictive Vibration Harmonics & Dynamic Laser Alignment');
  const [appliedTags, setAppliedTags] = useState<string[]>(['precision-cnc', 'high-rpm-spindle', 'vibration-cbm', 'iso-55001-cl8.1', 'mission-critical']);
  
  // Gemini AI Suggestion State
  const [isAnalyzingWithAi, setIsAnalyzingWithAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiAssetClassification | null>(null);
  const [hasAppliedAi, setHasAppliedAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Quick Preset Sample Assets for Demo & Instant Testing
  const SAMPLE_PRESETS = [
    {
      title: "5-Axis CNC Milling",
      name: "Haas VF-4SS 5-Axis Super-Speed CNC Milling Machine",
      description: "High-precision vertical machining center with 12,000 RPM inline direct-drive spindle, 40-taper tool changer, and dynamic laser calibration for aerospace turbine blades.",
      manufacturer: "Haas Automation Inc.",
      model: "VF-4SS 5-Axis"
    },
    {
      title: "Cardiac Ultrasound Diagnostic",
      name: "Sonosite PX High-Resolution Point-of-Care Ultrasound Diagnostic",
      description: "Emergency room diagnostic medical imaging system with acoustic curved transducer array, color doppler hemodynamics, and IEC 60601 clinical life-safety standards.",
      manufacturer: "Fujifilm Sonosite",
      model: "PX POC Diagnostic"
    },
    {
      title: "Cold-Chain Fleet Van",
      name: "Mercedes Sprinter 317 CDI Electric Cold-Chain Logistics Van",
      description: "Battery-electric commercial delivery cargo van equipped with dual-zone Carrier Transicold refrigeration unit and real-time IoT telematics for pharmaceutical transport.",
      manufacturer: "Mercedes-Benz AG",
      model: "Sprinter 317 CDI EV"
    },
    {
      title: "Cloud Datacenter Server",
      name: "Dell PowerEdge R760 2U Dual Xeon Cloud Datacenter Server",
      description: "Enterprise rack server with dual Intel Xeon Platinum processors, 512GB DDR5 ECC memory, redundant 1400W hot-plug PSUs, hosting mission-critical ERP databases.",
      manufacturer: "Dell Technologies",
      model: "PowerEdge R760"
    },
    {
      title: "Metrology Calibrator",
      name: "Fluke 5522A High-Precision Multi-Product Calibrator Standard",
      description: "Standards laboratory electrical calibration standard providing traceable DC/AC voltage, current, resistance, and thermocouple reference standards under ISO/IEC 17025.",
      manufacturer: "Fluke Calibration",
      model: "5522A Metrology"
    }
  ];

  // Image Management State
  const [imageUrl, setImageUrl] = useState<string>(getDefaultImageForCategory('industrial_machinery'));
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [imageSourceType, setImageSourceType] = useState<'preset' | 'upload' | 'url'>('preset');
  const [showPresetPicker, setShowPresetPicker] = useState<boolean>(false);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [hasUserCustomizedImage, setHasUserCustomizedImage] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Financials
  const [purchasePrice, setPurchasePrice] = useState<number>(15000);
  const [salvageValue, setSalvageValue] = useState<number>(2500);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(7);
  const [currency, setCurrency] = useState('USD');
  const [vendorName, setVendorName] = useState('');
  const [contractNumber, setContractNumber] = useState('');

  // Location & Custodian
  const [locationName, setLocationName] = useState('Central Warehouse Bay 1');
  const [facility, setFacility] = useState('Main Operating Site');
  const [address, setAddress] = useState('Tech Corridor 500, City Center');
  const [custodianName, setCustodianName] = useState('');
  const [custodianEmail, setCustodianEmail] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [mitigationStrategy, setMitigationStrategy] = useState('Routine preventive ISO 55001 quarterly diagnostic check');

  // When category changes, if user hasn't uploaded their own photo, match the preset
  const handleCategoryChange = (newCat: any) => {
    setCategory(newCat);
    if (!hasUserCustomizedImage) {
      setImageUrl(getDefaultImageForCategory(newCat));
    }
  };

  // Add custom category handler
  const handleAddNewCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const created = await addCustomCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        color: newCatColor,
      });
      const updatedList = getAllCategories();
      setCategoriesList(updatedList);
      setCategory(created.id);
      if (!hasUserCustomizedImage) {
        setImageUrl(getDefaultImageForCategory(created.id));
      }
      setNewCatName('');
      setNewCatDesc('');
      setShowNewCategoryModal(false);
      setCategoryNotice(`Category "${created.name}" created and selected!`);
      setTimeout(() => setCategoryNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error creating category');
    }
  };

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const resizedBase64 = await compressAndResizeImage(file, 900, 900, 0.85);
      setImageUrl(resizedBase64);
      setImageSourceType('upload');
      setHasUserCustomizedImage(true);
      setShowPresetPicker(false);
      setShowCustomUrlInput(false);
    } catch (err) {
      console.error('Image compression error:', err);
      alert('Could not process this image. Please try a different JPEG or PNG image.');
    } finally {
      setIsProcessingImage(false);
      // Reset input value so same file can be re-selected if needed
      if (e.target) e.target.value = '';
    }
  };

  // Handle custom URL submission
  const handleApplyCustomUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customUrlInput.trim()) return;
    setImageUrl(customUrlInput.trim());
    setImageSourceType('url');
    setHasUserCustomizedImage(true);
    setShowCustomUrlInput(false);
  };

  // Handle preset selection
  const handleSelectPreset = (presetUrl: string) => {
    setImageUrl(presetUrl);
    setImageSourceType('preset');
    setHasUserCustomizedImage(true);
    setShowPresetPicker(false);
  };

  // Analyze asset description with Gemini AI Suggestion Engine
  const handleAnalyzeWithGemini = async (
    overrideName?: string, 
    overrideDesc?: string, 
    overrideMan?: string, 
    overrideMod?: string
  ) => {
    const targetName = (overrideName !== undefined ? overrideName : name).trim();
    const targetDesc = (overrideDesc !== undefined ? overrideDesc : description).trim();
    const targetMan = (overrideMan !== undefined ? overrideMan : manufacturer).trim();
    const targetMod = (overrideMod !== undefined ? overrideMod : model).trim();

    if (!targetName && !targetDesc) {
      alert('Please enter an Asset Name or Description first for Gemini to analyze.');
      return;
    }

    setIsAnalyzingWithAi(true);
    setAiError(null);
    setHasAppliedAi(false);

    try {
      const res = await fetch('/api/ai/analyze-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetName,
          description: targetDesc,
          manufacturer: targetMan,
          model: targetMod,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const classification: AiAssetClassification = await res.json();
      setAiSuggestion(classification);
      applyAiClassification(classification);
    } catch (err: any) {
      console.error('Gemini Suggestion error:', err);
      setAiError('Could not connect to Gemini suggestion service. Please check your network or try again.');
    } finally {
      setIsAnalyzingWithAi(false);
    }
  };

  const applyAiClassification = (sug: AiAssetClassification) => {
    if (sug.category) {
      setCategory(sug.category);
      if (!hasUserCustomizedImage) {
        setImageUrl(getDefaultImageForCategory(sug.category));
      }
    }
    if (sug.suggestedCriticality) {
      setCriticality(sug.suggestedCriticality);
    }
    if (sug.suggestedConditionGrade) {
      setConditionGrade(sug.suggestedConditionGrade);
    }
    if (sug.riskMitigationStrategy) {
      setMitigationStrategy(sug.riskMitigationStrategy);
    }
    if (sug.iso55001ComplianceGroup) {
      setIsoComplianceGroup(sug.iso55001ComplianceGroup);
    }
    if (sug.maintenanceCategory) {
      setMaintenanceCategory(sug.maintenanceCategory);
    }
    if (sug.maintenanceStrategy) {
      setMaintenanceStrategy(sug.maintenanceStrategy);
    }
    if (sug.tags && Array.isArray(sug.tags)) {
      setAppliedTags(sug.tags);
    }
    setHasAppliedAi(true);
  };

  const handleSelectSample = (sample: typeof SAMPLE_PRESETS[0]) => {
    setName(sample.name);
    setDescription(sample.description);
    setManufacturer(sample.manufacturer);
    setModel(sample.model);
    handleAnalyzeWithGemini(sample.name, sample.description, sample.manufacturer, sample.model);
  };

  const handleToggleTag = (tag: string) => {
    setAppliedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter asset name');

    setIsSubmitting(true);
    try {
      const newAssetData: Partial<Asset> = {
        name,
        description: description.trim(),
        assetTag,
        barcode,
        category,
        manufacturer: manufacturer || 'Global OEM',
        model: model || 'Standard Model',
        serialNumber: serialNumber || `SN-${Date.now().toString().slice(-6)}`,
        status,
        lifecycleStage,
        conditionGrade,
        healthIndex: conditionGrade === 1 ? 95 : conditionGrade === 2 ? 85 : conditionGrade === 3 ? 65 : 40,
        criticality,
        parentAssetId: parentAssetId || undefined,
        relationshipType: parentAssetId ? relationshipType : undefined,
        isoComplianceGroup,
        maintenanceCategory,
        maintenanceStrategy,
        tags: appliedTags,
        aiClassification: aiSuggestion || undefined,
        location: {
          name: locationName,
          facility,
          address,
          coordinates: { lat: 48.7758 + (Math.random() - 0.5) * 0.05, lng: 9.1829 + (Math.random() - 0.5) * 0.05 },
          accuracyMeters: 4,
          lastPing: new Date().toISOString(),
        },
        custodian: {
          id: `CUST-${Date.now().toString().slice(-4)}`,
          name: custodianName || 'Assigned Custodian',
          employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          department,
          email: custodianEmail || 'custodian@enterprise.com',
          consentRecorded: true,
          consentDate: new Date().toISOString(),
          isAnonymized: false,
        },
        financials: {
          purchasePrice: Number(purchasePrice),
          currentBookValue: Number(purchasePrice),
          salvageValue: Number(salvageValue),
          annualDepreciation: Math.round((purchasePrice - salvageValue) / usefulLifeYears),
          purchaseDate: new Date().toISOString().split('T')[0],
          depreciationMethod: 'straight_line',
          usefulLifeYears: Number(usefulLifeYears),
          currency,
          vendorName: vendorName || 'Authorized Distributor',
          contractNumber: contractNumber || `CTR-${Math.floor(1000 + Math.random() * 9000)}`,
          isEncryptedInStorage: true,
          encryptionAlgorithm: 'AES-256-GCM',
        },
        riskAssessment: {
          likelihood: criticality === 'A_MISSION_CRITICAL' ? 2 : 1,
          consequence: criticality === 'A_MISSION_CRITICAL' ? 5 : 3,
          rpn: criticality === 'A_MISSION_CRITICAL' ? 10 : 3,
          mitigationStrategy,
        },
        lastMaintenanceDate: new Date().toISOString().split('T')[0],
        nextMaintenanceDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0],
        lastAuditDate: new Date().toISOString().split('T')[0],
        imageUrl: imageUrl || getDefaultImageForCategory(category),
        notes: description ? `[ISO 55001 Group: ${isoComplianceGroup}] ${description}` : undefined,
      };

      await onSubmit(newAssetData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">{t.addNewAsset}</h3>
              {modalExplanations && (
                <p className="text-[11px] text-slate-400">
                  ISO 55001 Registration & Encrypted Storage Vault
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Explanations Toggle */}
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
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Parent Asset Sub-Assembly Linkage Banner */}
        {parentAssetObj && (
          <div className="bg-indigo-50 border-b border-indigo-200 px-5 py-3 flex items-center justify-between text-xs text-indigo-950 shrink-0">
            <div className="flex items-center gap-2.5">
              <GitFork className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="font-bold text-indigo-900">Attaching as Sub-Asset / Component:</span>
                <span className="ml-1 text-slate-700">
                  This item will operate as a{' '}
                  <strong className="text-indigo-800 uppercase font-mono">{relationshipType.replace('_', ' ')}</strong>{' '}
                  under primary asset:
                </span>
                <span className="ml-1.5 font-mono font-bold bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-800">
                  {parentAssetObj.assetTag}
                </span>{' '}
                <span className="font-semibold text-slate-800">({parentAssetObj.name})</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setParentAssetId('')}
              className="text-[11px] text-slate-500 hover:text-rose-600 hover:underline cursor-pointer shrink-0 ml-2"
              title="Detach and register as top-level primary asset instead"
            >
              Clear Parent
            </button>
          </div>
        )}

        {/* Category Created Banner */}
        {categoryNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-800 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{categoryNotice}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* SECTION 1: ASSET PHOTO / IMAGE (NEW) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  {t.assetPhoto}
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {imageSourceType === 'upload' ? 'Uploaded Photo' : imageSourceType === 'url' ? 'Custom URL' : 'Preset Photo'}
              </span>
            </div>

            {modalExplanations && (
              <p className="text-[11px] text-slate-500">
                Provide an image to identify the physical equipment during field scans and ISO condition audits. You can upload an image file, snap with camera, or select a pre-curated industry photo.
              </p>
            )}

            {/* Photo Preview & Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              {/* Image Preview Thumbnail */}
              <div className="relative w-36 h-28 sm:w-44 sm:h-32 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-xs shrink-0 group">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Asset Preview"
                    className="w-full h-full object-cover"
                    onError={() => {
                      setImageUrl(getDefaultImageForCategory(category));
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[10px]">No image selected</span>
                  </div>
                )}

                {isProcessingImage && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-semibold">
                    Processing...
                  </div>
                )}

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl(getDefaultImageForCategory(category));
                      setImageSourceType('preset');
                      setHasUserCustomizedImage(false);
                    }}
                    title={t.removePhoto}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-slate-900/70 hover:bg-rose-600 text-white transition-colors cursor-pointer opacity-80 hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-1 space-y-2.5 w-full">
                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t.uploadPhoto}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.takePhotoCamera}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPresetPicker(!showPresetPicker);
                      setShowCustomUrlInput(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      showPresetPicker
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.choosePresetPhoto}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomUrlInput(!showCustomUrlInput);
                      setShowPresetPicker(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      showCustomUrlInput
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.customImageUrl}</span>
                  </button>
                </div>

                {/* Custom URL Input Accordion */}
                {showCustomUrlInput && (
                  <div className="flex gap-2 pt-2 animate-fade-in">
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="https://example.com/asset-image.jpg"
                      className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCustomUrl()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {/* Preset Gallery Carousel */}
                {showPresetPicker && (
                  <div className="pt-2 animate-fade-in">
                    <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
                      Select Curated Equipment Photo:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg">
                      {ASSET_IMAGE_PRESETS.map((preset) => {
                        const isSelected = imageUrl === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPreset(preset.url)}
                            className={`relative text-left p-1.5 rounded-lg border text-xs transition-all cursor-pointer group ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-full h-14 object-cover rounded-md mb-1"
                            />
                            <div className="font-semibold text-slate-800 text-[10px] truncate" title={preset.name}>
                              {preset.name}
                            </div>
                            <div className="text-[9px] text-slate-400 capitalize">
                              {preset.category.replace('_', ' ')}
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5 shadow-xs">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: BASIC SPECIFICATIONS & GEMINI AI SUGGESTION ENGINE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                1. Asset Specifications & Description
              </h4>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600 animate-spin-slow" />
                Gemini Auto-Tagging Ready
              </span>
            </div>

            {/* Quick Preset Selector Chips */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  Try Sample Industrial Equipment (1-Click Auto-Classification):
                </span>
                <span className="text-[10px] text-slate-400">Click to fill & analyze</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PRESETS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    disabled={isAnalyzingWithAi}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 border border-slate-200 text-slate-700 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-purple-500" />
                    <span>{sample.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Spec Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Precision 5-Axis CNC Milling Center"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Category *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryModal(true)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Category</span>
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowNewCategoryModal(true);
                    } else {
                      handleCategoryChange(e.target.value);
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50"
                >
                  <optgroup label="Standard ISO 55001 Categories">
                    {categoriesList.filter(c => !c.isCustom).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                  {categoriesList.some(c => c.isCustom) && (
                    <optgroup label="Custom Registered Categories">
                      {categoriesList.filter(c => c.isCustom).map(c => (
                        <option key={c.id} value={c.id}>{c.name} (Custom)</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="__add_new__">➕ + Add New Custom Category...</option>
                </select>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Selected: <strong className="text-slate-600">{formatCategoryName(category)}</strong></span>
                  {categoriesList.find(c => c.id === category)?.isCustom && (
                    <span className="text-purple-600 font-medium">Custom Category</span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Asset Technical Description & Operational Function *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Used by Gemini to infer maintenance regime & ISO 55001 group
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe operating parameters, component mechanics, RPM, fluid pressure, power rating, or clinical application..."
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asset Tag ID</label>
                <input
                  type="text"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Barcode / Serial Number</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Haas / Siemens / Fujifilm"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Model Number</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. VF-4SS Super-Speed"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* GEMINI-POWERED SUGGESTION ENGINE INTERACTION CARD */}
            <div className="bg-gradient-to-br from-purple-50/80 via-indigo-50/50 to-slate-50 border border-purple-200/90 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>Gemini-Powered Asset Suggestion Engine</span>
                      <span className="text-[10px] font-normal text-purple-700 bg-purple-100/80 px-2 py-0.2 rounded-full border border-purple-200">
                        ISO 55001 & RCM
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Evaluates technical description to auto-tag correct maintenance category and ISO 55001 compliance group.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAnalyzeWithGemini()}
                  disabled={isAnalyzingWithAi || (!name.trim() && !description.trim())}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0 ${
                    isAnalyzingWithAi
                      ? 'bg-purple-300 text-white cursor-not-allowed'
                      : (!name.trim() && !description.trim())
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingWithAi ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingWithAi ? 'Analyzing Description...' : '✨ Analyze & Tag with Gemini'}</span>
                </button>
              </div>

              {/* Error Notice */}
              {aiError && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Suggestions Preview Panel */}
              {aiSuggestion && (
                <div className="bg-white/90 backdrop-blur-xs border border-purple-200 rounded-xl p-3.5 space-y-3 animate-fade-in text-xs">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800 text-[11px]">
                        AI Classification Generated
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                        {aiSuggestion.confidenceScore}% Confidence
                      </span>
                      <span className="bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded border border-purple-200 capitalize">
                        Source: {aiSuggestion.source === 'gemini' ? 'Gemini 3.8 Flash' : 'ISO 55001 Knowledge Engine'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasAppliedAi ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3.5 h-3.5" />
                          Applied to Form
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => applyAiClassification(aiSuggestion)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Apply All AI Tags
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Two Column Grid for Maintenance Category & ISO 55001 Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Maintenance Category Block */}
                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-semibold">
                        <span className="flex items-center gap-1 text-blue-700 font-bold">
                          <Wrench className="w-3 h-3 text-blue-600" />
                          Maintenance Category
                        </span>
                        <span className="bg-blue-100/70 text-blue-800 px-1.5 py-0.2 rounded font-mono">
                          {aiSuggestion.category}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-[11px]">
                        {aiSuggestion.maintenanceCategory}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        <span className="font-semibold">Strategy:</span> {aiSuggestion.maintenanceStrategy}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        <span className="font-semibold">Cadence:</span> {aiSuggestion.recommendedFrequency}
                      </div>
                    </div>

                    {/* ISO 55001 Compliance Group Block */}
                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-semibold">
                        <span className="flex items-center gap-1 text-purple-700 font-bold">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          ISO 55001 Compliance Group
                        </span>
                        <span className="bg-purple-100/70 text-purple-800 px-1.5 py-0.2 rounded font-mono">
                          {aiSuggestion.suggestedCriticality.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-[11px]">
                        {aiSuggestion.iso55001ComplianceGroup}
                      </div>
                      <div className="text-[10px] text-purple-700 font-medium">
                        <span className="font-semibold">Standard Clause:</span> {aiSuggestion.iso55001Clause}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        <span className="font-semibold">Condition Rating:</span> Grade {aiSuggestion.suggestedConditionGrade} Initial
                      </div>
                    </div>
                  </div>

                  {/* AI Engineering Rationale */}
                  <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
                    <span className="font-bold text-[10px] text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-3 h-3 text-indigo-600" />
                      Auditor & Engineering Rationale:
                    </span>
                    <p className="italic text-slate-700 text-[11px] leading-relaxed">
                      "{aiSuggestion.rationale}"
                    </p>
                  </div>

                  {/* Recommended Risk Mitigation Strategy */}
                  <div className="text-[11px] text-slate-700">
                    <span className="font-semibold text-slate-900">Recommended Risk Mitigation (ISO Cl. 6.1): </span>
                    <span className="text-slate-600">{aiSuggestion.riskMitigationStrategy}</span>
                  </div>

                  {/* Dynamic Tags */}
                  {aiSuggestion.tags && aiSuggestion.tags.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <Tag className="w-3 h-3 text-purple-600" />
                        Automated Compliance & Engineering Tags:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiSuggestion.tags.map((tag, idx) => {
                          const isSelected = appliedTags.includes(tag);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleToggleTag(tag)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <span>#{tag}</span>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Key Physical Sensors To Monitor */}
                  {aiSuggestion.keySensorsToMonitor && aiSuggestion.keySensorsToMonitor.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700">Key Sensors To Monitor:</span>
                      <div className="flex flex-wrap gap-1">
                        {aiSuggestion.keySensorsToMonitor.map((sensor, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 font-mono">
                            {sensor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION: ASSET HIERARCHY & PARENT LINKING */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Asset System Hierarchy & Parent Linking</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">ISO 55001 Asset Structuring</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Parent Asset (Optional)
                </label>
                <select
                  value={parentAssetId}
                  onChange={(e) => setParentAssetId(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">None (Top-Level Primary Asset)</option>
                  {existingAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.assetTag} — {a.name} ({a.category.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Connect as a component, module, or sub-assembly under an existing primary asset.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Relationship Classification
                </label>
                <select
                  value={relationshipType}
                  disabled={!parentAssetId}
                  onChange={(e) => setRelationshipType(e.target.value as any)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="subassembly">Subassembly (e.g., Spindle Cartridge, Engine Core)</option>
                  <option value="component">Critical Component (e.g., Coolant Pump, Transducer)</option>
                  <option value="power_module">Power / Drive Module (e.g., Titanium PSU, Inverter)</option>
                  <option value="sensor_node">Sensor / Telemetry Node (e.g., Calibrator Cell, IoT Beacon)</option>
                  <option value="attachment">Modular Attachment / Tooling</option>
                  <option value="facility_system">Facility Infrastructure Sub-system</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Specifies physical/functional dependency per ISO 55001 RCM guidelines.
                </p>
              </div>
            </div>

            {parentAssetId && (
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  This asset will be registered as a <strong>{relationshipType.replace('_', ' ')}</strong> linked to parent: <strong>{existingAssets.find(a => a.id === parentAssetId)?.name || parentAssetId}</strong>.
                </span>
              </div>
            )}
          </div>

          {/* SECTION 3: ISO 55001 CLASSIFICATION */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1">
              2. ISO 55001 Lifecycle & Criticality
            </h4>
            {modalExplanations && (
              <p className="text-[11px] text-slate-500">
                ISO 55001 Section 8.1 requires structured classification of asset criticality, condition grading (1=Very Good to 5=Very Poor), and lifecycle stage tracking.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Criticality Tier</label>
                <select
                  value={criticality}
                  onChange={(e) => setCriticality(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50"
                >
                  <option value="A_MISSION_CRITICAL">Tier A - Mission Critical</option>
                  <option value="B_ESSENTIAL">Tier B - Essential</option>
                  <option value="C_NON_CRITICAL">Tier C - Non-Critical</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lifecycle Stage</label>
                <select
                  value={lifecycleStage}
                  onChange={(e) => setLifecycleStage(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50"
                >
                  <option value="acquisition">Acquisition</option>
                  <option value="operation">Operation</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="overhaul">Overhaul</option>
                  <option value="decommissioning">Decommissioning</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Condition Grade</label>
                <select
                  value={conditionGrade}
                  onChange={(e) => setConditionGrade(Number(e.target.value) as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50"
                >
                  <option value={1}>Grade 1 - Very Good (95%)</option>
                  <option value={2}>Grade 2 - Good (85%)</option>
                  <option value={3}>Grade 3 - Fair (65%)</option>
                  <option value={4}>Grade 4 - Poor (40%)</option>
                  <option value={5}>Grade 5 - Very Poor (15%)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>ISO 55001 Compliance Group</span>
                  <span className="text-[10px] text-purple-600 font-normal">Auto-tagged by Gemini</span>
                </label>
                <input
                  type="text"
                  value={isoComplianceGroup}
                  onChange={(e) => setIsoComplianceGroup(e.target.value)}
                  placeholder="e.g. Critical Infrastructure & High-Harmonic Production Systems"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Maintenance Category</span>
                  <span className="text-[10px] text-blue-600 font-normal">Auto-tagged</span>
                </label>
                <input
                  type="text"
                  value={maintenanceCategory}
                  onChange={(e) => setMaintenanceCategory(e.target.value)}
                  placeholder="e.g. Spindle Vibration CBM"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50 text-xs font-medium text-slate-800"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  Risk Mitigation Strategy (ISO 55001 Cl. 6.1)
                </label>
                <input
                  type="text"
                  value={mitigationStrategy}
                  onChange={(e) => setMitigationStrategy(e.target.value)}
                  placeholder="e.g. Real-time vibration accelerometer logging and ISO preventive spindle replacement"
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50/50 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: SENSITIVE FINANCIALS */}
          <div className="bg-cyan-950/10 p-4 rounded-xl border border-cyan-300 space-y-3">
            <div className="flex items-center gap-2 text-cyan-900 font-bold text-xs">
              <Lock className="w-4 h-4 text-cyan-600" />
              <span>3. Sensitive Financial Data (AES-256-GCM Vault Protected)</span>
            </div>
            {modalExplanations && (
              <p className="text-[11px] text-cyan-950/80">
                Valuation data is automatically encrypted with AES-256-GCM authenticated cipher before saving to database.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purchase Price ($)</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Salvage Value ($)</label>
                <input
                  type="number"
                  value={salvageValue}
                  onChange={(e) => setSalvageValue(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Useful Life (Years)</label>
                <input
                  type="number"
                  value={usefulLifeYears}
                  onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: CUSTODIAN & GDPR */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-100 pb-1">
              4. Custodian Assignment (GDPR Article 30)
            </h4>
            {modalExplanations && (
              <p className="text-[11px] text-slate-500">
                Personal identifier records for asset controllers under EU GDPR Article 30 Record of Processing Activities.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Custodian Name</label>
                <input
                  type="text"
                  value={custodianName}
                  onChange={(e) => setCustodianName(e.target.value)}
                  placeholder="e.g. Maria Sanchez"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Email</label>
                <input
                  type="email"
                  value={custodianEmail}
                  onChange={(e) => setCustodianEmail(e.target.value)}
                  placeholder="m.sanchez@enterprise.com"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Encrypting & Registering Asset...' : 'Register Asset with Photo & ISO 55001 Compliance'}
            </button>
          </div>
        </form>

        {/* Modal: Add New Custom Category Dialog */}
        {showNewCategoryModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Add New Asset Category</h4>
                    <p className="text-[11px] text-slate-500">ISO 55001 Asset Taxonomy Extension</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Renewable Energy & Solar Arrays"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Examples: Heavy Earthmoving, HVAC & Chillers, Robotics & AGVs, Telecoms, Cleanroom Tech
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Brief definition of equipment or facility systems in this category..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Badge Theme Color</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'purple', label: 'Purple', bg: 'bg-purple-500' },
                      { id: 'blue', label: 'Blue', bg: 'bg-blue-500' },
                      { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
                      { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
                      { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
                      { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
                      { id: 'teal', label: 'Teal', bg: 'bg-teal-500' },
                      { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500' },
                    ].map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewCatColor(c.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                          newCatColor === c.id
                            ? 'border-slate-800 bg-slate-900 text-white font-semibold'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`}></span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCategoryModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newCatName.trim()}
                  onClick={() => handleAddNewCategory()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Create & Select Category
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
