import { useState, useCallback } from "react";
import axios from "axios";

interface UseTutorialReturn {
  showTutorial: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
  completeTutorial: (userId: number) => Promise<void>;
  isMarkingViewed: boolean;
}

export const useTutorial = (): UseTutorialReturn => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isMarkingViewed, setIsMarkingViewed] = useState(false);

  const openTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const completeTutorial = useCallback(
    async (userId: number) => {
      setIsMarkingViewed(true);
      try {
        await axios.patch(`/api/v1/users/${userId}`, {
          viewed_tutorial: true,
        });
        closeTutorial();
      } catch (error) {
        console.error("Failed to mark tutorial as viewed:", error);
        // Still close the tutorial even if the API call fails
        closeTutorial();
      } finally {
        setIsMarkingViewed(false);
      }
    },
    [closeTutorial]
  );

  return {
    showTutorial,
    openTutorial,
    closeTutorial,
    completeTutorial,
    isMarkingViewed,
  };
};
