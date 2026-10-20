import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-8 px-4 mt-16 border-t border-slate-800 no-print">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo.jpg"
            alt="شعار المستشفى"
            className="w-10 h-10 object-contain rounded-lg border border-slate-700 bg-white p-0.5"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://ui-avatars.com/api/?name=MIH&background=991b1b&color=fff';
            }}
          />
          <div>
            <p className="font-extrabold text-slate-200">
              مستشفى المنصورة الدولي — إدارة الجودة وسلامة المرضى
            </p>
            <p className="text-[11px] text-slate-500">
              نظام حفظ وعرض السياسات المعتمدة • جميع الحقوق محفوظة © 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <a
            href="https://www.facebook.com/p/%D8%A7%D9%84%D8%B5%D9%81%D8%AD%D8%A9-%D8%A7%D9%84%D8%B1%D8%B3%D9%85%D9%8A%D8%A9-%D9%84%D8%A7%D8%AF%D8%A7%D8%B1%D8%A9-%D8%A7%D9%84%D8%AC%D9%88%D8%AF%D8%A9-%D8%A8%D9%85%D8%B3%D8%AA%D8%B4%D9%81%D9%8A-%D8%A7%D9%84%D9%85%D9%86%D8%B5%D9%88%D8%B1%D8%A9-%D8%A7%D9%84%D8%AF%D9%88%D9%84%D9%8A-100076438481489/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition"
          >
            صفحة الجودة على فيسبوك ↗
          </a>
          <span>•</span>
          <a
            href="https://www.smc.gov.eg/MansouraInterAr/continuouseducation/1/22"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition"
          >
            بوابة أمانة المراكز (SMC) ↗
          </a>
        </div>
      </div>
    </footer>
  );
};
