import { Injectable } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor =
  | 'blue'
  | 'purple'
  | 'green'
  | 'red'
  | 'orange'
  | 'pink'
  | 'teal'
  | 'indigo';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeMode: ThemeMode = 'system';
  private accentColor: AccentColor = 'blue';

  constructor() {
    // On service init, apply saved theme mode
    const saved = localStorage.getItem('themeMode');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      this.setThemeMode(saved as ThemeMode);
    } else {
      this.setThemeMode('system');
    }
  }

  setThemeMode(mode: ThemeMode) {
    this.themeMode = mode;
    // Tailwind dark mode toggling
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('themeMode', 'dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
      localStorage.setItem('themeMode', 'light');
    } else {
      // System: follow prefers-color-scheme
      localStorage.setItem('themeMode', 'system');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }

  getCurrentTheme() {
    let mode: ThemeMode = this.themeMode;
    const saved = localStorage.getItem('themeMode');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      mode = saved as ThemeMode;
    }
    return {
      mode,
      accent: this.accentColor,
    };
  }

  setAccentColor(color: AccentColor) {
    this.accentColor = color;
    // Add logic to update accent color in the app
  }
}
