import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

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

// PUBLIC_INTERFACE
function App() {
  /** @type {[Todo[], Function]} */
  const [todos, setTodos] = useState(() => loadTodos());
  const [filter, setFilter] = useState("all"); // all | active | completed
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const newInputRef = useRef(null);
  const editInputRef = useRef(null);

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
    // Keep focus on add input for fast entry
    newInputRef.current?.focus?.();
  }

  // PUBLIC_INTERFACE
  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  }

  // PUBLIC_INTERFACE
  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    // If you delete the todo you're editing, exit edit mode
    if (editingId === id) {
      setEditingId(null);
      setEditingText("");
    }
  }

  // PUBLIC_INTERFACE
  function startEditing(todo) {
    setEditingId(todo.id);
    setEditingText(todo.text);
  }

  // PUBLIC_INTERFACE
  function cancelEditing() {
    setEditingId(null);
    setEditingText("");
  }

  // PUBLIC_INTERFACE
  function saveEditing(id, nextText) {
    const trimmed = nextText.trim();
    if (!trimmed) {
      // If user clears text, interpret as delete to avoid blank todos
      deleteTodo(id);
      return;
    }

    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t)),
    );
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
    setTodos((prev) => prev.filter((t) => !t.completed));
  }

  const isEmpty = todos.length === 0;

  return (
    <div className="App">
      <div className="page">
        <header className="header">
          <div className="brand">
            <div className="brandMark" aria-hidden="true" />
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
              <div className="statValue">{counts.active}</div>
            </div>
            <div className="stat">
              <div className="statLabel">Done</div>
              <div className="statValue">{counts.completed}</div>
            </div>
          </div>
        </header>

        <main className="card">
          <form className="addRow" onSubmit={onSubmitNew}>
            <label className="srOnly" htmlFor="new-todo">
              Add a todo
            </label>
            <input
              id="new-todo"
              ref={newInputRef}
              className="input"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Add a task…"
              autoComplete="off"
            />
            <button className="btn btnPrimary" type="submit">
              Add
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
              <div className="emptyTitle">No todos yet</div>
              <div className="emptyText">
                Add your first task above to get started.
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
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="actions">
                        <button
                          type="button"
                          className="btn btnGhost"
                          onClick={() => startEditing(todo)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btnDanger"
                          onClick={() => deleteTodo(todo.id)}
                          aria-label={`Delete "${todo.text}"`}
                        >
                          Delete
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
