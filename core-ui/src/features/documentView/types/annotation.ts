interface Selector {
        "type": string;
        "value": string;
        "refined_by": {
            "type": string;
            "start": number;
            "end": number;
        };
}
interface TextPositionSelector {
    type: "TextPositionSelector";
    start: number;
    end: number;
}

interface TextQuoteSelector {
    type: "TextQuoteSelector";
    value: string;
    refined_by: TextPositionSelector;
}

export interface TextTarget {
    id?: number | null;
    type: string;
    source: string;
    selector?: TextQuoteSelector | null;
}

export interface ObjectTarget {
    id?: number | null;
    type: string;
    source: string;
}

interface Body {
    id: number;
    type: string;
    value: string;
    format: string;
    language: string;
}

interface Annotation {
    id: string
    context: string;
    document_collection_id: number;
    document_id: number;
    document_element_id: number;
    creator_id: number;
    classroom_id?: number | null;
    type: string;
    creator: {
        "first_name": string,
        "last_name": string,
        "id": number,
        "user_metadata": {
            "role": string,
            "affiliation": string
        }
    };
    created: string;
    modified: string;
    generator: string;
    generated: string;
    motivation: string;
    body: Body;
    target: (TextTarget | ObjectTarget | (TextTarget | ObjectTarget)[])[];
}

interface AnnotationCreate {
    "context": string;
    "document_collection_id": number,
    "document_id": number,
    "document_element_id": number,
    "type": string;
    "creator_id": number;
    "generator": string;
    "motivation": string;
    "annotation_type": string;
    "body": {
        "type": string;
        "value": string;
        "format": string;
        "language": string;
    };
    "target": (TextTarget | ObjectTarget | (TextTarget | ObjectTarget)[])[];
}

interface AnnotationDelete {
    annotationId: number
  }

interface AnnotationPatch {
    annotationId: number,
    payload: {
      body: string
    }
  }

export type AnnotationTarget = TextTarget | ObjectTarget;

export interface AnnotationAddTarget {
  annotationId: number;
  target: AnnotationTarget[];
}
// export annotation not using default
export type { Annotation }
export type { AnnotationCreate }
export type { AnnotationDelete }
export type { Selector}
export type { AnnotationPatch}