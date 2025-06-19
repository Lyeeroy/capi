import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LoadSourcesService } from '../player.service';

// Source interface
export interface Source {
  id: number;
  name: string;
  type: 'tv' | 'movie';
  season: number;
  episode: number;
  url: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class VideoSourceService {
  // Video sources
  sources: Source[] = [];
  currentSourceUrl: string = '';
  iframeUrl: SafeResourceUrl;

  // Constants
  private readonly MAPPING_REGEX =
    /^(https?:\/\/[^\/]+\/)([^\/?]+)\?([^:]+):([^\/]+)(\/.*)$/;

  // Media info needed for URL generation
  private id: number | null = null;
  private mediaType: 'tv' | 'movie' | null = null;
  private currentSeason: number = 1;
  private currentEpisode: number = 1;

  constructor(
    private loadSourcesService: LoadSourcesService,
    private sanitizer: DomSanitizer
  ) {
    this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  /**
   * Initialize video sources
   */
  async initializeSources(
    id: number,
    mediaType: 'tv' | 'movie',
    currentSeason: number,
    currentEpisode: number
  ): Promise<void> {
    this.id = id;
    this.mediaType = mediaType;
    this.currentSeason = currentSeason;
    this.currentEpisode = currentEpisode;

    await this.loadSourcesService.loadSources();
    this.sources = this.loadSourcesService.sources.map((source) => ({
      ...source,
      enabled: true, // Default all sources to enabled
    }));

    if (this.sources && this.sources.length > 0) {
      this.currentSourceUrl = this.sources[0].url;
    }
  }

  /**
   * Update current episode info for URL generation
   */
  updateEpisodeInfo(season: number, episode: number): void {
    this.currentSeason = season;
    this.currentEpisode = episode;
  }

  /**
   * Go to next available source
   */
  nextSource(): void {
    let currentIndex = this.sources.findIndex(
      (source) => source.url === this.currentSourceUrl && source.enabled
    );
    let nextIndex = (currentIndex + 1) % this.sources.length;
    while (!this.sources[nextIndex].enabled) {
      nextIndex = (nextIndex + 1) % this.sources.length;
    }
    this.currentSourceUrl = this.sources[nextIndex].url;
  }

  /**
   * Go to previous available source
   */
  prevSource(): void {
    let currentIndex = this.sources.findIndex(
      (source) => source.url === this.currentSourceUrl && source.enabled
    );
    let previousIndex =
      (currentIndex - 1 + this.sources.length) % this.sources.length;
    while (!this.sources[previousIndex].enabled) {
      previousIndex =
        (previousIndex - 1 + this.sources.length) % this.sources.length;
    }
    this.currentSourceUrl = this.sources[previousIndex].url;
  }

  /**
   * Change to specific source
   */
  onSourceChange(newSourceUrl: string): void {
    this.currentSourceUrl = newSourceUrl;
  }

  /**
   * Generate iframe URL from source URL
   */
  generateIframeUrl(): SafeResourceUrl {
    if (this.currentSourceUrl) {
      return this.translateIntoIframe(this.currentSourceUrl);
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  /**
   * Translate source URL into iframe URL
   */
  private translateIntoIframe(url: string): SafeResourceUrl {
    let newUrl: string;
    const match = url.match(this.MAPPING_REGEX);

    if (match) {
      const [_, baseUrl, __, tokenTv, tokenMovie, restOfUrl] = match;
      const replacement = this.mediaType === 'movie' ? tokenMovie : tokenTv;
      newUrl = `${baseUrl}${replacement}${restOfUrl}`;
      newUrl = newUrl.replace(/#id/g, this.id?.toString() || '');
    } else {
      newUrl = url
        .replace(/#type/g, this.mediaType || 'tv')
        .replace(/#id/g, this.id?.toString() || '');
    }

    if (this.mediaType === 'tv') {
      newUrl = newUrl
        .replace(/#season/g, this.currentSeason.toString())
        .replace(/#episode/g, this.currentEpisode.toString());
    } else {
      newUrl = newUrl
        .replace(/([&?])(s|e|season|episode)=[^&]*/gi, '')
        .replace(/\/(season|episode)\/[^/]+/gi, '')
        .replace(/-*(#season|#episode)-*/gi, '')
        .replace(/--+/g, '-')
        .replace(/-+$/g, '');
    }

    newUrl = newUrl
      .replace(/([^:])\/{2,}/g, '$1/')
      .replace(/\/+(\?.*)?$/, '$1')
      .replace(/\?+$/, '')
      .replace(/-+$/g, '');

    return this.sanitizer.bypassSecurityTrustResourceUrl(newUrl);
  }

  /**
   * Get current iframe URL
   */
  getCurrentIframeUrl(): SafeResourceUrl {
    return this.iframeUrl;
  }

  /**
   * Update iframe URL
   */
  updateIframeUrl(): void {
    this.iframeUrl = this.generateIframeUrl();
  }

  /**
   * Get current source URL
   */
  getCurrentSourceUrl(): string {
    return this.currentSourceUrl;
  }

  /**
   * Get all sources
   */
  getSources(): Source[] {
    return this.sources;
  }

  /**
   * Toggle source enabled state
   */
  toggleSourceEnabled(sourceUrl: string): void {
    const source = this.sources.find((s) => s.url === sourceUrl);
    if (source) {
      source.enabled = !source.enabled;
    }
  }

  /**
   * Check if there are any enabled sources
   */
  hasEnabledSources(): boolean {
    return this.sources.some((source) => source.enabled);
  }

  /**
   * Get enabled sources count
   */
  getEnabledSourcesCount(): number {
    return this.sources.filter((source) => source.enabled).length;
  }

  /**
   * Get current source index
   */
  getCurrentSourceIndex(): number {
    return this.sources.findIndex(
      (source) => source.url === this.currentSourceUrl && source.enabled
    );
  }

  /**
   * Get current source name
   */
  getCurrentSourceName(): string {
    const currentSource = this.sources.find(
      (source) => source.url === this.currentSourceUrl
    );
    return currentSource?.name || 'Unknown Source';
  }
}
