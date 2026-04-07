import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';

export type SeedPillVariant =
  | 'default'
  | 'filter-plain'
  | 'filter-selected'
  | 'badge'
  | 'filter-badge-icon';
export type SeedPillTone = 'attention' | 'warning' | 'success' | 'neutral';
export type SeedPillSize = 'sm' | 'md';
export type SeedPillIconPlacement = 'leading' | 'trailing';

interface SeedPillBaseProps {
  as?: 'button' | 'span';
  variant?: SeedPillVariant;
  tone?: SeedPillTone;
  size?: SeedPillSize;
  icon?: ReactNode;
  iconPlacement?: SeedPillIconPlacement;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

type SeedPillButtonProps = SeedPillBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    as?: 'button';
  };

type SeedPillSpanProps = SeedPillBaseProps &
  Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'className'> & {
    as: 'span';
  };

export type SeedPillProps = SeedPillButtonProps | SeedPillSpanProps;

interface SeedPillClassOptions {
  variant?: SeedPillVariant;
  tone?: SeedPillTone;
  size?: SeedPillSize;
  disabled?: boolean;
  interactive?: boolean;
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getBadgeToneClasses(tone: SeedPillTone) {
  switch (tone) {
    case 'warning':
      return 'bg-[#fff7ed] text-[#d97706]';
    case 'success':
      return 'bg-[#f0fdf4] text-[#16a34a]';
    case 'neutral':
      return 'bg-[#f3f4f6] text-[#6a7282]';
    case 'attention':
    default:
      return 'bg-[#fff7ed] text-[#f54900]';
  }
}

function getDisabledClasses(variant: SeedPillVariant) {
  switch (variant) {
    case 'default':
      return 'bg-[#f9fafb] text-[#9ca3af]';
    case 'filter-selected':
      return 'bg-[#86efac] text-white';
    case 'badge':
      return 'bg-[#ffedd5] text-[#fb923c]';
    case 'filter-badge-icon':
    case 'filter-plain':
    default:
      return 'border border-[#e5e7eb] bg-[#f9fafb] text-[#9ca3af]';
  }
}

export function getSeedPillClasses({
  variant = 'filter-plain',
  tone = 'attention',
  size = 'md',
  disabled = false,
  interactive = false,
}: SeedPillClassOptions = {}) {
  const isIconOnly = variant === 'default';
  const layoutClasses = isIconOnly
    ? size === 'sm'
      ? 'h-8 w-8 rounded-xl p-1.5'
      : 'h-10 w-10 rounded-xl p-2'
    : size === 'sm'
      ? 'min-h-[26px] gap-1.5 rounded-[20px] px-2 py-1 text-xs leading-4'
      : 'min-h-[34px] gap-1.5 rounded-[20px] px-3 py-[7px] text-[14px] leading-5';

  const interactionClasses = interactive
    ? joinClasses(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-[#16a34a]',
        'focus-visible:ring-offset-2',
        'focus-visible:ring-offset-white',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )
    : '';

  const baseClasses = joinClasses(
    'inline-flex',
    'shrink-0',
    'items-center',
    'justify-center',
    'whitespace-nowrap',
    'font-medium',
    'transition-colors',
    layoutClasses,
    interactionClasses,
  );

  if (disabled) {
    return joinClasses(baseClasses, getDisabledClasses(variant));
  }

  switch (variant) {
    case 'default':
      return joinClasses(
        baseClasses,
        'bg-white text-[#6a7282]',
        interactive && 'hover:bg-[#f3f4f6]',
      );
    case 'filter-selected':
      return joinClasses(
        baseClasses,
        'bg-[#16a34a] text-white',
        interactive && 'hover:bg-[#15803d]',
      );
    case 'badge':
      return joinClasses(baseClasses, getBadgeToneClasses(tone));
    case 'filter-badge-icon':
    case 'filter-plain':
    default:
      return joinClasses(
        baseClasses,
        'border border-[#e5e7eb] bg-white text-[#6a7282]',
        interactive && 'hover:border-[#16a34a]',
      );
  }
}

export function getSeedPillIconClasses(
  variant: SeedPillVariant = 'filter-plain',
  size: SeedPillSize = 'md',
) {
  const iconSize =
    variant === 'default'
      ? size === 'sm'
        ? 'size-5'
        : 'size-6'
      : size === 'sm'
        ? 'size-3.5'
        : 'size-4';

  return joinClasses(
    'shrink-0',
    iconSize,
    '[&_svg]:h-full',
    '[&_svg]:w-full',
  );
}

export function SeedPill(props: SeedPillProps) {
  const {
    as = 'button',
    variant = 'filter-plain',
    tone = 'attention',
    size = 'md',
    icon,
    iconPlacement = 'leading',
    disabled = false,
    className,
    children,
    ...rest
  } = props;

  const classes = joinClasses(
    getSeedPillClasses({
      variant,
      tone,
      size,
      disabled,
      interactive: as === 'button',
    }),
    className,
  );

  const iconNode = icon ? (
    <span aria-hidden="true" className={getSeedPillIconClasses(variant, size)}>
      {icon}
    </span>
  ) : null;

  const content = (
    <>
      {iconPlacement === 'leading' && iconNode}
      {children ? <span>{children}</span> : null}
      {iconPlacement === 'trailing' && iconNode}
    </>
  );

  if (as === 'span') {
    const spanProps = rest as HTMLAttributes<HTMLSpanElement>;
    return (
      <span
        aria-disabled={disabled || undefined}
        className={classes}
        {...spanProps}
      >
        {content}
      </span>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={buttonProps.type ?? 'button'}
      disabled={disabled}
      className={classes}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
