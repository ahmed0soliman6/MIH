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
  const [adminEmailsText, setAdminEmailsText] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [cloudinaryName, setCloudinaryName] = useState('');
  const [cloudinaryPreset, setCloudinaryPreset] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(settings.firebase?.apiKey || '');
      setProjectId(settings.firebase?.projectId || '');
      setAuthDomain(settings.firebase?.authDomain || '');
      setAdminEmailsText((settings.adminEmails || []).join('\n'));
      setGeminiKey(settings.geminiKey || '');
      setCloudinaryName(settings.cloudinaryName || '');
      setCloudinaryPreset(settings.cloudinaryPreset || '');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    const emails = adminEmailsText
      .split('\n')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const updated: SystemSettings = {
      firebase: {
        apiKey: apiKey.trim(),
        projectId: projectId.trim(),
        authDomain: authDomain.trim() || (projectId.trim() ? `${projectId.trim()}.firebaseapp.com` : '')
      },
      adminEmails: emails.length > 0 ? emails : settings.adminEmails,
      geminiKey: geminiKey.trim(),
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

          {/* Admin Whitelist */}
          <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 space-y-2">
            <h4 className="font-extrabold text-red-950 dark:text-red-300 text-sm flex items-center gap-1.5">
              <span>👑</span>
              <span>القائمة البيضاء لإيميلات الإدارة (Admin Whitelist)</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              أدخل إيميلات Google للمديرين المسموح لهم بإدارة السياسات (إيميل في كل سطر):
            </p>
            <textarea
              rows={2}
              value={adminEmailsText}
              onChange={(e) => setAdminEmailsText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-red-300 dark:border-red-900 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-600 custom-scroll"
            ></textarea>
          </div>

          {/* Gemini API Key */}
          <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 space-y-2">
            <h4 className="font-extrabold text-teal-950 dark:text-teal-300 text-sm flex items-center gap-1.5">
              <span>✨</span>
              <span>مفتاح Gemini API (للتحويل الذكي)</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300">يُستخدم لاستخراج النصوص وبناء الشرائح تلقائياً من ملفات PDF:</p>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-900 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none focus:ring-2 focus:ring-teal-600"
            />
            <p className="text-[11px] text-teal-700 dark:text-teal-400">يمكنك الحصول على مفتاح مجاني فوري من Google AI Studio.</p>
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
