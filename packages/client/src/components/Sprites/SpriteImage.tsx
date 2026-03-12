import { useState } from 'react';

interface SpriteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function SpriteImage({ fallback, className, alt, ...props }: SpriteImageProps) {
  const [error, setError] = useState(false);

  if (error && fallback) {
    return <span className={className + " flex items-center justify-center font-emoji"}>{fallback}</span>;
  }

  return (
    <img
      {...props}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
