import { Note, Topic } from './types';
import { API_BASE_URL, API_TIMEOUT_MS } from './config';

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        SettingsButton?: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        showAlert: (message: string, callback?: () => void) => void;
      };
    };
  }
}

// Backend API base URL and timeout are configured in src/config.ts

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs: number = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Получить заголовки авторизации
function getAuthHeaders(): HeadersInit {
  // В dev режиме без Telegram используется тестовый user
  const initData = window.Telegram?.WebApp?.initData || '';
  
  return {
    'Authorization': `tma ${initData}`,
    'Content-Type': 'application/json'
  };
}

// Обработка ответа API
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(data.error?.message || 'API Error');
  }
  
  return data;
}

// Конвертация дат из ISO строк в timestamps
function parseNote(note: any): Note {
  return {
    ...note,
    createdAt: new Date(note.createdAt).getTime(),
    updatedAt: new Date(note.updatedAt).getTime(),
    attachments: note.attachments.map((att: any) => ({
      ...att,
      createdAt: new Date(att.createdAt).getTime()
    }))
  };
}

function parseTopic(topic: any): Topic {
  return {
    ...topic,
    createdAt: new Date(topic.createdAt).getTime(),
    updatedAt: new Date(topic.updatedAt).getTime()
  };
}

// ============ Search API ============

export type SearchNotesRequest = {
  q?: string;
  topicId?: string | null;
  offset?: number;
  limit?: number;
  mode?: 'notes' | 'topics';
};

export type SearchNotesResponse = {
  items: Note[];
  total: number;
};

export async function searchNotesApi(req: SearchNotesRequest): Promise<SearchNotesResponse> {
  const { q, topicId, offset = 0, limit = 50 } = req;
  
  const params = new URLSearchParams();
  if (q && q.trim()) params.append('q', q.trim());
  if (topicId) params.append('topic', topicId);
  params.append('offset', offset.toString());
  params.append('limit', limit.toString());
  
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/notes/search?${params}`,
    { headers: getAuthHeaders() }
  );
  
  const data = await handleResponse<{
    ok: true;
    items: any[];
    total: number;
    offset: number;
    limit: number;
  }>(response);
  
  return {
    items: data.items.map(parseNote),
    total: data.total
  };
}

// ============ Notes API ============

export type SaveNoteResponse = { ok: boolean };

export async function saveNoteApi(note: Note): Promise<SaveNoteResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: note.title,
      text: note.text,
      url: note.url || null,
      imageUrl: note.imageUrl || null,
      topicId: note.topicId || null,
      isFavorite: note.isFavorite || false,
      attachments: note.attachments.map(att => ({
        name: att.name,
        mimeType: att.mimeType,
        size: att.size,
        dataUrl: att.dataUrl
      }))
    })
  });
  
  await handleResponse(response);
  return { ok: true };
}

export async function updateNoteApi(note: Note): Promise<SaveNoteResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/notes/${note.id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: note.title,
      text: note.text,
      url: note.url || null,
      imageUrl: note.imageUrl || null,
      topicId: note.topicId || null,
      isFavorite: note.isFavorite || false,
      attachments: note.attachments.map(att => ({
        name: att.name,
        mimeType: att.mimeType,
        size: att.size,
        dataUrl: att.dataUrl
      }))
    })
  });
  
  await handleResponse(response);
  return { ok: true };
}

export async function deleteNoteApi(noteId: string): Promise<SaveNoteResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/notes/${noteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  await handleResponse(response);
  return { ok: true };
}

export async function toggleNoteFavoriteApi(noteId: string, isFavorite: boolean): Promise<{ note: Note }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/notes/${noteId}/favorite`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ isFavorite })
  });
  
  const data = await handleResponse<{
    ok: true;
    note: any;
  }>(response);
  
  return {
    note: parseNote(data.note)
  };
}

// ============ Topics API ============

export type GetTopicsResponse = {
  topics: Topic[];
};

export async function getTopicsApi(): Promise<GetTopicsResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/topics`, {
    headers: getAuthHeaders()
  });
  
  const data = await handleResponse<{
    ok: true;
    topics: any[];
  }>(response);
  
  return {
    topics: data.topics.map(parseTopic)
  };
}


export type EnsurePathRequest = {
  path: string;
};

export type EnsurePathResponse = {
  topicId: string;
  createdTopics: Topic[];
};

export async function ensureTopicPathApi(req: EnsurePathRequest): Promise<EnsurePathResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/topics/ensure-path`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(req)
  });
  
  const data = await handleResponse<{
    ok: true;
    topicId: string;
    createdTopics: any[];
  }>(response);
  
  return {
    topicId: data.topicId,
    createdTopics: data.createdTopics.map(parseTopic)
  };
}


export async function deleteTopicApi(id: string): Promise<{ ok: boolean }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/topics/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  await handleResponse(response);
  return { ok: true };
}


