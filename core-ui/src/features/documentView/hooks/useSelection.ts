import { useContext } from "react";
import { SelectionContext } from '../contexts/SelectionContext'
// Custom hook to use the selection context
export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (context === undefined) {
      throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
  };