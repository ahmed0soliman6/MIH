import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: SystemSettings;
  onClose: () => void;
  onSave: (settings: SystemSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [cloudinaryName, setCloudinaryName] = useState('');
  const [cloudinaryPreset, setCloudinaryPreset] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(settings.firebase?.apiKey || '');
      setProjectId(settings.firebase?.projectId || '');
      setAuthDomain(settings.firebase?.authDomain || '');
      setCloudinaryName(settings.cloudinaryName || '');
      setCloudinaryPreset(settings.cloudinaryPreset || '');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: SystemSettings = {
      firebase: {
        apiKey: apiKey.trim(),
        projectId: projectId.trim(),
        authDomain: authDomain.trim() || (projectId.trim() ? `${projectId.trim()}.firebaseapp.com` : '')
      },
      cloudinaryName: cloudinaryName.trim(),
      cloudinaryPreset: cloudinaryPreset.trim()
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full my-auto shadow-2xl p-6 sm:p-8 space-y-6 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                إعدادات الربط السحابي ومفاتيح API
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                تُحفظ الإعدادات في متصفحك أو يمكنك تثبيتها داخل متغيرات البيئة في Vercel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Firebase Settings */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <span>🔥</span>
              <span>إعدادات Firebase Firestore</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Firebase API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Firebase Project ID</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="mih-quality"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Auth Domain (اختياري)</label>
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="mih-quality.firebaseapp.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>

          {/* ملاحظة أمنية: المديرون ومفتاح Gemini لم يعودا يُدارَان من هنا */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <span>🔒</span>
              <span>المديرون ومفتاح Gemini</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
              تُدار صلاحيات المديرين من لوحة الإدارة (للـ superadmin) وتُفرض عبر قواعد Firestore. مفتاح Gemini محفوظ على الخادم فقط
              (متغير GEMINI_API_KEY في Vercel) ولا يُدخل من المتصفح.
            </p>
          </div>

          {/* Cloudinary Settings */}
          <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 space-y-3">
            <h4 className="font-extrabold text-purple-950 dark:text-purple-300 text-sm flex items-center gap-1.5">
              <span>☁️</span>
              <span>إعدادات Cloudinary (لرفع الصور والمخططات)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cloud Name</label>
                <input
                  type="text"
                  value={cloudinaryName}
                  onChange={(e) => setCloudinaryName(e.target.value)}
                  placeholder="اسم حسابك"
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-900 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Upload Preset (Unsigned)</label>
                <input
                  type="text"
                  value={cloudinaryPreset}
                  onChange={(e) => setCloudinaryPreset(e.target.value)}
                  placeholder="mih_preset"
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-900 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black shadow-md transition cursor-pointer"
          >
            حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
};
