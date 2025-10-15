// Mock API implementation for testing
// This file mimics the real API but works with local mock data

import { Note, Topic } from './types';
import { mockNotes, mockTopics } from './mockData';

// In-memory storage
let notes = [...mockNotes];
let topics = [...mockTopics];

// Simulated network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Generate simple ID
const generateId = () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock API functions
export async function searchNotesApi(params: {
  q?: string;
  topicId?: string | null;
  offset?: number;
  limit?: number;
  mode?: 'notes' | 'topics';
}): Promise<{ items: Note[]; total: number }> {
  await delay();
  
  let filtered = [...notes];

  // Filter by topic
  if (params.topicId) {
    filtered = filtered.filter(n => n.topicId === params.topicId);
  }

  // Filter by query
  if (params.q && params.q.trim()) {
    const query = params.q.toLowerCase();
    filtered = filtered.filter(n => 
      n.title.toLowerCase().includes(query) ||
      (n.text && n.text.toLowerCase().includes(query))
    );
  }

  // Sort by updatedAt descending
  filtered.sort((a, b) => b.updatedAt - a.updatedAt);

  // Limit
  const limit = params.limit || 50;
  const limited = filtered.slice(0, limit);

  return {
    items: limited,
    total: filtered.length,
  };
}

export async function saveNoteApi(note: Note): Promise<{ ok: boolean; note: Note }> {
  await delay();
  
  const newNote = {
    ...note,
    id: note.id || generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  notes.push(newNote);
  
  return { ok: true, note: newNote };
}

export async function updateNoteApi(note: Note): Promise<{ ok: boolean; note: Note }> {
  await delay();
  
  const index = notes.findIndex(n => n.id === note.id);
  if (index === -1) {
    return { ok: false, note };
  }
  
  const updatedNote = {
    ...note,
    updatedAt: Date.now(),
  };
  
  notes[index] = updatedNote;
  
  return { ok: true, note: updatedNote };
}

export async function deleteNoteApi(id: string): Promise<{ ok: boolean }> {
  await delay();
  
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) {
    return { ok: false };
  }
  
  notes.splice(index, 1);
  
  return { ok: true };
}

export async function getTopicsApi(): Promise<{ ok: boolean; topics: Topic[] }> {
  await delay(200);
  
  return {
    ok: true,
    topics: [...topics],
  };
}

export async function ensureTopicPathApi(params: {
  path: string;
}): Promise<{ ok: boolean; topicId: string; createdTopics: Topic[] }> {
  await delay();
  
  const parts = params.path.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error('Invalid path');
  }

  const createdTopics: Topic[] = [];
  let currentParentId: string | null = null;

  for (const part of parts) {
    // Try to find existing topic
    const findExistingTopic = (parentId: string | null) => 
      topics.find(t => t.name === part && t.parentId === parentId);
    
    let existing = findExistingTopic(currentParentId);

    if (!existing) {
      // Create new topic
      existing = {
        id: generateId(),
        name: part,
        parentId: currentParentId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      topics.push(existing);
      createdTopics.push(existing);
    }

    currentParentId = existing.id;
  }

  return {
    ok: true,
    topicId: currentParentId!,
    createdTopics,
  };
}

export async function deleteTopicApi(id: string): Promise<{ ok: boolean }> {
  await delay();
  
  const index = topics.findIndex(t => t.id === id);
  if (index === -1) {
    return { ok: false };
  }
  
  // Remove topic
  topics.splice(index, 1);
  
  // Unlink children
  topics = topics.map(t => 
    t.parentId === id ? { ...t, parentId: null } : t
  );
  
  // Unlink notes
  notes = notes.map(n => 
    n.topicId === id ? { ...n, topicId: null } : n
  );
  
  return { ok: true };
}

export async function toggleNoteFavoriteApi(
  id: string,
  isFavorite: boolean
): Promise<{ ok: boolean; note: Note }> {
  await delay();
  
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) {
    throw new Error('Note not found');
  }
  
  const updatedNote = {
    ...notes[index],
    isFavorite,
    updatedAt: Date.now(),
  };
  
  notes[index] = updatedNote;
  
  return { ok: true, note: updatedNote };
}

