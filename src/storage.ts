import { AppState, Note } from './types';

const STORAGE_KEY = 'knowledge2_state_v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { notes: [], topics: [] };
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.topics)) {
      return { notes: [], topics: [] };
    }
    return parsed;
  } catch {
    return { notes: [], topics: [] };
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function upsertNote(state: AppState, note: Note): AppState {
  const idx = state.notes.findIndex(n => n.id === note.id);
  const notes = [...state.notes];
  if (idx >= 0) notes[idx] = note; else notes.unshift(note);
  const next = { ...state, notes };
  saveState(next);
  return next;
}

export function deleteNote(state: AppState, id: string): AppState {
  const next = { ...state, notes: state.notes.filter(n => n.id !== id) };
  saveState(next);
  return next;
}


export function deleteTopic(state: AppState, id: string): AppState {
  // Remove topic and detach from notes; also detach children (not delete)
  const topics = state.topics.filter(t => t.id !== id).map(t =>
    t.parentId === id ? { ...t, parentId: null } : t
  );
  const notes = state.notes.map(n => (n.topicId === id ? { ...n, topicId: null } : n));
  const next = { ...state, topics, notes };
  saveState(next);
  return next;
}


