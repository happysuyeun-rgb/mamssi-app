import { NavLink } from 'react-router-dom';

const linkStyle: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  gap: 3,
  padding: '8px 4px',
  borderRadius: 12,
  color: 'var(--ms-color-ink-muted)',
  textDecoration: 'none',
  fontSize: 11,
  fontWeight: 600
};

export default function TabBar() {
  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff',
      borderTop: '1px solid var(--ms-color-border-soft)', zIndex: 20
    }}>
      <div style={{
        maxWidth: 720, margin: '0 auto', display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)', gap: 2, padding: '7px 8px 8px'
      }}>
        <NavLink to="/" style={({ isActive }) => ({
          ...linkStyle,
          color: isActive ? 'var(--ms-color-primary)' : linkStyle.color,
          background: isActive ? '#e0f7f5' : 'transparent',
          border: isActive ? '1px solid #99f6e4' : '1px solid transparent'
        })}>
          <span style={{ fontSize: 18 }}>🏡</span>
          <div>홈</div>
        </NavLink>
        <NavLink to="/forest" style={({ isActive }) => ({
          ...linkStyle,
          color: isActive ? 'var(--ms-color-primary)' : linkStyle.color,
          background: isActive ? '#e0f7f5' : 'transparent',
          border: isActive ? '1px solid #99f6e4' : '1px solid transparent'
        })}>
          <span style={{ fontSize: 18 }}>🌿</span>
          <div>공감숲</div>
        </NavLink>
        <NavLink to="/record" style={({ isActive }) => ({
          ...linkStyle,
          color: isActive ? 'var(--ms-color-primary)' : linkStyle.color,
          background: isActive ? '#e0f7f5' : 'transparent',
          border: isActive ? '1px solid #99f6e4' : '1px solid transparent'
        })}>
          <span style={{ fontSize: 18 }}>📝</span>
          <div>기록</div>
        </NavLink>
        <NavLink to="/me" style={({ isActive }) => ({
          ...linkStyle,
          color: isActive ? 'var(--ms-color-primary)' : linkStyle.color,
          background: isActive ? '#e0f7f5' : 'transparent',
          border: isActive ? '1px solid #99f6e4' : '1px solid transparent'
        })}>
          <span style={{ fontSize: 18 }}>🌱</span>
          <div>정원</div>
        </NavLink>
      </div>
    </nav>
  );
}


