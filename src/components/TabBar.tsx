import { NavLink } from 'react-router-dom';

const itemStyle: React.CSSProperties = {
  textAlign: 'center',
  textDecoration: 'none',
  color: 'var(--ms-ink-muted)'
};

export default function TabBar() {
  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff',
      borderTop: '1px solid var(--ms-line)', zIndex: 20
    }}>
      <div style={{
        maxWidth: 720, margin: '0 auto', height: 56, display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)', alignItems: 'center'
      }}>
        <NavLink to="/" end style={({ isActive }) => ({
          ...itemStyle,
          color: isActive ? 'var(--ms-primary)' : 'var(--ms-ink-muted)'
        })}>
          <div style={{ fontSize: 20 }}>🏡</div><div style={{ fontSize: 11 }}>홈</div>
        </NavLink>
        <NavLink to="/record" style={({ isActive }) => ({
          ...itemStyle,
          color: isActive ? 'var(--ms-primary)' : 'var(--ms-ink-muted)'
        })}>
          <div style={{ fontSize: 20 }}>📝</div><div style={{ fontSize: 11 }}>기록</div>
        </NavLink>
        <NavLink to="/forest" style={({ isActive }) => ({
          ...itemStyle,
          color: isActive ? 'var(--ms-primary)' : 'var(--ms-ink-muted)'
        })}>
          <div style={{ fontSize: 20 }}>🌿</div><div style={{ fontSize: 11 }}>공감숲</div>
        </NavLink>
        <NavLink to="/mypage" style={({ isActive }) => ({
          ...itemStyle,
          color: isActive ? 'var(--ms-primary)' : 'var(--ms-ink-muted)'
        })}>
          <div style={{ fontSize: 20 }}>🌸</div><div style={{ fontSize: 11 }}>마이</div>
        </NavLink>
      </div>
    </nav>
  );
}











