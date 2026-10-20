import React from 'react';

export type TabType = 'home' | 'policies' | 'bundles' | 'architecture' | 'admin';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  policiesCount: number;
  bundlesCount: number;
  isAuthorizedAdmin: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  policiesCount,
  bundlesCount,
  isAuthorizedAdmin,
}) => {
  return (
    <header className="bg-white/95 backdrop-blur sticky top-0 z-30 border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Hospital Logo & Brand */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onTabChange('home')}
        >
          <img
            src="/assets/logo.jpg"
            alt="شعار مستشفى المنصورة الدولي"
            className="w-12 h-12 object-contain rounded-xl border border-slate-200 p-0.5 shadow-sm bg-white"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://ui-avatars.com/api/?name=MIH&background=991b1b&color=fff';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                مستشفى المنصورة الدولي
              </h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                MIH
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              بوابة سياسات الجودة والاعتماد المؤسسي (GAHAR & CBAHI)
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2" aria-label="التنقل الرئيسي">
          <button
            type="button"
            onClick={() => onTabChange('home')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              currentTab === 'home'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            🏠 الرئيسية
          </button>

          <button
            type="button"
            onClick={() => onTabChange('policies')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              currentTab === 'policies'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            📚 مكتبة السياسات (<span>{policiesCount}</span>)
          </button>

          <button
            type="button"
            onClick={() => onTabChange('bundles')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              currentTab === 'bundles'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            📋 حزم الرعاية (<span>{bundlesCount}</span>)
          </button>

          <button
            type="button"
            onClick={() => onTabChange('architecture')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              currentTab === 'architecture'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            🏛️ الهيكلية والمعايير
          </button>

          {/* Admin panel tab (only visible when admin is logged in) */}
          {isAuthorizedAdmin && (
            <button
              type="button"
              onClick={() => onTabChange('admin')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-red-900 text-white'
                  : 'bg-red-800 hover:bg-red-900 text-white'
              }`}
            >
              <span>⚡</span>
              <span>لوحة إدارة الجودة</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
