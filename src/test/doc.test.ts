import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { wrapBidiInline, hasLatin } from '../doc/inline';
import { smartParseText } from '../doc/smartParse';
import { parseHtmlToBlocks } from '../doc/parse';
import { serializeBlocksToHtml } from '../doc/serialize';
import { DEFAULT_POLICIES } from '../data/defaultPolicies';
import { Block } from '../doc/model';

describe('inline.ts: Bidi & HTML Entities Handling', () => {
  it('correctly detects latin text and ignores HTML entities', () => {
    expect(hasLatin('سياسة الجودة الشاملة')).toBe(false);
    expect(hasLatin('مستشفى &amp; مركز طبي')).toBe(false);
    expect(hasLatin('&quot;تنبيه&quot; &nbsp; &#160;')).toBe(false);
    expect(hasLatin('Life Support')).toBe(true);
    expect(hasLatin('دعم الحياة (Life Support) واكتشاف المشاكل')).toBe(true);
  });

  it('skips HTML entities (&amp;, &quot;, &nbsp;, &lt;, &gt;, &#...;) without wrapping them in bdi', () => {
    const textWithEntities = 'مستشفى &amp; مركز &quot;المنصورة&quot; &lt;قسم&gt; &#160;';
    const wrapped = wrapBidiInline(textWithEntities);
    expect(wrapped).toBe(textWithEntities);
    expect(wrapped).not.toContain('<bdi');
  });

  it('wraps English medical phrases in bdi while preserving adjacent entities', () => {
    const text = 'تقديم دعم الحياة Life Support &amp; ICU في قسم الطوارئ';
    const wrapped = wrapBidiInline(text);
    expect(wrapped).toContain('<bdi lang="en" dir="ltr">Life Support</bdi>');
    expect(wrapped).toContain('<bdi lang="en" dir="ltr">ICU</bdi>');
    expect(wrapped).toContain('&amp;');
    expect(wrapped).not.toContain('<bdi lang="en" dir="ltr">&amp;</bdi>');
  });

  it('leaves pure Arabic text completely untouched', () => {
    const arabic = 'يلتزم جميع العاملين في المجال الطبي بتطبيق الاحتياطات القياسية.';
    expect(wrapBidiInline(arabic)).toBe(arabic);
  });
});

describe('smartParse.ts: Testing on sample-official-page.txt', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures/sample-official-page.txt');
  const fixtureText = fs.readFileSync(fixturePath, 'utf-8');

  it('parses structured blocks and cleans repeated headers and page numbers', () => {
    const result = smartParseText(fixtureText);

    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.detections.length).toBeGreaterThan(0);

    // 1. Repeated headers & page numbers (Ministry of Health repeated >=3 times, "10" as standalone page number)
    const repeatedDetection = result.detections.find((d) => d.type === 'repeatedHeaders');
    expect(repeatedDetection).toBeDefined();
    expect(repeatedDetection!.count).toBeGreaterThanOrEqual(3);

    // Check that "Ministry of Health" was filtered out of content blocks
    const paragraphTexts = result.blocks
      .filter((b) => b.type === 'paragraph')
      .map((b) => (b as any).text);
    expect(paragraphTexts).not.toContain('Ministry of Health');
    expect(paragraphTexts).not.toContain('10');

    // 2. Box section: □ مراقبة المريض:
    const boxSection = result.blocks.find(
      (b) => b.type === 'section' && b.style === 'box'
    );
    expect(boxSection).toBeDefined();
    expect((boxSection as any).title).toContain('مراقبة المريض');

    // 3. Roman Numeral Section: IV & V
    const romanSections = result.blocks.filter(
      (b) => b.type === 'section' && b.numbering === 'roman'
    );
    expect(romanSections.length).toBe(2);
    expect((romanSections[0] as any).title).toContain('Life Support');
    expect((romanSections[1] as any).title).toContain('خطة الرعاية');

    // 4. Subheading: ➢ معدات المراقبة المتوفرة لكل مريض:
    const subheading = result.blocks.find((b) => b.type === 'subheading');
    expect(subheading).toBeDefined();
    expect((subheading as any).text).toContain('معدات المراقبة المتوفرة');

    // 5. Nested list with disc (●) and check (✓)
    const listBlock = result.blocks.find(
      (b) =>
        b.type === 'list' &&
        (b as any).items.some((item: any) => item.text.includes('جهاز مونيتور'))
    );
    expect(listBlock).toBeDefined();
    const itemWithChildren = (listBlock as any).items.find(
      (item: any) => item.children && item.children.length > 0
    );
    expect(itemWithChildren).toBeDefined();
    expect(itemWithChildren.text).toContain('جهاز مونيتور');
    expect(itemWithChildren.children.length).toBe(2);
    expect(itemWithChildren.children[0].text).toContain('يُعاير دورياً');
    expect(itemWithChildren.children[1].text).toContain('يُوثَّق في السجل');

    // 6. Ordered list: 1. يقوم الطبيب... 2. تقوم الممرضة...
    const orderedBlock = result.blocks.find((b) => b.type === 'ordered');
    expect(orderedBlock).toBeDefined();
    expect((orderedBlock as any).items.length).toBe(2);
    expect((orderedBlock as any).items[0].text).toContain('يقوم الطبيب بالتسجيل');

    // 7. Table: 3x3 table with headers [الصنف, الجرعة, المدة]
    const tableBlock = result.blocks.find((b) => b.type === 'table');
    expect(tableBlock).toBeDefined();
    expect((tableBlock as any).headers).toEqual(['الصنف', 'الجرعة', 'المدة']);
    expect((tableBlock as any).rows.length).toBe(2);
    expect((tableBlock as any).rows[0]).toEqual(['أ', '10', '5 أيام']);
    expect((tableBlock as any).rows[1]).toEqual(['ب', '20', '3 أيام']);

    // 8. Callout: ملاحظة: يجب التوثيق الفوري.
    const calloutBlock = result.blocks.find((b) => b.type === 'callout');
    expect(calloutBlock).toBeDefined();
    expect((calloutBlock as any).calloutType).toBe('note');
    expect((calloutBlock as any).text).toContain('يجب التوثيق الفوري');
  });
});

