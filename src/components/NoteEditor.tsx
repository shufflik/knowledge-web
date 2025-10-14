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
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
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
        <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: -4, marginBottom: 8 }}>{errors.title}</div>
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
        <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>{errors.content}</div>
      )}

      <div className="divider" />

      <div className="row" style={{ gap: 8 }}>
        <input
          className="inline-input"
          placeholder="Ссылка (необязательно)"
          value={url}
          onChange={e => { setUrl(e.target.value); if (errors.content && (e.target.value.trim() || text.trim() || attachments.length > 0)) setErrors(prev => ({ ...prev, content: undefined })); }}
        />
      </div>
      {url.trim().length > 0 && (
        <div className="row" style={{ gap: 8, marginTop: 6, alignItems: 'center' }}>
          <label className="row" style={{ gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={enablePreview} onChange={e => setEnablePreview(e.target.checked)} />
            <span style={{ fontSize: 12, opacity: 0.85 }}>Показывать превью</span>
          </label>
        </div>
      )}
      {enablePreview && url.trim().length > 0 && previewFailed && !loadingPreview && (
        <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>
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

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <input
            className="inline-input"
            placeholder="Выберите тему"
            value={topicPath}
            onChange={e => { setTopicPath(e.target.value); setShowTopicSuggest(true); if (errors.topic && (e.target.value.trim() || topicId)) setErrors(prev => ({ ...prev, topic: undefined })); }}
            onFocus={() => setShowTopicSuggest(true)}
            onBlur={() => setTimeout(() => setShowTopicSuggest(false), 120)}
            aria-invalid={!!errors.topic}
            style={errors.topic ? { borderColor: '#ff6b6b' } : undefined}
          />
          {showTopicSuggest && (
            <div className="dropdown-suggest">
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
                const unique = Array.from(new Set(filtered)).slice(0, 20);
                const items = unique.length > 0 ? unique : [];
                const createItem = q && !paths.some(p => p.toLowerCase() === q) ? q : '';
                return (
                  <>
                    {createItem && (
                      <div
                        className="dropdown-item"
                        onMouseDown={() => {
                          setTopicPath(createItem);
                          if (errors.topic) setErrors(prev => ({ ...prev, topic: undefined }));
                        }}
                      >
                        Создать/выбрать: {createItem}
                      </div>
                    )}
                    {items.map(p => (
                      <div
                        key={p}
                        className="dropdown-item"
                        onMouseDown={() => {
                          setTopicPath(p);
                          if (errors.topic) setErrors(prev => ({ ...prev, topic: undefined }));
                        }}
                      >
                        {p}
                      </div>
                    ))}
                    {!createItem && items.length === 0 && (
                      <div className="dropdown-item" style={{ opacity: 0.7 }}>Нет вариантов</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {errors.topic && (
            <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>{errors.topic}</div>
          )}
        </div>

        <label className="pill" style={{ cursor: 'pointer' }}>
          Прикрепить файлы
          <input type="file" multiple style={{ display: 'none' }} onChange={onFileChange} />
        </label>
      </div>

      {attachments.length > 0 && (
        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
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

      <div className="row" style={{ marginTop: 25, justifyContent: 'flex-end', gap: 8 }}>
        <button className="pill" onClick={onCancel}>Отмена</button>
        <button className="pill" onClick={handleSave}>{isEdit ? 'Сохранить' : 'Создать'}</button>
      </div>
    </div>
  );
}


