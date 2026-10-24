import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Policy, CategoryKey, Slide } from '../../types';
import { StudioHeader } from './StudioHeader';
import { FastWriter } from './FastWriter';
import { StudioMetadataPanel } from './StudioMetadataPanel';
import { SmartPasteDrawer } from './SmartPasteDrawer';
import { BlockEditor } from './BlockEditor';
import { HtmlEditor } from './HtmlEditor';
import { SlidesEditor } from './SlidesEditor';
import { DiffSummaryModal } from './DiffSummaryModal';
import { useStudioDraft, StudioDraftState } from './useStudioDraft';
import { OfficialDocument } from '../../doc/OfficialDocument';
import { smartParseText } from '../../doc/smartParse';
import { serializeBlocksToHtml } from '../../doc/serialize';
import { parseHtmlToBlocks } from '../../doc/parse';
import { htmlToText, sanitizeHtml } from '../../utils/sanitize';
import { Block } from '../../doc/model';

interface PolicyStudioProps {
  policy: Policy | null;
  existingPolicies?: Policy[];
  onSave: (policy: Policy) => Promise<void>;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onSelectPolicy?: (id: string) => void;
}

export const PolicyStudio: React.FC<PolicyStudioProps> = ({
  policy,
  existingPolicies = [],
  onSave,
  onClose,
  onShowToast,
  onSelectPolicy,
}) => {
  // Mode state: 'fast' | 'blocks' | 'html' | 'slides'
  const [contentMode, setContentMode] = useState<'fast' | 'blocks' | 'html' | 'slides'>('fast');

  // Metadata state
  const [title, setTitle] = useState(policy?.title || '');
  const [code, setCode] = useState(policy?.code || '');
  const [category, setCategory] = useState<string>(policy?.category || 'QPI');
  const [dept, setDept] = useState(policy?.dept || 'جميع أقسام المستشفى');
  const [version, setVersion] = useState(policy?.version || '1.0');
  const [effectiveDate, setEffectiveDate] = useState(policy?.effectiveDate || policy?.date || '');
  const [reviewDate, setReviewDate] = useState(policy?.reviewDate || '');
  const [responsibilities, setResponsibilities] = useState(
    Array.isArray(policy?.responsibilities)
      ? policy.responsibilities.join(' • ')
      : policy?.responsibilities || ''
  );
  const [purpose, setPurpose] = useState(policy?.purpose || '');

  // Content state
  const [rawText, setRawText] = useState(policy?.plain_text || '');
  const [htmlContent, setHtmlContent] = useState(policy?.content_html || '');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [originalBlocks, setOriginalBlocks] = useState<Block[]>([]);
  const [slides, setSlides] = useState<Slide[]>(policy?.slides || []);

  // History state for Undo/Redo (max 100)
  const [blocksHistory, setBlocksHistory] = useState<Block[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // UI state
  const [docMode, setDocMode] = useState<'page' | 'reading'>('page');
  const [isSaving, setIsSaving] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [isMetadataCollapsed, setIsMetadataCollapsed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState<'editor' | 'preview'>('editor');

  // Initialize or reset policy data
  useEffect(() => {
    if (policy) {
      setTitle(policy.title || '');
      setCode(policy.code || '');
      setCategory(policy.category || 'QPI');
      setDept(policy.dept || 'جميع أقسام المستشفى');
      setVersion(policy.version || '1.0');
      setEffectiveDate(policy.effectiveDate || policy.date || '');
      setReviewDate(policy.reviewDate || '');
      setResponsibilities(
        Array.isArray(policy.responsibilities)
          ? policy.responsibilities.join(' • ')
          : policy.responsibilities || ''
      );
      setPurpose(policy.purpose || '');
      setSlides(policy.slides || []);

      let initialBlocks: Block[] = [];
      if (policy.content_html) {
        initialBlocks = parseHtmlToBlocks(policy.content_html);
        setHtmlContent(policy.content_html);
      } else if (policy.plain_text) {
        initialBlocks = smartParseText(policy.plain_text).blocks;
        setHtmlContent(serializeBlocksToHtml(initialBlocks));
      }

      setBlocks(initialBlocks);
      setOriginalBlocks(initialBlocks);
      setBlocksHistory([initialBlocks]);
      setHistoryIdx(0);

      if (policy.plain_text) {
        setRawText(policy.plain_text);
      } else if (policy.content_html) {
        setRawText(htmlToText(policy.content_html));
      }
    } else {
      setTitle('');
      setCode('');
      setCategory('QPI');
      setDept('جميع أقسام المستشفى');
      setVersion('1.0');
      setEffectiveDate('');
      setReviewDate('');
      setResponsibilities('');
      setPurpose('');
      setRawText('');
      setHtmlContent('');
      setBlocks([]);
      setOriginalBlocks([]);
      setBlocksHistory([[]]);
      setHistoryIdx(0);
      setSlides([]);
    }
  }, [policy]);

  // Draft management
  const draftState = useMemo(
    () => ({
      title,
      code,
      category,
      dept,
      version,
      purpose,
      rawText,
      contentHtml: htmlContent,
      effectiveDate,
      reviewDate,
      responsibilities,
    }),
    [
      title,
      code,
      category,
      dept,
      version,
      purpose,
      rawText,
      htmlContent,
      effectiveDate,
      reviewDate,
      responsibilities,
    ]
  );

  const handleRestoreDraft = (draft: StudioDraftState) => {
    setTitle(draft.title || '');
    setCode(draft.code || '');
    setCategory(draft.category || 'QPI');
    setDept(draft.dept || '');
    setVersion(draft.version || '1.0');
    setEffectiveDate(draft.effectiveDate || '');
    setReviewDate(draft.reviewDate || '');
    setResponsibilities(draft.responsibilities || '');
    setPurpose(draft.purpose || '');
    setRawText(draft.rawText || '');
    if (draft.rawText) {
      const parsed = smartParseText(draft.rawText).blocks;
      setBlocks(parsed);
      setHtmlContent(serializeBlocksToHtml(parsed));
      setBlocksHistory([parsed]);
      setHistoryIdx(0);
    }
    onShowToast('تمت استعادة المسودة بنجاح');
  };

  const {
    hasExistingDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
    lastSavedTime,
    isDirty,
  } = useStudioDraft(policy?.id, draftState, handleRestoreDraft);

  // Push new blocks state with max 100 history entries
  const pushBlocksHistory = useCallback(
    (newBlocks: Block[]) => {
      setBlocks(newBlocks);
      const html = serializeBlocksToHtml(newBlocks);
      setHtmlContent(html);

      setBlocksHistory((prev) => {
        const upToCurrent = prev.slice(0, historyIdx + 1);
        const next = [...upToCurrent, newBlocks];
        if (next.length > 100) next.shift();
        return next;
      });
      setHistoryIdx((prev) => Math.min(prev + 1, 99));
    },
    [historyIdx]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      const targetBlocks = blocksHistory[nextIdx];
      setBlocks(targetBlocks);
      const html = serializeBlocksToHtml(targetBlocks);
      setHtmlContent(html);
      setRawText(htmlToText(html));
    }
  }, [historyIdx, blocksHistory]);

  const handleRedo = useCallback(() => {
    if (historyIdx < blocksHistory.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      const targetBlocks = blocksHistory[nextIdx];
      setBlocks(targetBlocks);
      const html = serializeBlocksToHtml(targetBlocks);
      setHtmlContent(html);
      setRawText(htmlToText(html));
    }
  }, [historyIdx, blocksHistory]);

  // Mode change handler with seamless bidirectional sync
  const handleModeChange = (newMode: 'fast' | 'blocks' | 'html' | 'slides') => {
    if (newMode === contentMode) return;

    if (contentMode === 'fast') {
      if (rawText.trim()) {
        const parsed = smartParseText(rawText).blocks;
        setBlocks(parsed);
        const html = serializeBlocksToHtml(parsed);
        setHtmlContent(html);
        pushBlocksHistory(parsed);
      }
    } else if (contentMode === 'blocks') {
      const html = serializeBlocksToHtml(blocks);
      setHtmlContent(html);
      setRawText(htmlToText(html));
    } else if (contentMode === 'html') {
      if (htmlContent.trim()) {
        const parsed = parseHtmlToBlocks(htmlContent);
        setBlocks(parsed);
        setRawText(htmlToText(htmlContent));
        pushBlocksHistory(parsed);
      }
    }

    setContentMode(newMode);
  };

  // Debounced live preview HTML generation (~150ms) for fast writer
  const [debouncedRawText, setDebouncedRawText] = useState(rawText);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRawText(rawText);
    }, 150);
    return () => clearTimeout(handler);
  }, [rawText]);

  // Generate live preview policy object
  const previewPolicy = useMemo(() => {
    let currentHtml = '';
    if (contentMode === 'fast') {
      if (debouncedRawText.trim()) {
        const parsed = smartParseText(debouncedRawText);
        currentHtml = serializeBlocksToHtml(parsed.blocks);
      } else if (policy?.content_html) {
        currentHtml = policy.content_html;
      }
    } else if (contentMode === 'blocks') {
      currentHtml = serializeBlocksToHtml(blocks);
    } else if (contentMode === 'html') {
      currentHtml = htmlContent;
    } else if (contentMode === 'slides') {
      currentHtml = serializeBlocksToHtml(blocks);
    }

    if (!currentHtml && policy?.content_html) {
      currentHtml = policy.content_html;
    }

    return {
      id: policy?.id || 'preview-temp',
      title: title || 'عنوان السياسة',
      code: code || '—',
      category: category || '—',
      dept: dept || '—',
      version: version || '1.0',
      effectiveDate: effectiveDate || '—',
      reviewDate: reviewDate || '—',
      responsibilities: responsibilities || '—',
      purpose: purpose || '—',
      content_html: currentHtml,
      plain_text: contentMode === 'fast' ? debouncedRawText : htmlToText(currentHtml),
      slides: slides,
    };
  }, [
    contentMode,
    debouncedRawText,
    blocks,
    htmlContent,
    slides,
    title,
    code,
    category,
    dept,
    version,
    effectiveDate,
    reviewDate,
    responsibilities,
    purpose,
    policy,
  ]);

  // Perform actual save
  const performActualSave = useCallback(async () => {
    setIsSaving(true);
    try {
      let finalHtml = '';
      if (contentMode === 'fast') {
        const parsed = smartParseText(rawText);
        finalHtml = serializeBlocksToHtml(parsed.blocks);
      } else if (contentMode === 'blocks') {
        finalHtml = serializeBlocksToHtml(blocks);
      } else if (contentMode === 'html') {
        finalHtml = htmlContent;
      } else if (contentMode === 'slides') {
        finalHtml = serializeBlocksToHtml(blocks);
      }

      if (!finalHtml.trim()) {
        finalHtml = '<p>لا يوجد محتوى</p>';
      }

      const cleanHtml = sanitizeHtml(finalHtml);
      const plainText = htmlToText(cleanHtml) || rawText;

      const policyPayload: Policy = {
        id: policy?.id || `pol-${Date.now()}`,
        title: title.trim(),
        code: code.trim(),
        category: category.trim() || 'QPI',
        dept: dept.trim() || 'جميع أقسام المستشفى',
        version: version.trim() || '1.0',
        date: effectiveDate.trim() || undefined,
        effectiveDate: effectiveDate.trim() || undefined,
        reviewDate: reviewDate.trim() || undefined,
        responsibilities: responsibilities.trim() || undefined,
        purpose: purpose.trim() || '',
        content_html: cleanHtml,
        plain_text: plainText,
        slides: slides,
        updated_at: new Date().toISOString(),
      };

      await onSave(policyPayload);
      clearDraft();
      setOriginalBlocks(contentMode === 'blocks' ? blocks : parseHtmlToBlocks(cleanHtml));
      onShowToast('تم حفظ السياسة بنجاح!');
    } catch (err: any) {
      console.error('Failed to save policy:', err);
      onShowToast(err.message || 'حدث خطأ أثناء حفظ السياسة');
    } finally {
      setIsSaving(false);
    }
  }, [
    contentMode,
    rawText,
    blocks,
    htmlContent,
    slides,
    title,
    code,
    category,
    dept,
    version,
    effectiveDate,
    reviewDate,
    responsibilities,
    purpose,
    policy,
    onSave,
    clearDraft,
    onShowToast,
  ]);

  // Initiate Save (checks diff modal if applicable)
  const handleSaveInitiate = useCallback(() => {
    if (!title.trim()) {
      onShowToast('يرجى إدخال عنوان السياسة');
      return;
    }
    if (!code.trim()) {
      onShowToast('يرجى إدخال كود السياسة');
      return;
    }

    // Check code uniqueness
    const duplicate = existingPolicies.find(
      (p) =>
        p.code.trim().toLowerCase() === code.trim().toLowerCase() &&
        p.id !== policy?.id
    );
    if (duplicate) {
      onShowToast(`الكود (${code}) مستخدم بالفعل في سياسة أخرى: ${duplicate.title}`);
      return;
    }

    if (rawText.length > 300000 || htmlContent.length > 500000) {
      onShowToast('حجم المحتوى يتجاوز الحد الأقصى المسموح به');
      return;
    }

    // Show diff modal if modifying an existing policy with existing blocks
    if (policy?.id && originalBlocks.length > 0 && contentMode === 'blocks') {
      const hasChanges = JSON.stringify(originalBlocks) !== JSON.stringify(blocks);
      if (hasChanges) {
        setShowDiffModal(true);
        return;
      }
    }

    performActualSave();
  }, [
    title,
    code,
    existingPolicies,
    policy,
    rawText,
    htmlContent,
    originalBlocks,
    blocks,
    contentMode,
    onShowToast,
    performActualSave,
  ]);

  // Keyboard Shortcuts: Ctrl+S to save, Ctrl+Z / Ctrl+Shift+Z for undo/redo, Ctrl+Enter for preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveInitiate();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setIsFullscreenPreview((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && contentMode === 'blocks') {
        if (e.shiftKey && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          handleRedo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveInitiate, handleUndo, handleRedo, contentMode]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans" dir="rtl">
      {/* Top Header */}
      <StudioHeader
        title={title}
        code={code}
        isDirty={isDirty}
        lastSavedTime={lastSavedTime}
        isSaving={isSaving}
        onSave={handleSaveInitiate}
        onPrint={handlePrint}
        onToggleFullscreenPreview={() => setIsFullscreenPreview(true)}
        onClose={onClose}
        activeView={mobileActiveView}
        onChangeActiveView={setMobileActiveView}
        contentMode={contentMode}
        onChangeContentMode={handleModeChange}
        blocksCount={blocks.length}
        slidesCount={slides.length}
        existingPolicies={existingPolicies}
        currentPolicyId={policy?.id}
        onSelectPolicy={onSelectPolicy}
      />

      {/* Restorable Draft Banner */}
      {hasExistingDraft && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/40 px-4 py-2 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <span>⚠️</span>
            <span>توجد مسودة غير محفوظة من جلسة سابقة لهذه السياسة.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
            >
              استعادة المسودة
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition"
            >
              تجاهل
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Right Pane: Active Content Mode Editor */}
        <div
          className={`flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto ${
            mobileActiveView === 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {contentMode === 'fast' && (
            <FastWriter
              value={rawText}
              onChange={setRawText}
              onOpenSmartPaste={() => setIsSmartPasteOpen(true)}
            />
          )}

          {contentMode === 'blocks' && (
            <BlockEditor
              blocks={blocks}
              onChangeBlocks={pushBlocksHistory}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={historyIdx > 0}
              canRedo={historyIdx < blocksHistory.length - 1}
            />
          )}

          {contentMode === 'html' && (
            <HtmlEditor
              value={htmlContent}
              onChange={setHtmlContent}
            />
          )}

          {contentMode === 'slides' && (
            <SlidesEditor
              slides={slides}
              onChangeSlides={setSlides}
              contentHtml={previewPolicy.content_html}
              policyTitle={title}
              policyCode={code}
              onShowToast={onShowToast}
            />
          )}
        </div>

        {/* Collapsible Metadata Panel */}
        <div className={`${mobileActiveView === 'preview' ? 'hidden lg:block' : 'block'}`}>
          <StudioMetadataPanel
            title={title}
            onChangeTitle={setTitle}
            code={code}
            onChangeCode={setCode}
            category={category}
            onChangeCategory={setCategory}
            dept={dept}
            onChangeDept={setDept}
            version={version}
            onChangeVersion={setVersion}
            effectiveDate={effectiveDate}
            onChangeEffectiveDate={setEffectiveDate}
            reviewDate={reviewDate}
            onChangeReviewDate={setReviewDate}
            responsibilities={responsibilities}
            onChangeResponsibilities={setResponsibilities}
            purpose={purpose}
            onChangePurpose={setPurpose}
            existingPolicies={existingPolicies}
            currentPolicyId={policy?.id}
            isCollapsed={isMetadataCollapsed}
            onToggleCollapse={() => setIsMetadataCollapsed((prev) => !prev)}
          />
        </div>

        {/* Left Pane: Live Preview (>=1024px always visible, on mobile toggled) */}
        <div
          className={`w-full lg:w-1/2 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-200/60 dark:bg-slate-900/80 overflow-hidden ${
            mobileActiveView === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>📄</span>
              <span>معاينة حية فورية (A4)</span>
            </span>

            {/* Mode & Zoom Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDocMode('page')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    docMode === 'page'
                      ? 'bg-white dark:bg-slate-700 shadow-xs font-bold text-teal-700 dark:text-teal-300'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="محاكاة ورقة A4 للطباعة"
                >
                  📄 A4
                </button>
                <button
                  type="button"
                  onClick={() => setDocMode('reading')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    docMode === 'reading'
                      ? 'bg-white dark:bg-slate-700 shadow-xs font-bold text-teal-700 dark:text-teal-300'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="قراءة متكيفة مع الوضع الليلي والشاشات"
                >
                  🌙 قراءة مريحة
                </button>
              </div>

              {/* Zoom Controls */}
              {docMode === 'page' && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setZoomScale(0.75)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      zoomScale === 0.75 ? 'bg-white dark:bg-slate-700 shadow-xs font-bold text-teal-700 dark:text-teal-300' : 'text-slate-500'
                    }`}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      zoomScale === 1 ? 'bg-white dark:bg-slate-700 shadow-xs font-bold text-teal-700 dark:text-teal-300' : 'text-slate-500'
                    }`}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.15)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      zoomScale === 1.15 ? 'bg-white dark:bg-slate-700 shadow-xs font-bold text-teal-700 dark:text-teal-300' : 'text-slate-500'
                    }`}
                  >
                    115%
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Official Document Live Render */}
          <div className="flex-1 overflow-y-auto p-4 flex justify-center">
            <OfficialDocument
              policy={previewPolicy}
              mode={docMode}
              zoomScale={docMode === 'page' ? zoomScale : 1}
            />
          </div>
        </div>
      </div>

      {/* Smart Paste Drawer */}
      <SmartPasteDrawer
        isOpen={isSmartPasteOpen}
        onClose={() => setIsSmartPasteOpen(false)}
        onApply={(parsedText, parsedBlocks, detectedMeta) => {
          if (detectedMeta) {
            if (detectedMeta.title) setTitle(detectedMeta.title);
            if (detectedMeta.code) setCode(detectedMeta.code);
            if (detectedMeta.category) setCategory(detectedMeta.category);
            if (detectedMeta.dept) setDept(detectedMeta.dept);
            if (detectedMeta.version) setVersion(detectedMeta.version);
            if (detectedMeta.effectiveDate) setEffectiveDate(detectedMeta.effectiveDate);
            if (detectedMeta.reviewDate) setReviewDate(detectedMeta.reviewDate);
          }
          setRawText((prev) => (prev ? `${prev}\n\n${parsedText}` : parsedText));
          if (contentMode === 'blocks') {
            pushBlocksHistory([...blocks, ...parsedBlocks]);
          }
          onShowToast('تم تطبيق النص والبيانات المستخرجة بنجاح');
        }}
      />

      {/* Diff Summary Modal before final save */}
      <DiffSummaryModal
        isOpen={showDiffModal}
        originalBlocks={originalBlocks}
        currentBlocks={blocks}
        onConfirmSave={() => {
          setShowDiffModal(false);
          performActualSave();
        }}
        onCancel={() => setShowDiffModal(false)}
      />

      {/* Fullscreen Preview Modal */}
      {isFullscreenPreview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md animate-in fade-in"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <span className="font-bold">معاينة كاملة للوثيقة:</span>
              <span className="text-slate-400">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
              >
                <span>🖨️ طباعة</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreenPreview(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
              >
                إغلاق (Esc)
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex justify-center">
            <OfficialDocument policy={previewPolicy} mode="page" zoomScale={1} />
          </div>
        </div>
      )}
    </div>
  );
};
