import { Injectable, ElementRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlayerUIService {
  // UI state
  layoutType: 'list' | 'grid' | 'poster' | 'compact' = 'list';
  onShowPlaylist: boolean = true;
  onShowDetails: boolean = false;
  showIframe: boolean = true;
  isDetailsExpanded: boolean = false;
  playlistHeight: number = 0;

  // Window resize tracking
  private resizeListener?: () => void;

  constructor() {}

  /**
   * Show playlist panel
   */
  showPlaylist(): void {
    this.onShowDetails = false;
    this.onShowPlaylist = true;
  }

  /**
   * Show details panel
   */
  showDetails(): void {
    this.onShowPlaylist = false;
    this.onShowDetails = true;
  }

  /**
   * Toggle details expansion
   */
  toggleDetailsExpansion(): void {
    this.isDetailsExpanded = !this.isDetailsExpanded;
  }

  /**
   * Change layout type (cycle through available layouts)
   */
  changeLayout(): void {
    const layoutOrder: Array<'list' | 'grid' | 'poster' | 'compact'> = [
      'list',
      'grid',
      'poster',
      'compact',
    ];
    const currentIndex = layoutOrder.indexOf(this.layoutType);
    this.layoutType = layoutOrder[(currentIndex + 1) % layoutOrder.length];
  }

  /**
   * Set specific layout type
   */
  setLayout(layout: 'list' | 'grid' | 'poster' | 'compact'): void {
    this.layoutType = layout;
  }

  /**
   * Load default settings from localStorage
   */
  loadDefaultSettings(): void {
    try {
      const settings = localStorage.getItem('appSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        if (parsedSettings.playlistLayout) {
          this.layoutType = parsedSettings.playlistLayout;
        }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
      // Keep default layout if settings loading fails
    }
  }

  /**
   * Save current settings to localStorage
   */
  saveSettings(): void {
    try {
      const settings = {
        playlistLayout: this.layoutType
      };
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  /**
   * Initialize UI for specific media type
   */
  initializeForMediaType(mediaType: 'tv' | 'movie'): void {
    // If media type is movie, expand details by default
    if (mediaType === 'movie') {
      this.isDetailsExpanded = true;
    }
  }

  /**
   * Calculate playlist height based on video container
   */
  calculatePlaylistHeight(
    videoContainer?: ElementRef,
    playlistContainer?: ElementRef
  ): number {
    if (typeof window === 'undefined') return 400; // SSR fallback

    if (window.innerWidth < 1024) {
      // Mobile: use 80vh for better mobile experience
      return Math.round(window.innerHeight * 0.8);
    }

    // Get the video container and desktop controls elements
    const videoElement = videoContainer?.nativeElement;
    const desktopControls = document.getElementById('desktop-controls');

    if (videoElement) {
      // Calculate the height based on the video container and controls
      const videoHeight = videoElement.offsetHeight;
      const controlsHeight = desktopControls ? desktopControls.offsetHeight : 0;
      return videoHeight + controlsHeight + 8; // 8px for the gap
    }

    // Fallback: calculate height to match video aspect ratio
    const containerWidth = window.innerWidth;
    const gap = 16; // 1rem gap
    const videoContainerWidth = containerWidth * 0.75 - gap / 2;
    const aspectRatioHeight = videoContainerWidth * (9 / 16); // 16:9 aspect ratio
    const estimatedControlsHeight = 60; // Estimate controls height

    return Math.round(aspectRatioHeight + estimatedControlsHeight + 8);
  }

  /**
   * Get iframe container height for mobile
   */
  getIframeContainerHeight(): number | null {
    if (typeof window === 'undefined') return null; // SSR fallback

    if (window.innerWidth < 1024) {
      // Mobile: set explicit height to match playlist
      return window.innerWidth * (9 / 16);
    }

    // Desktop: let aspect-video class handle it
    return null;
  }

  /**
   * Setup window resize listener
   */
  setupResizeListener(callback: () => void): void {
    if (typeof window === 'undefined') return;

    this.resizeListener = () => {
      callback();
    };

    window.addEventListener('resize', this.resizeListener);
  }

  /**
   * Match playlist height to video container
   */
  matchPlaylistHeight(
    videoContainer?: ElementRef,
    playlistContainer?: ElementRef
  ): void {
    if (typeof window === 'undefined') return;

    setTimeout(() => {
      const videoElement = videoContainer?.nativeElement;
      const playlistElement = playlistContainer?.nativeElement;
      const desktopControls = document.getElementById('desktop-controls');

      if (playlistElement) {
        if (window.innerWidth < 1024) {
          // Mobile: Use 80vh for better mobile experience
          const mobileHeight = Math.round(window.innerHeight * 0.8);
          this.playlistHeight = mobileHeight;
        } else if (videoElement) {
          // Desktop: Match video container height + controls height
          const videoHeight = videoElement.offsetHeight;
          const controlsHeight = desktopControls
            ? desktopControls.offsetHeight
            : 0;
          const totalHeight = videoHeight + controlsHeight + 8; // 8px for the gap

          this.playlistHeight = totalHeight;
        }
      }
    }, 100);
  }

  /**
   * Cleanup resize listener
   */
  cleanup(): void {
    if (this.resizeListener && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  /**
   * Get current UI state
   */
  getUIState(): {
    layoutType: string;
    onShowPlaylist: boolean;
    onShowDetails: boolean;
    showIframe: boolean;
    isDetailsExpanded: boolean;
    playlistHeight: number;
  } {
    return {
      layoutType: this.layoutType,
      onShowPlaylist: this.onShowPlaylist,
      onShowDetails: this.onShowDetails,
      showIframe: this.showIframe,
      isDetailsExpanded: this.isDetailsExpanded,
      playlistHeight: this.playlistHeight
    };
  }

  /**
   * Set iframe visibility
   */
  setIframeVisibility(visible: boolean): void {
    this.showIframe = visible;
  }

  /**
   * Toggle iframe visibility with delay for reload
   */
  reloadIframe(): void {
    this.showIframe = false;
    setTimeout(() => (this.showIframe = true), 0);
  }

  /**
   * Update playlist height
   */
  updatePlaylistHeight(height: number): void {
    this.playlistHeight = height;
  }

  /**
   * Get responsive classes for containers
   */
  getContainerClasses(): {
    videoContainer: string;
    playlistContainer: string;
    mainContainer: string;
  } {
    const baseVideoClasses = 'w-full';
    const basePlaylistClasses = 'w-full';
    const baseMainClasses = 'w-full';

    // Add responsive classes based on screen size
    const videoContainer = `${baseVideoClasses} lg:w-3/4`;
    const playlistContainer = `${basePlaylistClasses} lg:w-1/4`;
    const mainContainer = `${baseMainClasses} lg:flex lg:gap-4`;

    return {
      videoContainer,
      playlistContainer,
      mainContainer
    };
  }

  /**
   * Get layout-specific classes
   */
  getLayoutClasses(): string {
    switch (this.layoutType) {
      case 'grid':
        return 'grid grid-cols-2 gap-2';
      case 'poster':
        return 'grid grid-cols-3 gap-2';
      case 'compact':
        return 'space-y-1';
      case 'list':
      default:
        return 'space-y-2';
    }
  }
}
