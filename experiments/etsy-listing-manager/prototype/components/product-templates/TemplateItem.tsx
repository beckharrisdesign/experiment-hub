'use client';

import Link from 'next/link';
import { Template, TemplateType } from '@/types';

interface TemplateItemProps {
  template: Template;
  showDetails?: boolean;
  onEdit?: () => void;
  className?: string;
}

const getTypeLabel = (type: TemplateType) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const getNumberOfItemsLabel = (numberOfItems: 'single' | 'three' | 'five') => {
  return numberOfItems === 'single' ? 'Single' : numberOfItems === 'three' ? 'Three' : 'Five';
};

export default function TemplateItem({ 
  template, 
  showDetails = true,
  onEdit,
  className = ''
}: TemplateItemProps) {
  const imageUrl = template.imageUrl || null;
  const hasImage = !!imageUrl;

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {/* Thumbnail Image */}
      <Link
        href={`/templates/${template.id}`}
        className="flex-shrink-0"
      >
        <div className="w-20 h-20 bg-background-tertiary border border-border rounded flex items-center justify-center overflow-hidden">
          {hasImage ? (
            <img
              src={imageUrl}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-text-muted text-xs text-center px-2">
              {template.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </Link>
      
      {/* Template Info */}
      <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/templates/${template.id}`}
            className="block hover:text-accent-primary transition"
          >
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {template.name}
            </h3>
            {showDetails && (
              <>
                {template.commonInstructions && (
                  <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                    {template.commonInstructions}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  {template.types && template.types.length > 0 && (
                    <span>
                      Type: {template.types
                        .filter((type): type is TemplateType => type === 'digital' || type === 'physical')
                        .map((type) => getTypeLabel(type))
                        .join(', ')}
                    </span>
                  )}
                  {template.numberOfItems && (
                    <span>Items: {getNumberOfItemsLabel(template.numberOfItems)}</span>
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

