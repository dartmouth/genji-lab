import { useEffect, useRef, useState, RefObject } from 'react';

/**
 * Hook that detects when an element is approaching viewport (for prefetching)
 * and when it's actually visible (for rendering)
 * 
 * @param prefetchMargin Distance from viewport to trigger prefetching (e.g. '200px')
 * @param visibilityThreshold Percentage of element that must be visible (0-1)
 */
export function useVisibilityWithPrefetch<T extends HTMLElement | null>(
    existingRef: RefObject<T> | null = null,
    prefetchMargin = '200px', 
    visibilityThreshold = 0.1
  ) {
    // Use provided ref or create one
    const defaultRef = useRef(null);
    const ref = existingRef || defaultRef;
    
    const [isVisible, setIsVisible] = useState(false);
    const [shouldPrefetch, setShouldPrefetch] = useState(false);
  
    useEffect(() => {
      const currentRef = ref.current;
      if (!currentRef) return;
      
      // Observer for actual visibility
      const visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
        },
        { threshold: visibilityThreshold }
      );
      
      // Observer for approaching viewport
      const prefetchObserver = new IntersectionObserver(
        ([entry]) => {
          setShouldPrefetch(entry.isIntersecting);
        },
        { rootMargin: prefetchMargin }
      );
      
      visibilityObserver.observe(currentRef);
      prefetchObserver.observe(currentRef);
      
      return () => {
        visibilityObserver.unobserve(currentRef);
        prefetchObserver.unobserve(currentRef);
      };
    }, [ref, prefetchMargin, visibilityThreshold]);
  
    return { isVisible, shouldPrefetch };
  }