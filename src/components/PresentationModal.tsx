import React, { useState, useEffect, useRef } from 'react';
import { Policy } from '../types';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface PresentationModalProps {
  policy: Policy | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PresentationModal: React.FC<PresentationModalProps> = ({
  policy,
  isOpen,
  onClose,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const dialogRef = useDialogA11y<HTMLDivElement>({ isOpen, onClose });
  const touchStartXRef = useRef(0);

  const slides = policy?.slides || [];

  useEffect(() => {
    if (isOpen) {
      setCurrentSlideIndex(0);
      setDirection('next');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || slides.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowRight' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlideIndex, slides.length]);

  if (!isOpen || !policy || slides.length === 0) return null;

  const currentSlide = slides[currentSlideIndex];
  const progressPct = Math.round(((currentSlideIndex + 1) / slides.length) * 100);

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setDirection('next');
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setDirection('prev');
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      dialogRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0].screenX;
    const diff = endX - touchStartXRef.current;
    if (Math.abs(diff) > 45) {
      if (diff < 0) {
        // Swiped left (in RTL: next slide)
        handleNext();
      } else {
        // Swiped right (in RTL: prev slide)
        handlePrev();
      }
    }
  };

  return (
    <div
      ref={dialogRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`عرض تقديمي: ${policy.title}`}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col select-none modal-enter"
    >
      {/* Top Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 shrink-0">
            {policy.code}
          </span>
          <span className="text-xs text-slate-300 font-bold truncate max-w-[200px] sm:max-w-md">
            {policy.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            شريحة {currentSlideIndex + 1} من {slides.length}
          </span>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
            title="تبديل ملء الشاشة (F)"
          >
            ⛶ ملء الشاشة
          </button>

          <button
            type="button"
            onClick={onClose}
            onTouchEnd={(e) => {
              e.preventDefault();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-red-700 active:bg-red-800 text-white flex items-center justify-center font-bold text-base transition cursor-pointer border border-slate-700 active:scale-95 shadow-md"
            title="خروج (Esc)"
            aria-label="إغلاق العرض"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1">
        <div
          className="bg-teal-400 h-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        ></div>
      </div>

      {/* Central Slide Content with RTL-aware transition */}
      <div
        key={currentSlideIndex}
        className={`w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center py-6 px-4 overflow-y-auto custom-scroll ${
          direction === 'next' ? 'slide-enter-next' : 'slide-enter-prev'
        }`}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700/60 inline-block">
              {policy.code} • قسم {policy.dept}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {currentSlide?.slide_title}
            </h2>
          </div>

          <div
            className={`grid grid-cols-1 ${
              currentSlide?.image_url ? 'lg:grid-cols-12' : ''
            } gap-6 items-center`}
          >
            <div className={`${currentSlide?.image_url ? 'lg:col-span-7' : 'w-full'} space-y-3`}>
              {(currentSlide?.bullet_points || []).map((bullet, i) => (
                <div
                  key={i}
                  className="slide-bullet flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-100 shadow-md"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </span>
                  <p className="text-base sm:text-xl font-bold leading-relaxed">{bullet}</p>
                </div>
              ))}
            </div>

            {currentSlide?.image_url && (
              <div className="lg:col-span-5 flex justify-center">
                <img
                  src={currentSlide.image_url}
                  alt="مخطط الشريحة"
                  className="rounded-2xl max-h-80 w-full object-cover border border-slate-800 shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Toolbar */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <span>→</span>
          <span>الشريحة السابقة</span>
        </button>

        <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">
          يمكنك استخدام أسهم لوحة المفاتيح (← / →) أو مسطرة المسافة أو السحب باللمس على الموبايل
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentSlideIndex === slides.length - 1}
          className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-lg disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <span>الشريحة التالية</span>
          <span>←</span>
        </button>
      </div>
    </div>
  );
};
