import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, message }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center space-y-4">
      <div className="w-14 h-14 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
      <div className="space-y-1">
        <h3 className="text-lg font-black text-white">جاري المعالجة الذكية...</h3>
        {message && <p className="text-xs text-slate-300 font-semibold">{message}</p>}
      </div>
    </div>
  );
};
