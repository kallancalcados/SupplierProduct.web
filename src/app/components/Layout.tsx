import { ReactNode } from 'react';
import { ImageWithFallback } from './ui/image-with-fallback';
import { kallanMarkSrc } from './kallan-mark';
import { Toaster } from './ui/sonner';

interface LayoutProps {
  children: ReactNode;
  showLogo?: boolean;
}

export function Layout({ children, showLogo = true }: LayoutProps) {
  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#ca0404] via-[#a00303] to-[#8a0202]">
      <Toaster position="top-right" />
      {/* Geometric Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>

      {/* Diagonal Lines Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="diagonals" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="40" y2="40" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonals)" />
        </svg>
      </div>

      {/* Logo in corner */}
      {showLogo && (
        <div className="absolute top-8 left-8 z-10 animate-[fadeIn_0.8s_ease-out]">
          <ImageWithFallback
            src={kallanMarkSrc}
            alt="Kallan"
            className="w-16 h-16 drop-shadow-2xl"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
