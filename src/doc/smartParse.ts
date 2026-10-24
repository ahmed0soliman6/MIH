/**
 * smartParse.ts
 * Smart text parser for pasting raw policies from Word, PDF, or ChatGPT.
 * Converts unstructured plain text into structured Block[] and returns detections.
 */

import {
  Block,
  ListItem,
  ChecklistItem,
  ListMarker,
  OrderedKind,
  CalloutType,
  createBlockId,
} from './model';

export interface SmartDetection {
  type: string;
  label: string;
  count: number;
}

export interface SmartParseResult {
  blocks: Block[];
  detections: SmartDetection[];
}

export interface ExtractedPolicyMetadata {
  title?: string;
  code?: string;
  category?: string;
  version?: string;
  date?: string;
  effectiveDate?: string;
  reviewDate?: string;
  dept?: string;
  preparedBy?: { name: string; title: string };
  reviewedBy?: { name: string; title: string };
  approvedBy?: { name: string; title: string };
}

/**
 * Extracts hospital policy metadata (title, code, category, dates, dept, approval)
 * and strips table headers, repeated hospital headers, and signatures from the body text.
 */
export function extractPolicyMetadata(text: string): { metadata: ExtractedPolicyMetadata; cleanText: string } {
  if (!text || !text.trim()) {
    return { metadata: {}, cleanText: '' };
  }

  const metadata: ExtractedPolicyMetadata = {};
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Title
    if (!metadata.title) {
      const titleMatch = trimmed.match(/(?:اسم السياسة|عنوان السياسة)[\s:：]+(.*?)(?=\s*(?:تاريخ|رقم|كود|الاقسام|الأقسام|\n|$))/i);
      if (titleMatch && titleMatch[1].trim()) {
        metadata.title = titleMatch[1].trim().replace(/^[-–—:\s]+/, '');
      }
    }

    // 2. Code
    if (!metadata.code) {
      const codeMatch = trimmed.match(/(?:رقم السياسة|كود السياسة)[\s:：]+([A-Za-z0-9/._-]+|(?:\d+[A-Z]+\/[A-Z]+\/[A-Z]+))/i);
      if (codeMatch && codeMatch[1].trim()) {
        let extractedCode = codeMatch[1].trim();
        const reversedMatch = extractedCode.match(/^(\d+)([A-Z]+)\/([A-Z]+)\/([A-Z]+)$/);
        if (reversedMatch) {
          extractedCode = `${reversedMatch[4]}/${reversedMatch[3]}/${reversedMatch[2]}.${reversedMatch[1]}`;
        }
        metadata.code = extractedCode;

        // Auto-infer category from code
        const upper = extractedCode.toUpperCase();
        if (upper.includes('CSS')) metadata.category = 'CSS';
        else if (upper.includes('ICD')) metadata.category = 'ICD';
        else if (upper.includes('PCC')) metadata.category = 'PCC';
        else if (upper.includes('IMT')) metadata.category = 'IMT';
        else if (upper.includes('QPI')) metadata.category = 'QPI';
        else if (upper.includes('ACT')) metadata.category = 'ACT';
        else if (upper.includes('SAS')) metadata.category = 'SAS';
        else if (upper.includes('MMS')) metadata.category = 'MMS';
        else if (upper.includes('WFM')) metadata.category = 'WFM';
        else if (upper.includes('IPC')) metadata.category = 'IPC';
        else if (upper.includes('FMS')) metadata.category = 'FMS';
        else if (upper.includes('NSR')) metadata.category = 'NSR';
      }
    }

    // 3. Version (ensure it does not match "تاريخ الإصدار")
    if (!metadata.version) {
      const versionMatch = trimmed.match(/(?:رقم\s*الإصدار|رقم\s*الاصدار|الإصدار\s*رقم)\s*[:：]?\s*(\d+(?:\.\d+)?)/i);
      if (versionMatch && versionMatch[1]) {
        metadata.version = versionMatch[1].trim();
      }
    }

    // 4. Issue Date (تاريخ الإصدار)
    if (!metadata.date) {
      const dateMatch = trimmed.match(/تاريخ الإصدار[\s:：]+([\d/.-]+)/i);
      if (dateMatch && dateMatch[1]) {
        metadata.date = dateMatch[1].trim();
      }
    }

    // 5. Effective Date (تاريخ التفعيل / تاريخ السريان)
    if (!metadata.effectiveDate) {
      const effMatch = trimmed.match(/(?:تاريخ التفعيل|تاريخ السريان)[\s:：]+([\d/.-]+)/i);
      if (effMatch && effMatch[1]) {
        metadata.effectiveDate = effMatch[1].trim();
      }
    }

    // 6. Review Date (تاريخ المراجعة)
    if (!metadata.reviewDate) {
      const revMatch = trimmed.match(/تاريخ المراجعة[\s:：]+([\d/.-]+)/i);
      if (revMatch && revMatch[1]) {
        metadata.reviewDate = revMatch[1].trim();
      }
    }

    // 7. Department (الأقسام المعنية)
    if (!metadata.dept) {
      const deptMatch = trimmed.match(/(?:االقسام المعنية|الأقسام المعنية|الاقسام المعنية|القسم المعني)[\s:：]+(.*?)(?=\s*(?:تاريخ|رقم|اعتماد|اعداد|إعداد|\n|$))/i);
      if (deptMatch && deptMatch[1].trim()) {
        metadata.dept = deptMatch[1].trim();
      }
    }
  }

  // Filter out header lines, repeated hospital headers, and approval metadata from body
  const isHeaderOrMetaLine = (trimmed: string) => {
    if (!trimmed) return false;
    // Hospital branding header lines
    if (/^(?:وزارة الصحة|أمانة المراكز الطبية المتخصصة|مستشفى المنصورة الدولي|إدارة الجودة)$/i.test(trimmed)) return true;
    if (/^(?:Ministry of Health|Specialized Medical Centers|Mansoura International Hospital|Quality Department)$/i.test(trimmed)) return true;
    if (/^\d{1,3}$/.test(trimmed)) return true; // Standalone page numbers

    // Document metadata table lines (both single and compound column rows)
    if (/(?:اسم السياسة|عنوان السياسة|رقم السياسة|كود السياسة|تاريخ الإصدار|رقم الإصدار|عدد الصفحات|تاريخ التفعيل|تاريخ السريان|تاريخ المراجعة|االقسام المعنية|الأقسام المعنية|الاقسام المعنية)/i.test(trimmed)) return true;

    // Approval / Signatures blocks
    if (/^(?:اعتماد|مراجعة|اعداد|إعداد|التوقيع|\s)+$/i.test(trimmed)) return true;
    if (/(?:االسم|الاسم|الوظيفة|التوقيع)\s*[:：]/i.test(trimmed)) return true;
    return false;
  };

  const cleanLines = lines.filter((l) => !isHeaderOrMetaLine(l.trim()));
  const cleanText = cleanLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return { metadata, cleanText };
}

