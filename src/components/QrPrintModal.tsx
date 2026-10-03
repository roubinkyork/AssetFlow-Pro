import React from 'react';
import { X, Printer, QrCode, ShieldCheck, Download } from 'lucide-react';
import { Asset, LanguageCode } from '../types';
import { translations } from '../i18n/translations';

interface QrPrintModalProps {
  asset: Asset;
  onClose: () => void;
  currentLanguage: LanguageCode;
}

export const QrPrintModal: React.FC<QrPrintModalProps> = ({
  asset,
  onClose,
  currentLanguage,
}) => {
  const t = translations[currentLanguage];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white">ISO 55001 Asset Tag Label</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Label Preview Card (Clean printable format) */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-50">
          <div className="bg-white border-2 border-slate-900 p-6 rounded-xl shadow-md max-w-xs w-full text-center space-y-3 print:shadow-none print:border-black">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              <span>Enterprise Asset</span>
              <span className="text-emerald-700">ISO 55001</span>
            </div>

            {/* Simulated High-Res QR code */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  JSON.stringify({
                    tag: asset.assetTag,
                    barcode: asset.barcode,
                    name: asset.name,
                    criticality: asset.criticality,
                  })
                )}`}
                alt={`QR code for ${asset.assetTag}`}
                className="w-40 h-40 object-contain mx-auto"
              />
            </div>

            {/* Barcode visual lines */}
            <div className="font-mono text-center">
              <div className="text-base font-black tracking-widest text-slate-950">{asset.assetTag}</div>
              <div className="text-xs text-slate-600 font-mono tracking-widest">{asset.barcode}</div>
            </div>

            <div className="text-xs text-slate-800 font-semibold border-t border-slate-200 pt-2 truncate">
              {asset.name}
            </div>

            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>Tier: {asset.criticality.replace('_', ' ')}</span>
              <span>Vault: AES-256</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Dymo & Zebra Label Compatible</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Physical Tag</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
