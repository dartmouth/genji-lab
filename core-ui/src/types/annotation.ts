interface Annotation {
    "@context": string;
    "id": string;
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
        "source": number;
        "selector": {
            "type": string;
            "value": string;
            "refined_by": {
                "type": string;
                "start": number;
                "end": number;
            };
        };
    }>
}

interface DocumentElement {
    "document_id": number,
    "hierarchy": object,
    "content": {
        "text": string
    },
    "links": object[] |null,
    "id": number,
    "created": string,
    "modified": string
}

// export annotation not using default
export type { Annotation }
export type { DocumentElement }