import { useEffect, useMemo, useRef } from "react";
import { debounce } from "lodash";

// function debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): T {
//     let timer: ReturnType<typeof setTimeout>;
//     return ((...args: Parameters<T>) => {
//       clearTimeout(timer);
//       timer = setTimeout(() => func(...args), delay);
//     }) as T;
//   }
  

const useDebounce = (callback: () => void): (() => void) => {
  const ref = useRef<(() => void) | null>(null);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const func = () => {
      ref.current?.();
    };

    return debounce(func, 500);
  }, []);

  return debouncedCallback;
};

export default useDebounce;
