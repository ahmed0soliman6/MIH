/**
 * serialize.ts
 * Converts Block[] into canonical, standardized HTML structure for storage and rendering.
 */

import { Block, ListItem } from './model';
import { wrapBidiInline } from './inline';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderListItems(items: ListItem[], marker?: string): string {
  return items
    .map((item) => {
      let content = wrapBidiInline(item.text);
      if (item.children && item.children.length > 0) {
        content += `<ul class="mih-ul"${marker ? ` data-marker="${marker}"` : ''}>${renderListItems(item.children, marker)}</ul>`;
      }
      return `<li>${content}</li>`;
    })
    .join('');
}

export function serializeBlocksToHtml(
  blocks: Block[],
  options: { numbering?: string } = {}
): string {
  const numbering = options.numbering || 'roman';
  const htmlParts: string[] = [];

  let inSection = false;

  for (const block of blocks) {
    if (block.type === 'section') {
      if (inSection) {
        htmlParts.push('</section>');
      }
      const style = block.style || 'bar';
      const num = block.numbering || numbering;
      htmlParts.push(
        `<section class="mih-sec" data-block="section" data-style="${escapeHtml(style)}" data-num="${escapeHtml(num)}">`
      );
      htmlParts.push(`<h2 class="mih-h2">${wrapBidiInline(block.title)}</h2>`);
      inSection = true;
      continue;
    }

    switch (block.type) {
      case 'subheading': {
        const style = block.style || 'underline';
        htmlParts.push(`<h3 class="mih-sub" data-style="${escapeHtml(style)}">${wrapBidiInline(block.text)}</h3>`);
        break;
      }

      case 'paragraph': {
        htmlParts.push(`<p class="mih-p" dir="auto">${wrapBidiInline(block.text)}</p>`);
        break;
      }

      case 'list': {
        const marker = block.marker || 'disc';
        htmlParts.push(`<ul class="mih-ul" data-marker="${escapeHtml(marker)}">`);
        htmlParts.push(renderListItems(block.items, marker));
        htmlParts.push('</ul>');
        break;
      }

      case 'ordered': {
        const kind = block.kind || 'decimal';
        htmlParts.push(`<ol class="mih-ol" data-kind="${escapeHtml(kind)}">`);
        htmlParts.push(renderListItems(block.items));
        htmlParts.push('</ol>');
        break;
      }

      case 'callout': {
        const type = block.calloutType || 'note';
        htmlParts.push(`<div class="mih-callout" data-type="${escapeHtml(type)}"><p>${wrapBidiInline(block.text)}</p></div>`);
        break;
      }

      case 'table': {
        htmlParts.push('<div class="mih-table-wrap"><table class="mih-table">');
        if (block.headers && block.headers.length > 0) {
          htmlParts.push('<thead><tr>');
          for (const h of block.headers) {
            htmlParts.push(`<th>${wrapBidiInline(h)}</th>`);
          }
          htmlParts.push('</tr></thead>');
        }
        if (block.rows && block.rows.length > 0) {
          htmlParts.push('<tbody>');
          for (const row of block.rows) {
            htmlParts.push('<tr>');
            for (const cell of row) {
              htmlParts.push(`<td>${wrapBidiInline(cell)}</td>`);
            }
            htmlParts.push('</tr>');
          }
          htmlParts.push('</tbody>');
        }
        htmlParts.push('</table></div>');
        break;
      }

      case 'checklist': {
        htmlParts.push('<ul class="mih-checklist">');
        for (const item of block.items) {
          const checked = item.checked ? '1' : '0';
          htmlParts.push(`<li data-checked="${checked}"><span class="mih-checklist-box">${item.checked ? '✓' : ''}</span><span>${wrapBidiInline(item.text)}</span></li>`);
        }
        htmlParts.push('</ul>');
        break;
      }

      case 'figure': {
        htmlParts.push('<figure class="mih-fig">');
        htmlParts.push(`<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || '')}" loading="lazy" />`);
        if (block.caption) {
          htmlParts.push(`<figcaption>${wrapBidiInline(block.caption)}</figcaption>`);
        }
        htmlParts.push('</figure>');
        break;
      }

      case 'pagebreak': {
        htmlParts.push('<div class="mih-pagebreak"></div>');
        break;
      }

      case 'raw': {
        htmlParts.push(block.html);
        break;
      }
    }
  }

  if (inSection) {
    htmlParts.push('</section>');
  }

  return `<div class="mih-doc" data-v="1" data-num="${escapeHtml(numbering)}">\n${htmlParts.join('\n')}\n</div>`;
}
