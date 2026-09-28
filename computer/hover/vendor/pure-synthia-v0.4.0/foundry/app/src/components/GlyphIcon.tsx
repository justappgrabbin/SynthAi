interface GlyphIconProps {
  glyph: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GlyphIcon({ glyph, size = 'md', className = '' }: GlyphIconProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {glyph}
    </div>
  );
}
