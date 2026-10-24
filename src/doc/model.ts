/**
 * model.ts
 * Data model for Official Hospital Document Blocks (MIH Standard).
 */

export type NumberingStyle = 'roman' | 'decimal' | 'arabic-indic' | 'arabic-letters' | 'none';
export type SectionStyle = 'bar' | 'underline' | 'box';
export type SubheadingStyle = 'bold' | 'underline';
export type ListMarker = 'disc' | 'arrow' | 'check' | 'dash';
export type OrderedKind = 'decimal' | 'arabic-letters';
export type CalloutType = 'note' | 'warn' | 'important';

export interface ListItem {
  id: string;
  text: string;
  children?: ListItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export type Block =
  | { id: string; type: 'section'; title: string; style?: SectionStyle; numbering?: NumberingStyle }
  | { id: string; type: 'subheading'; text: string; style?: SubheadingStyle }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'list'; marker: ListMarker; items: ListItem[] }
  | { id: string; type: 'ordered'; kind: OrderedKind; items: ListItem[] }
  | { id: string; type: 'callout'; calloutType: CalloutType; text: string }
  | { id: string; type: 'table'; headers: string[]; rows: string[][] }
  | { id: string; type: 'checklist'; items: ChecklistItem[] }
  | { id: string; type: 'figure'; src: string; caption?: string; alt?: string }
  | { id: string; type: 'pagebreak' }
  | { id: string; type: 'raw'; html: string };

export interface ApprovalEntry {
  name?: string;
  title?: string;
  signature?: string;
  date?: string;
}

export interface DocumentApproval {
  preparedBy?: ApprovalEntry;
  reviewedBy?: ApprovalEntry;
  approvedBy?: ApprovalEntry;
}

export function createBlockId(): string {
  return 'b_' + Math.random().toString(36).substring(2, 9);
}
