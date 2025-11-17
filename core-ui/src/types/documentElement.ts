// src/types/documentElement.ts (updated)

interface TextStyle {
  start: number;
  end: number;
  type: string[];
}

interface TextFormatting {
  left_indent?: number;
  right_indent?: number;
  first_line_indent?: number;
  alignment?: 'left' | 'right' | 'center' | 'justify';
  text_styles?: {
    is_bold: boolean;
    is_italic: boolean;
    is_underlined: boolean;
    formatting: TextStyle[];
  };
}

interface DocumentElement {
  document_id: number;
  hierarchy: {
    document: number;
    element_order: number;
  };
  content: {
    text: string;
    formatting: TextFormatting;
  };
  links?: object[] | null;
  id: number;
  created: string;
  modified: string;
}

interface DocumentMetadata {
  title: string;
  description: string;
  document_collection_id: number;
  id: number;
  created: string;
  modified: string;
}

interface DocumentElementWithMetadata extends DocumentElement {
  document: DocumentMetadata;
}

export type { DocumentElement, TextFormatting, DocumentMetadata, DocumentElementWithMetadata };