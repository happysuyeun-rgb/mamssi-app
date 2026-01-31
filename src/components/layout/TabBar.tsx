import { NavLink } from 'react-router-dom';
import HomeIcon from '@components/icons/HomeIcon';
import CommunityIcon from '@components/icons/CommunityIcon';
import CalendarIcon from '@components/icons/CalendarIcon';
import MyProfileIcon from '@components/icons/MyProfileIcon';

const linkStyle: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  gap: 3,
  padding: '8px 4px',
  textDecoration: 'none',
  fontSize: 11,
  fontWeight: 600,
};

export default function TabBar() {
  return (
    <nav
      className="ms-tabbar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#FFFFFF',
        borderTop: '1px solid var(--ms-color-border-nav, #D6E2DD)',
        boxShadow: '0 -6px 18px rgba(0,0,0,0.04)',
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 2,
          padding: '7px 8px calc(8px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'ms-tabbar-link active' : 'ms-tabbar-link'
          }
          style={linkStyle}
        >
          {({ isActive }) => (
            <>
              <HomeIcon isActive={isActive} size={24} />
              <div>홈</div>
            </>
          )}
        </NavLink>
        <NavLink
          to="/forest"
          className={({ isActive }) =>
            isActive ? 'ms-tabbar-link active' : 'ms-tabbar-link'
          }
          style={linkStyle}
        >
          {({ isActive }) => (
            <>
              <CommunityIcon isActive={isActive} size={24} />
              <div>공감숲</div>
            </>
          )}
        </NavLink>
        <NavLink
          to="/record"
          className={({ isActive }) =>
            isActive ? 'ms-tabbar-link active' : 'ms-tabbar-link'
          }
          style={linkStyle}
        >
          {({ isActive }) => (
            <>
              <CalendarIcon isActive={isActive} size={24} />
              <div>기록</div>
            </>
          )}
        </NavLink>
        <NavLink
          to="/mypage"
          className={({ isActive }) =>
            isActive ? 'ms-tabbar-link active' : 'ms-tabbar-link'
          }
          style={linkStyle}
        >
          {({ isActive }) => (
            <>
              <MyProfileIcon isActive={isActive} size={24} />
              <div>정원</div>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
