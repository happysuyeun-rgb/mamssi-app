import type { ReactNode } from 'react';
import '@styles/page-header.css';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

export default function PageHeader({ title, subtitle, rightSlot }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {rightSlot && <div className="page-header-right">{rightSlot}</div>}
    </div>
  );
}
