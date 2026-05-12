import { ReactNode } from 'react';

// ── Reusable shimmer block ──
export function Skeleton({
  width,
  height,
  borderRadius = 8,
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? 16,
        borderRadius,
        background: 'rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    />
  );
}

// ── Skeleton line (text-like) ──
export function SkeletonText({
  lines = 1,
  maxWidth,
  lastLineWidth,
  height = 14,
  gap = 8,
}: {
  lines?: number;
  maxWidth?: string | number;
  lastLineWidth?: string;
  height?: number;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, width: '100%' }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={height}
          borderRadius={6}
          width={
            i === lines - 1 && lastLineWidth
              ? lastLineWidth
              : maxWidth ?? '100%'
          }
        />
      ))}
    </div>
  );
}

// ── Skeleton circle (avatar/icon) ──
export function SkeletonCircle({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      className={className}
    />
  );
}

// ── Skeleton card wrapper ──
export function SkeletonCard({
  children,
  padding = 24,
  borderRadius = 24,
  className = '',
}: {
  children?: ReactNode;
  padding?: number;
  borderRadius?: number;
  className?: string;
}) {
  return (
    <div
      className={`glass ${className}`}
      style={{ borderRadius, padding, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {children}
    </div>
  );
}
