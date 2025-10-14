export type Topic = {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string; // base64 Data URL
  createdAt: number;
};

export type Note = {
  id: string;
  title: string;
  text: string;
  url?: string;
  imageUrl?: string; // preview image if available
  topicId?: string | null;
  attachments: Attachment[];
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
};

export type AppState = {
  notes: Note[];
  topics: Topic[];
};


export type EditorMode =
  | { type: 'closed' }
  | { type: 'create'; presetTopicId?: string | null }
  | { type: 'edit'; noteId: string };

export type SearchMode = 'topics' | 'notes';


