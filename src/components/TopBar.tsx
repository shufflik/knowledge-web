import React from 'react';
import './TopBar.css';
import { SearchIcon } from './Icons';
import { TopicNavigator } from './TopicNavigator';
import { SearchMode, Topic } from '../types';
import { truncateMiddle } from '../utils';

type Props = {
  topics: Topic[];
  selectedTopicId: string | null;
  onSelectTopic: (id: string | null) => void;
  searchQuery: string;
  onChangeSearch: (q: string) => void;
  mode: SearchMode;
  onChangeMode: (m: SearchMode) => void;
  center?: boolean;
  onSubmitSearch?: () => void;
  errorText?: string | null;
  onEditTopic?: (id: string) => void;
  topicsLoading?: boolean;
  topicsError?: string | null;
};

export function TopBar({ topics, selectedTopicId, onSelectTopic, searchQuery, onChangeSearch, mode, onChangeMode, center, onSubmitSearch, errorText, onEditTopic, topicsLoading, topicsError }: Props) {
  const [showTopicPicker, setShowTopicPicker] = React.useState(false);
  const selectedTopicName = React.useMemo(() => (
    topics.find(t => t.id === selectedTopicId)?.name ?? null
  ), [topics, selectedTopicId]);

  return (
    <div className="topbar">
      <div className={`topbar-inner ${center ? 'center-onboarding' : ''}`}>
        {/* Unified field */}
        <div className="field-col">
          <div className="input-ghost" style={{ flex: 1 }}>
            <select className="pill" value={mode} onChange={e => onChangeMode(e.target.value as SearchMode)} style={{ marginLeft: 6 }}>
              <option value="notes">Заметки</option>
              <option value="topics">Темы</option>
            </select>
            <input
              placeholder={mode === 'notes' ? 'Поиск по заголовкам' : 'Поиск по темам'}
              value={searchQuery}
              onChange={e => onChangeSearch(e.target.value)}
            />
            <button className="chip" aria-label="Найти" onClick={onSubmitSearch}><SearchIcon /></button>
          </div>
          {/* {errorText && <div className="error-text">{errorText}</div>} */}
          {mode === 'topics' && (
            <div style={{ marginTop: 'clamp(5px, 2vw, 8px)', textAlign: 'center' }}>
              {!showTopicPicker ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    className="pill"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box'
                    }}
                    onClick={() => setShowTopicPicker(true)}
                  >
                    {selectedTopicName ? truncateMiddle(selectedTopicName, 40) : 'Выберите тему'} 
                    <span style={{ opacity: 0.8, marginLeft: 'clamp(3px, 1.3vw, 6px)' }}>▼</span>
                  </button>
                </div>
              ) : (
                <div className="topic-dropdown">
                  <div style={{ textAlign: 'center', marginBottom: 'clamp(3px, 1.3vw, 6px)' }}>
                    <button className="pill" onClick={() => setShowTopicPicker(false)}>Свернуть</button>
                  </div>
                  {topicsLoading ? (
                    <div className="card" style={{ textAlign: 'center' }}>
                      <div className="spinner spinner--sm" style={{ margin: 'clamp(8px, 2.7vw, 12px) auto' }} />
                      <div style={{ opacity: 0.8, fontSize: 'clamp(11px, 2.4vw, 13px)' }}>Загрузка тем…</div>
                    </div>
                  ) : topicsError ? (
                    <div className="card" style={{ textAlign: 'center' }}>
                      <div style={{ color: '#ff6b6b', marginBottom: 'clamp(3px, 1.3vw, 6px)' }}>Не удалось загрузить темы</div>
                    </div>
                  ) : topics.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', opacity: 0.8 }}>Тем нет</div>
                  ) : (
                    <TopicNavigator topics={topics} onSelectTopic={(id) => { onSelectTopic(id); setShowTopicPicker(false); }} onEditTopic={onEditTopic} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


