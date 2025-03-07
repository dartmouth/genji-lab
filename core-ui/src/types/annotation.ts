interface Annotation {
    "@context": string;
    "id": string;
    "type": string;
    "creator": string;
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
        "selector": {
            "type": string;
            "value": string;
            "refinedBy": {
                "type": string;
                "start": number;
                "end": number;
            };
        };
    }>
}

// export annotation not using default
export type { Annotation }