import React from 'react';
import { AuthUser } from '../types';

interface TopBannerProps {
  isFirebaseConnected: boolean;
  currentUser: AuthUser | null;
  isAuthorizedAdmin: boolean;
  onOpenSettings: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

export const TopBanner: React.FC<TopBannerProps> = ({
  isFirebaseConnected,
  currentUser,
  isAuthorizedAdmin,
  onOpenSettings,
  onLogin,
  onLogout,
}) => {
  return (
    <div className="bg-slate-950 text-slate-200 text-xs py-2 px-4 border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-bold text-teal-400">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            وزارة الصحة والسكان - أمانة المراكز الطبية المتخصصة (SMC)
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-300 font-semibold">
            بوابة إدارة الجودة وسلامة المرضى (MIH Quality Portal)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status badge */}
          {isFirebaseConnected ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>سحابي (Firestore متصل)</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800 cursor-pointer hover:bg-amber-900 transition"
              title="اضغط لضبط مفاتيح الربط السحابي"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>محلي (Local / Demo)</span>
            </button>
          )}

          <span className="text-slate-700">|</span>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="hover:text-white flex items-center gap-1 text-slate-300 transition hover:underline"
            title="إعدادات الربط السحابي ومفاتيح API"
          >
            <span>⚙️</span>
            <span>الإعدادات</span>
          </button>

          <span className="text-slate-700">|</span>

          {/* Admin Auth / Profile */}
          <div className="flex items-center gap-2">
            {currentUser && isAuthorizedAdmin ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 py-0.5 px-2.5 rounded-full">
                <img
                  className="w-5 h-5 rounded-full border border-teal-400 object-cover"
                  src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=0f766e&color=fff'}
                  alt="avatar"
                />
                <span className="font-bold text-[11px] text-white max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
                <span className="text-xs font-bold text-emerald-400">👑 مدير</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold mr-1 underline transition cursor-pointer"
                >
                  خروج
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3 py-1 rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>🔐</span>
                <span>دخول الإدارة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
