import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { ContinueWatchingService } from '../../../services/continue-watching.service';
import { CircularProgressComponent } from './circular-progress/circular-progress.component';

export interface Episode {
  number: number;
  name: string;
  description?: string;
}

export interface EpisodeProgress {
  p: number; // progress (0-1) - shortened from 'progress'
  c: boolean; // isClicked - shortened from 'isClicked'
  t: number; // timestamp - shortened from 'lastUpdated'
}

// Ultra-compact storage format: [season, episode, progress_int, clicked_flag, timestamp_offset]
// progress_int: progress * 100 (0-100 instead of 0.0-1.0)
// clicked_flag: 1 for clicked, 0 for not clicked
// timestamp_offset: (timestamp - baseTime) / 1000 (seconds since base time)
export type CompactEpisodeData = [number, number, number, number, number];

export interface SeriesProgressData {
  b?: number; // base timestamp for all episodes
  d?: CompactEpisodeData[]; // compact data array
  [key: string]: EpisodeProgress | CompactEpisodeData[] | number | undefined; // legacy support
}

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconLibComponent,
    CircularProgressComponent,
  ],
  templateUrl: './playlist.component.html',
})
export class PlaylistComponent
  implements OnInit, OnChanges, AfterViewInit, OnDestroy
{
  @Input() names: string = '';
  @Input() totalSeasons: number[] = [];
  @Input() currentSeason: number = 1;
  @Input() currentEpisodes: Episode[] = [];
  @Input() currentPosters: string[] = [];
  @Input() layoutType: 'list' | 'grid' | 'poster' | 'compact' = 'list';
  @Input() isSortedAscending: boolean = true;
  @Input() seriesId: string = '';
  @Input() activeEpisodeIndex: number = -1;
  @Input() currentEpisode: number = 1;
  @Input() activeEpisodeSeason: number = 1; // NEW: season of the currently playing episode
  @Input() isDetailsExpanded: boolean = false; // NEW: details panel state
  @Input() mediaType: 'tv' | 'movie' | null = null;
  @Output() seasonChange = new EventEmitter<number>();
  @Output() episodeSelected = new EventEmitter<number>();
  @Output() layoutChange = new EventEmitter<void>();
  @Output() sortToggle = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @ViewChildren('episodeBtn, episodeList')
  episodeElements!: QueryList<ElementRef>;
  private initialScrollDone = false;
  private scrollEnabled = true; // Add this property

  // Add search functionality
  searchQuery: string = '';
  filteredEpisodes: Episode[] = [];
  // Add expand tracking for poster view descriptions
  expandedDescriptions: Set<number> = new Set();

  // Self-contained progress tracking
  private seriesProgressData: CompactEpisodeData[] = [];
  private baseTimestamp: number = Date.now();

  // Settings for watched episodes feature
  public isWatchedEpisodesEnabled: boolean = true;

  constructor(
    private cdr: ChangeDetectorRef,
    private continueWatchingService: ContinueWatchingService
  ) {}

  ngOnInit() {
    // Load default layout from localStorage if available
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        if (
          settings.playlistLayout === 'list' ||
          settings.playlistLayout === 'grid' ||
          settings.playlistLayout === 'poster'
        ) {
          this.layoutType = settings.playlistLayout;
        }
        // Load scroll setting
        if (typeof settings.enableScrollToEpisode === 'boolean') {
          this.scrollEnabled = settings.enableScrollToEpisode;
        }
      }
    } catch {
      // Ignore errors, fallback to default
    }

    // Load clicked episodes from localStorage
    this.loadSeriesProgress();

    // Load watched episodes settings
    this.loadWatchedEpisodesSettings();

    // Start background sync for progress data (non-blocking)
    this.startProgressSync();

    // Listen for settings changes
    window.addEventListener(
      'appSettingsChanged',
      this.onSettingsChanged.bind(this)
    );

    this.filteredEpisodes = [...this.currentEpisodes];

    this.continueWatchingService.cleanupOldSessionData();
  }
  ngAfterViewInit() {
    // Use longer delay for initial scroll to ensure all elements are rendered
    setTimeout(() => {
      console.log('Initial scroll attempt', {
        activeEpisodeIndex: this.activeEpisodeIndex,
        activeEpisodeSeason: this.activeEpisodeSeason,
        currentSeason: this.currentSeason,
        scrollEnabled: this.scrollEnabled,
      });
      this.scrollToActiveEpisode(true);
    }, 800);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['currentSeason'] ||
      changes['currentEpisodes'] ||
      changes['activeEpisodeIndex'] ||
      changes['activeEpisodeSeason']
    ) {
      // Mark previous episode as watched when active episode changes (e.g., next episode button)
      // Reload clicked episodes when season changes
      if (changes['currentSeason'] || changes['seriesId']) {
        this.loadSeriesProgress();
      }

      this.filteredEpisodes = [...this.currentEpisodes];
      this.filterEpisodes();

      // Log changes for debugging
      if (changes['activeEpisodeIndex'] || changes['activeEpisodeSeason']) {
        console.log('Episode/Season changed', {
          activeEpisodeIndex: this.activeEpisodeIndex,
          activeEpisodeSeason: this.activeEpisodeSeason,
          currentSeason: this.currentSeason,
        });
      }

      // Use debounced scroll for changes
      this.debouncedScrollToActiveEpisode(false, 300);
    }

    // Trigger change detection when details panel state changes to recalculate height
    if (changes['isDetailsExpanded']) {
      this.cdr.detectChanges();
    }
  }
  private scrollToActiveEpisode(initial = false) {
    // Check if scrolling is enabled in settings
    if (!this.scrollEnabled) return;

    // Only scroll if the active episode is in the currently viewed season
    if (this.activeEpisodeSeason !== this.currentSeason) return;

    // Validate active episode index
    if (
      typeof this.activeEpisodeIndex !== 'number' ||
      this.activeEpisodeIndex < 0 ||
      this.activeEpisodeIndex >= this.currentEpisodes.length
    )
      return;

    // Find the filtered index for the active episode
    const activeEpisode = this.currentEpisodes[this.activeEpisodeIndex];
    if (!activeEpisode) return;

    const filteredIndex = this.filteredEpisodes.findIndex(
      (ep) => ep.number === activeEpisode.number
    );

    if (filteredIndex === -1) return; // Active episode is filtered out

    // Use longer timeout to ensure DOM is ready
    setTimeout(
      () => {
        this.attemptScroll(filteredIndex, initial);
      },
      initial ? 500 : 200
    );
  }

  private attemptScroll(
    filteredIndex: number,
    initial = false,
    retryCount = 0
  ) {
    const maxRetries = 8;
    let el: HTMLElement | null = null;
    let elementId = '';

    // Generate correct element ID based on layout type
    if (this.layoutType === 'grid') {
      elementId = 'episode-btn-' + filteredIndex;
    } else if (this.layoutType === 'list') {
      elementId = 'episode-list-' + filteredIndex;
    } else if (this.layoutType === 'poster') {
      elementId = 'episode-poster-' + this.getOriginalIndex(filteredIndex);
    } else if (this.layoutType === 'compact') {
      elementId = 'episode-compact-' + this.getOriginalIndex(filteredIndex);
    }

    el = document.getElementById(elementId);

    if (el) {
      // Check if element has been rendered properly
      const rect = el.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) {
        // Always scroll on initial load or if element is not in viewport
        if (initial || !this.isElementInViewport(el)) {
          console.log(`Scrolling to episode ${elementId}`, {
            initial,
            retryCount,
          });
          this.smoothScrollToElement(el);
        }

        if (initial) {
          this.initialScrollDone = true;
        }
        return;
      }
    }

    // Retry if element not found or not ready
    if (retryCount < maxRetries) {
      const delay = Math.min(200 * (retryCount + 1), 1000); // Cap at 1 second
      setTimeout(() => {
        this.attemptScroll(filteredIndex, initial, retryCount + 1);
      }, delay);
    } else {
      console.warn(
        `Failed to scroll to episode after ${maxRetries} attempts.`,
        {
          layout: this.layoutType,
          filteredIndex,
          elementId,
          activeEpisodeIndex: this.activeEpisodeIndex,
          activeEpisodeSeason: this.activeEpisodeSeason,
          currentSeason: this.currentSeason,
        }
      );
    }
  }

  onSeasonChange(event: Event) {
    const newSeason = Number((event.target as HTMLSelectElement).value);
    this.seasonChange.emit(newSeason);
  }
  onEpisodeSelected(logicalIndex: number, actualIndex: number) {
    this.episodeSelected.emit(actualIndex);
    // Allow scrolling when episodes are selected
    setTimeout(() => {
      this.scrollToActiveEpisode();
    }, 100);
  }

  isEpisodeActiveByIndex(index: number): boolean {
    // Only highlight if both season and index match
    return (
      this.currentSeason === this.activeEpisodeSeason &&
      index === this.activeEpisodeIndex
    );
  }
  filterEpisodes() {
    if (!this.searchQuery.trim()) {
      this.filteredEpisodes = [...this.currentEpisodes];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredEpisodes = this.currentEpisodes.filter(
        (episode) =>
          episode.number.toString().includes(query) ||
          episode.name.toLowerCase().includes(query)
      );
    }

    // Use debounced scroll after filtering
    this.debouncedScrollToActiveEpisode();
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
    this.filterEpisodes();
  }

  getOriginalIndex(filteredIndex: number): number {
    const episode = this.filteredEpisodes[filteredIndex];
    return this.currentEpisodes.findIndex((ep) => ep.number === episode.number);
  }

  isEpisodeActiveByFilteredIndex(filteredIndex: number): boolean {
    const originalIndex = this.getOriginalIndex(filteredIndex);
    return this.isEpisodeActiveByIndex(originalIndex);
  }
  onFilteredEpisodeSelected(filteredIndex: number) {
    const originalIndex = this.getOriginalIndex(filteredIndex);

    // Mark the previous episode as fully watched if it was being played
    if (
      this.isWatchedEpisodesEnabled &&
      this.activeEpisodeIndex >= 0 &&
      this.activeEpisodeIndex !== originalIndex &&
      this.activeEpisodeSeason === this.currentSeason
    ) {
      this.markEpisodeAsFullyWatched(this.activeEpisodeIndex);
    }

    // Mark the newly selected episode as clicked
    if (this.isWatchedEpisodesEnabled) {
      this.markEpisodeAsClicked(originalIndex);
    }

    this.onEpisodeSelected(originalIndex, originalIndex);
  }

  // Self-contained progress tracking - no external dependencies
  private loadSeriesProgress() {
    if (!this.seriesId || !this.isWatchedEpisodesEnabled) {
      this.seriesProgressData = [];
      this.baseTimestamp = Date.now();
      return;
    }

    try {
      const progressKey = `episode_progress_${this.seriesId}`;
      const progressData = localStorage.getItem(progressKey);

      if (progressData) {
        const parsed = JSON.parse(progressData);

        // Check format and migrate if needed
        if (Array.isArray(parsed.d) && typeof parsed.b === 'number') {
          // New compact format
          this.seriesProgressData = parsed.d;
          this.baseTimestamp = parsed.b;
        } else if (Array.isArray(parsed)) {
          // Already in array format
          this.seriesProgressData = parsed;
          this.baseTimestamp = Date.now();
        } else {
          // Old object format, migrate to compact array
          this.seriesProgressData = [];
          this.baseTimestamp = Date.now();

          Object.keys(parsed).forEach((key) => {
            const match = key.match(/s(\d+)e(\d+)/);
            if (match) {
              const season = parseInt(match[1]);
              const episode = parseInt(match[2]);
              const data = parsed[key];

              if (data && typeof data === 'object') {
                const progress = Math.round(
                  (data.progress || data.p || 0) * 100
                );
                const clicked = data.isClicked || data.c || false;
                const timeOffset = Math.round(
                  (Date.now() - this.baseTimestamp) / 1000
                );

                this.seriesProgressData.push([
                  season,
                  episode,
                  progress,
                  clicked ? 1 : 0,
                  timeOffset,
                ]);
              }
            }
          });

          this.saveSeriesProgress(); // Save in new format
        }
      } else {
        this.seriesProgressData = [];
        this.baseTimestamp = Date.now();
      }
    } catch (error) {
      console.error('Error loading series progress:', error);
      this.seriesProgressData = [];
      this.baseTimestamp = Date.now();
    }
  }

  private saveSeriesProgress() {
    if (!this.seriesId) return;

    try {
      const progressKey = `episode_progress_${this.seriesId}`;
      const compactData = {
        b: this.baseTimestamp,
        d: this.seriesProgressData,
      };
      localStorage.setItem(progressKey, JSON.stringify(compactData));
    } catch (error) {
      console.error('Error saving series progress:', error);
    }
  }

  // Helper methods for compact array format
  private findEpisodeData(
    season: number,
    episode: number
  ): CompactEpisodeData | null {
    return (
      this.seriesProgressData.find(
        (item) => item[0] === season && item[1] === episode
      ) || null
    );
  }

  private updateEpisodeData(
    season: number,
    episode: number,
    progress: number,
    clicked: boolean
  ): void {
    const existingIndex = this.seriesProgressData.findIndex(
      (item) => item[0] === season && item[1] === episode
    );
    const progressInt = Math.round(progress * 100);
    const timeOffset = Math.round((Date.now() - this.baseTimestamp) / 1000);
    const newData: CompactEpisodeData = [
      season,
      episode,
      progressInt,
      clicked ? 1 : 0,
      timeOffset,
    ];

    if (existingIndex >= 0) {
      this.seriesProgressData[existingIndex] = newData;
    } else {
      this.seriesProgressData.push(newData);
    }
  }

  private removeEpisodeData(season: number, episode: number): void {
    const index = this.seriesProgressData.findIndex(
      (item) => item[0] === season && item[1] === episode
    );
    if (index >= 0) {
      this.seriesProgressData.splice(index, 1);
    }
  }

  private markEpisodeAsClicked(episodeIndex: number) {
    if (!this.isWatchedEpisodesEnabled) return;

    const episode = this.currentEpisodes[episodeIndex];
    if (!episode) return;

    const existingData = this.findEpisodeData(
      this.currentSeason,
      episode.number
    );
    const currentProgress = existingData ? existingData[2] / 100 : 0;

    this.updateEpisodeData(
      this.currentSeason,
      episode.number,
      currentProgress,
      true
    );
    this.saveSeriesProgress();
  }

  private markEpisodeAsFullyWatched(episodeIndex: number) {
    if (!this.isWatchedEpisodesEnabled) return;

    const episode = this.currentEpisodes[episodeIndex];
    if (!episode) return;

    this.updateEpisodeData(this.currentSeason, episode.number, 1.0, true);
    this.saveSeriesProgress();

    // Trigger immediate UI update
    this.cdr.detectChanges();
  }

  private updateEpisodeProgress(
    season: number,
    episodeNumber: number,
    progress: number
  ) {
    if (!this.isWatchedEpisodesEnabled) return;

    // Only update progress if episode was clicked or is currently active
    const isCurrentEpisode =
      season === this.activeEpisodeSeason &&
      this.currentEpisodes[this.activeEpisodeIndex]?.number === episodeNumber;

    const existingData = this.findEpisodeData(season, episodeNumber);
    const isClicked = existingData ? existingData[3] === 1 : false;

    if (!isClicked && !isCurrentEpisode) {
      return; // Don't track progress for non-clicked episodes
    }

    // Update progress, keeping clicked state
    this.updateEpisodeData(
      season,
      episodeNumber,
      progress,
      isClicked || isCurrentEpisode
    );
    this.saveSeriesProgress();
  }

  private getEpisodeProgressData(
    season: number,
    episodeNumber: number
  ): EpisodeProgress | null {
    const data = this.findEpisodeData(season, episodeNumber);
    if (!data) return null;

    return {
      p: data[2] / 100, // Convert back to 0-1 range
      c: data[3] === 1,
      t: this.baseTimestamp + data[4] * 1000, // Convert back to timestamp
    };
  }

  private isEpisodeClicked(episodeIndex: number): boolean {
    if (!this.isWatchedEpisodesEnabled) return false;

    const episode = this.currentEpisodes[episodeIndex];
    if (!episode) return false;

    const progressData = this.getEpisodeProgressData(
      this.currentSeason,
      episode.number
    );
    return progressData?.c || false;
  }

  private removeEpisodeProgress(episodeIndex: number) {
    if (!this.isWatchedEpisodesEnabled) return;

    const episode = this.currentEpisodes[episodeIndex];
    if (!episode) return;

    this.removeEpisodeData(this.currentSeason, episode.number);
    this.saveSeriesProgress();
  }

  // Background sync for progress data - runs asynchronously to not block UI
  private progressSyncInterval: any;

  private startProgressSync() {
    // Clear any existing interval
    if (this.progressSyncInterval) {
      clearInterval(this.progressSyncInterval);
    }

    // Sync progress every 30 seconds in the background
    this.progressSyncInterval = setInterval(() => {
      this.syncProgressInBackground();
    }, 30000);

    // Also sync immediately but asynchronously
    setTimeout(() => this.syncProgressInBackground(), 1000);
  }

  private syncProgressInBackground() {
    if (!this.seriesId || !this.isWatchedEpisodesEnabled) return;

    // Only sync progress for episodes that have been clicked
    this.seriesProgressData.forEach((episodeData) => {
      if (episodeData[3] === 0) return; // Not clicked

      const season = episodeData[0];
      const episodeNumber = episodeData[1];
      const currentProgress = episodeData[2] / 100;

      // Get latest progress from continue watching service
      try {
        const liveProgress = this.continueWatchingService.getEpisodeProgress(
          this.seriesId,
          season,
          episodeNumber
        );

        if (liveProgress.progress > currentProgress) {
          // Update our local data with newer progress
          this.updateEpisodeProgress(
            season,
            episodeNumber,
            liveProgress.progress
          );
        }
      } catch (error) {
        // Silently ignore sync errors to not affect UI
      }
    });
  }

  // Public method for external services to update progress immediately
  public updateEpisodeProgressImmediate(
    season: number,
    episodeNumber: number,
    progress: number
  ): void {
    this.updateEpisodeProgress(season, episodeNumber, progress);
    this.cdr.detectChanges(); // Trigger immediate UI update
  }

  // Public method to mark current active episode as clicked when playback starts
  public markActiveEpisodeAsClicked(): void {
    if (
      this.activeEpisodeIndex >= 0 &&
      this.activeEpisodeIndex < this.currentEpisodes.length
    ) {
      this.markEpisodeAsClicked(this.activeEpisodeIndex);
    }
  }

  isEpisodeWatchedByFilteredIndex(filteredIndex: number): boolean {
    if (!this.isWatchedEpisodesEnabled) return false;

    const originalIndex = this.getOriginalIndex(filteredIndex);
    return this.isEpisodeClicked(originalIndex);
  }

  // Handle clicking on watched indicator (for removing watched status)
  onWatchedIndicatorClick(filteredIndex: number, event: Event) {
    event.stopPropagation(); // Prevent episode selection

    if (!this.isWatchedEpisodesEnabled) return;

    const originalIndex = this.getOriginalIndex(filteredIndex);
    const episode = this.currentEpisodes[originalIndex];
    if (!episode) return;

    // Only allow removal if it's a watched episode (not currently playing)
    if (
      !this.isEpisodeActiveByFilteredIndex(filteredIndex) &&
      this.isEpisodeWatchedByFilteredIndex(filteredIndex)
    ) {
      this.removeEpisodeFromWatched(originalIndex);
    }
  }

  private removeEpisodeFromWatched(episodeIndex: number) {
    this.removeEpisodeProgress(episodeIndex);
  }

  // Settings management methods
  private loadWatchedEpisodesSettings() {
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        if (typeof settings.enableWatchedEpisodes === 'boolean') {
          this.isWatchedEpisodesEnabled = settings.enableWatchedEpisodes;
        }
      }
    } catch (error) {
      console.error('Error loading watched episodes settings:', error);
    }
  }

  private saveWatchedEpisodesSettings() {
    try {
      let settings = {};
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        settings = JSON.parse(raw);
      }
      (settings as any).enableWatchedEpisodes = this.isWatchedEpisodesEnabled;
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving watched episodes settings:', error);
    }
  }

  // Public method to refresh clicked episodes (called externally when continue watching changes)
  public refreshWatchedEpisodes(): void {
    this.loadSeriesProgress();
    this.cdr.detectChanges();
  }

  // Public methods for settings component
  public toggleWatchedEpisodesFeature(enabled: boolean) {
    this.isWatchedEpisodesEnabled = enabled;
    this.saveWatchedEpisodesSettings();
  }

  // Public method to mark current episode as clicked (called from external components like next episode button)
  public markCurrentEpisodeAsWatched() {
    if (!this.isWatchedEpisodesEnabled) return;

    if (
      this.activeEpisodeIndex >= 0 &&
      this.activeEpisodeIndex < this.currentEpisodes.length
    ) {
      this.markEpisodeAsFullyWatched(this.activeEpisodeIndex);
    }
  }

  public clearAllWatchedEpisodes() {
    if (!this.seriesId) return;

    try {
      // Clear the progress data
      this.seriesProgressData = [];
      this.saveSeriesProgress();

      // Also clear old storage formats for backward compatibility
      const clickedKey = `clicked_episodes_${this.seriesId}`;
      localStorage.removeItem(clickedKey);
      const watchedKey = `watched_episodes_${this.seriesId}`;
      localStorage.removeItem(watchedKey);
    } catch (error) {
      console.error('Error clearing watched episodes:', error);
    }
  }

  public clearAllWatchedEpisodesForAllSeries() {
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage);

      // Remove all watched episodes keys
      keys.forEach((key) => {
        if (key.startsWith('watched_episodes_')) {
          localStorage.removeItem(key);
        }
      });

      // Clear current series progress data
      this.seriesProgressData = [];
      this.saveSeriesProgress();
    } catch (error) {
      console.error('Error clearing all watched episodes:', error);
    }
  }

  /**
   * Public method called from settings component to clear all progress data
   * This ensures the playlist component resets its internal state
   */
  public clearAllProgressData(): void {
    // Clear internal progress data
    this.seriesProgressData = [];
    this.baseTimestamp = Date.now();

    // Clear any expanded descriptions
    this.expandedDescriptions.clear();

    // Trigger UI update
    this.cdr.detectChanges();

    console.log('Playlist progress data cleared');
  }

  // Add the missing methods from the original file
  private getScrollContainer(): HTMLElement | null {
    // First try to find the episodes container by class
    const episodesContainer = document.querySelector(
      '.episodes-scroll-container'
    ) as HTMLElement;
    if (episodesContainer) return episodesContainer;

    // Fallback to finding the overflow-y-auto container within the playlist component
    const playlistElement = document.querySelector('app-playlist');
    if (playlistElement) {
      const scrollContainer = playlistElement.querySelector(
        '.overflow-y-auto'
      ) as HTMLElement;
      if (scrollContainer) return scrollContainer;
    }

    // Last resort - find any overflow-y-auto container
    const containers = document.querySelectorAll('.overflow-y-auto');
    for (let i = 0; i < containers.length; i++) {
      const container = containers[i] as HTMLElement;
      if (container.scrollHeight > container.clientHeight) {
        return container;
      }
    }

    return null;
  }

  private smoothScrollToElement(element: HTMLElement): void {
    const container = this.getScrollContainer();

    if (container) {
      // Get the container's current scroll position
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Calculate the element's position relative to the container's scroll area
      let elementTop = 0;
      let currentElement = element;

      // Walk up the DOM tree to calculate total offset from container
      while (currentElement && currentElement !== container) {
        elementTop += currentElement.offsetTop;
        currentElement = currentElement.offsetParent as HTMLElement;
      }

      // Calculate target scroll position (center the element)
      const containerHeight = container.clientHeight;
      const elementHeight = element.offsetHeight;
      const targetScrollTop =
        elementTop - containerHeight / 2 + elementHeight / 2;

      // Ensure we don't scroll beyond bounds
      const maxScroll = container.scrollHeight - container.clientHeight;
      const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

      container.scrollTo({
        top: finalScrollTop,
        behavior: 'smooth',
      });
    } else {
      // Fallback to standard scrollIntoView
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }

  private isElementInViewport(element: HTMLElement): boolean {
    const container = this.getScrollContainer();
    const rect = element.getBoundingClientRect();

    if (!container) {
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    }

    const containerRect = container.getBoundingClientRect();

    // Check if element is within container bounds with some margin
    const margin = 20;
    return (
      rect.top >= containerRect.top - margin &&
      rect.bottom <= containerRect.bottom + margin
    );
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any) {
    // Debounce resize events
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.debouncedScrollToActiveEpisode(false, 300);
      // Trigger change detection to recalculate height
      this.cdr?.detectChanges();
    }, 300);
  }

  private resizeTimeout: any;
  private scrollTimeout: any;

  private debouncedScrollToActiveEpisode(initial = false, delay = 100) {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.scrollToActiveEpisode(initial);
    }, delay);
  }

  ngOnDestroy() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Remove settings change listener
    window.removeEventListener(
      'appSettingsChanged',
      this.onSettingsChanged.bind(this)
    );
  }

  private onSettingsChanged(event: any) {
    const settings = event.detail;
    if (typeof settings.enableWatchedEpisodes === 'boolean') {
      this.isWatchedEpisodesEnabled = settings.enableWatchedEpisodes;
      // Reload clicked episodes if the feature was re-enabled
      if (this.isWatchedEpisodesEnabled) {
        this.loadSeriesProgress();
      }
    }
  }

  // Layout and UI methods
  onLayoutChange() {
    this.layoutChange.emit();
    // Use longer timeout to ensure layout change is complete
    setTimeout(() => {
      this.scrollToActiveEpisode();
    }, 150);
  }

  onSortToggle() {
    this.sortToggle.emit();
  }

  // Methods for poster view description expansion
  toggleDescription(episodeIndex: number) {
    if (this.expandedDescriptions.has(episodeIndex)) {
      this.expandedDescriptions.delete(episodeIndex);
    } else {
      this.expandedDescriptions.add(episodeIndex);
    }
  }

  isDescriptionExpanded(episodeIndex: number): boolean {
    return this.expandedDescriptions.has(episodeIndex);
  }

  getGridMinHeight(): string {
    const episodeCount = this.filteredEpisodes.length;
    if (episodeCount === 0) return '200px'; // Empty state

    // Use fixed grid columns based on container width
    const cols = this.getGridColumns();
    const rows = Math.ceil(episodeCount / cols);

    // Each grid item has aspect-[3/2] ratio with gap-2 (8px)
    const itemWidth = 48; // Approximate width for grid items
    const itemHeight = itemWidth * (2 / 3); // 3:2 aspect ratio = height is 2/3 of width
    const gap = 8;
    const totalHeight = rows * itemHeight + (rows - 1) * gap;

    return `${Math.max(totalHeight, 100)}px`;
  }

  private getGridColumns(): number {
    // Match the responsive grid columns from template
    if (window.innerWidth >= 1024) return 8; // lg:grid-cols-8
    if (window.innerWidth >= 768) return 6; // md:grid-cols-6
    if (window.innerWidth >= 640) return 5; // sm:grid-cols-5
    return 4; // grid-cols-4
  }

  getListMinHeight(): string {
    const episodeCount = this.filteredEpisodes.length;
    if (episodeCount === 0) return '200px'; // Empty state
    if (episodeCount <= 8) {
      // Small number of episodes, calculate exact height
      return `${Math.max(episodeCount * 45, 100)}px`;
    }
    return `${episodeCount * 45}px`;
  }

  getCompactMinHeight(): string {
    const episodeCount = this.filteredEpisodes.length;
    if (episodeCount === 0) return '160px'; // Empty state
    if (episodeCount <= 6) {
      // Small number of episodes, calculate exact height
      const containerWidth =
        window.innerWidth < 1024 ? window.innerWidth - 48 : 300;
      const episodesPerRow = Math.max(1, Math.floor(containerWidth / 142)); // 140px + 2px gap
      const rows = Math.ceil(episodeCount / episodesPerRow);
      return `${Math.max(rows * 160, 160)}px`; // Compact cards are 160px high
    }
    const containerWidth =
      window.innerWidth < 1024 ? window.innerWidth - 48 : 300;
    const episodesPerRow = Math.max(1, Math.floor(containerWidth / 142));
    const rows = Math.ceil(episodeCount / episodesPerRow);
    return `${rows * 160}px`;
  }

  /**
   * Get the watch progress for a specific episode by filtered index
   * Instant response with no external dependencies to eliminate delays
   * @param filteredIndex The index in the filtered episodes array
   * @returns Object with progress ratio (0-1) and isWatched flag
   */
  getEpisodeProgressByFilteredIndex(filteredIndex: number): {
    progress: number;
    isWatched: boolean;
  } {
    const episode = this.filteredEpisodes[filteredIndex];
    if (!episode || !this.seriesId || !this.isWatchedEpisodesEnabled) {
      return { progress: 0, isWatched: false };
    }

    const isClicked = this.isEpisodeWatchedByFilteredIndex(filteredIndex);
    const isActive = this.isEpisodeActiveByFilteredIndex(filteredIndex);

    // Show progress indicator only if episode has been clicked OR is currently active
    if (!isClicked && !isActive) {
      return { progress: 0, isWatched: false };
    }

    // Get progress from our local storage - instant response
    const progressData = this.getEpisodeProgressData(
      this.currentSeason,
      episode.number
    );

    // Use stored progress immediately, no external calls
    let currentProgress = progressData?.p || 0;

    // For active episode with no stored progress, start with minimal progress to show the indicator
    if (isActive && currentProgress === 0) {
      currentProgress = 0.01; // Minimal progress to show the circle
    }

    // Only show progress if there's actual progress > 0
    if (currentProgress <= 0) {
      return { progress: 0, isWatched: false };
    }

    return {
      progress: currentProgress,
      isWatched: isClicked,
    };
  }

  /**
   * Handle click on progress indicator to remove episode progress
   * @param filteredIndex The index in the filtered episodes array
   */
  onProgressClick(filteredIndex: number): void {
    const episode = this.filteredEpisodes[filteredIndex];
    if (!episode || !this.seriesId) return;

    const originalIndex = this.getOriginalIndex(filteredIndex);
    const isCurrentEpisode = this.isEpisodeActiveByFilteredIndex(filteredIndex);

    // Don't allow deletion of currently playing episode's progress
    if (isCurrentEpisode) return;

    // Remove episode progress from local storage
    this.removeEpisodeData(this.currentSeason, episode.number);
    this.saveSeriesProgress();

    // Also remove from continue watching service
    this.continueWatchingService.removeEpisodeProgress(
      this.seriesId,
      this.currentSeason,
      episode.number
    );

    // Trigger change detection to update UI immediately
    this.cdr.detectChanges();
  }

  /**
   * Clean up old localStorage format and optimize storage
   * This method can be called periodically to maintain clean storage
   */
  public optimizeLocalStorage(): {
    before: number;
    after: number;
    saved: string;
    episodes: number;
  } {
    const before = this.getLocalStorageSize();

    // Clean up old format keys for all series
    const keys = Object.keys(localStorage);
    let episodesCleaned = 0;

    keys.forEach((key) => {
      if (
        key.startsWith('clicked_episodes_') ||
        key.startsWith('watched_episodes_') ||
        key.startsWith('ep_progress_') ||
        key.startsWith('ep_session_') ||
        (key.startsWith('episode_progress_') && !key.includes('_compact'))
      ) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (
              parsed &&
              typeof parsed === 'object' &&
              !Array.isArray(parsed.d)
            ) {
              episodesCleaned += Object.keys(parsed).length;
            }
          } catch (e) {
            // Invalid data, remove it
          }
        }
        localStorage.removeItem(key);
      }
    });

    // Re-save current data in optimized format
    this.saveSeriesProgress();

    const after = this.getLocalStorageSize();
    const savedBytes = before - after;
    const savedKB = (savedBytes / 1024).toFixed(2);

    return {
      before,
      after,
      saved: `${savedKB} KB`,
      episodes: episodesCleaned,
    };
  }

  /**
   * Get approximate size of localStorage in bytes
   */
  private getLocalStorageSize(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
}
