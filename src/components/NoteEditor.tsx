import React from 'react';
import { Attachment, EditorMode, Note, Topic } from '../types';
import { generateId, fetchLinkPreview, isValidUrl } from '../utils';

type Props = {
  mode: EditorMode;
  topics: Topic[];
  note?: Note;
  onCancel: () => void;
  onSave: (note: Note) => void;
  onEnsureTopicPath: (path: string) => Promise<string | null> | string | null;
};

export function NoteEditor({ mode, topics, note, onCancel, onSave, onEnsureTopicPath }: Props) {
  const isEdit = mode.type === 'edit' && note;
  const [title, setTitle] = React.useState<string>(note?.title ?? '');
  const [text, setText] = React.useState<string>(note?.text ?? '');
  const [url, setUrl] = React.useState<string>(note?.url ?? '');
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(note?.imageUrl);
  const [topicId] = React.useState<string | null>(note?.topicId ?? null);
  const [topicPath, setTopicPath] = React.useState<string>('');
  const [attachments, setAttachments] = React.useState<Attachment[]>(note?.attachments ?? []);
  const [loadingPreview, setLoadingPreview] = React.useState<boolean>(false);
  const [showTopicSuggest, setShowTopicSuggest] = React.useState<boolean>(false);
  const [enablePreview, setEnablePreview] = React.useState<boolean>(true);
  const [previewFailed, setPreviewFailed] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<{ title?: string; topic?: string; content?: string }>({});

  const textRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Block body scroll when topic modal is open
  React.useEffect(() => {
    if (showTopicSuggest) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTopicSuggest]);

  React.useLayoutEffect(() => {
    const el = textRef.current;
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
  }, [text]);

  React.useEffect(() => {
    if (!enablePreview) {
      setImageUrl(undefined);
      setPreviewFailed(false);
      return;
    }
    if (url && isValidUrl(url)) {
      setLoadingPreview(true);
      setPreviewFailed(false);
      fetchLinkPreview(url)
        .then((res) => {
          if (res?.image) {
            setImageUrl(res.image);
            setPreviewFailed(false);
          } else {
            setImageUrl(undefined);
            setPreviewFailed(true);
          }
        })
        .catch(() => {
          setImageUrl(undefined);
          setPreviewFailed(true);
        })
        .finally(() => setLoadingPreview(false));
    } else {
      setImageUrl(undefined);
      setPreviewFailed(false);
    }
  }, [url, enablePreview]);

  const handleUploadPreviewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read error'));
        reader.readAsDataURL(file);
      });
      setImageUrl(dataUrl);
      setPreviewFailed(false);
    } finally {
      inputEl.value = '';
    }
  };

  // Build full path for existing topic to prefill
  React.useEffect(() => {
    if (!topicId) {
      setTopicPath('');
      return;
    }
    const idToTopic = new Map<string, Topic>();
    topics.forEach(t => idToTopic.set(t.id, t));
    const parts: string[] = [];
    let cur: Topic | undefined = idToTopic.get(topicId);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentId ? idToTopic.get(cur.parentId) : undefined;
    }
    setTopicPath(parts.join('/'));
  }, [topicId, topics]);

  // Clear topic validation error once user provides a path or has a preset topic
  React.useEffect(() => {
    if (errors.topic && (topicPath.trim().length > 0 || !!topicId)) {
      setErrors(prev => ({ ...prev, topic: undefined }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicPath, topicId, errors.topic]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const files = inputEl.files;
    if (!files || files.length === 0) return;
    const list = await Promise.all(Array.from(files).map(async f => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read error'));
        reader.readAsDataURL(f);
      });
      return {
        id: generateId('att'),
        name: f.name,
        mimeType: f.type || 'application/octet-stream',
        size: f.size,
        dataUrl,
        createdAt: Date.now(),
      } as Attachment;
    }));
    setAttachments(prev => [...prev, ...list]);
    if (errors.content) setErrors(prev => ({ ...prev, content: undefined }));
    inputEl.value = '';
  };

  const handleSave = async () => {
    const now = Date.now();
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();
    const trimmedUrl = url.trim();
    const pathTrimmed = topicPath.trim();

    // validate only in create mode, per requirement
    if (mode.type === 'create') {
      const nextErrors: { title?: string; topic?: string; content?: string } = {};
      if (!trimmedTitle) nextErrors.title = 'Заголовок обязателен';
      const hasPresetTopic = !!topicId;
      const willCreateTopic = pathTrimmed.length > 0;
      if (!hasPresetTopic && !willCreateTopic) nextErrors.topic = 'Выберите тему или введите путь';
      const hasContent = !!trimmedText || !!trimmedUrl || attachments.length > 0;
      if (!hasContent) nextErrors.content = 'Добавьте описание, ссылку или файл';
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;
    }

    let finalTopicId: string | null = topicId;
    if (pathTrimmed.length > 0) {
      const ensured = await onEnsureTopicPath(pathTrimmed);
      if (!ensured) {
        setErrors(prev => ({ ...prev, topic: 'Не удалось определить тему по пути' }));
        return;
      }
      finalTopicId = ensured;
    }

    const base: Note = {
      id: isEdit ? (note as Note).id : generateId('note'),
      title: trimmedTitle,
      text: trimmedText,
      url: trimmedUrl || undefined,
      imageUrl: enablePreview ? (imageUrl || undefined) : undefined,
      topicId: finalTopicId,
      attachments,
      createdAt: isEdit ? (note as Note).createdAt : now,
      updatedAt: now,
    };
    onSave(base);
  };

  return (
    <div className="card">
      <div className="row" style={{ gap: 'clamp(6px, 2vw, 8px)', marginBottom: 'clamp(6px, 2vw, 8px)' }}>
        <input
          className="inline-input"
          placeholder="Заголовок"
          value={title}
          onChange={e => { setTitle(e.target.value); if (errors.title && e.target.value.trim()) setErrors(prev => ({ ...prev, title: undefined })); }}
          aria-invalid={!!errors.title}
          style={errors.title ? { borderColor: '#ff6b6b' } : undefined}
        />
      </div>
      {errors.title && (
        <div style={{ color: '#ff6b6b', fontSize: 'clamp(11px, 2.4vw, 12px)', marginTop: 'clamp(-3px, -1vw, -4px)', marginBottom: 'clamp(6px, 2vw, 8px)' }}>{errors.title}</div>
      )}
      <textarea
        ref={textRef}
        className="inline-input textarea"
        placeholder="Текст заметки"
        value={text}
        onChange={e => { setText(e.target.value); if (errors.content && (e.target.value.trim() || url.trim() || attachments.length > 0)) setErrors(prev => ({ ...prev, content: undefined })); }}
        style={{
          minHeight: 90,
          maxHeight: 150,
          overflowY: 'auto',
          resize: 'none'
        }}
      />
      {errors.content && (
        <div style={{ color: '#ff6b6b', fontSize: 'clamp(11px, 2.4vw, 12px)', marginTop: 'clamp(3px, 1vw, 4px)' }}>{errors.content}</div>
      )}

      <div className="divider" />

      <div className="row" style={{ gap: 'clamp(6px, 2vw, 8px)' }}>
        <input
          className="inline-input"
          placeholder="Ссылка (необязательно)"
          value={url}
          onChange={e => { setUrl(e.target.value); if (errors.content && (e.target.value.trim() || text.trim() || attachments.length > 0)) setErrors(prev => ({ ...prev, content: undefined })); }}
        />
      </div>
      {url.trim().length > 0 && (
        <div className="row" style={{ gap: 'clamp(6px, 2vw, 8px)', marginTop: 'clamp(4px, 1.5vw, 6px)', alignItems: 'center' }}>
          <label className="row" style={{ gap: 'clamp(4px, 1.5vw, 6px)', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={enablePreview} onChange={e => setEnablePreview(e.target.checked)} />
            <span style={{ fontSize: 'clamp(11px, 2.4vw, 12px)', opacity: 0.85 }}>Показывать превью</span>
          </label>
        </div>
      )}
      {enablePreview && url.trim().length > 0 && previewFailed && !loadingPreview && (
        <div style={{ color: '#ff6b6b', fontSize: 'clamp(11px, 2.4vw, 12px)', marginTop: 'clamp(3px, 1vw, 4px)' }}>
          Невозможно получить превью по ссылке. Вы можете загрузить фото вручную.
        </div>
      )}
      {enablePreview && (loadingPreview || imageUrl || previewFailed) && (
        <div className="editor-preview">
          <div className="editor-preview-thumb">
            {loadingPreview && <div className="spinner" />}
            {!loadingPreview && imageUrl && <img src={imageUrl} alt="preview" />}
            {!loadingPreview && !imageUrl && previewFailed && (
              <label className="pill" style={{ cursor: 'pointer' }}>
                Загрузить фото
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadPreviewImage} />
              </label>
            )}
          </div>
        </div>
      )}

      <div className="divider" />

      <div className="row" style={{ gap: 'clamp(6px, 2vw, 8px)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="inline-input"
            placeholder="Выберите тему"
            value={topicPath}
            onChange={e => { setTopicPath(e.target.value); if (errors.topic && (e.target.value.trim() || topicId)) setErrors(prev => ({ ...prev, topic: undefined })); }}
            onFocus={() => setShowTopicSuggest(true)}
            aria-invalid={!!errors.topic}
            style={errors.topic ? { borderColor: '#ff6b6b' } : undefined}
            readOnly
            onClick={() => setShowTopicSuggest(true)}
          />
          {errors.topic && (
            <div style={{ color: '#ff6b6b', fontSize: 'clamp(11px, 2.4vw, 12px)', marginTop: 'clamp(3px, 1vw, 4px)' }}>{errors.topic}</div>
          )}
        </div>

        <label className="pill" style={{ cursor: 'pointer' }}>
          Прикрепить файлы
          <input type="file" multiple style={{ display: 'none' }} onChange={onFileChange} />
        </label>
      </div>

      {/* Topic selector modal */}
      {showTopicSuggest && (
        <div className="modal-overlay" onClick={() => setShowTopicSuggest(false)}>
          <div className="topic-modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Выберите или создайте тему</div>
              <input
                className="inline-input"
                placeholder="Поиск или создание темы..."
                value={topicPath}
                onChange={e => { setTopicPath(e.target.value); if (errors.topic && (e.target.value.trim() || topicId)) setErrors(prev => ({ ...prev, topic: undefined })); }}
                autoFocus
              />
            </div>
            <div style={{ 
              maxHeight: 'min(400px, 50vh)', 
              overflowY: 'auto', 
              overflowX: 'hidden',
              overscrollBehavior: 'contain'
            }}>
              {(() => {
                const idToTopic = new Map<string, Topic>();
                topics.forEach(t => idToTopic.set(t.id, t));
                const pathCache = new Map<string, string>();
                const buildPath = (id: string): string => {
                  if (pathCache.has(id)) return pathCache.get(id)!;
                  const tp = idToTopic.get(id);
                  if (!tp) return '';
                  const p = tp.parentId ? buildPath(tp.parentId) : '';
                  const result = p ? `${p}/${tp.name}` : tp.name;
                  pathCache.set(id, result);
                  return result;
                };
                const paths = topics.map(t => buildPath(t.id));
                const q = topicPath.trim().toLowerCase();
                const filtered = q ? paths.filter(p => p.toLowerCase().includes(q)) : paths;
                const unique = Array.from(new Set(filtered)).slice(0, 50);
                const items = unique.length > 0 ? unique : [];
                const createItem = q && !paths.some(p => p.toLowerCase() === q) ? q : '';
                return (
                  <>
                    {createItem && (
                      <div
                        className="dropdown-item"
                        onClick={() => {
                          setTopicPath(createItem);
                          setShowTopicSuggest(false);
                          if (errors.topic) setErrors(prev => ({ ...prev, topic: undefined }));
                        }}
                        style={{ 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          fontWeight: 500
                        }}
                      >
                        ✨ Создать: {createItem}
                      </div>
                    )}
                    {items.map(p => (
                      <div
                        key={p}
                        className="dropdown-item"
                        onClick={() => {
                          setTopicPath(p);
                          setShowTopicSuggest(false);
                          if (errors.topic) setErrors(prev => ({ ...prev, topic: undefined }));
                        }}
                      >
                        {p}
                      </div>
                    ))}
                    {!createItem && items.length === 0 && (
                      <div className="dropdown-item" style={{ opacity: 0.7, textAlign: 'center' }}>
                        {q ? 'Нет совпадений' : 'Нет тем'}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button className="pill" onClick={() => setShowTopicSuggest(false)} style={{ width: '100%' }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="row" style={{ marginTop: 'clamp(6px, 2vw, 8px)', flexWrap: 'wrap', gap: 'clamp(6px, 2vw, 8px)' }}>
          {attachments.map(att => (
            <span key={att.id} className="pill chip-file">
              {att.name}
              <button
                type="button"
                className="chip-close"
                aria-label="Удалить файл"
                onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: 'clamp(12px, 5.8vw, 25px)', justifyContent: 'flex-end', gap: 'clamp(6px, 2vw, 8px)' }}>
        <button className="pill" onClick={onCancel}>Отмена</button>
        <button className="pill" onClick={handleSave}>{isEdit ? 'Сохранить' : 'Создать'}</button>
      </div>
    </div>
  );
}


