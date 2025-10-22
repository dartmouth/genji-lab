// import { AnnotationCreate, } from '@documentView/types';

// export function makeTextAnnotationBody(
//     document_collection_id: number,
//     documentId: number,
//     documentElementId: number,
//     creatorId: number,
//     motivation: string,
//     text: string,
//     segments: Array<{
//       sourceURI: string;
//       start: number;
//       end: number;
//       text: string;
//     }>,
//     language: string = "en"
// ): AnnotationCreate {
//     const newAnnotation: AnnotationCreate = {
//         "context": "http://www.w3.org/ns/anno.jsonld",
//         "document_collection_id": document_collection_id,
//         "document_id": documentId,
//         "document_element_id": documentElementId,
//         "type": "Annotation",
//         "creator_id": creatorId, 
//         "generator": "web-client",
//         "motivation": motivation,
//         "annotation_type": motivation === "linking" ? "link" : "comment",
//         "body": {
//           "type": "TextualBody",
//           "value": text,
//           "format": "text/plain",
//           "language": language
//         },
//         "target": []
//     };

//     if (['commenting', 'scholarly', 'linking'].includes(motivation)) {
//         // Process each segment for commenting/scholarly/linking annotations
//         segments.forEach(segment => {

//             // For linking, we allow segments without strict end requirements
//             if (!segment.end && !['linking'].includes(motivation)) {
//                 throw new SyntaxError("Range end required for new comments");
//             }

//             const target = {
//                 "type": "Text",
//                 "source": segment.sourceURI,
//                 "selector": {
//                     "type": "TextQuoteSelector",
//                     "value": segment.text,
//                     "refined_by": {
//                         "type": "TextPositionSelector",
//                         "start": segment.start,
//                         "end": segment.end
//                     }
//                 }
//             };

//             newAnnotation.target.push(target);
//         });
//     } else {
//         // Process each segment for other types of annotations
//         segments.forEach(segment => {
//             const target = {
//                 "type": "Text",
//                 "source": segment.sourceURI
//             };
            
//             newAnnotation.target.push(target);
//         });
//     }

//     return newAnnotation;
// }

// export function parseURI(uri: string) {
//     const destruct = uri.split("/");
//     if (destruct.length != 2) {
//         console.error("Bad URI: ", uri);
//     }
//     return destruct[1];
// }

import { AnnotationCreate, } from '@documentView/types';

type Segment = {
  sourceURI: string;
  start: number;
  end: number;
  text: string;
};

export function makeTextAnnotationBody(
    document_collection_id: number,
    documentId: number,
    documentElementId: number,
    creatorId: number,
    motivation: string,
    text: string,
    segments: Segment[] | Segment[][],
    language: string = "en"
): AnnotationCreate {
    const newAnnotation: AnnotationCreate = {
        "context": "http://www.w3.org/ns/anno.jsonld",
        "document_collection_id": document_collection_id,
        "document_id": documentId,
        "document_element_id": documentElementId,
        "type": "Annotation",
        "creator_id": creatorId, 
        "generator": "web-client",
        "motivation": motivation,
        "annotation_type": motivation === "linking" ? "link" : "comment",
        "body": {
          "type": "TextualBody",
          "value": text,
          "format": "text/plain",
          "language": language
        },
        "target": []
    };

    // Normalize to array of arrays for consistent processing
    const segmentGroups: Segment[][] = Array.isArray(segments[0]) 
        ? segments as Segment[][] 
        : [segments as Segment[]];
    
    if (Array.isArray(segments[0])){
        console.log('lol')
    } else {
        console.log('no lol')
    }
    if (['commenting', 'scholarly', 'linking'].includes(motivation)) {
        // Process each group of segments
        segmentGroups.forEach(group => {
            // Create targets for each segment in the group
            const targets = group.map(segment => {
                // For linking, we allow segments without strict end requirements
                if (!segment.end && !['linking'].includes(motivation)) {
                    throw new SyntaxError("Range end required for new comments");
                }
                return {
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
            });
            
            // If original was a flat array, push individually; if nested, push as group
            if (Array.isArray(segments[0])) {
                newAnnotation.target.push(targets);
            } else {
                newAnnotation.target.push(...targets);
            }
        });
    } else {
        // Process each group of segments for other types of annotations
        segmentGroups.forEach(group => {
            const targets = group.map(segment => ({
                "type": "Text",
                "source": segment.sourceURI
            }));
            
            // Preserve structure based on input type
            if (Array.isArray(segments[0])) {
                newAnnotation.target.push(targets);
            } else {
                newAnnotation.target.push(...targets);
            }
        });
    }
    console.log(newAnnotation)
    console.log("target after makeAnnotationBody: ", newAnnotation.target)
    return newAnnotation;
}

export function parseURI(uri: string) {
    const destruct = uri.split("/");
    if (destruct.length != 2) {
        console.error("Bad URI: ", uri);
    }
    return destruct[1];
}