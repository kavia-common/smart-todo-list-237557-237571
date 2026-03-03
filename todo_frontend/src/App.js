import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import ToastContainer from "./components/ToastContainer";
import useToast from "./hooks/useToast";

const STORAGE_KEY = "kavia.todos.v1";

/**
 * @typedef {Object} Todo
 * @property {string} id
 * @property {string} text
 * @property {boolean} completed
 * @property {number} createdAt
 */

/**
 * Generate a reasonably unique id without extra dependencies.
 * Falls back gracefully if crypto.randomUUID is unavailable.
 */
function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Load todos from localStorage.
 * Returns [] on any error or invalid data to keep app resilient.
 */
function loadTodos() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t.text === "string")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : createId(),
        text: t.text,
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

/**
 * Persist todos to localStorage. Silently ignores quota errors.
 * @param {Todo[]} todos
 */
function saveTodos(todos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // ignore persistence errors (e.g., quota / private mode)
  }
}

/**
 * Format a timestamp into a human-readable relative time string.
 * @param {number} timestamp
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// PUBLIC_INTERFACE
/**
 * Main App component — renders the todo application with toast notifications,
 * filtering, local persistence, and an enhanced UI.
 */
function App() {
  /** @type {[Todo[], Function]} */
  const [todos, setTodos] = useState(() => loadTodos());
  const [filter, setFilter] = useState("all"); // all | active | completed
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const newInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Toast notification system
  const { toasts, showToast, dismissToast } = useToast(3000);

  // Persist on every change
  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  // Autofocus add input on first load
  useEffect(() => {
    newInputRef.current?.focus?.();
  }, []);

  // Autofocus edit input when entering edit mode
  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus?.();
      editInputRef.current?.select?.();
    }
  }, [editingId]);

  const counts = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const active = total - completed;
    return { total, completed, active };
  }, [todos]);

  const filteredTodos = useMemo(() => {
    if (filter === "active") return todos.filter((t) => !t.completed);
    if (filter === "completed") return todos.filter((t) => t.completed);
    return todos;
  }, [todos, filter]);

  // PUBLIC_INTERFACE
  /**
   * Add a new todo item and show a success notification.
   * @param {string} text - The todo text
   */
  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const todo = {
      id: createId(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    setTodos((prev) => [todo, ...prev]);
    setNewText("");
    showToast(`Task "${trimmed}" added`, "success");
    // Keep focus on add input for fast entry
    newInputRef.current?.focus?.();
  }

  // PUBLIC_INTERFACE
  /**
   * Toggle the completion state of a todo and notify the user.
   * @param {string} id
   */
  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = { ...t, completed: !t.completed };
          showToast(
            next.completed
              ? `"${t.text}" marked complete`
              : `"${t.text}" marked active`,
            next.completed ? "success" : "info"
          );
          return next;
        }
        return t;
      })
    );
  }

  // PUBLIC_INTERFACE
  /**
   * Delete a todo item and notify the user.
   * @param {string} id
   */
  function deleteTodo(id) {
    const target = todos.find((t) => t.id === id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (target) {
      showToast(`"${target.text}" deleted`, "error");
    }
    // If you delete the todo you're editing, exit edit mode
    if (editingId === id) {
      setEditingId(null);
      setEditingText("");
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Enter editing mode for a given todo.
   * @param {Todo} todo
   */
  function startEditing(todo) {
    setEditingId(todo.id);
    setEditingText(todo.text);
  }

  // PUBLIC_INTERFACE
  /**
   * Cancel editing and reset editing state.
   */
  function cancelEditing() {
    setEditingId(null);
    setEditingText("");
  }

  // PUBLIC_INTERFACE
  /**
   * Save the edited text for a todo. Deletes if blank text is submitted.
   * @param {string} id
   * @param {string} nextText
   */
  function saveEditing(id, nextText) {
    const trimmed = nextText.trim();
    if (!trimmed) {
      // If user clears text, interpret as delete to avoid blank todos
      deleteTodo(id);
      return;
    }

    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t))
    );
    showToast("Task updated", "info");
    setEditingId(null);
    setEditingText("");
  }

  function onSubmitNew(e) {
    e.preventDefault();
    addTodo(newText);
  }

  function onSubmitEdit(e, id) {
    e.preventDefault();
    saveEditing(id, editingText);
  }

  function clearCompleted() {
    const count = todos.filter((t) => t.completed).length;
    setTodos((prev) => prev.filter((t) => !t.completed));
    showToast(`${count} completed task${count !== 1 ? "s" : ""} cleared`, "warning");
  }

  const isEmpty = todos.length === 0;

  // Calculate completion percentage for the progress indicator
  const completionPercent =
    counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

  return (
    <div className="App">
      {/* Toast notification overlay */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="page">
        <header className="header">
          <div className="brand">
            <div className="brandMark" aria-hidden="true">
              <span className="brandIcon">✓</span>
            </div>
            <div>
              <h1 className="title">Todos</h1>
              <p className="subtitle">A lightweight, local-first task list.</p>
            </div>
          </div>

          <div className="stats" aria-label="Todo stats">
            <div className="stat">
              <div className="statLabel">Total</div>
              <div className="statValue">{counts.total}</div>
            </div>
            <div className="stat">
              <div className="statLabel">Active</div>
              <div className="statValue statValueActive">{counts.active}</div>
            </div>
            <div className="stat statHighlight">
              <div className="statLabel">Done</div>
              <div className="statValue statValueDone">{counts.completed}</div>
              {counts.total > 0 && (
                <div className="statProgress">
                  <div
                    className="statProgressBar"
                    style={{ width: `${completionPercent}%` }}
                    role="progressbar"
                    aria-valuenow={completionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${completionPercent}% complete`}
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="card">
          <form className="addRow" onSubmit={onSubmitNew}>
            <label className="srOnly" htmlFor="new-todo">
              Add a todo
            </label>
            <div className="inputWrapper">
              <span className="inputIcon" aria-hidden="true">+</span>
              <input
                id="new-todo"
                ref={newInputRef}
                className="input inputWithIcon"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="What needs to be done?"
                autoComplete="off"
              />
            </div>
            <button className="btn btnPrimary" type="submit">
              <span className="btnLabel">Add</span>
            </button>
          </form>

          <section className="toolbar" aria-label="Todo filters and actions">
            <div className="filters" role="tablist" aria-label="Filter todos">
              <button
                type="button"
                className={`chip ${filter === "all" ? "chipActive" : ""}`}
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
              >
                All
              </button>
              <button
                type="button"
                className={`chip ${filter === "active" ? "chipActive" : ""}`}
                onClick={() => setFilter("active")}
                aria-pressed={filter === "active"}
              >
                Active
              </button>
              <button
                type="button"
                className={`chip ${filter === "completed" ? "chipActive" : ""}`}
                onClick={() => setFilter("completed")}
                aria-pressed={filter === "completed"}
              >
                Completed
              </button>
            </div>

            <div className="toolbarRight">
              <div className="countText" aria-live="polite">
                {counts.active} active
              </div>
              <button
                type="button"
                className="btn btnGhost"
                onClick={clearCompleted}
                disabled={counts.completed === 0}
              >
                Clear completed
              </button>
            </div>
          </section>

          {isEmpty ? (
            <div className="emptyState" role="status">
              <div className="emptyIcon" aria-hidden="true">📝</div>
              <div className="emptyTitle">No todos yet</div>
              <div className="emptyText">
                Add your first task above to get started.
              </div>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="emptyState" role="status">
              <div className="emptyIcon" aria-hidden="true">🔍</div>
              <div className="emptyTitle">No {filter} tasks</div>
              <div className="emptyText">
                Try a different filter to see your tasks.
              </div>
            </div>
          ) : (
            <ul className="list" aria-label="Todo list">
              {filteredTodos.map((todo) => {
                const isEditing = editingId === todo.id;

                return (
                  <li
                    key={todo.id}
                    className={`item ${todo.completed ? "itemDone" : ""}`}
                  >
                    <div className="left">
                      <button
                        type="button"
                        className={`check ${todo.completed ? "checkOn" : ""}`}
                        onClick={() => toggleTodo(todo.id)}
                        aria-label={
                          todo.completed
                            ? `Mark "${todo.text}" as incomplete`
                            : `Mark "${todo.text}" as complete`
                        }
                      >
                        <span className="checkIcon" aria-hidden="true">
                          ✓
                        </span>
                      </button>

                      <div className="content">
                        {isEditing ? (
                          <form
                            className="editForm"
                            onSubmit={(e) => onSubmitEdit(e, todo.id)}
                          >
                            <label className="srOnly" htmlFor={`edit-${todo.id}`}>
                              Edit todo
                            </label>
                            <input
                              id={`edit-${todo.id}`}
                              ref={editInputRef}
                              className="input inputCompact"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") cancelEditing();
                              }}
                              autoComplete="off"
                            />
                            <button className="btn btnSuccess" type="submit">
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btnGhost"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <div className="row">
                            <div className="text">{todo.text}</div>
                            <div className="meta">
                              {todo.completed ? "Completed" : "Active"}
                              {" · "}
                              {formatRelativeTime(todo.createdAt)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="actions">
                        <button
                          type="button"
                          className="btn btnGhost btnSmall"
                          onClick={() => startEditing(todo)}
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btnDanger btnSmall"
                          onClick={() => deleteTodo(todo.id)}
                          aria-label={`Delete "${todo.text}"`}
                        >
                          ✕ Delete
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        <footer className="footer">
          <span className="footerText">
            Data is stored locally in your browser (localStorage).
          </span>
        </footer>
      </div>
    </div>
  );
}

export default App;
