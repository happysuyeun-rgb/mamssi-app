export default function Header() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 20 }}>마음, 씨</div>
        <div style={{ fontSize: 13, color: 'var(--ms-color-ink-muted)' }}>오늘 하루의 마음을 가볍게 돌봐요</div>
      </div>
      <div title="알림" style={{ fontSize: 20 }}>🔔</div>
    </header>
  );
}


