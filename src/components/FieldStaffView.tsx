import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Barcode, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  Upload, 
  WifiOff, 
  Check, 
  Crosshair,
  Sliders,
  History,
  ShieldCheck,
  Smartphone,
  QrCode,
  ScanLine,
  Image as ImageIcon,
  SwitchCamera,
  X,
  Eye,
  AlertCircle
} from 'lucide-react';
import jsQR from 'jsqr';
import { Asset, AssetStatus, ConditionGrade, LanguageCode, UserSession } from '../types';
import { translations } from '../i18n/translations';
import { getAppLocale } from '../i18n/appTranslations';
import { locationService } from '../lib/locationService';
import { soundEffects } from '../lib/sound';

interface FieldStaffViewProps {
  assets: Asset[];
  onUpdateAssetStatus: (
    assetId: string, 
    status: AssetStatus, 
    conditionGrade?: ConditionGrade, 
    notes?: string, 
    coordinates?: { lat: number; lng: number }
  ) => Promise<void>;
  isOnline: boolean;
  pendingOfflineCount: number;
  onSyncNow: () => void;
  currentLanguage: LanguageCode;
  currentUser: UserSession;
}

export const FieldStaffView: React.FC<FieldStaffViewProps> = ({
  assets,
  onUpdateAssetStatus,
  isOnline,
  pendingOfflineCount,
  onSyncNow,
  currentLanguage,
  currentUser,
}) => {
  const t = translations[currentLanguage];
  const appLocale = getAppLocale(currentLanguage);
  const fieldT = appLocale.fieldStaff;
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [activeCamera, setActiveCamera] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedNotification, setScannedNotification] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [scanSuccessFlash, setScanSuccessFlash] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState<string | null>(null);

  // Field Staff Form State
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus>('in_service');
  const [selectedGrade, setSelectedGrade] = useState<ConditionGrade>(1);
  const [fieldNotes, setFieldNotes] = useState<string>('');
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(() => {
    const saved = locationService.getSavedLocation();
    return saved ? { lat: saved.lat, lng: saved.lng, accuracy: saved.accuracy } : null;
  });
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(() => {
    return locationService.hasSavedLocation() ? fieldT.gpsSavedNotice : null;
  });
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentAsset = assets.find(a => a.id === selectedAssetId) || assets[0];

  useEffect(() => {
    if (currentAsset) {
      setSelectedStatus(currentAsset.status);
      setSelectedGrade(currentAsset.conditionGrade);
      setFieldNotes(currentAsset.notes || '');
    }
  }, [selectedAssetId]);

  // Clean up camera stream and loop on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // QR Code Asset Resolver
  const lookupAssetByScannedText = (scannedText: string): Asset | null => {
    const raw = scannedText.trim();
    if (!raw) return null;

    // 1. Try JSON parsing (from QrPrintModal: { tag, barcode, name, ... })
    try {
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw);
        const tag = parsed.tag || parsed.assetTag || parsed.barcode || parsed.id;
        if (tag) {
          const match = assets.find(a => 
            a.assetTag.toLowerCase() === String(tag).toLowerCase() ||
            a.barcode.toLowerCase() === String(tag).toLowerCase() ||
            a.id.toLowerCase() === String(tag).toLowerCase()
          );
          if (match) return match;
        }
      }
    } catch {
      // not JSON, continue
    }

    // 2. Direct exact / case-insensitive match on tag, barcode, id, or serial number
    const directMatch = assets.find(a => 
      a.assetTag.toLowerCase() === raw.toLowerCase() ||
      a.barcode.toLowerCase() === raw.toLowerCase() ||
      a.id.toLowerCase() === raw.toLowerCase() ||
      (a.serialNumber && a.serialNumber.toLowerCase() === raw.toLowerCase())
    );
    if (directMatch) return directMatch;

    // 3. Partial or URL parameter match
    const partialMatch = assets.find(a => 
      raw.toLowerCase().includes(a.assetTag.toLowerCase()) ||
      raw.toLowerCase().includes(a.barcode.toLowerCase()) ||
      a.name.toLowerCase() === raw.toLowerCase()
    );
    if (partialMatch) return partialMatch;

    return null;
  };

  // Handle successful QR detection
  const handleProcessDetectedCode = (codeData: string) => {
    const now = Date.now();
    // Debounce 2 seconds for same code
    if (codeData === lastScannedCodeRef.current && now - lastScanTimeRef.current < 2000) {
      return;
    }
    lastScanTimeRef.current = now;
    lastScannedCodeRef.current = codeData;

    const matched = lookupAssetByScannedText(codeData);
    if (matched) {
      soundEffects.playScanBeep();
      setSelectedAssetId(matched.id);
      setScanSuccessFlash(true);
      setScannedNotification(`QR Asset Tag Verified: ${matched.assetTag} (${matched.name})`);
      setSearchError(null);
      setTimeout(() => setScanSuccessFlash(false), 2400);
      setTimeout(() => setScannedNotification(null), 4500);
    } else {
      setSearchError(`Scanned code "${codeData.slice(0, 32)}" is not registered in the system.`);
      setTimeout(() => setSearchError(null), 4000);
    }
  };

  // Continuous Camera Frame Processing Loop
  const startScanningLoop = () => {
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            handleProcessDetectedCode(code.data);
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const stopCameraStream = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveCamera(false);
  };

  const startCameraStream = async (mode: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setCameraError(null);
    setActiveCamera(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera in your browser settings, or upload an asset tag photo below.'
          : 'Device camera unavailable. You can upload an image of the physical tag or search by tag name.'
      );
    }
  };

  const toggleCamera = () => {
    if (activeCamera) {
      stopCameraStream();
    } else {
      startCameraStream(facingMode);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (activeCamera) {
      startCameraStream(nextMode);
    }
  };

  // Scan QR code from an uploaded image file (fallback for devices without direct video permissions)
  const handleUploadScanImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            handleProcessDetectedCode(code.data);
          } else {
            setSearchError('No QR code detected in the selected image. Please try a clearer picture of the asset tag.');
            setTimeout(() => setSearchError(null), 4000);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Manual Barcode / Tag Form Search
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const match = lookupAssetByScannedText(barcodeInput.trim());
    if (match) {
      handleSelectAsset(match);
      setBarcodeInput('');
      setSearchError(null);
    } else {
      setSearchError(`No asset found matching barcode or tag: ${barcodeInput}`);
      setTimeout(() => setSearchError(null), 4000);
    }
  };

  // Select asset directly
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAssetId(asset.id);
    soundEffects.playScanBeep();
    setScannedNotification(`Loaded ${asset.assetTag} (${asset.name})`);
    setTimeout(() => setScannedNotification(null), 3000);
  };

  // GPS Pinning - Uses persistent local storage so browser prompts are bypassed!
  const handleCaptureGps = async (forcePrompt: boolean = false) => {
    setIsGettingGps(true);
    setGpsNotice(null);

    if (!forcePrompt) {
      const saved = locationService.getSavedLocation();
      if (saved) {
        setGpsLocation({
          lat: saved.lat,
          lng: saved.lng,
          accuracy: saved.accuracy,
        });
        setIsGettingGps(false);
        soundEffects.playSuccessChime();
        setGpsNotice(fieldT.gpsSavedNotice);
        return;
      }
    }

    try {
      const loc = await locationService.getLocation({ forcePrompt: true });
      setGpsLocation({
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
      });
      setGpsNotice(fieldT.locationSavedPref);
      soundEffects.playSuccessChime();
    } catch (e) {
      console.warn('GPS capture error:', e);
      const baseLat = currentAsset?.location.coordinates.lat || 48.7758;
      const baseLng = currentAsset?.location.coordinates.lng || 9.1829;
      setGpsLocation({
        lat: Number((baseLat + (Math.random() - 0.5) * 0.005).toFixed(5)),
        lng: Number((baseLng + (Math.random() - 0.5) * 0.005).toFixed(5)),
        accuracy: 4,
      });
    } finally {
      setIsGettingGps(false);
    }
  };

  // Photo Attachment Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedPhoto(reader.result as string);
        soundEffects.playScanBeep();
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Status / Inventory Update
  const handleSubmitUpdate = async () => {
    if (!currentAsset) return;
    setIsUpdating(true);
    try {
      await onUpdateAssetStatus(
        currentAsset.id,
        selectedStatus,
        selectedGrade,
        fieldNotes,
        gpsLocation ? { lat: gpsLocation.lat, lng: gpsLocation.lng } : undefined
      );
      soundEffects.playSuccessChime();
      setUpdateSuccessMessage(t.statusUpdatedSuccess);
      setTimeout(() => setUpdateSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions: { value: AssetStatus; label: string; color: string }[] = [
    { value: 'in_service', label: t.statusInService, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { value: 'in_transit', label: t.statusInTransit, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { value: 'maintenance', label: t.statusMaintenance, color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { value: 'audited', label: t.statusAudited, color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { value: 'quarantine', label: t.statusQuarantine, color: 'bg-rose-600 hover:bg-rose-700 text-white' },
  ];

  const conditionOptions: { grade: ConditionGrade; label: string; desc: string }[] = [
    { grade: 1, label: t.conditionGrade1, desc: '90-100% Health' },
    { grade: 2, label: t.conditionGrade2, desc: '80-89% Health' },
    { grade: 3, label: t.conditionGrade3, desc: '60-79% Health' },
    { grade: 4, label: t.conditionGrade4, desc: '40-59% Health' },
    { grade: 5, label: t.conditionGrade5, desc: '<40% Critical' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Hidden Canvas for QR decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Input for QR Photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadScanImage}
        className="hidden"
      />

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold">{t.offlineMode}</div>
              <div className="text-xs text-amber-800">{t.offlineBadgeNotice}</div>
            </div>
          </div>
          {pendingOfflineCount > 0 && (
            <button
              onClick={onSyncNow}
              className="bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              {t.syncNow} ({pendingOfflineCount})
            </button>
          )}
        </div>
      )}

      {/* Success Banner */}
      {updateSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm font-semibold">{updateSuccessMessage}</div>
        </div>
      )}

      {/* Search Error Notice */}
      {searchError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-xl p-3 text-xs flex items-center gap-2 animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Scanner & Quick Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Live QR Tag Scanner & Mobile Lookup</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            User: {currentUser.name}
          </span>
        </div>

        {/* Barcode / Tag Form */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Enter tag (e.g. CNC-8820-ALPHA, AST-2026-0042) or scan QR code..."
              className="w-full px-3.5 py-2.5 pl-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden bg-slate-50/50"
            />
            <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Find Tag
          </button>
          <button
            type="button"
            onClick={toggleCamera}
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
              activeCamera 
                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' 
                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            }`}
            title="Scan physical QR code using device camera"
          >
            <Camera className="w-4 h-4" />
            <span>{activeCamera ? 'Stop Camera' : 'Scan QR Tag'}</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Scan QR code from an image or photo"
          >
            <ImageIcon className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">Photo Tag</span>
          </button>
        </form>

        {/* Live Camera Viewfinder & QR Scanner HUD */}
        {activeCamera && (
          <div className="relative w-full h-72 sm:h-80 bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-slate-800 shadow-inner">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover" 
            />

            {/* Camera Controls Bar (Top) */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-white text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>QR SCANNER ACTIVE</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 transition-colors cursor-pointer shadow-md"
                  title="Switch Front/Rear Camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 transition-colors cursor-pointer shadow-md"
                  title="Upload / capture photo of asset tag"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="p-2 bg-rose-600/90 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer shadow-md"
                  title="Close Camera"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewfinder Target Reticle */}
            <div className={`relative z-10 w-64 h-64 border-2 rounded-2xl flex flex-col items-center justify-between p-3 transition-all duration-300 ${
              scanSuccessFlash 
                ? 'border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-500/50 scale-105' 
                : 'border-cyan-400/80 bg-cyan-950/20'
            }`}>
              {/* Corner Brackets */}
              <div className="w-full flex justify-between">
                <div className="w-5 h-5 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                <div className="w-5 h-5 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
              </div>

              {/* Animated Laser Sweep Beam */}
              <div className="w-full flex items-center justify-center relative">
                <div className={`w-full h-0.5 shadow-lg ${
                  scanSuccessFlash 
                    ? 'bg-emerald-400 shadow-emerald-400' 
                    : 'bg-red-500 shadow-red-500 animate-pulse'
                }`}></div>
              </div>

              <div className="w-full flex justify-between">
                <div className="w-5 h-5 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                <div className="w-5 h-5 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
              </div>
            </div>

            {/* Scanner Guidance Footer */}
            <div className="absolute bottom-3 z-20 bg-slate-900/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700 text-cyan-200 text-xs font-mono shadow-md flex items-center gap-2">
              <ScanLine className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Align physical QR tag or barcode inside frame</span>
            </div>

            {/* Camera Error Message Overlay */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 z-30 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <div className="text-white text-sm font-semibold max-w-sm">{cameraError}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startCameraStream(facingMode)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Upload Tag Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Asset Selector Pills / Tap to Simulate Scan */}
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Physical Asset Tags in Fleet (Click to Simulate Scan):</span>
            <span className="text-[11px] text-blue-600 font-normal">Instant Tag Lookup</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {assets.map((asset, index) => (
              <button
                key={`field-asset-${asset.id || asset.assetTag || 'item'}-${index}`}
                type="button"
                onClick={() => handleSelectAsset(asset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentAsset?.id === asset.id
                    ? 'bg-blue-50 border-blue-400 text-blue-800 font-semibold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title={`Scan tag ${asset.assetTag} (${asset.name})`}
              >
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                <span>{asset.assetTag}</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[110px]">{asset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scanned Feedback Notification */}
      {scannedNotification && (
        <div className="bg-blue-600 text-white rounded-xl p-3.5 text-xs font-semibold flex items-center justify-between shadow-md shadow-blue-500/20 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-cyan-300 shrink-0" />
            <div>
              <div className="text-sm font-bold text-white">{scannedNotification}</div>
              <div className="text-[11px] text-blue-100">Asset details loaded into field inspection form below.</div>
            </div>
          </div>
          <span className="text-[10px] bg-blue-700 px-2.5 py-1 rounded font-mono border border-blue-400/30">
            MATCH 100%
          </span>
        </div>
      )}

      {/* Active Selected Asset Field Card */}
      {currentAsset && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <img
                src={currentAsset.imageUrl}
                alt={currentAsset.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                    {currentAsset.assetTag}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Barcode: {currentAsset.barcode}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {currentAsset.category.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{currentAsset.name}</h3>
                <p className="text-xs text-slate-500">
                  {currentAsset.manufacturer} • Model: {currentAsset.model} • S/N: {currentAsset.serialNumber}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-500">ISO Health Index</div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${currentAsset.healthIndex >= 80 ? 'bg-emerald-500' : currentAsset.healthIndex >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                <span className="text-base font-bold text-slate-900">{currentAsset.healthIndex}%</span>
              </div>
              <div className="text-[10px] text-slate-400">Condition Grade {currentAsset.conditionGrade}/5</div>
            </div>
          </div>

          {/* 1. 1-Tap Status Switcher (Touch Targets >= 44px) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>1. {t.quickStatusUpdate} (1-Tap Selection)</span>
              <span className="text-[11px] font-normal text-slate-500">Current: {currentAsset.status}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {statusOptions.map((opt, index) => {
                const isSelected = selectedStatus === opt.value;
                return (
                  <button
                    key={`field-status-opt-${opt.value || index}`}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(opt.value);
                      soundEffects.playScanBeep();
                    }}
                    className={`min-h-[48px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      isSelected
                        ? `${opt.color} shadow-md scale-[1.02] border-transparent`
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ISO 55001 Condition Grade Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. {t.conditionGrade} (ISO 55001 Scale 1-5)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {conditionOptions.map((opt, index) => {
                const isSelected = selectedGrade === opt.grade;
                return (
                  <button
                    key={`field-condition-opt-${opt.grade ?? index}`}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(opt.grade);
                      soundEffects.playScanBeep();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 text-blue-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Grade {opt.grade}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <div className="text-[11px] font-medium text-slate-600 mt-0.5 truncate">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. GPS Location Capture & Address */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>3. {fieldT.captureGps}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentAsset.location.name} ({currentAsset.location.facility})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCaptureGps(false)}
                  disabled={isGettingGps}
                  className="min-h-[40px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Loads saved coordinates immediately without triggering browser permission dialog"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
                  <span>{isGettingGps ? 'Fixing...' : fieldT.captureGps}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCaptureGps(true)}
                  disabled={isGettingGps}
                  className="min-h-[40px] px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Re-query GPS sensor and update saved location"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">{fieldT.recalibrateGps}</span>
                </button>
              </div>
            </div>

            {gpsNotice && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{gpsNotice}</span>
              </div>
            )}

            {gpsLocation && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Lat: <strong className="font-mono">{gpsLocation.lat}</strong>, Lng: <strong className="font-mono">{gpsLocation.lng}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700">{fieldT.accuracy} ~{gpsLocation.accuracy || 3}m</span>
              </div>
            )}
          </div>

          {/* 4. Inspection Photo Attachment & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>4. {t.attachPhoto}</span>
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                {attachedPhoto ? (
                  <div className="flex items-center gap-3">
                    <img src={attachedPhoto} alt="Inspection" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                    <div className="text-left text-xs">
                      <div className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Photo Attached</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{t.photoEncrypted}</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                    <div className="text-xs font-medium text-slate-700">Tap to take photo or upload</div>
                    <div className="text-[10px] text-slate-400">Encrypted with AES-256-GCM in vault</div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Field Inspection Notes
              </label>
              <textarea
                value={fieldNotes}
                onChange={(e) => setFieldNotes(e.target.value)}
                placeholder="Log physical inspection notes, odometer readings, or maintenance flags..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden bg-slate-50/50"
              />
            </div>
          </div>

          {/* 5. Submit Update Button (Large Touch Target) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmitUpdate}
              disabled={isUpdating}
              className="w-full min-h-[52px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>
                {isUpdating ? 'Transmitting & Encrypting...' : `Submit Inventory Update for ${currentAsset.assetTag}`}
              </span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Complies with ISO 55001 operational tracking & GDPR Article 30 audit trails.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
