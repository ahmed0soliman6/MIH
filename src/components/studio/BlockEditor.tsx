import React, { useState, useRef } from 'react';
import { Block, createBlockId } from '../../doc/model';
import { BlockItem } from './BlockItem';

interface BlockEditorProps {
  blocks: Block[];
  onChangeBlocks: (blocks: Block[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  blocks,
  onChangeBlocks,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [insertIdx, setInsertIdx] = useState<number | null>(null);

  // Add block helper
  const handleAddBlock = (type: Block['type'], atIndex?: number) => {
    let newBlock: Block;
    switch (type) {
      case 'section':
        newBlock = {
          id: createBlockId(),
          type: 'section',
          title: 'عنوان القسم',
          style: 'bar',
          numbering: 'roman',
        };
        break;
      case 'subheading':
        newBlock = {
          id: createBlockId(),
          type: 'subheading',
          text: 'عنوان فرعي:',
          style: 'underline',
        };
        break;
      case 'paragraph':
        newBlock = {
          id: createBlockId(),
          type: 'paragraph',
          text: 'اكتب نص الفقرة هنا...',
        };
        break;
      case 'list':
        newBlock = {
          id: createBlockId(),
          type: 'list',
          marker: 'disc',
          items: [{ id: createBlockId(), text: 'بند أول' }],
        };
        break;
      case 'ordered':
        newBlock = {
          id: createBlockId(),
          type: 'ordered',
          kind: 'decimal',
          items: [{ id: createBlockId(), text: 'خطوة أولى' }],
        };
        break;
      case 'table':
        newBlock = {
          id: createBlockId(),
          type: 'table',
          headers: ['العنصر', 'الوصف', 'الملاحظات'],
          rows: [['بند 1', 'تفاصيل', 'ملاحظة']],
        };
        break;
      case 'callout':
        newBlock = {
          id: createBlockId(),
          type: 'callout',
          calloutType: 'note',
          text: 'ملاحظة هامة للممارسين الصحيين.',
        };
        break;
      case 'checklist':
        newBlock = {
          id: createBlockId(),
          type: 'checklist',
          items: [{ id: createBlockId(), text: 'بند تحقق أول', checked: false }],
        };
        break;
      case 'figure':
        newBlock = {
          id: createBlockId(),
          type: 'figure',
          src: '',
          caption: 'شكل توضيحي',
        };
        break;
      case 'pagebreak':
        newBlock = { id: createBlockId(), type: 'pagebreak' };
        break;
      case 'raw':
        newBlock = { id: createBlockId(), type: 'raw', html: '<p>محتوى مخصص</p>' };
        break;
    }

    const nextBlocks = [...blocks];
    const target = atIndex !== undefined ? atIndex : blocks.length;
    nextBlocks.splice(target, 0, newBlock);
    onChangeBlocks(nextBlocks);
    setInsertIdx(null);
  };

  // Move block up
  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...blocks];
    const temp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = temp;
    onChangeBlocks(next);
  };

  // Move block down
  const handleMoveDown = (idx: number) => {
    if (idx === blocks.length - 1) return;
    const next = [...blocks];
    const temp = next[idx];
    next[idx] = next[idx + 1];
    next[idx + 1] = temp;
    onChangeBlocks(next);
  };

  // Duplicate block
  const handleDuplicate = (idx: number) => {
    const original = blocks[idx];
    const duplicated: Block = JSON.parse(JSON.stringify(original));
    duplicated.id = createBlockId();
    const next = [...blocks];
    next.splice(idx + 1, 0, duplicated);
    onChangeBlocks(next);
  };

  // Delete block
  const handleDelete = (idx: number) => {
    const next = blocks.filter((_, i) => i !== idx);
    onChangeBlocks(next);
  };

  // Drag and drop
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIdx: number) => {
    if (draggedIdx === null || draggedIdx === dropIdx) {
      setDraggedIdx(null);
      return;
    }
    const next = [...blocks];
    const item = next.splice(draggedIdx, 1)[0];
    next.splice(dropIdx, 0, item);
    onChangeBlocks(next);
    setDraggedIdx(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 overflow-y-auto space-y-4" dir="rtl">
      {/* Top Bar with Block count and Undo/Redo */}
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <span>🧱</span>
          <span>محرر الكتل الهيكلية ({blocks.length} كتلة)</span>
        </span>

        <div className="flex items-center gap-1.5">
          {onUndo && (
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 font-medium transition"
              title="تراجع (Ctrl+Z)"
            >
              ↩️ تراجع
            </button>
          )}
          {onRedo && (
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 font-medium transition"
              title="إعادة (Ctrl+Shift+Z)"
            >
              ↪️ إعادة
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {blocks.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-3">
          <span className="text-4xl block">🧱</span>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            الوثيقة فارغة حتى الآن
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            أضف كتل من الخيارات أدناه أو استخدم وضع "الكتابة السريعة" لكتابة نص يُحلل تلقائياً
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleAddBlock('section')}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition"
            >
              ➕ قسم رئيسي
            </button>
            <button
              type="button"
              onClick={() => handleAddBlock('paragraph')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
            >
              ➕ فقرة نصية
            </button>
            <button
              type="button"
              onClick={() => handleAddBlock('list')}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
            >
              ➕ قائمة نقطية
            </button>
          </div>
        </div>
      )}

      {/* Block List */}
      <div className="space-y-3">
        {blocks.map((block, idx) => (
          <React.Fragment key={block.id}>
            <BlockItem
              block={block}
              index={idx}
              totalBlocks={blocks.length}
              onChange={(updated) => {
                const next = [...blocks];
                next[idx] = updated;
                onChangeBlocks(next);
              }}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
              onDuplicate={() => handleDuplicate(idx)}
              onDelete={() => handleDelete(idx)}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
            />

            {/* Quick Insert in-between bar on hover */}
            <div className="flex items-center justify-center -my-1 py-1 opacity-0 hover:opacity-100 transition duration-150">
              <button
                type="button"
                onClick={() => setInsertIdx(idx + 1)}
                className="px-2 py-0.5 text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-full shadow-xs hover:scale-105 transition"
              >
                ➕ إضافة كتلة هنا
              </button>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Insert Block Bar (Bottom) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
          ➕ إضافة كتلة جديدة في النهاية:
        </span>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => handleAddBlock('section')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            📑 قسم
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('subheading')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            ➢ فرعي
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('paragraph')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            ¶ فقرة
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('list')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            ● قائمة نقطية
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('ordered')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            1. مرقمة
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('table')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            📊 جدول
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('callout')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            💡 تنبيه
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('checklist')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            ☑️ تحقق
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('figure')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            🖼️ صورة
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('pagebreak')}
            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
          >
            📄 فاصل
          </button>
        </div>
      </div>
    </div>
  );
};
