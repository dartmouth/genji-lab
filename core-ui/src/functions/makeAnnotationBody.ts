import { AnnotationCreate, Selector } from '../types/annotation';

export function makeTextAnnotationBody(
    document_collection_id: number,
    documentId: number,
    documentElementId: number,
    creatorId: number,
    motivation: string,
    sourceURI: string,
    text: string,
    targetStart?: number,
    targetEnd?: number,
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
        "annotation_type": "comment",
        "body": {
          "type": "TextualBody",
          "value": text,
          "format": "text/plain",
          "language": language
        },
        "target": [{
          "type": "Text",
          "source": sourceURI,

        }]
      };

      if (['commenting', 'scholarly'].includes(motivation)){
        console.log("Start is ", targetStart)
        console.log("End is ", targetEnd)
        if (!targetStart){
          throw new SyntaxError("Range start required for new comments")
        }

        if (!targetEnd){
          throw new SyntaxError("Range end required for new comments")
        }

        const selector: Selector = {
          "type": "TextQuoteSelector",
          "value": text,
          "refined_by": {
            "type": "TextPositionSelector",
            "start": targetStart,
            "end": targetEnd
          }
        }
        // FIXME -- need to update for multi-paragraph annotations
        newAnnotation.target[0].selector = selector;
      }

    return newAnnotation
}

export function parseURI(uri: string){
  const destruct = uri.split("/")
  if (destruct.length != 2){
    console.error("Bad URI: ", uri)
  }
  return destruct[1]
}