import React from 'react';
import { Topic } from '../types';
import { EditIcon } from './Icons';

type Props = {
  topics: Topic[];
  onSelectTopic: (id: string | null) => void;
  onEditTopic?: (id: string) => void;
};

function findById(topics: Topic[], id: string | null): Topic | undefined {
  return id ? topics.find(t => t.id === id) : undefined;
}

function truncateMiddle(text: string, maxLen = 40): string {
  if (text.length <= maxLen) return text;
  const keep = maxLen - 2; // account for '..'
  const left = Math.ceil(keep / 2);
  const right = Math.floor(keep / 2);
  return text.slice(0, left) + '..' + text.slice(text.length - right);
}

export function TopicNavigator({ topics, onSelectTopic, onEditTopic }: Props) {
  const [currentId, setCurrentId] = React.useState<string | null>(null);

  const current = findById(topics, currentId) || null;
  const children = React.useMemo(
    () => topics.filter(t => (t.parentId ?? null) === (currentId ?? null)),
    [topics, currentId]
  );

  const hasChildren = (id: string) => topics.some(t => t.parentId === id);
  const parentOf = (id: string | null) => (id ? (topics.find(t => t.id === id)?.parentId ?? null) : null);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: current ? 15 : 0 }}>
        {current ? (
          <button className="pill" onClick={() => setCurrentId(parentOf(currentId))}>
            ← Назад
          </button>
        ) : (
          <div />
        )}
        {current && (
          <button
            className="pill"
            onClick={() => onSelectTopic(current.id)}
            style={{
              display: 'inline-flex',
              justifyContent: 'center',
              minWidth: '40%',
              width: 'fit-content',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={`Искать в «${current.name}»`}
          >
            Искать в «{truncateMiddle(current.name)}»
          </button>
        )}
      </div>

      <div className="topic-list">
        {children.length === 0 && (
          <div style={{ opacity: 0.7 }}>Нет вложенных тем</div>
        )}
        {children.map(c => (
          <div
            key={c.id}
            className="row"
            style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '3px 0' }}
            onClick={() => (hasChildren(c.id) ? setCurrentId(c.id) : onSelectTopic(c.id))}
          >
            <div className="pill" style={{ pointerEvents: 'none' }}>{truncateMiddle(c.name)}</div>
            <div className="row" style={{ alignItems: 'center', gap: 6 }}>
              {onEditTopic && (
                <button
                  className="icon-button"
                  title="Редактировать тему"
                  aria-label="Редактировать тему"
                  onClick={(e) => { e.stopPropagation(); onEditTopic(c.id); }}
                >
                  <EditIcon />
                </button>
              )}
              {hasChildren(c.id) && <span style={{ opacity: 0.7 }}>›</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


