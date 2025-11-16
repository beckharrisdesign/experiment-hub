import { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

interface BaseButtonProps {
  variant?: "primary" | "secondary" | "destructive";
  children: ReactNode;
  className?: string;
}

interface ButtonProps extends BaseButtonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  as?: "button";
}

interface LinkButtonProps extends BaseButtonProps, AnchorHTMLAttributes<HTMLAnchorElement> {
  as: "a";
  href: string;
  target?: string;
  rel?: string;
}

interface NextLinkButtonProps extends BaseButtonProps {
  as: "link";
  href: string;
}

type ButtonComponentProps = ButtonProps | LinkButtonProps | NextLinkButtonProps;

export default function Button(props: ButtonComponentProps) {
  const { variant = "primary", children, className = "", ...rest } = props;

  const baseClasses = "inline-block px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "border border-accent-primary/50 text-accent-primary hover:bg-accent-primary/10 hover:text-accent-primary",
    secondary: "text-text-muted hover:text-text-primary hover:underline",
    destructive: "text-text-muted hover:text-red-500 hover:underline",
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if ("as" in rest && rest.as === "a") {
    const { as, ...anchorProps } = rest as LinkButtonProps;
    return (
      <a className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  if ("as" in rest && rest.as === "link") {
    const { as, href, ...linkProps } = rest as NextLinkButtonProps;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { as, ...buttonProps } = rest as ButtonProps;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

