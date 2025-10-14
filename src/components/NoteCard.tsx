import { Note, Topic } from '../types';
import { truncateMiddle } from '../utils';
import { FileIcon, LinkIcon, NoImageIcon, TextDocIcon } from './Icons';

type Props = {
  note: Note;
  topics: Topic[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen?: (id: string) => void;
};

export function NoteCard({ note, topics, onEdit, onDelete, onOpen }: Props) {
  const topic = note.topicId ? topics.find(t => t.id === note.topicId) : undefined;

  return (
    <div className="card" onClick={() => onOpen && onOpen(note.id)} style={{ cursor: onOpen ? 'pointer' : undefined }}>
      <div className="card-thumb">
        {note.imageUrl ? (
          <img src={note.imageUrl} alt={note.title || 'preview'} />
        ) : (
          <NoImageIcon />
        )}
      </div>
      {note.title && (
        <div style={{ fontWeight: 700, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {truncateMiddle(note.title, 50)}
        </div>
      )}
      <div className="card-footer">
        <div className="badges-row">
          {topic && <span className="topic-badge">{truncateMiddle(topic.name, 30)}</span>}
        </div>
        <div className="badges-row">
          {note.url && <span title="Ссылка"><LinkIcon size={16} /></span>}
          {note.attachments.length > 0 && <span title="Файлы"><FileIcon size={16} /></span>}
          {note.text && note.text.trim().length > 0 && <span title="Текст"><TextDocIcon size={16} /></span>}
        </div>
      </div>
    </div>
  );
}


