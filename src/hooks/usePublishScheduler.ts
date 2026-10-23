import { useState, useEffect, useRef, useCallback } from 'react';
import { requestPublish } from '../services/publish';
import { loadDataVersion } from '../services/policyData';

export type PublishStatus = 'idle' | 'pending' | 'publishing' | 'published' | 'error';

interface UsePublishSchedulerProps {
  onShowToast: (message: string) => void;
  isAdmin: boolean;
}

export function usePublishScheduler({ onShowToast, isAdmin }: UsePublishSchedulerProps) {
  const [publishStatus, setPublishStatus] = useState<PublishStatus>(() => {
    return localStorage.getItem('mih_publish_pending') === '1' ? 'pending' : 'idle';
  });

  const timerRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);
  const requestedAtRef = useRef<number>(0);
  const statusRef = useRef<PublishStatus>(publishStatus);

  useEffect(() => {
    statusRef.current = publishStatus;
  }, [publishStatus]);

  // تنفيذ النشر الفعلي
  const triggerPublishNow = useCallback(async (keepalive = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setPublishStatus('publishing');
    requestedAtRef.current = Date.now();

    try {
      const res = await requestPublish(keepalive);

      if (res.ok) {
        localStorage.removeItem('mih_publish_pending');
        onShowToast('🚀 تم إرسال أمر النشر إلى Vercel، جاري بناء النسخة الجديدة...');

        // بدء الفحص الدوري (Polling) كل 15 ثانية للتأكد من وصول اللقطة الجديدة للزوار
        if (pollingRef.current) clearInterval(pollingRef.current);

        const startTime = Date.now();
        const MAX_POLL_TIME = 6 * 60 * 1000; // 6 دقائق كحد أقصى

        pollingRef.current = setInterval(async () => {
          if (Date.now() - startTime > MAX_POLL_TIME) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            return;
          }

          const version = await loadDataVersion();
          if (version && version.generatedAt) {
            const genTime = new Date(version.generatedAt).getTime();
            if (genTime >= requestedAtRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
              setPublishStatus('published');
              onShowToast('✅ تم اكتمال النشر ووصول التحديثات لجميع الزوار!');
            }
          }
        }, 15000);
      } else if (res.status === 429) {
        setPublishStatus('pending');
        const retrySec = (res.retryAfterSec || 20) + 5;
        onShowToast(`⏳ تم تأجيل النشر (${retrySec} ثانية) بسبب كثرة الطلبات المتتالية.`);
        timerRef.current = setTimeout(() => {
          triggerPublishNow();
        }, retrySec * 1000);
      } else {
        setPublishStatus('error');
        onShowToast(`⚠️ فشل النشر: ${res.message || 'حدث خطأ'}`);
      }
    } catch (err: any) {
      setPublishStatus('error');
      onShowToast(`⚠️ تعذر النشر: ${err.message || err}`);
    }
  }, [onShowToast]);

  // جدولة النشر مع Debounce مدته 30 ثانية
  const schedulePublish = useCallback(() => {
    if (!isAdmin) return;

    localStorage.setItem('mih_publish_pending', '1');
    setPublishStatus('pending');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      triggerPublishNow();
    }, 30000);
  }, [isAdmin, triggerPublishNow]);

  // في حال إغلاق الصفحة أو التنقل أثناء وجود نشر معلق
  useEffect(() => {
    const handleVisibilityOrPageHide = () => {
      if (document.visibilityState === 'hidden' && statusRef.current === 'pending') {
        triggerPublishNow(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrPageHide);
    window.addEventListener('pagehide', handleVisibilityOrPageHide);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrPageHide);
      window.removeEventListener('pagehide', handleVisibilityOrPageHide);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [triggerPublishNow]);

  return {
    publishStatus,
    schedulePublish,
    triggerPublishNow
  };
}
