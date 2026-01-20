// hooks/useNotification.ts
import { useState, useCallback } from "react";
import { NotificationState } from "../types";
export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: "",
    severity: "info",
  });

  const showNotification = useCallback(
    (message: string, severity: NotificationState["severity"]) => {
      setNotification({ open: true, message, severity });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return { notification, showNotification, hideNotification };
};