'use client';

import Link from 'next/link';
import { Pattern } from '@/types';

interface PatternItemProps {
  pattern: Pattern & { 
    imageUrl?: string;
  };
  showDetails?: boolean;
  onEdit?: () => void;
  className?: string;
}

export default function PatternItem({ 
  pattern, 
  showDetails = true,
  onEdit,
  className = ''
}: PatternItemProps) {
  // Get image URL - check for imageUrl property or use placeholder
  const imageUrl = pattern.imageUrl || null;
  const hasImage = !!imageUrl;

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {/* Thumbnail Image */}
      <Link
        href={`/patterns/${pattern.id}`}
        className="flex-shrink-0"
      >
        <div className="w-20 h-20 bg-background-tertiary border border-border rounded flex items-center justify-center overflow-hidden">
          {hasImage ? (
            <img
              src={imageUrl}
              alt={pattern.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-text-muted text-xs text-center px-2">
              {pattern.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </Link>
      
      {/* Pattern Info */}
      <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/patterns/${pattern.id}`}
            className="block hover:text-accent-primary transition"
          >
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {pattern.name}
            </h3>
            {showDetails && (
              <>
                {pattern.notes && (
                  <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                    {pattern.notes}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  {pattern.category && (
                    <span>Category: {pattern.category}</span>
                  )}
                  {pattern.difficulty && (
                    <span>Difficulty: {pattern.difficulty}</span>
                  )}
                  {pattern.style && (
                    <span>Style: {pattern.style}</span>
                  )}
                </div>
              </>
            )}
          </Link>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs bg-background-tertiary border border-border rounded hover:bg-background-primary transition flex-shrink-0"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

