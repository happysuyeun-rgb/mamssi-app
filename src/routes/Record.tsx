import { useMemo, useState } from 'react';

const EMOTIONS = [
  { emoji: '😀', label: '기쁨' },
  { emoji: '🙂', label: '차분' },
  { emoji: '😟', label: '불안' },
  { emoji: '😔', label: '우울' },
  { emoji: '😠', label: '화남' },
  { emoji: '😮‍💨', label: '지침' },
  { emoji: '😮', label: '설렘' },
  { emoji: '🌱', label: '성장' },
  { emoji: '🥰', label: '뿌듯' },
  { emoji: '🌀', label: '복잡' },
];

export default function Record() {
  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [selected, setSelected] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [shareForest, setShareForest] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);

  const canShare = isPublic;

  function toggleCategory(cat: string) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function save() {
    if (!selected) {
      alert('오늘의 대표 감정을 하나 골라주세요');
      return;
    }
    if (!note || note.trim().length < 5) {
      alert('감정을 5자 이상으로 가볍게 남겨볼까요?');
      return;
    }
    if (isPublic && shareForest && categories.length === 0) {
      alert('공감숲에 심으려면 카테고리를 1개 이상 선택해 주세요');
      return;
    }
    alert(
      isPublic ? (shareForest ? '기록 저장+공감숲 공유' : '공개 기록 저장') : '비공개 기록 저장'
    );
  }

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          background: 'var(--ms-surface)',
          borderRadius: '20px',
          padding: '14px 16px',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: 'var(--ms-shadow-soft)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--ms-ink-soft)', marginBottom: 6 }}>오늘 날짜</div>
        <div style={{ fontWeight: 500 }}>{today}</div>
      </div>

      <div
        style={{
          background: 'var(--ms-surface)',
          borderRadius: '20px',
          padding: '14px 16px',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: 'var(--ms-shadow-soft)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--ms-ink-soft)', marginBottom: 10 }}>
          오늘은 어떤 하루였나요?{' '}
          <span style={{ fontSize: 11, color: 'var(--ms-ink-muted)' }}>
            가장 크게 느껴진 감정을 1개 선택해 주세요.
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
          {EMOTIONS.map((e) => (
            <button
              key={e.label}
              onClick={() => setSelected(e.label)}
              style={{
                borderRadius: 14,
                border: '1px solid var(--ms-line)',
                background: selected === e.label ? '#E6FFF6' : 'var(--ms-surface-soft)',
                color: selected === e.label ? 'var(--ms-primary)' : 'var(--ms-ink-soft)',
                padding: '8px 4px',
              }}
            >
              <div style={{ fontSize: 20 }}>{e.emoji}</div>
              <div style={{ fontSize: 12 }}>{e.label}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ms-ink-muted)', marginTop: 8 }}>
          {selected
            ? `오늘은 “${selected}” 감정이 가장 크게 느껴졌네요.`
            : '오늘의 대표 감정을 하나 골라주세요.'}
        </div>
      </div>

      <div
        style={{
          background: 'var(--ms-surface)',
          borderRadius: '20px',
          padding: '14px 16px',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: 'var(--ms-shadow-soft)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--ms-ink-soft)', marginBottom: 10 }}>
          오늘 하루에 대해 적어보세요{' '}
          <span style={{ fontSize: 11, color: 'var(--ms-ink-muted)' }}>
            5자 이상부터 저장할 수 있어요.
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder="오늘의 장면, 떠오르는 생각, 남기고 싶은 말을 자유롭게 적어보세요."
          style={{
            width: '100%',
            minHeight: 120,
            borderRadius: 14,
            border: '1px solid var(--ms-line)',
            padding: '10px 11px',
            fontSize: 14,
            resize: 'vertical',
          }}
        />
        <div
          style={{ marginTop: 4, fontSize: 12, color: 'var(--ms-ink-muted)', textAlign: 'right' }}
        >
          {note.length} / 1000
        </div>
      </div>

      <div
        style={{
          background: 'var(--ms-surface)',
          borderRadius: '20px',
          padding: '14px 16px',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: 'var(--ms-shadow-soft)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--ms-ink-soft)', marginBottom: 10 }}>공개 설정</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--ms-ink-soft)' }}>
              {isPublic ? '공개 기록' : '나만 보기'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ms-ink-muted)' }}>
              {isPublic
                ? '공감숲에서 다른 사람도 이 기록을 볼 수 있어요.'
                : '기록은 내 정원에서만 볼 수 있어요.'}
            </div>
          </div>
          <label style={{ position: 'relative', width: 42, height: 24, display: 'inline-block' }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              style={{ display: 'none' }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background: isPublic ? 'var(--ms-primary)' : '#E5E7EB',
                borderRadius: 999,
                transition: '.2s',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: isPublic ? 21 : 3,
                width: 18,
                height: 18,
                borderRadius: 999,
                background: '#fff',
                transition: '.2s',
                boxShadow: '0 1px 3px rgba(15,23,42,0.25)',
              }}
            />
          </label>
        </div>
        <div style={{ marginTop: 10, opacity: canShare ? 1 : 0.5 }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'var(--ms-ink-soft)',
            }}
          >
            <input
              type="checkbox"
              disabled={!canShare}
              checked={shareForest}
              onChange={(e) => setShareForest(e.target.checked)}
            />
            이 기록을 공감숲에 함께 심기
          </label>
        </div>
        {isPublic && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--ms-ink-muted)' }}>
              감정 카테고리
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                '일상',
                '일·커리어',
                '관계',
                '감정 관리',
                '성장 · 도전',
                '쉼 · 회복',
                '기타 / 메모',
              ].map((c) => {
                const on = categories.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: `1px solid ${on ? 'var(--ms-primary)' : 'var(--ms-line)'}`,
                      background: on ? '#E6FFF6' : '#fff',
                      color: on ? 'var(--ms-primary)' : 'var(--ms-ink-soft)',
                      fontSize: 12,
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={save}
        style={{
          background: 'var(--ms-primary)',
          color: '#fff',
          height: 48,
          borderRadius: 14,
          border: 'none',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        저장하기
      </button>
    </section>
  );
}

import EmotionGrid from '@components/record/EmotionGrid';
import PhotoUploader from '@components/record/PhotoUploader';
import CategoryChips from '@components/record/CategoryChips';
import { useState } from 'react';
import toast from '@utils/toast';

export default function Record() {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [shareForest, setShareForest] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  function handleSave() {
    if (!selectedEmotion) return toast('오늘의 대표 감정을 하나 골라주세요');
    if (note.trim().length < 5) return toast('감정을 5자 이상으로 적어주세요');
    if (isPublic && shareForest && categories.length === 0) {
      return toast('공감숲 공유 시 카테고리를 선택해주세요');
    }
    toast(
      isPublic ? (shareForest ? '기록 저장 + 공감숲 공유' : '공개 기록 저장') : '비공개 기록 저장'
    );
  }

  return (
    <section className="ms-section">
      <div className="ms-header-title">오늘의 감정 기록하기</div>
      <div className="ms-header-sub">오늘 하루를 떠올리며, 가볍게 마음을 남겨보세요.</div>

      <div className="ms-section" style={{ marginTop: 12 }}>
        <div className="ms-section-label">오늘은 어떤 하루였나요?</div>
        <EmotionGrid value={selectedEmotion} onChange={setSelectedEmotion} />
      </div>

      <div className="ms-section">
        <div className="ms-section-label">오늘 하루에 대해 적어보세요</div>
        <textarea
          className="ms-textarea"
          maxLength={1000}
          placeholder="오늘의 장면, 떠오르는 생각을 자유롭게 적어보세요."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="ms-textarea-count">{note.length} / 1000</div>
        <PhotoUploader />
      </div>

      <div className="ms-section">
        <div className="ms-section-label">공개 설정</div>
        <div className="ms-toggle-row">
          <div className="ms-toggle-text">
            <div className="ms-toggle-title">{isPublic ? '공개 기록' : '나만 보기'}</div>
          </div>
          <label className="ms-switch">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <span className="ms-switch-slider" />
          </label>
        </div>
        {isPublic && (
          <>
            <div className="ms-checkbox-row">
              <input
                id="shareForest"
                type="checkbox"
                checked={shareForest}
                onChange={(e) => setShareForest(e.target.checked)}
              />
              <label htmlFor="shareForest">이 기록을 공감숲에 심기</label>
            </div>
            <CategoryChips value={categories} onChange={setCategories} />
          </>
        )}
      </div>

      <button className="ms-btn ms-btn-primary" onClick={handleSave}>
        저장하기
      </button>
    </section>
  );
}