describe('Round-trip parse/serialize tests', () => {
  it('round-trips custom structured blocks without loss', () => {
    const inputBlocks: Block[] = [
      {
        id: 'sec-1',
        type: 'section',
        title: 'السياسات العامة',
        style: 'bar',
        numbering: 'roman',
      },
      {
        id: 'sub-1',
        type: 'subheading',
        text: 'أهداف السياسة:',
        style: 'underline',
      },
      {
        id: 'p-1',
        type: 'paragraph',
        text: 'تهدف هذه السياسة إلى ضمان السلامة وجودة الرعاية.',
      },
      {
        id: 'list-1',
        type: 'list',
        marker: 'disc',
        items: [
          {
            id: 'li-1',
            text: 'الفحص الدوري',
            children: [{ id: 'li-1-1', text: 'فحص يومي صباحي' }],
          },
          { id: 'li-2', text: 'التوثيق المكتمل' },
        ],
      },
      {
        id: 'ord-1',
        type: 'ordered',
        kind: 'decimal',
        items: [
          { id: 'oli-1', text: 'الخطوة الأولى' },
          { id: 'oli-2', text: 'الخطوة الثانية' },
        ],
      },
      {
        id: 'call-1',
        type: 'callout',
        calloutType: 'warn',
        text: 'يمنع استخدام أي أداة غير معقمة تحت أي ظرف.',
      },
      {
        id: 'tbl-1',
        type: 'table',
        headers: ['البند', 'المسؤول'],
        rows: [['التعقيم', 'فريق مكافحة العدوى']],
      },
    ];

    const serializedHtml = serializeBlocksToHtml(inputBlocks);
    expect(serializedHtml).toContain('mih-sec');
    expect(serializedHtml).toContain('mih-table');
    expect(serializedHtml).toContain('mih-callout');

    const parsedBlocks = parseHtmlToBlocks(serializedHtml);
    expect(parsedBlocks.length).toBe(inputBlocks.length);

    // Verify block types match in sequence
    expect(parsedBlocks.map((b) => b.type)).toEqual(inputBlocks.map((b) => b.type));

    // Verify table content retained
    const parsedTable = parsedBlocks.find((b) => b.type === 'table') as any;
    expect(parsedTable.headers).toEqual(['البند', 'المسؤول']);
    expect(parsedTable.rows[0]).toEqual(['التعقيم', 'فريق مكافحة العدوى']);
  });

  it('successfully parses and preserves content from default policies', () => {
    // Test sample policies from DEFAULT_POLICIES
    const samplePolicies = DEFAULT_POLICIES.slice(0, 5);

    for (const policy of samplePolicies) {
      if (!policy.content_html) continue;

      const blocks = parseHtmlToBlocks(policy.content_html);
      expect(blocks.length).toBeGreaterThan(0);

      const serialized = serializeBlocksToHtml(blocks);
      expect(serialized.length).toBeGreaterThan(0);

      // Re-parse serialized output
      const reparsedBlocks = parseHtmlToBlocks(serialized);
      expect(reparsedBlocks.length).toBeGreaterThan(0);

      // Ensure key sections/lists were retained
      const originalTypes = blocks.map((b) => b.type);
      const reparsedTypes = reparsedBlocks.map((b) => b.type);
      expect(reparsedTypes.length).toBe(originalTypes.length);
    }
  });
});
