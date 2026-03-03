import { useCallback, useState } from "react";

/**
 * @typedef {Object} Toast
 * @property {string} id - Unique identifier for the toast
 * @property {string} message - The toast message to display
 * @property {"success"|"error"|"info"|"warning"} type - Toast variant
 * @property {number} duration - Auto-dismiss duration in ms
 */

let toastCounter = 0;

// PUBLIC_INTERFACE
/**
 * Custom hook for managing in-app toast notifications.
 * Returns a list of active toasts and functions to show/dismiss them.
 *
 * @param {number} [defaultDuration=3000] - Default auto-dismiss time in ms
 * @returns {{ toasts: Toast[], showToast: Function, dismissToast: Function }}
 */
function useToast(defaultDuration = 3000) {
  const [toasts, setToasts] = useState([]);

  /**
   * Show a new toast notification.
   * @param {string} message - Message text
   * @param {"success"|"error"|"info"|"warning"} [type="info"] - Toast type
   * @param {number} [duration] - Optional override for auto-dismiss time
   */
  const showToast = useCallback(
    (message, type = "info", duration) => {
      const id = `toast-${++toastCounter}-${Date.now()}`;
      const resolvedDuration = duration ?? defaultDuration;

      const newToast = { id, message, type, duration: resolvedDuration };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after duration
      if (resolvedDuration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, resolvedDuration);
      }
    },
    [defaultDuration]
  );

  /**
   * Manually dismiss a toast by id.
   * @param {string} id
   */
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

export default useToast;
