import React, { useEffect, useState } from "react";
import "./ToastContainer.css";

/**
 * @typedef {Object} Toast
 * @property {string} id
 * @property {string} message
 * @property {"success"|"error"|"info"|"warning"} type
 * @property {number} duration
 */

/**
 * Individual toast notification with enter/exit animation.
 */
function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Start exit animation slightly before removal
    const exitDelay = Math.max(toast.duration - 400, 200);
    const timer = setTimeout(() => setExiting(true), exitDelay);
    return () => clearTimeout(timer);
  }, [toast.duration]);

  const iconMap = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  return (
    <div
      className={`toast toast--${toast.type} ${exiting ? "toast--exit" : "toast--enter"}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast__icon" aria-hidden="true">
        {iconMap[toast.type] || iconMap.info}
      </span>
      <span className="toast__message">{toast.message}</span>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

// PUBLIC_INTERFACE
/**
 * Container component that renders a stack of toast notifications.
 * Positioned fixed at the top-right corner of the viewport.
 *
 * @param {{ toasts: Toast[], onDismiss: Function }} props
 */
function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toastContainer" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default ToastContainer;
