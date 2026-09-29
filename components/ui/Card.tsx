import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  /** calm: a lighter cream for blocks inside a card. flush: no padding, for lists that run edge to edge. dashed: an empty state. */
  tone?: 'default' | 'calm' | 'flush' | 'dashed';
  children?: ReactNode;
};

/** A cream panel with the gold-edged game shadow. */
export function Card({ as: Tag = 'div', tone = 'default', className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cn('wt-card', tone === 'calm' && 'wt-card-calm', tone === 'flush' && 'wt-card-flush', tone === 'dashed' && 'wt-card-dashed', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** The Deep Sky hero card: sky gradient, cloud pattern and a gold frame. */
export function Hero({ as: Tag = 'div', className, children, ...rest }: Omit<CardProps, 'tone'>) {
  return (
    <Tag className={cn('wt-hero', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** A card title row: bold title on the left, an optional action on the right. */
export function CardHead({ title, right, className }: { title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('wt-cardhead', className)}>
      <b>{title}</b>
      {right}
    </div>
  );
}

/** A section title in the game font, with an optional action on the right. */
export function SectionLabel({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('wt-sec-label', className)}>
      <h2 style={{ font: 'inherit', margin: 0 }}>{children}</h2>
      {right}
    </div>
  );
}