export function smartParseText(rawText: string): SmartParseResult {
  if (!rawText || !rawText.trim()) {
    return { blocks: [], detections: [] };
  }

  // 1. Normalize line breaks and tabs
  const rawLines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Count line frequencies for repeated header detection (Rule 2)
  const lineFrequencies = new Map<string, number>();
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed && !/^[0-9]+$/.test(trimmed)) {
      lineFrequencies.set(trimmed, (lineFrequencies.get(trimmed) || 0) + 1);
    }
  }

  const blocks: Block[] = [];
  const counts: Record<string, number> = {
    sections: 0,
    subheadings: 0,
    lists: 0,
    ordered: 0,
    callouts: 0,
    tables: 0,
    checklists: 0,
    pagebreaks: 0,
    repeatedHeaders: 0,
  };

  let currentList: { marker: ListMarker; items: ListItem[] } | null = null;
  let currentOrdered: { kind: OrderedKind; items: ListItem[] } | null = null;
  let currentChecklist: { items: ChecklistItem[] } | null = null;
  let currentTableRows: string[][] = [];

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blocks.push({
        id: createBlockId(),
        type: 'list',
        marker: currentList.marker,
        items: currentList.items,
      });
      counts.lists++;
      currentList = null;
    }
  };

  const flushOrdered = () => {
    if (currentOrdered && currentOrdered.items.length > 0) {
      blocks.push({
        id: createBlockId(),
        type: 'ordered',
        kind: currentOrdered.kind,
        items: currentOrdered.items,
      });
      counts.ordered++;
      currentOrdered = null;
    }
  };

  const flushChecklist = () => {
    if (currentChecklist && currentChecklist.items.length > 0) {
      blocks.push({
        id: createBlockId(),
        type: 'checklist',
        items: currentChecklist.items,
      });
      counts.checklists++;
      currentChecklist = null;
    }
  };

  const flushTable = () => {
    if (currentTableRows.length > 0) {
      const headers = currentTableRows[0];
      const rows = currentTableRows.slice(1);
      blocks.push({
        id: createBlockId(),
        type: 'table',
        headers,
        rows,
      });
      counts.tables++;
      currentTableRows = [];
    }
  };

  const flushAll = () => {
    flushList();
    flushOrdered();
    flushChecklist();
    flushTable();
  };

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // Repeated hospital headers and page numbers
    if (
      /^(?:وزارة الصحة|أمانة المراكز الطبية المتخصصة|مستشفى المنصورة الدولي|إدارة الجودة)$/i.test(trimmed) ||
      /^(?:Ministry of Health|Specialized Medical Centers|Mansoura International Hospital|Quality Department)$/i.test(trimmed) ||
      /^\d{1,3}$/.test(trimmed) ||
      (lineFrequencies.get(trimmed) && lineFrequencies.get(trimmed)! >= 3)
    ) {
      flushAll();
      counts.repeatedHeaders++;
      continue;
    }

    // 1. Page Break (---, ===, [فاصل صفحة])
    if (/^([-=_]{3,}|\[فاصل صفحة\])$/i.test(trimmed)) {
      flushAll();
      blocks.push({ id: createBlockId(), type: 'pagebreak' });
      counts.pagebreaks++;
      continue;
    }

    // 2. Table row (pipes | col 1 | col 2 | or col 1 | col 2)
    const isPipeTableLine =
      trimmed.includes('|') &&
      trimmed.split('|').filter((c) => c.trim().length > 0).length >= 2;

    if (isPipeTableLine) {
      if (/^\|?[\s\-:|]+\|?$/.test(trimmed)) {
        continue;
      }
      flushList();
      flushOrdered();
      flushChecklist();
      const cells = trimmed
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());
      currentTableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Rule: Standard Hospital Quality Accreditation Sections (GAHAR)
    const standardSectionMatch = trimmed.match(
      /^(?:[➢>●•\-–—]\s*)?(السياسة(?:\s+والهدف|\s+والغرض)?|الغرض|الهدف|الأهداف|المجال|نطاق التطبيق|التعريفات|االجراءات|الإجراءات|إجراءات العمل|خطوات العمل|المسئول عن التنفيذ|المسؤول عن التنفيذ|المسئولون عن التنفيذ|النماذج|النماذج المستخدمة|المراجع|المرفقات)[\s:：]*$/i
    );
    if (standardSectionMatch) {
      flushAll();
      let title = standardSectionMatch[1].trim();
      if (title === 'االجراءات') title = 'الإجراءات';
      blocks.push({
        id: createBlockId(),
        type: 'section',
        title,
        style: 'bar',
      });
      counts.sections++;
      continue;
    }

    // Rule 4: Box Prefix Section (□ or ☐)
    const boxSectionMatch = trimmed.match(/^[□☐]\s*(.*)$/);
    if (boxSectionMatch) {
      flushAll();
      blocks.push({
        id: createBlockId(),
        type: 'section',
        title: boxSectionMatch[1].replace(/[:：]$/, '').trim(),
        style: 'box',
      });
      counts.sections++;
      continue;
    }

    // Rule 3: Roman Numeral Section: I. II. III. IV. V. VI. VII. VIII. IX. X. ...
    const romanMatch = trimmed.match(/^([IVXLCDM]+)\.\s*(.*)$/i);
    if (romanMatch) {
      flushAll();
      const title = romanMatch[2].trim() || romanMatch[1];
      blocks.push({
        id: createBlockId(),
        type: 'section',
        title,
        style: 'bar',
        numbering: 'roman',
      });
      counts.sections++;
      continue;
    }

    // Section headers with # or "القسم:" or "المعيار:"
    const headerMatch = trimmed.match(/^(#{1,2}\s*|(?:القسم|البند|المعيار)\s*\d*[:\s]+)(.*)$/);
    if (headerMatch) {
      flushAll();
      blocks.push({
        id: createBlockId(),
        type: 'section',
        title: headerMatch[2].trim(),
        style: 'bar',
      });
      counts.sections++;
      continue;
    }

    // Rule 5: Subheading with ➢ or ending with colon
    if (trimmed.startsWith('➢') && (trimmed.endsWith(':') || trimmed.endsWith('：'))) {
      flushAll();
      const subText = trimmed.replace(/^➢\s*/, '').replace(/[:：]$/, '').trim();
      blocks.push({
        id: createBlockId(),
        type: 'subheading',
        text: '➢ ' + subText + ':',
        style: 'underline',
      });
      counts.subheadings++;
      continue;
    }

    // Rule 10: Callouts (تنبيه / تحذير / هام / ملاحظة / Note / Warning / Important)
    const calloutMatch = trimmed.match(
      /^(تنبيه|تحذير|خطر|هام|ملاحظة|ملحوظة|Note|Warning|Important)\s*[:：]\s*(.*)$/i
    );
    if (calloutMatch) {
      flushAll();
      const keyword = calloutMatch[1];
      const text = calloutMatch[2].trim();
      let type: CalloutType = 'note';
      if (/تحذير|خطر|Warning/i.test(keyword)) type = 'warn';
      else if (/هام|Important/i.test(keyword)) type = 'important';

      blocks.push({
        id: createBlockId(),
        type: 'callout',
        calloutType: type,
        text,
      });
      counts.callouts++;
      continue;
    }

    // Rule 7 & Checklist: (☐, ☑, [ ], [x], [X]) inside lists
    const checklistMatch = trimmed.match(/^(☑|\[[\sxX]\])\s*(.*)$/);
    if (checklistMatch) {
      flushList();
      flushOrdered();
      const box = checklistMatch[1];
      const text = checklistMatch[2].trim();
      const checked = box === '☑' || /\[[xX]\]/.test(box);
      if (!currentChecklist) currentChecklist = { items: [] };
      currentChecklist.items.push({ id: createBlockId(), text, checked });
      continue;
    } else {
      flushChecklist();
    }

    // Rule 8: Ordered Lists (1. 2. 3. or أ- ب- ج- or -1 or -2)
    const decimalMatch = trimmed.match(/^(?:[-–—]\s*)?(\d+)[\.\-\)]\s*(.*)$/);
    const arabicLettersMatch = trimmed.match(/^([أ-ي])[\.\-\)]\s*(.*)$/);
    if (decimalMatch || arabicLettersMatch) {
      const text = decimalMatch ? decimalMatch[2].trim() : arabicLettersMatch![2].trim();
      const kind: OrderedKind = decimalMatch ? 'decimal' : 'arabic-letters';

      if (!currentOrdered || currentOrdered.kind !== kind) {
        flushOrdered();
        currentOrdered = { kind, items: [] };
      }
      currentOrdered.items.push({ id: createBlockId(), text });
      counts.ordered++;
      continue;
    } else {
      flushOrdered();
    }

    // Rule 7: Bullet Lists (➢, ✓, -, –, •, ●, *)
    const bulletMatch = trimmed.match(/^([➢>✓✔\-–—•●\*])\s*(.*)$/);
    if (bulletMatch) {
      const sym = bulletMatch[1];
      const text = bulletMatch[2].trim();
      let marker: ListMarker = 'disc';
      if (sym === '➢' || sym === '>') marker = 'arrow';
      else if (sym === '✓' || sym === '✔') marker = 'check';
      else if (/^[-–—]$/.test(sym)) marker = 'dash';

      const indentLevel = Math.floor((rawLine.match(/^\s*/)?.[0].length || 0) / 2);
      const isSubBullet =
        (sym === '✓' || sym === '✔' || indentLevel > 0) &&
        currentList &&
        currentList.marker === 'disc' &&
        currentList.items.length > 0;

      if (isSubBullet && currentList) {
        const parent = currentList.items[currentList.items.length - 1];
        if (!parent.children) parent.children = [];
        parent.children.push({ id: createBlockId(), text });
        continue;
      }

      if (!currentList || currentList.marker !== marker) {
        flushList();
        currentList = { marker, items: [] };
      }

      currentList.items.push({ id: createBlockId(), text });
      counts.lists++;
      continue;
    } else {
      flushList();
    }

    // Rule 5: Subheading (ends with colon ':' or wrapped in **bold:** or ###)
    if (
      (trimmed.endsWith(':') || trimmed.endsWith('：') || trimmed.startsWith('###')) &&
      trimmed.length < 100
    ) {
      flushAll();
      const subText = trimmed
        .replace(/^###\s*/, '')
        .replace(/[:：]$/, '')
        .replace(/\*\*/g, '')
        .trim();
      blocks.push({
        id: createBlockId(),
        type: 'subheading',
        text: subText + ':',
        style: 'underline',
      });
      counts.subheadings++;
      continue;
    }

    // Rule 13: Default Paragraph
    flushAll();
    blocks.push({
      id: createBlockId(),
      type: 'paragraph',
      text: trimmed,
    });
  }

  flushAll();

  const detections: SmartDetection[] = [
    { type: 'sections', label: 'أقسام رئيسية', count: counts.sections },
    { type: 'subheadings', label: 'عناوين فرعية', count: counts.subheadings },
    { type: 'lists', label: 'قوائم نقطية', count: counts.lists },
    { type: 'ordered', label: 'قوائم مرقمة', count: counts.ordered },
    { type: 'callouts', label: 'مربعات تنبيه', count: counts.callouts },
    { type: 'tables', label: 'جداول', count: counts.tables },
    { type: 'checklists', label: 'قوائم تحقق', count: counts.checklists },
    { type: 'pagebreaks', label: 'فواصل صفحات', count: counts.pagebreaks },
    { type: 'repeatedHeaders', label: 'ترويسات وأرقام صفحات مكررة', count: counts.repeatedHeaders },
  ].filter((d) => d.count > 0);

  return { blocks, detections };
}
