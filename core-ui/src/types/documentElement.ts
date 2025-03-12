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
export type { DocumentElement }