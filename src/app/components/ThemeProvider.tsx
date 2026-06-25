import React from 'react';

// Simplified provider - no theme switching, always light mode
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
