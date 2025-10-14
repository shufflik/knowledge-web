import React from 'react';
import { Note, Topic } from '../types';
import { formatDate, truncateMiddle } from '../utils';
import { CloseIcon, EditIcon, TrashIcon, StarIcon, TopicIcon } from './Icons';

type Props = {
  note: Note;
  topics: Topic[];
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
};

export function NoteViewer({ note, topics, onClose, onEdit, onDelete, onToggleFavorite }: Props) {
  const topic = note.topicId ? topics.find(t => t.id === note.topicId) : undefined;
  const descriptionRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useLayoutEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const update = () => {
      el.style.height = 'auto';
      const next = clamp(el.scrollHeight, 90, 150);
      el.style.height = `${next}px`;
    };
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [note.text]);
  return (
    <div className="card" style={{ width: '100%', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="row" style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          {topic && (
            <span
              className="topic-badge"
              style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={topic.name}
            >
              <TopicIcon size={14} /> {truncateMiddle(topic.name, 40)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'center' }}>{formatDate(note.createdAt)}</div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть"><CloseIcon /></button>
        </div>
      </div>

      <div className="viewer-inner">
        {note.imageUrl && (
          <div className="viewer-preview">
            <img src={note.imageUrl} alt="preview" />
          </div>
        )}

        {note.title && (
          <div
            className="viewer-title"
            style={{
              fontWeight: 800,
              marginTop: 12,
              fontSize: 20,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={note.title}
          >
            {truncateMiddle(note.title, 40)}
          </div>
        )}

        {/* <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>Описание</div> */}
        {note.text.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <textarea
              ref={descriptionRef}
              className="inline-input textarea"
              readOnly
              value={note.text || ''}
              style={{
                minHeight: 90,
                maxHeight: 150,
                overflowY: 'auto',
                resize: 'none'
              }}
            />
          </div>
        )}


        {note.attachments.length > 0 && (
          <>
            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.8 }}>Файлы</div>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {note.attachments.map(att => (
                <a key={att.id} className="pill" href={att.dataUrl} download={att.name}>
                  {att.name}
                </a>
              ))}
            </div>
          </>
        )}

        {note.url && (
          <div style={{ margin: '50px 0 15px 0', display: 'flex', justifyContent: 'center' }}>
            <a className="pill" href={note.url} target="_blank" rel="noreferrer">Открыть</a>
          </div>
        )}
      </div>

      <div className="viewer-footer">
        <button className="icon-button" onClick={() => onDelete(note.id)} aria-label="Удалить"><TrashIcon /></button>
        <button
          className="icon-button"
          onClick={() => onToggleFavorite && onToggleFavorite(note.id)}
          aria-label="Избранное"
          aria-pressed={!!note.isFavorite}
          title={note.isFavorite ? 'Убрать из избранного' : 'В избранное'}
        >
          <StarIcon color={note.isFavorite ? '#ffd166' : '#666'} />
        </button>
        <button className="icon-button" onClick={() => onEdit(note.id)} aria-label="Редактировать"><EditIcon /></button>
      </div>
    </div>
  );
}


