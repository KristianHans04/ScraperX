import { useTheme } from '../../contexts/ThemeContext';

interface ThemeLogoProps {
  /** 'full' renders the Name logo, 'icon' renders the icon-only logo */
  variant?: 'full' | 'icon';
  /** CSS class applied to the wrapper */
  className?: string;
  /** Height of the logo image (CSS value) */
  height?: string;
  /** Force a specific mode regardless of current theme */
  forceDark?: boolean;
}

/**
 * Renders the correct Scrapifie logo based on the current theme.
 *
 * - Dark mode  -> Name-Dark.svg / Dark.svg  (light-colored logo for dark backgrounds)
 * - Light mode -> Name-Light.svg / Light.svg (dark-colored logo for light backgrounds)
 *
 * Uses CSS to toggle visibility so there's no flash when switching themes.
 */
export function ThemeLogo({
  variant = 'full',
  className = '',
  height = '32px',
  forceDark = false,
}: ThemeLogoProps) {
  const { theme } = useTheme();

  // Determine which logos to show based on variant
  const darkSrc = variant === 'full' ? '/Logo/Name-Dark.svg' : '/Logo/Dark.svg';
  const lightSrc = variant === 'full' ? '/Logo/Name-Light.svg' : '/Logo/Light.svg';

  // If forceDark, always show the dark-background variant
  if (forceDark) {
    return (
      <img
        src={darkSrc}
        alt="Scrapifie"
        className={className}
        style={{ height, width: 'auto' }}
      />
    );
  }

  // For system theme, use CSS media query via picture element
  if (theme === 'system') {
    return (
      <picture className={className}>
        <source srcSet={darkSrc} media="(prefers-color-scheme: dark)" />
        <img
          src={lightSrc}
          alt="Scrapifie"
          style={{ height, width: 'auto' }}
        />
      </picture>
    );
  }

  // For explicit theme, render the correct variant directly
  const src = theme === 'dark' ? darkSrc : lightSrc;

  return (
    <img
      src={src}
      alt="Scrapifie"
      className={className}
      style={{ height, width: 'auto' }}
    />
  );
}
