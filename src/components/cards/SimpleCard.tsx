import { type ReactNode } from 'react';
import './SimpleCard.css';

type SimpleCardProps = {
  title: string;
  description?: string;
  onClick?: () => void;
  children?: ReactNode;
};

export default function SimpleCard({ title, description, onClick, children }: SimpleCardProps) {
  return (
    <div
      className={`simple-card ${onClick ? 'simple-card--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="simple-card__content">
        <div className="simple-card__text">
          <div className="simple-card__title">{title}</div>
          {description && (
            <div className="simple-card__description">{description}</div>
          )}
          {children && (
            <div className="simple-card__children">{children}</div>
          )}
        </div>
        {onClick && (
          <div className="simple-card__arrow">›</div>
        )}
      </div>
    </div>
  );
}










