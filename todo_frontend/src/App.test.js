import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

const STORAGE_KEY = "kavia.todos.v1";

function setStoredTodos(todos) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

beforeEach(() => {
  window.localStorage.clear();
});

test("adds a todo and shows it in the list", () => {
  render(<App />);

  const input = screen.getByLabelText(/add a todo/i);
  fireEvent.change(input, { target: { value: "Buy milk" } });
  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  expect(screen.getByText("Buy milk")).toBeInTheDocument();
  expect(screen.getByText(/1 active/i)).toBeInTheDocument();
});

test("toggles completion and filters completed/active", () => {
  render(<App />);

  const input = screen.getByLabelText(/add a todo/i);
  fireEvent.change(input, { target: { value: "Task A" } });
  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  // Mark as complete using the toggle button
  fireEvent.click(screen.getByRole("button", { name: /mark "task a" as complete/i }));

  // Active filter should hide completed item
  fireEvent.click(screen.getByRole("button", { name: /^active$/i }));
  expect(screen.queryByText("Task A")).not.toBeInTheDocument();

  // Completed filter should show it
  fireEvent.click(screen.getByRole("button", { name: /^completed$/i }));
  expect(screen.getByText("Task A")).toBeInTheDocument();
});

test("edits a todo and saves changes", () => {
  render(<App />);

  const input = screen.getByLabelText(/add a todo/i);
  fireEvent.change(input, { target: { value: "Old text" } });
  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  fireEvent.click(screen.getByRole("button", { name: /edit/i }));

  const editInput = screen.getByLabelText(/edit todo/i);
  fireEvent.change(editInput, { target: { value: "New text" } });
  fireEvent.click(screen.getByRole("button", { name: /save/i }));

  expect(screen.getByText("New text")).toBeInTheDocument();
  expect(screen.queryByText("Old text")).not.toBeInTheDocument();
});

test("deletes a todo", () => {
  render(<App />);

  const input = screen.getByLabelText(/add a todo/i);
  fireEvent.change(input, { target: { value: "Disposable" } });
  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  fireEvent.click(screen.getByRole("button", { name: /delete "disposable"/i }));
  expect(screen.queryByText("Disposable")).not.toBeInTheDocument();
});

test("loads initial todos from localStorage", () => {
  setStoredTodos([
    { id: "1", text: "From storage", completed: false, createdAt: 1 },
  ]);

  render(<App />);

  expect(screen.getByText("From storage")).toBeInTheDocument();
});

test("persists todos to localStorage after adding", () => {
  render(<App />);

  const input = screen.getByLabelText(/add a todo/i);
  fireEvent.change(input, { target: { value: "Persist me" } });
  fireEvent.click(screen.getByRole("button", { name: /add/i }));

  const raw = window.localStorage.getItem(STORAGE_KEY);
  expect(raw).toBeTruthy();

  const parsed = JSON.parse(raw);
  expect(parsed.some((t) => t.text === "Persist me")).toBe(true);
});
