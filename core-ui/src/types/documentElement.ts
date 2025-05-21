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
text_styles?: TextStyle[];
}

interface DocumentElement {
    "document_id": number,
    "hierarchy": object,
    "content": {
        "text": string
        "formatting": TextFormatting
    },
    "links": object[] |null,
    "id": number,
    "created": string,
    "modified": string
}
export type { DocumentElement }
export type { TextFormatting }