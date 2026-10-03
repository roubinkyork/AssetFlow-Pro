import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Radio, 
  Compass, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause, 
  Crosshair,
  Truck,
  Building,
  Server,
  Cpu
} from 'lucide-react';
import { Asset, LanguageCode, LocationTelemetry } from '../types';
import { translations } from '../i18n/translations';
import { getAppLocale } from '../i18n/appTranslations';
import { soundEffects } from '../lib/sound';

interface TrackingMapProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onUpdateCoordinates: (assetId: string, lat: number, lng: number, locationName: string) => Promise<void>;
  currentLanguage: LanguageCode;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  assets,
  onSelectAsset,
  onUpdateCoordinates,
  currentLanguage,
}) => {
  const t = translations[currentLanguage];
  const appLocale = getAppLocale(currentLanguage);
  const trackT = appLocale.tracking;
  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[0] || null);
  const [filterMode, setFilterMode] = useState<'all' | 'in_transit' | 'in_service' | 'maintenance'>('all');
  const [isSimulatingLiveTransit, setIsSimulatingLiveTransit] = useState(false);
  const [transitStep, setTransitStep] = useState(0);

  // Filtered list
  const displayAssets = assets.filter(a => {
    if (filterMode === 'all') return true;
    return a.status === filterMode;
  });

  // Simulated live route telemetry updates for in_transit assets
  useEffect(() => {
    let interval: any = null;
    if (isSimulatingLiveTransit) {
      interval = setInterval(() => {
        setTransitStep(prev => {
          const next = prev + 1;
          // Pick an in_transit or movable asset
          const movable = assets.find(a => a.status === 'in_transit') || assets[0];
          if (movable) {
            const deltaLat = (Math.sin(next * 0.5) * 0.002);
            const deltaLng = (Math.cos(next * 0.5) * 0.002);
            const newLat = Number((movable.location.coordinates.lat + deltaLat).toFixed(4));
            const newLng = Number((movable.location.coordinates.lng + deltaLng).toFixed(4));
            onUpdateCoordinates(
              movable.id,
              newLat,
              newLng,
              `Route Telemetry Ping #${next} (${movable.location.name})`
            );
          }
          return next;
        });
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulatingLiveTransit, assets]);

  const toggleSimulation = () => {
    setIsSimulatingLiveTransit(!isSimulatingLiveTransit);
    soundEffects.playScanBeep();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fleet_vehicle':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'it_computing':
        return <Server className="w-4 h-4 text-indigo-600" />;
      case 'industrial_machinery':
        return <Cpu className="w-4 h-4 text-amber-600" />;
      default:
        return <Building className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900">{trackT.title}</h2>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {trackT.liveTelemetry}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {trackT.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="all">{trackT.allPings} ({assets.length})</option>
            <option value="in_transit">{trackT.inTransitOnly}</option>
            <option value="in_service">{trackT.inServiceOnly}</option>
            <option value="maintenance">{trackT.maintenanceOnly}</option>
          </select>

          {/* Live Simulation Toggle */}
          <button
            onClick={toggleSimulation}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSimulatingLiveTransit
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSimulatingLiveTransit ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{trackT.pauseSimulation}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{trackT.simulateRoute}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Map View & Detail Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Stylized Tactical Map Canvas */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-xl relative min-h-[460px] flex flex-col justify-between overflow-hidden">
          {/* Subtle Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #020617 1px)`,
              backgroundSize: '32px 32px',
              backgroundPosition: '0 0, 16px 16px',
            }}
          />

          {/* Map Status Header Overlay */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="bg-slate-900/90 border border-slate-700 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-slate-300">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>{trackT.globalNetwork}</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-mono text-[11px]">{trackT.activeSatellites}</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-700 backdrop-blur-md px-3 py-1.5 rounded-lg text-[11px] font-mono text-cyan-300">
              {trackT.geofenceSecure}
            </div>
          </div>

          {/* Interactive Tactical Map Pins Stage */}
          <div className="relative z-10 my-8 flex-1 flex flex-wrap items-center justify-around gap-6 p-4">
            {displayAssets.map((asset, index) => {
              const isSelected = selectedAsset?.id === asset.id;
              const isMoving = asset.status === 'in_transit';

              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    setSelectedAsset(asset);
                    soundEffects.playScanBeep();
                  }}
                  className={`group relative cursor-pointer flex flex-col items-center transition-all ${
                    isSelected ? 'scale-110' : 'hover:scale-105'
                  }`}
                >
                  {/* Outer Radar Ping Animation for Moving / Selected */}
                  {(isMoving || isSelected) && (
                    <div className="absolute -inset-2 rounded-full bg-cyan-500/20 animate-ping"></div>
                  )}

                  {/* Marker Pin */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors border-2 ${
                      isSelected
                        ? 'bg-blue-600 border-white text-white shadow-blue-500/50 ring-4 ring-blue-500/30'
                        : isMoving
                        ? 'bg-amber-500 border-amber-300 text-slate-950 animate-bounce'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-400'
                    }`}
                  >
                    {getCategoryIcon(asset.category)}
                  </div>

                  {/* Pin Callout Badge */}
                  <div className="mt-2 bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1 text-center shadow-md">
                    <div className="text-[11px] font-bold text-white font-mono">{asset.assetTag}</div>
                    <div className="text-[9px] text-slate-400 truncate max-w-[110px]">{asset.location.name}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map Footer Bar */}
          <div className="relative z-10 bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> In Service
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> In Transit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Maintenance
              </span>
            </div>
            <div>Encryption: TLS 1.3 / AES-256 Telemetry Stream</div>
          </div>
        </div>

        {/* Right Col: Active Telemetry Detail Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span>{trackT.dossierTitle}</span>
            </div>
            {selectedAsset && (
              <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {selectedAsset.assetTag}
              </span>
            )}
          </div>

          {selectedAsset ? (
            <div className="space-y-4 text-xs">
              {/* Asset Header */}
              <div className="flex items-center gap-3">
                <img
                  src={selectedAsset.imageUrl}
                  alt={selectedAsset.name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedAsset.name}</h4>
                  <div className="text-slate-500 text-[11px]">{selectedAsset.manufacturer}</div>
                  <div className="text-[10px] text-blue-600 font-medium capitalize mt-0.5">
                    Status: {selectedAsset.status.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Coordinates Box */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                <div className="text-slate-400 font-bold uppercase text-[10px]">{trackT.coordinates}</div>
                <div className="font-mono font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>{selectedAsset.location.coordinates.lat} N</span>
                  <span>{selectedAsset.location.coordinates.lng} E</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {trackT.address}: {selectedAsset.location.address}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200">
                  <span>{trackT.accuracy}: ~{selectedAsset.location.accuracyMeters || 3}m</span>
                  <span>{trackT.lastPing}: {new Date(selectedAsset.location.lastPing).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Custodian / Driver on Duty */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">{trackT.assignedCustodian}</div>
                <div className="font-bold text-slate-800">{selectedAsset.custodian.name}</div>
                <div className="text-[11px] text-slate-500">{selectedAsset.custodian.department}</div>
              </div>

              {/* Recent Movement Log */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 uppercase text-[10px]">{trackT.recentCheckins}</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedAsset.movementHistory.map((mov) => (
                    <div key={mov.id} className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                      <div className="font-semibold text-slate-800">{mov.locationName}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(mov.timestamp).toLocaleString()} • {mov.actor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* View Full Dossier Action */}
              <button
                type="button"
                onClick={() => onSelectAsset(selectedAsset)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                {trackT.openDossier}
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              {trackT.selectPrompt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
