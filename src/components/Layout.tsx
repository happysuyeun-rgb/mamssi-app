import React, { type ReactNode } from 'react';
import Header from './Header';
import TabBar from './TabBar';

type LayoutProps = {
  children: ReactNode;
  hideHeader?: boolean;
  contentPadding?: string;
};

export default function Layout({
  children,
  hideHeader = true,
  contentPadding = '16px 16px 96px'
}: LayoutProps) {
  return (
    <div className="ms-app-shell">
      <div className="ms-app" style={{ padding: contentPadding }}>
        {!hideHeader && <Header />}
        <main style={{ paddingTop: hideHeader ? 0 : 10 }}>
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}


