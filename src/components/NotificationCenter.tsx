import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Radio, 
  Send, 
  Volume2, 
  Clock, 
  ShieldAlert,
  Smartphone
} from 'lucide-react';
import { UrgentAlert, LanguageCode } from '../types';
import { translations } from '../i18n/translations';
import { soundEffects } from '../lib/sound';
import { sendPushNotification } from '../lib/cryptoClient';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: UrgentAlert[];
  onMarkAllRead: () => void;
  onTriggerTestAlert: () => Promise<void>;
  currentLanguage: LanguageCode;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  alerts,
  onMarkAllRead,
  onTriggerTestAlert,
  currentLanguage,
}) => {
  const t = translations[currentLanguage];
  const [pushStatus, setPushStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isTriggering, setIsTriggering] = useState(false);

  if (!isOpen) return null;

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPushStatus(permission);
        if (permission === 'granted') {
          soundEffects.playSuccessChime();
          sendPushNotification('Push Alerts Enabled', {
            body: 'Real-time ISO 55001 and inventory alerts will appear on your device.',
          });
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
  };

  const handleTestAlertClick = async () => {
    setIsTriggering(true);
    try {
      soundEffects.playUrgentAlertChime();
      await onTriggerTestAlert();
      sendPushNotification('Urgent Inventory Alert', {
        body: 'Automated real-time inventory trigger dispatched to field team.',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{t.urgentAlerts}</h3>
              <p className="text-[11px] text-slate-400">Real-Time Push Broadcast Network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Notification Permission Box */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>Native Web Push Alerts</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
              pushStatus === 'granted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {pushStatus === 'granted' ? 'Active' : pushStatus}
            </span>
          </div>

          {pushStatus !== 'granted' ? (
            <button
              onClick={handleRequestPushPermission}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {t.requestPushPermission}
            </button>
          ) : (
            <div className="text-[11px] text-slate-500">
              Browser push notifications are active for critical inventory shifts.
            </div>
          )}
        </div>

        {/* Test Trigger Button */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white text-xs">
          <button
            onClick={handleTestAlertClick}
            disabled={isTriggering}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            <Radio className={`w-3.5 h-3.5 text-red-600 ${isTriggering ? 'animate-ping' : ''}`} />
            <span>{t.testUrgentAlert}</span>
          </button>

          <button
            onClick={onMarkAllRead}
            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
          >
            {t.markAllRead}
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              {t.noAlerts}
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  alert.severity === 'critical'
                    ? 'bg-red-50/70 border-red-200 text-red-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {alert.severity === 'critical' ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <Bell className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                    <h4 className="text-xs font-bold">{alert.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                  {alert.message}
                </p>

                {alert.assetTag && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-mono">
                    <span className="bg-white/80 border border-slate-300/80 px-1.5 py-0.5 rounded font-bold text-slate-800">
                      {alert.assetTag}
                    </span>
                    <span className="text-slate-400 uppercase">
                      {alert.category.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Push alerts are broadcast encrypted via WebPush / TLS.
        </div>
      </div>
    </div>
  );
};
