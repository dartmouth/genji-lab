import { AnnotationCreate } from '@documentView/types';

export function makeTextAnnotationBody(
    document_collection_id: number,
    documentId: number,
    documentElementId: number,
    creatorId: number,
    motivation: string,
    text: string,
    segments: Array<{
      sourceURI: string;
      start: number;
      end: number;
      text: string;
    }>,
    language: string = "en"
): AnnotationCreate {
  console.log("making a new annotation body")
    const newAnnotation: AnnotationCreate = {
        "context": "http://www.w3.org/ns/anno.jsonld",
        "document_collection_id": document_collection_id,
        "document_id": documentId,
        "document_element_id": documentElementId,
        "type": "Annotation",
        "creator_id": creatorId, 
        "generator": "web-client",
        "motivation": motivation,
        "annotation_type": "comment",
        "body": {
          "type": "TextualBody",
          "value": text,
          "format": "text/plain",
          "language": language
        },
        "target": []
    };

    if (['commenting', 'scholarly'].includes(motivation)) {
        // Process each segment for commenting/scholarly annotations
        segments.forEach(segment => {
            // if (!segment.start) {
            //     throw new SyntaxError("Range start required for new comments");
            // }

            if (!segment.end) {
                throw new SyntaxError("Range end required for new comments");
            }

            // const start = segment.start > segment.end ? 0 : segment.start

            const target = {
                "type": "Text",
                "source": segment.sourceURI,
                "selector": {
                    "type": "TextQuoteSelector",
                    "value": segment.text,
                    "refined_by": {
                        "type": "TextPositionSelector",
                        "start": segment.start,
                        "end": segment.end
                    }
                }
            };

            newAnnotation.target.push(target);
        });
    } else {
        // Process each segment for other types of annotations
        segments.forEach(segment => {
            const target = {
                "type": "Text",
                "source": segment.sourceURI
            };
            
            newAnnotation.target.push(target);
        });
    }
    console.log("new body is", newAnnotation)

    return newAnnotation;
}

export function parseURI(uri: string) {
    const destruct = uri.split("/");
    if (destruct.length != 2) {
        console.error("Bad URI: ", uri);
    }
    return destruct[1];
}