interface Selector {
        "type": string;
        "value": string;
        "refined_by": {
            "type": string;
            "start": number;
            "end": number;
        };
}

interface Annotation {
    "context": string;
    "id": string;
    "document_element_id": string;
    "document_id": number;
    "document_collection_id": number;
    "type": string;
    "creator": {
        "first_name": string,
        "last_name": string,
        "id": number,
        "user_metadata": {
            "role": string,
            "affiliation": string
        }
    };
    "created": string;
    "modified": string;
    "generator": string;
    "generated": string;
    "motivation": string;
    "body": {
        "id": string;
        "type": string;
        "value": string;
        "format": string;
        "language": string;
    };
    "target": Array<{
        "id": string;
        "type": string;
        "source": string;
        "selector"?: Selector;
    }>
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
    "target": Array<{
        "type": string;
        "source": string;
        "selector"?: Selector;
    }>
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

// export annotation not using default
export type { Annotation }
export type { AnnotationCreate }
export type { AnnotationDelete }
export type { Selector}
export type { AnnotationPatch}