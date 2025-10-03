import { useEffect, useState } from 'react';

function useLocalStorage(key: string): [string | null, (newValue: string | null) => void] {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    console.log(`Initial load of ${key}:`, stored);
    return stored;
    });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setValue(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const handleCustomEvent = (e: CustomEvent<string | null>) => {
      setValue(e.detail);
    };
    window.addEventListener(`localStorage-${key}`, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(`localStorage-${key}`, handleCustomEvent as EventListener);
    };
  }, [key]);

  const setStorageValue = (newValue: string | null) => {
    if (newValue === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, newValue);
    }
    setValue(newValue);
    
    window.dispatchEvent(
      new CustomEvent(`localStorage-${key}`, { detail: newValue })
    );
  };

  return [value, setStorageValue];
}

export default useLocalStorage;