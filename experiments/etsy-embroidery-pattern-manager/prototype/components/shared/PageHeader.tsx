'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  backButton?: boolean | (() => void);
  children?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  action,
  backButton,
  children,
  className = '',
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof backButton === 'function') {
      backButton();
    } else {
      router.back();
    }
  };

  // If children are provided, use them for completely custom layout
  if (children) {
    return (
      <header className={`mb-8 ${className}`}>
        {backButton && (
          <button
            onClick={handleBack}
            className="text-text-secondary hover:text-text-primary transition mb-4"
          >
            ← Back
          </button>
        )}
        {children}
      </header>
    );
  }

  // Standard layout with title, description, and optional action
  // Title is required when not using children
  if (!title) {
    console.warn('PageHeader: title is required when children are not provided');
    return null;
  }

  return (
    <header className={`mb-8 ${className}`}>
      {backButton && (
        <button
          onClick={handleBack}
          className="text-text-secondary hover:text-text-primary transition mb-4"
        >
          ← Back
        </button>
      )}
      <div className={action ? 'flex items-start justify-between gap-4' : ''}>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-text-secondary mt-2">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </header>
  );
}

