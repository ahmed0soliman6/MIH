import React from 'react';
import {
  Block,
  SectionStyle,
  NumberingStyle,
  SubheadingStyle,
  ListMarker,
  OrderedKind,
  CalloutType,
  ListItem,
  ChecklistItem,
  createBlockId,
} from '../../doc/model';

interface BlockItemProps {
  block: Block;
  index: number;
  totalBlocks: number;
  onChange: (updated: Block) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const BLOCK_TYPES: { type: Block['type']; label: string; icon: string }[] = [
  { type: 'section', label: 'قسم رئيسي', icon: '📑' },
  { type: 'subheading', label: 'عنوان فرعي', icon: '➢' },
  { type: 'paragraph', label: 'فقرة نصية', icon: '¶' },
  { type: 'list', label: 'قائمة نقطية', icon: '●' },
  { type: 'ordered', label: 'قائمة مرقمة', icon: '1.' },
  { type: 'table', label: 'جدول', icon: '📊' },
  { type: 'callout', label: 'مربع تنبيه', icon: '💡' },
  { type: 'checklist', label: 'قائمة تحقق', icon: '☑️' },
  { type: 'figure', label: 'صورة / شكل', icon: '🖼️' },
  { type: 'pagebreak', label: 'فاصل صفحة', icon: '📄' },
  { type: 'raw', label: 'HTML خام', icon: '💻' },
];

export const BlockItem: React.FC<BlockItemProps> = ({
  block,
  index,
  totalBlocks,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const currentMeta = BLOCK_TYPES.find((b) => b.type === block.type) || BLOCK_TYPES[2];

  const handleTypeChange = (newType: Block['type']) => {
    if (newType === block.type) return;

    let converted: Block;
    switch (newType) {
      case 'section':
        converted = {
          id: block.id,
          type: 'section',
          title: (block as any).title || (block as any).text || 'عنوان القسم',
          style: 'bar',
          numbering: 'roman',
        };
        break;
      case 'subheading':
        converted = {
          id: block.id,
          type: 'subheading',
          text: (block as any).text || (block as any).title || 'عنوان فرعي:',
          style: 'underline',
        };
        break;
      case 'paragraph':
        converted = {
          id: block.id,
          type: 'paragraph',
          text: (block as any).text || (block as any).title || '',
        };
        break;
      case 'list':
        converted = {
          id: block.id,
          type: 'list',
          marker: 'disc',
          items: [{ id: createBlockId(), text: (block as any).text || 'بند أول' }],
        };
        break;
      case 'ordered':
        converted = {
          id: block.id,
          type: 'ordered',
          kind: 'decimal',
          items: [{ id: createBlockId(), text: (block as any).text || 'خطوة أولى' }],
        };
        break;
      case 'callout':
        converted = {
          id: block.id,
          type: 'callout',
          calloutType: 'note',
          text: (block as any).text || (block as any).title || '',
        };
        break;
      case 'table':
        converted = {
          id: block.id,
          type: 'table',
          headers: ['العنصر', 'الوصف', 'الملاحظات'],
          rows: [['بند 1', 'تفاصيل', 'ملاحظة']],
        };
        break;
      case 'checklist':
        converted = {
          id: block.id,
          type: 'checklist',
          items: [{ id: createBlockId(), text: (block as any).text || 'بند تحقق', checked: false }],
        };
        break;
      case 'figure':
        converted = {
          id: block.id,
          type: 'figure',
          src: '',
          alt: '',
          caption: (block as any).text || '',
        };
        break;
      case 'pagebreak':
        converted = { id: block.id, type: 'pagebreak' };
        break;
      case 'raw':
        converted = { id: block.id, type: 'raw', html: '<p>محتوى مخصص</p>' };
        break;
    }
    onChange(converted);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-teal-400 dark:hover:border-teal-700 transition duration-150 overflow-hidden"
      dir="rtl"
    >
      {/* Block Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs">
        {/* Left: Drag handle + Type selector */}
        <div className="flex items-center gap-2">
          <span
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-mono text-sm px-1"
            title="اسحب لإعادة الترتيب"
          >
            ⠿
          </span>

          <span className="text-sm">{currentMeta.icon}</span>

          <select
            value={block.type}
            onChange={(e) => handleTypeChange(e.target.value as Block['type'])}
            className="bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer hover:text-teal-700"
          >
            {BLOCK_TYPES.map((b) => (
              <option key={b.type} value={b.type} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                {b.icon} {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Actions (Move Up, Move Down, Duplicate, Delete) */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="p-1 text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 disabled:opacity-20 rounded"
            title="تحريك لأعلى (Alt+↑)"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === totalBlocks - 1}
            onClick={onMoveDown}
            className="p-1 text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 disabled:opacity-20 rounded"
            title="تحريك لأسفل (Alt+↓)"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1 text-slate-500 hover:text-indigo-600 rounded text-xs"
            title="تكرار الكتلة"
          >
            📋
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-xs"
            title="حذف الكتلة"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Block Body Content Form */}
      <div className="p-3.5 space-y-3">
        {/* 1. Section Block */}
        {block.type === 'section' && (
          <div className="space-y-2">
            <input
              type="text"
              value={block.title}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
              placeholder="عنوان القسم..."
              className="w-full p-2 text-sm font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>نمط التصميم:</span>
                <select
                  value={block.style || 'bar'}
                  onChange={(e) => onChange({ ...block, style: e.target.value as SectionStyle })}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="bar">شريط جانبي ملون (Bar)</option>
                  <option value="underline">خط سفلي (Underline)</option>
                  <option value="box">مربع حدودي (Box)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span>الترقيم:</span>
                <select
                  value={block.numbering || 'roman'}
                  onChange={(e) => onChange({ ...block, numbering: e.target.value as NumberingStyle })}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                >
                  <option value="roman">روماني (I, II, III)</option>
                  <option value="decimal">رقمي (1, 2, 3)</option>
                  <option value="arabic-letters">أبجدي (أ، ب، ج)</option>
                  <option value="none">بدون ترقيم</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 2. Subheading Block */}
        {block.type === 'subheading' && (
          <div className="space-y-2">
            <input
              type="text"
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              placeholder="نص العنوان الفرعي..."
              className="w-full p-2 text-sm font-semibold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>النمط:</span>
              <select
                value={block.style || 'underline'}
                onChange={(e) => onChange({ ...block, style: e.target.value as SubheadingStyle })}
                className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="underline">مسطر أسفله (Underline)</option>
                <option value="bold">غامق بدون تسطير (Bold)</option>
              </select>
            </div>
          </div>
        )}

        {/* 3. Paragraph Block */}
        {block.type === 'paragraph' && (
          <textarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="اكتب نص الفقرة هنا..."
            rows={3}
            className="w-full p-2.5 text-xs sm:text-sm leading-relaxed text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/80 focus:ring-2 focus:ring-teal-500 outline-none resize-y"
          />
        )}

        {/* 4. List Block */}
        {block.type === 'list' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>شكل العلامة:</span>
                <select
                  value={block.marker}
                  onChange={(e) => onChange({ ...block, marker: e.target.value as ListMarker })}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="disc">● نقطة دائرية</option>
                  <option value="arrow">➢ سهم</option>
                  <option value="check">✓ علامة صح</option>
                  <option value="dash">- شرطة</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    items: [...block.items, { id: createBlockId(), text: '' }],
                  })
                }
                className="px-2 py-0.5 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded font-bold hover:bg-teal-100"
              >
                ➕ إضافة بند
              </button>
            </div>

            <div className="space-y-1.5">
              {block.items.map((item: ListItem, itemIdx: number) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold shrink-0">
                    {block.marker === 'arrow' ? '➢' : block.marker === 'check' ? '✓' : block.marker === 'dash' ? '-' : '●'}
                  </span>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const updated = [...block.items];
                      updated[itemIdx] = { ...item, text: e.target.value };
                      onChange({ ...block, items: updated });
                    }}
                    placeholder={`بند ${itemIdx + 1}...`}
                    className="flex-1 p-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = block.items.filter((_, i) => i !== itemIdx);
                      onChange({ ...block, items: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 px-1 text-xs"
                    title="حذف البند"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Ordered List Block */}
        {block.type === 'ordered' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>نمط الترقيم:</span>
                <select
                  value={block.kind}
                  onChange={(e) => onChange({ ...block, kind: e.target.value as OrderedKind })}
                  className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="decimal">أرقام (1, 2, 3)</option>
                  <option value="arabic-letters">حروف أبجدية (أ، ب، ج)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    items: [...block.items, { id: createBlockId(), text: '' }],
                  })
                }
                className="px-2 py-0.5 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded font-bold hover:bg-teal-100"
              >
                ➕ إضافة خطوة
              </button>
            </div>

            <div className="space-y-1.5">
              {block.items.map((item: ListItem, itemIdx: number) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-teal-600 font-bold font-mono text-xs w-5 shrink-0">
                    {itemIdx + 1}.
                  </span>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const updated = [...block.items];
                      updated[itemIdx] = { ...item, text: e.target.value };
                      onChange({ ...block, items: updated });
                    }}
                    placeholder={`خطوة ${itemIdx + 1}...`}
                    className="flex-1 p-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-teal-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = block.items.filter((_, i) => i !== itemIdx);
                      onChange({ ...block, items: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 px-1 text-xs"
                    title="حذف الخطوة"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Callout Block */}
        {block.type === 'callout' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">نوع التنبيه:</span>
              <select
                value={block.calloutType}
                onChange={(e) => onChange({ ...block, calloutType: e.target.value as CalloutType })}
                className="p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="note">💡 ملاحظة (Note)</option>
                <option value="important">⭐ هام (Important)</option>
                <option value="warn">⚠️ تحذير (Warning)</option>
              </select>
            </div>
            <textarea
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              placeholder="نص التنبيه..."
              rows={2}
              className={`w-full p-2.5 text-xs rounded-lg border outline-none focus:ring-2 ${
                block.calloutType === 'warn'
                  ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 focus:ring-amber-500'
                  : block.calloutType === 'important'
                  ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 focus:ring-indigo-500'
                  : 'border-teal-400 bg-teal-50/60 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 focus:ring-teal-500'
              }`}
            />
          </div>
        )}

        {/* 7. Table Block */}
        {block.type === 'table' && (
          <div className="space-y-2.5 overflow-x-auto">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold">بيانات الجدول:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const newHeaders = [...block.headers, `عمود ${block.headers.length + 1}`];
                    const newRows = block.rows.map((r) => [...r, '']);
                    onChange({ ...block, headers: newHeaders, rows: newRows });
                  }}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded font-bold"
                >
                  ➕ عمود
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newRow = new Array(block.headers.length).fill('');
                    onChange({ ...block, rows: [...block.rows, newRow] });
                  }}
                  className="px-2 py-0.5 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 rounded font-bold"
                >
                  ➕ صف
                </button>
              </div>
            </div>

            <table className="w-full text-xs border border-slate-300 dark:border-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  {block.headers.map((h: string, hIdx: number) => (
                    <th key={hIdx} className="p-1 border border-slate-300 dark:border-slate-700">
                      <input
                        type="text"
                        value={h}
                        onChange={(e) => {
                          const updated = [...block.headers];
                          updated[hIdx] = e.target.value;
                          onChange({ ...block, headers: updated });
                        }}
                        className="w-full text-center font-bold bg-transparent outline-none"
                      />
                    </th>
                  ))}
                  <th className="w-6 p-1 border border-slate-300 dark:border-slate-700"></th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row: string[], rIdx: number) => (
                  <tr key={rIdx}>
                    {row.map((cell: string, cIdx: number) => (
                      <td key={cIdx} className="p-1 border border-slate-300 dark:border-slate-700">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => {
                            const updatedRows = [...block.rows];
                            updatedRows[rIdx][cIdx] = e.target.value;
                            onChange({ ...block, rows: updatedRows });
                          }}
                          className="w-full bg-transparent outline-none p-0.5"
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center border border-slate-300 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          const updatedRows = block.rows.filter((_, idx) => idx !== rIdx);
                          onChange({ ...block, rows: updatedRows });
                        }}
                        className="text-slate-400 hover:text-rose-500 font-bold"
                        title="حذف هذا الصف"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 8. Checklist Block */}
        {block.type === 'checklist' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold">عناصر التحقق:</span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...block,
                    items: [...block.items, { id: createBlockId(), text: '', checked: false }],
                  })
                }
                className="px-2 py-0.5 bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded font-bold hover:bg-teal-100"
              >
                ➕ إضافة بند تحقق
              </button>
            </div>

            <div className="space-y-1.5">
              {block.items.map((item: ChecklistItem, itemIdx: number) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => {
                      const updated = [...block.items];
                      updated[itemIdx] = { ...item, checked: e.target.checked };
                      onChange({ ...block, items: updated });
                    }}
                    className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const updated = [...block.items];
                      updated[itemIdx] = { ...item, text: e.target.value };
                      onChange({ ...block, items: updated });
                    }}
                    placeholder={`بند تحقق ${itemIdx + 1}...`}
                    className="flex-1 p-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = block.items.filter((_, i) => i !== itemIdx);
                      onChange({ ...block, items: updated });
                    }}
                    className="text-slate-400 hover:text-rose-500 px-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. Figure Block */}
        {block.type === 'figure' && (
          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">رابط الصورة (URL):</label>
              <input
                type="text"
                value={block.src}
                onChange={(e) => onChange({ ...block, src: e.target.value })}
                placeholder="https://..."
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1">تعليق توضيحي (Caption):</label>
              <input
                type="text"
                value={block.caption || ''}
                onChange={(e) => onChange({ ...block, caption: e.target.value })}
                placeholder="شكل توضيحي..."
                className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        {/* 10. Pagebreak Block */}
        {block.type === 'pagebreak' && (
          <div className="py-2 text-center text-xs text-slate-400 dark:text-slate-500 font-mono border-y border-dashed border-slate-300 dark:border-slate-700">
            --- فاصل صفحة للطباعة (A4 Page Break) ---
          </div>
        )}

        {/* 11. Raw HTML Block */}
        {block.type === 'raw' && (
          <div className="space-y-1">
            <span className="text-[10px] text-amber-600 font-mono">كتلة كود HTML خام</span>
            <textarea
              value={block.html}
              onChange={(e) => onChange({ ...block, html: e.target.value })}
              rows={3}
              dir="ltr"
              className="w-full p-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded bg-slate-900 text-emerald-400 outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
