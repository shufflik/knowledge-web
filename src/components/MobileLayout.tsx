import React from 'react';
import './MobileLayout.css';

type Props = {
  children: React.ReactNode;
  onCreate: () => void;
  createLabel?: string;
  centerContent?: boolean;
  showCreate?: boolean;
  loading?: boolean;
};

export function MobileLayout({ children, onCreate, createLabel = 'Создать', centerContent, showCreate = true, loading }: Props) {
  return (
    <div className={`screen${centerContent ? ' center-mode' : ''}`}>
      {loading && (
        <div className="overlay-blocker" role="progressbar" aria-busy="true">
          <div className="spinner" />
        </div>
      )}
      <div className={`screen-content${centerContent ? ' center' : ''}`}>
        {children}
      </div>
      {showCreate && (
        <div className="bottom-bar">
          <button className="primary-button" onClick={onCreate}>{createLabel}</button>
        </div>
      )}
    </div>
  );
}


