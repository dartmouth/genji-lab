import { useState, useEffect } from 'react';
import { Annotation, AnnotationCreate } from '../types/annotation';
import { useApiClient } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuthContext';

interface SelectionInfo {
  content_id: number;
  start: number;
  end: number;
  text: string;
}

interface UseAnnotationCreationReturn {
  selectionInfo: SelectionInfo;
  setSelectionInfo: (info: SelectionInfo) => void;
  newAnnotationText: string;
  setNewAnnotationText: (text: string) => void;
  handleCreateAnnotation: () => Promise<void>;
  handleCancelAnnotation: () => void;
  annotations: ReturnType<typeof useApiClient<Annotation[]>>;
}

export const useAnnotationCreation = (documentID: number, motivation: string): UseAnnotationCreationReturn => {
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo>({
    content_id: 0,
    start: 0,
    end: 0,
    text: ""
  });
  
  const [newAnnotationText, setNewAnnotationText] = useState("");
  const { user, isAuthenticated } = useAuth();
  const annotations = useApiClient<Annotation[]>(`/annotations/?motivation=${motivation}`);

  useEffect(() => {
    if (selectionInfo.text) {
      setNewAnnotationText("");
    }
  }, [selectionInfo]);

  const handleCreateAnnotation = async () => {
    if (!selectionInfo.text || !newAnnotationText) return;
    if (!user || !isAuthenticated) return;

    const newAnnotation: AnnotationCreate = {
      "context": "http://www.w3.org/ns/anno.jsonld",
      "document_collection_id": 1,
      "document_id": documentID,
      "document_element_id": selectionInfo.content_id,
      "type": "Annotation",
      "creator_id": user.id, 
      "generator": "web-client",
      "motivation": motivation,
      "annotation_type": "comment",
      "body": {
        "type": "TextualBody",
        "value": newAnnotationText,
        "format": "text/plain",
        "language": "en"
      },
      "target": [{
        "type": "Text",
        "source": `DocumentElement/${selectionInfo.content_id}`,
        "selector": {
          "type": "TextQuoteSelector",
          "value": selectionInfo.text,
          "refined_by": {
            "type": "TextPositionSelector",
            "start": selectionInfo.start,
            "end": selectionInfo.end
          }
        }
      }]
    };
    
    try {
      await annotations.post("/annotations/", newAnnotation)
        .then(() => annotations.get());
      
      console.log("Annotation created and data refreshed");
      
      resetSelectionState();
    } catch (error) {
      console.error("Error creating annotation:", error);
    }
  };

  const resetSelectionState = () => {
    setSelectionInfo({
      content_id: 0,
      start: 0,
      end: 0,
      text: ""
    });
    setNewAnnotationText("");
  };
  
  const handleCancelAnnotation = () => {
    resetSelectionState();
  };

  return {
    selectionInfo,
    setSelectionInfo,
    newAnnotationText,
    setNewAnnotationText,
    handleCreateAnnotation,
    handleCancelAnnotation,
    annotations
  };
};