import React from 'react';

export const ArchitectureView: React.FC = () => {
  return (
    <section className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-teal-100 text-teal-800">
            المعمارية التقنية للنظام
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            كيف يعمل نظام سياسات مستشفى المنصورة الدولي؟
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed font-semibold">
            صُمم هذا النظام بفلسفة "السرعة الفائقة وانعدام تكلفة التخزين" (Zero File Storage Architecture) من خلال استخراج المحتوى في متصفح العميل مباشرة وحفظه كنصوص مهيكلة داخل Firebase Firestore.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-3xl">📑</span>
            <h3 className="font-extrabold text-slate-900 text-base">1. استخراج فوري بدون تخزين</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              ملفات Word (.docx) و PDF يتم تحليلها على جهازك مباشرة عبر <code>mammoth.js</code> و <code>pdf-lib</code> مع <code>Gemini 2.5 Flash</code>؛ دون استهلاك ميجابايت واحد على استضافة الملفات.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-3xl">⚡</span>
            <h3 className="font-extrabold text-slate-900 text-base">2. قاعدة بيانات JSON خفيفة</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              تُحفظ السياسات كنصوص HTML خفيفة وشرائح عرض تقديمي داخل Firestore، مما يتيح استرجاع أي وثيقة في أقل من 200 ميلي ثانية حتى مع بطء الإنترنت داخل أقسام المستشفى.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-3xl">📽️</span>
            <h3 className="font-extrabold text-slate-900 text-base">3. عارض شرائح جاهز للتدريب</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              لا حاجة لتصميم عروض PowerPoint؛ كل سياسة تتحول تلقائياً إلى شرائح عرض تفاعلية ملء الشاشة تدعم الموبايل والتابلت والأسهم لاستخدامها في مرور الأطباء واجتماعات الأقسام.
            </p>
          </div>
        </div>

        {/* Technical stack overview */}
        <div className="p-5 rounded-2xl bg-slate-950 text-white space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
            <h4 className="text-sm font-bold text-white">التقنيات المستخدمة في البوابة (React Architecture)</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-slate-400">الواجهة الأمامية</p>
              <p className="font-bold text-white mt-1">React 18 + Vite + TS</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-slate-400">قاعدة البيانات السحابية</p>
              <p className="font-bold text-teal-400 mt-1">Firebase Firestore</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-slate-400">محرك استخراج الذكاء الاصطناعي</p>
              <p className="font-bold text-red-400 mt-1">Gemini 2.5 Flash API</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-slate-400">التحليل في المتصفح</p>
              <p className="font-bold text-purple-400 mt-1">Mammoth + PDF-Lib</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
