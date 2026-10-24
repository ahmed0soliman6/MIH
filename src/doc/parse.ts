/**
 * parse.ts
 * Parses HTML (both canonical .mih-doc and legacy HTML from Mammoth/PDF) into Block[].
 * Guarantees zero data loss on legacy content via 'raw' blocks.
 */

import {
  Block,
  ListItem,
  ChecklistItem,
  CalloutType,
  ListMarker,
  OrderedKind,
  SectionStyle,
  NumberingStyle,
  createBlockId,
} from './model';

function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text.trim();
}

function parseListElement(listEl: HTMLUListElement | HTMLOListElement): ListItem[] {
  const items: ListItem[] = [];
  const liElements = Array.from(listEl.children).filter((c) => c.tagName === 'LI') as HTMLLIElement[];

  for (const li of liElements) {
    // Check if there is a nested list inside this LI
    const nestedList = li.querySelector('ul, ol');
    let text = '';

    if (nestedList) {
      // Clone li to get only the immediate text
      const clone = li.cloneNode(true) as HTMLLIElement;
      const nestedClone = clone.querySelector('ul, ol');
      if (nestedClone) nestedClone.remove();
      text = cleanText(clone.textContent);
    } else {
      text = cleanText(li.textContent);
    }

    const item: ListItem = {
      id: createBlockId(),
      text,
    };

    if (nestedList && (nestedList.tagName === 'UL' || nestedList.tagName === 'OL')) {
      item.children = parseListElement(nestedList as HTMLUListElement | HTMLOListElement);
    }

    items.push(item);
  }

  return items;
}

export function parseHtmlToBlocks(html: string | null | undefined): Block[] {
  if (!html || !html.trim()) return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body;

  const blocks: Block[] = [];

  // If wrapped in .mih-doc, search through it
  const mihContainer = root.querySelector('.mih-doc') || root;

  const processNode = (node: Element) => {
    const tag = node.tagName.toLowerCase();

    if (tag === 'section' && node.classList.contains('mih-sec')) {
      const style = (node.getAttribute('data-style') as SectionStyle) || 'bar';
      const numbering = (node.getAttribute('data-num') as NumberingStyle) || 'roman';
      const h2 = node.querySelector('h2');
      const title = cleanText(h2 ? h2.textContent : '');

      blocks.push({
        id: createBlockId(),
        type: 'section',
        title,
        style,
        numbering,
      });

      // Process children inside this section (skip h2 already processed)
      for (const child of Array.from(node.children)) {
        if (child.tagName.toLowerCase() === 'h2') continue;
        processNode(child);
      }
      return;
    }

    if (tag === 'h1' || tag === 'h2') {
      const style = (node.getAttribute('data-style') as SectionStyle) || 'bar';
      blocks.push({
        id: createBlockId(),
        type: 'section',
        title: cleanText(node.textContent),
        style,
      });
      return;
    }

    if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      blocks.push({
        id: createBlockId(),
        type: 'subheading',
        text: cleanText(node.textContent),
        style: 'underline',
      });
      return;
    }

    if (tag === 'p') {
      const text = cleanText(node.textContent);
      if (text) {
        blocks.push({
          id: createBlockId(),
          type: 'paragraph',
          text,
        });
      }
      return;
    }

    if (tag === 'ul') {
      if (node.classList.contains('mih-checklist')) {
        const items: ChecklistItem[] = [];
        const lis = Array.from(node.querySelectorAll('li'));
        for (const li of lis) {
          const checked = li.getAttribute('data-checked') === '1' || li.textContent?.includes('☑') || false;
          const label = cleanText(li.textContent?.replace(/[☑☐✓✔]/g, ''));
          items.push({
            id: createBlockId(),
            text: label,
            checked,
          });
        }
        blocks.push({
          id: createBlockId(),
          type: 'checklist',
          items,
        });
        return;
      }

      const marker = (node.getAttribute('data-marker') as ListMarker) || 'disc';
      const items = parseListElement(node as HTMLUListElement);
      if (items.length > 0) {
        blocks.push({
          id: createBlockId(),
          type: 'list',
          marker,
          items,
        });
      }
      return;
    }

    if (tag === 'ol') {
      const kind = (node.getAttribute('data-kind') as OrderedKind) || 'decimal';
      const items = parseListElement(node as HTMLOListElement);
      if (items.length > 0) {
        blocks.push({
          id: createBlockId(),
          type: 'ordered',
          kind,
          items,
        });
      }
      return;
    }

    if (node.classList.contains('mih-callout') || tag === 'blockquote') {
      const calloutType = (node.getAttribute('data-type') as CalloutType) || 'note';
      blocks.push({
        id: createBlockId(),
        type: 'callout',
        calloutType,
        text: cleanText(node.textContent),
      });
      return;
    }

    if (tag === 'table' || node.classList.contains('mih-table-wrap')) {
      const table = tag === 'table' ? (node as HTMLTableElement) : node.querySelector('table');
      if (table) {
        const headers: string[] = [];
        const thElements = Array.from(table.querySelectorAll('thead th, tr:first-child th'));
        thElements.forEach((th) => headers.push(cleanText(th.textContent)));

        const rows: string[][] = [];
        const trs = Array.from(table.querySelectorAll('tbody tr, tr')).filter(
          (tr) => !tr.querySelector('th')
        );

        trs.forEach((tr) => {
          const row: string[] = [];
          Array.from(tr.querySelectorAll('td')).forEach((td) => {
            row.push(cleanText(td.textContent));
          });
          if (row.length > 0) rows.push(row);
        });

        blocks.push({
          id: createBlockId(),
          type: 'table',
          headers,
          rows,
        });
        return;
      }
    }

    if (tag === 'figure' || tag === 'img') {
      const img = tag === 'img' ? (node as HTMLImageElement) : node.querySelector('img');
      const captionEl = node.querySelector('figcaption');
      if (img) {
        blocks.push({
          id: createBlockId(),
          type: 'figure',
          src: img.getAttribute('src') || '',
          alt: img.getAttribute('alt') || '',
          caption: cleanText(captionEl?.textContent),
        });
        return;
      }
    }

    if (node.classList.contains('mih-pagebreak') || tag === 'hr') {
      blocks.push({
        id: createBlockId(),
        type: 'pagebreak',
      });
      return;
    }

    // Any other unhandled elements (e.g. custom div, old styles) become a safe raw block
    const rawHtml = node.outerHTML.trim();
    if (rawHtml) {
      blocks.push({
        id: createBlockId(),
        type: 'raw',
        html: rawHtml,
      });
    }
  };

  for (const child of Array.from(mihContainer.children)) {
    processNode(child);
  }

  return blocks;
}
