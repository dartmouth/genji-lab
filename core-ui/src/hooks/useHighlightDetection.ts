// hooks/useHighlightDetection.ts
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setHoveredHighlights } from '../store/highlightRegistrySlice';
import { makeSelectAnnotationsById } from '../store/annotationSlice';
import { debounce } from 'lodash';

export function useHighlightDetection() {
  const dispatch = useDispatch();
  const highlights = useSelector((state: RootState) => state.highlightRegistry.highlights);
  const hoveredHighlightIds = useSelector(
    (state: RootState) => state.highlightRegistry.hoveredHighlightIds
  );
  const selectAnnotationsByIdMemo = useMemo(makeSelectAnnotationsById, []);

  // Get all annotations that match the hoveredHighlightIds
  const hoveredAnnotations = useSelector(
    (state: RootState) => selectAnnotationsByIdMemo(state, hoveredHighlightIds)
  );
  const detectHighlightsAtPoint = useCallback((x: number, y: number) => {
    const highlightsAtPoint = Object.values(highlights).filter(highlight => {
      return highlight.boundingBoxes.some(box => {
        return (
          x >= box.left &&
          x <= box.left + box.width &&
          y >= box.top &&
          y <= box.top + box.height
        );
      });
    });
    
    const highlightIds = highlightsAtPoint.map(h => h.annotationId);
    if (highlightIds.length > 0){
      dispatch(setHoveredHighlights(highlightIds));
    }
    return highlightIds;
  }, [highlights, dispatch]);

  const debouncedDetectHighlightsAtPoint = debounce(detectHighlightsAtPoint, 300)

  return {
    detectHighlightsAtPoint: debouncedDetectHighlightsAtPoint,
    hoveredHighlightIds,
    hoveredAnnotations
  };
}