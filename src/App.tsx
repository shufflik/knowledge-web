import React from 'react';
import './App.css';
import { MobileLayout } from './components/MobileLayout';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';
import { AppState, EditorMode, Note, SearchMode, Topic } from './types';
import { deleteNote, loadState, saveState, upsertNote, deleteTopic } from './storage';
import { TopBar } from './components/TopBar';
import { truncateMiddle } from './utils';
import { searchNotesApi, saveNoteApi, updateNoteApi, deleteNoteApi, getTopicsApi, ensureTopicPathApi, deleteTopicApi, toggleNoteFavoriteApi } from './api';
import { NoteViewer } from './components/NoteViewer';
import { CloseIcon } from './components/Icons';
import { Toast, ToastMessage } from './components/Toast';

function App() {
  const [state, setState] = React.useState<AppState>(() => loadState());
  const [query, setQuery] = React.useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = React.useState<string | null>(null);
  const [editor, setEditor] = React.useState<EditorMode>({ type: 'closed' });
  const [editingNote, setEditingNote] = React.useState<Note | undefined>(undefined);
  const [searchMode, setSearchMode] = React.useState<SearchMode>('notes');
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const topicsLoadRequested = React.useRef<boolean>(false);
  const [topicsLoading, setTopicsLoading] = React.useState<boolean>(false);
  const [topicsError, setTopicsError] = React.useState<string | null>(null);

  React.useEffect(() => { saveState(state); }, [state]);

  // Настройка кнопки Settings в Telegram
  React.useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.SettingsButton) return;

    const handleSettingsClick = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const screenInfo = `Размер экрана:\n${width} × ${height}px\n\nViewport: ${window.screen.width} × ${window.screen.height}px`;
      
      if (tg.showAlert) {
        tg.showAlert(screenInfo);
      } else {
        alert(screenInfo);
      }
    };

    tg.SettingsButton.show();
    tg.SettingsButton.onClick(handleSettingsClick);

    return () => {
      tg.SettingsButton?.hide();
      tg.SettingsButton?.offClick(handleSettingsClick);
    };
  }, []);

  

  const showToast = (message: string, type: ToastMessage['type'] = 'error') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Загрузка тем из API при старте (guard против StrictMode двойного вызова)
  React.useEffect(() => {
    async function loadTopics() {
      try {
        setTopicsLoading(true);
        setTopicsError(null);
        const { topics } = await getTopicsApi();
        setState(prev => ({ ...prev, topics }));
      } catch (e: any) {
        console.error('Failed to load topics:', e);
        setTopicsError(e?.message || 'Не удалось загрузить темы');
        showToast(e?.message || 'Не удалось загрузить темы');
      } finally {
        setTopicsLoading(false);
      }
    }
    if (!topicsLoadRequested.current) {
      topicsLoadRequested.current = true;
      loadTopics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = () => setEditor({ type: 'create', presetTopicId: selectedTopicId });

  const [results, setResults] = React.useState<Note[]>([]);
  const [hasSearched, setHasSearched] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestSeq = React.useRef<number>(0);
  const [lastSearch, setLastSearch] = React.useState<{ mode: SearchMode; q?: string; topicId?: string | null } | null>(null);
  const [viewingNoteId, setViewingNoteId] = React.useState<string | null>(null);
  const [showEditTopicId, setShowEditTopicId] = React.useState<string | null>(null);
  const [confirmDeleteTopicId, setConfirmDeleteTopicId] = React.useState<string | null>(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = React.useState<string | null>(null);

  // Блокируем скролл основного контента когда открыта модалка
  React.useEffect(() => {
    const hasModal = viewingNoteId || confirmDeleteNoteId || confirmDeleteTopicId;
    if (hasModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewingNoteId, confirmDeleteNoteId, confirmDeleteTopicId]);
  // Moved topic picker UI into TopBar

  const handleSaveNote = async (note: Note) => {
    // Preserve isFavorite from existing note (if any)
    const existed = state.notes.find(n => n.id === note.id);
    const merged: Note = { ...note, isFavorite: existed?.isFavorite ?? note.isFavorite } as Note;
    // optimistic local save with rollback support
    const prevState = state;
    setState(prev => upsertNote(prev, merged));
    setEditor({ type: 'closed' });
    setEditingNote(undefined);
    // mock backend save with loader and toast
    setLoading(true);
    const rid = ++requestSeq.current;
    try {
      const res = merged.id && state.notes.some(n => n.id === merged.id)
        ? await updateNoteApi(merged)
        : await saveNoteApi(merged);
      if (rid !== requestSeq.current) return;
      // refresh list if viewing same topic
      if (selectedTopicId) {
        const searchRes = await searchNotesApi({ q: query.trim(), topicId: selectedTopicId, limit: 50, mode: searchMode });
        if (rid !== requestSeq.current) return;
        setResults(searchRes.items);
        setHasSearched(true);
      }
      if (res.ok) {
        showToast('Заметка сохранена', 'success');
        setError(null);
      } else {
        showToast('Ошибка сохранения заметки');
        setError('Ошибка сохранения');
        // rollback optimistic change
        setState(prevState);
      }
    } catch (e: any) {
      if (rid !== requestSeq.current) return;
      const errorMsg = e?.message || 'Ошибка сохранения заметки';
      showToast(errorMsg);
      setError(errorMsg);
      // rollback optimistic change
      setState(prevState);
    } finally {
      if (rid === requestSeq.current) setLoading(false);
    }
  };

  const ensureTopicPath = async (path: string): Promise<string | null> => {
    const parts = path.split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    
    try {
      const { topicId, createdTopics } = await ensureTopicPathApi({ path });
      
      // Обновляем state только новыми темами
      if (createdTopics.length > 0) {
        setState(prev => ({
          ...prev,
          topics: [...prev.topics, ...createdTopics]
        }));
      }
      
      return topicId;
    } catch (e: any) {
      console.error('Failed to ensure topic path:', e);
      showToast(e?.message || 'Не удалось создать тему');
      return null;
    }
  };

  const handleDeleteNote = async (id: string) => {
    // optimistic remove
    const prevState = state;
    setState(prev => deleteNote(prev, id));
    setLoading(true);
    const rid = ++requestSeq.current;
    try {
      const res = await deleteNoteApi(id);
      if (rid !== requestSeq.current) return;
      if (!res.ok) {
        // revert on failure
        setState(prevState);
        showToast('Ошибка удаления заметки');
        setError('Ошибка удаления');
      } else {
        showToast('Заметка удалена', 'success');
        setError(null);
        if (selectedTopicId) {
          const searchRes = await searchNotesApi({ q: query.trim(), topicId: selectedTopicId, limit: 50, mode: searchMode });
          if (rid !== requestSeq.current) return;
          setResults(searchRes.items);
          setHasSearched(true);
        }
      }
    } catch (e: any) {
      if (rid !== requestSeq.current) return;
      setState(prevState);
      const errorMsg = e?.message || 'Ошибка удаления заметки';
      showToast(errorMsg);
      setError(errorMsg);
    } finally {
      if (rid === requestSeq.current) setLoading(false);
    }
  };

  const handleRenameTopic = (id: string, name: string, parentId: string | null) => {
    setState(prev => {
      const now = Date.now();
      const updated = prev.topics.map(t => t.id === id ? { ...t, name, parentId, updatedAt: now } as Topic : t);
      return { ...prev, topics: updated };
    });
  };

  const handleDeleteTopicLocal = async (id: string) => {
    try {
      await deleteTopicApi(id);
      // Удаляем из локального state
      setState(prev => deleteTopic(prev, id));
      if (selectedTopicId === id) setSelectedTopicId(null);
      setShowEditTopicId(null);
      setConfirmDeleteTopicId(null);
      showToast('Тема удалена', 'success');
    } catch (e: any) {
      // Показываем ошибку пользователю
      const errorMsg = e?.message || 'Не удалось удалить тему';
      showToast(errorMsg);
      setError(errorMsg);
      setConfirmDeleteTopicId(null);
    }
  };

  const handleEditNote = (id: string) => {
    const n = results.find(x => x.id === id) || state.notes.find(x => x.id === id);
    if (!n) return;
    setEditingNote(n);
    setEditor({ type: 'edit', noteId: id });
  };

  const handleToggleFavorite = async (id: string) => {
    const fromResults = results.find(n => n.id === id);
    const fromState = state.notes.find(n => n.id === id);
    const current = fromResults || fromState;
    if (!current) return;
    const next = !current.isFavorite;
    const now = Date.now();
    // optimistic update in results
    setResults(prev => prev.map(n => n.id === id ? { ...n, isFavorite: next, updatedAt: now } : n));
    // optimistic update in local state
    setState(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, isFavorite: next, updatedAt: now } : n)
    }));
    try {
      const { note } = await toggleNoteFavoriteApi(id, next);
      setResults(prev => prev.map(n => n.id === id ? { ...n, isFavorite: note.isFavorite, updatedAt: note.updatedAt } : n));
      setState(prev => ({
        ...prev,
        notes: prev.notes.map(n => n.id === id ? { ...n, isFavorite: note.isFavorite, updatedAt: note.updatedAt } : n)
      }));
    } catch (e: any) {
      showToast(e?.message || 'Не удалось обновить избранное');
      // rollback
      setResults(prev => prev.map(n => n.id === id ? { ...n, isFavorite: !next } : n));
      setState(prev => ({
        ...prev,
        notes: prev.notes.map(n => n.id === id ? { ...n, isFavorite: !next } : n)
      }));
    }
  };


  const center = !selectedTopicId && !hasSearched;

  const handleSearch = async () => {
    const q = query.trim();
    if (q.length === 0 && searchMode === 'notes') {
      setError('Введите текст для поиска');
      setResults([]);
      setHasSearched(false);
      return;
    }
    setError(null);
    setLoading(true);
    const rid = ++requestSeq.current;
    try {
      const res = await searchNotesApi({ q, topicId: selectedTopicId ?? undefined, limit: 50, mode: searchMode });
      if (rid !== requestSeq.current) return;
      setResults(res.items);
      setHasSearched(true);
      setLastSearch({ mode: 'notes', q, topicId: selectedTopicId });
    } catch (e: any) {
      if (rid !== requestSeq.current) return;
      const errorMsg = e?.message || 'Ошибка поиска';
      showToast(errorMsg);
      setError(errorMsg);
      setResults([]);
      setHasSearched(true);
      setLastSearch({ mode: 'notes', q, topicId: selectedTopicId });
    } finally {
      if (rid === requestSeq.current) setLoading(false);
    }
  };

  const handleSelectTopic = async (id: string | null) => {
    setSelectedTopicId(id);
    // Trigger search when a topic is chosen, even if query is empty
    setError(null);
    setLoading(true);
    const rid = ++requestSeq.current;
    try {
      const res = await searchNotesApi({ q: query.trim(), topicId: id ?? undefined, limit: 50, mode: 'topics' });
      if (rid !== requestSeq.current) return;
      setResults(res.items);
      setHasSearched(true);
      setLastSearch({ mode: 'topics', topicId: id });
    } catch (e: any) {
      if (rid !== requestSeq.current) return;
      const errorMsg = e?.message || 'Ошибка поиска по теме';
      showToast(errorMsg);
      setError(errorMsg);
      setResults([]);
      setHasSearched(true);
      setLastSearch({ mode: 'topics', topicId: id });
    } finally {
      if (rid === requestSeq.current) setLoading(false);
    }
  };

  const handleChangeMode = (m: SearchMode) => {
    if (m === 'topics') {
      setSearchMode('topics');
      setQuery('');
      // keep previous results until a new search
      setLoading(false);
      requestSeq.current++;
      // picker is controlled inside TopBar now
    } else {
      setSearchMode('notes');
      setSelectedTopicId(null);
      // keep previous results until a new search
      setLoading(false);
      requestSeq.current++;
      // picker is controlled inside TopBar now
    }
  };

  const isMainMenu = editor.type === 'closed';
  const layoutCenter = editor.type !== 'closed' ? true : center;
  return (
    <>
      <Toast toasts={toasts} onDismiss={dismissToast} />
      <MobileLayout onCreate={onCreate} centerContent={layoutCenter} showCreate={isMainMenu} loading={loading}>
      {editor.type === 'closed' && (
        <>
          <div style={{ position: 'relative', width: '100%', maxWidth: '520px', margin: '0 auto', padding: '0 clamp(1px, 1.3vw, 8px)', boxSizing: 'border-box' }}>
            <TopBar
              topics={state.topics}
              selectedTopicId={selectedTopicId}
              onSelectTopic={handleSelectTopic}
              searchQuery={query}
              onChangeSearch={setQuery}
              mode={searchMode}
              onChangeMode={handleChangeMode}
              center={center}
              onSubmitSearch={handleSearch}
              errorText={error}
              topicsLoading={topicsLoading}
              topicsError={topicsError}
              onEditTopic={(id) => setShowEditTopicId(id)}
            />
            
          </div>
          {showEditTopicId && (() => {
            const t = state.topics.find(x => x.id === showEditTopicId);
            if (!t) return null;
            return (
              <div className="modal-overlay" onClick={() => setShowEditTopicId(null)}>
                <div className="modal-container" onClick={e => e.stopPropagation()}>
                  <div className="card" style={{ minHeight: 200, display: 'flex', flexDirection: 'column' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700 }}>Редактировать тему</div>
                      <button className="icon-button" aria-label="Закрыть" onClick={() => setShowEditTopicId(null)} style={{ width: 36, height: 36 }}>
                        <CloseIcon size={22} />
                      </button>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
                      <input className="inline-input" defaultValue={t.name} placeholder="Название" id="topic-edit-name" />
                      <select className="pill" defaultValue={t.parentId ?? ''} id="topic-edit-parent">
                        <option value="">Без родителя</option>
                        {state.topics.filter(x => x.id !== t.id).map(x => (
                          <option key={x.id} value={x.id}>{x.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="row" style={{ marginTop: 'auto', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="pill"
                        onClick={() => setConfirmDeleteTopicId(t.id)}
                        style={{ background: '#7f1d1d', borderColor: 'rgba(255,255,255,0.08)' }}
                      >
                        Удалить
                      </button>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="pill" onClick={() => {
                          const nameEl = document.getElementById('topic-edit-name') as HTMLInputElement | null;
                          const parentEl = document.getElementById('topic-edit-parent') as HTMLSelectElement | null;
                          const newName = nameEl ? nameEl.value.trim() : t.name;
                          const newParent = parentEl ? (parentEl.value || null) : (t.parentId ?? null);
                          if (!newName) return;
                          handleRenameTopic(t.id, newName, newParent);
                          setShowEditTopicId(null);
                        }}>Сохранить</button>
                      </div>
                    </div>
                  </div>
                </div>
                {confirmDeleteTopicId && confirmDeleteTopicId === t.id && (
                  <div className="modal-overlay" onClick={() => setConfirmDeleteTopicId(null)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                      <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Удалить тему?</div>
                        <div style={{ opacity: 0.85 }}>
                          Заметки останутся без темы, а вложенные темы будут отвязаны.
                        </div>
                        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', gap: 8 }}>
                          <button className="pill" onClick={() => setConfirmDeleteTopicId(null)}>Отмена</button>
                          <button className="pill" style={{ background: '#7f1d1d', borderColor: 'rgba(255,255,255,0.08)' }} onClick={() => handleDeleteTopicLocal(t.id)}>Удалить</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {!center && hasSearched && (
            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
              {lastSearch?.mode === 'notes' && (
                <>
                  Результат поиска по заметке '{lastSearch.q}'
                  {lastSearch.topicId && (() => {
                    const t = state.topics.find(x => x.id === lastSearch.topicId);
                    return t ? <> в теме '{truncateMiddle(t.name, 40)}'</> : null;
                  })()}
                </>
              )}
              {lastSearch?.mode === 'topics' && (() => {
                const t = state.topics.find(x => x.id === lastSearch.topicId);
                return t ? <>Результат поиска по теме '{truncateMiddle(t.name, 40)}'</> : <>Результат поиска по теме</>;
              })()}
            </div>
          )}
          {!center && (
            <div className="list" style={{ marginTop: 16 }}>
              {loading && <div style={{ opacity: 0.7, textAlign: 'center' }}>Поиск...</div>}
              {!loading && !error && results.map((n) => (
                <div key={n.id} className="card-enter">
                  <NoteCard note={n} topics={state.topics} onEdit={handleEditNote} onDelete={(id) => setConfirmDeleteNoteId(id)} onOpen={setViewingNoteId} />
                </div>
              ))}
              {!loading && !error && results.length === 0 && hasSearched && (
                <div style={{ opacity: 0.7, textAlign: 'center' }}>Нет заметок</div>
              )}
            </div>
          )}
          {viewingNoteId && (() => {
            // Ищем заметку в результатах поиска или в локальном state
            const n = results.find(x => x.id === viewingNoteId) || state.notes.find(x => x.id === viewingNoteId);
            if (!n) return null;
            return (
              <div className="modal-overlay" onClick={() => setViewingNoteId(null)}>
                <div className="modal-container" onClick={e => e.stopPropagation()}>
                  <NoteViewer
                    note={n}
                    topics={state.topics}
                    onClose={() => setViewingNoteId(null)}
                    onEdit={(id) => { setViewingNoteId(null); handleEditNote(id); }}
                    onDelete={(id) => { setConfirmDeleteNoteId(id); }}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </div>
              </div>
            );
          })()}
          {confirmDeleteNoteId && (() => {
            // Ищем заметку в результатах поиска или в локальном state
            const n = results.find(x => x.id === confirmDeleteNoteId) || state.notes.find(x => x.id === confirmDeleteNoteId);
            if (!n) return null;
            return (
              <div className="modal-overlay" onClick={() => setConfirmDeleteNoteId(null)}>
                <div className="modal-container" onClick={e => e.stopPropagation()}>
                  <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Удалить заметку?</div>
                    <div style={{ opacity: 0.85 }}>
                      Заметка "{truncateMiddle(n.title || 'без названия', 40)}" будет удалена.
                    </div>
                    <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', gap: 8 }}>
                      <button className="pill" onClick={() => setConfirmDeleteNoteId(null)}>Отмена</button>
                      <button
                        className="pill"
                        style={{ background: '#7f1d1d', borderColor: 'rgba(255,255,255,0.08)' }}
                        onClick={() => {
                          const id = confirmDeleteNoteId;
                          setConfirmDeleteNoteId(null);
                          if (!id) return;
                          handleDeleteNote(id);
                          if (viewingNoteId === id) setViewingNoteId(null);
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
      {editor.type !== 'closed' && (
        <NoteEditor
          mode={editor}
          topics={state.topics}
          note={editingNote}
          onCancel={() => { setEditor({ type: 'closed' }); setEditingNote(undefined); }}
          onSave={handleSaveNote}
          onEnsureTopicPath={ensureTopicPath}
        />
      )}
    </MobileLayout>
    </>
  );
}

export default App;
