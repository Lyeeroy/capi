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
  progress: number;
  isWatched: boolean;
}

interface AppSettings {
  playlistLayout?: 'list' | 'grid' | 'poster' | 'compact';
  enableScrollToEpisode?: boolean;
  enableWatchedEpisodes?: boolean;
}

// Constants for better maintainability
const STORAGE_KEYS = {
  APP_SETTINGS: 'appSettings',
  EPISODE_PROGRESS: 'episode_progress_',
} as const;

const PROGRESS_THRESHOLDS = {
  MINIMUM_PROGRESS: 0.01,
  WATCHED_THRESHOLD: 0.05,
  MAXIMUM_PROGRESS: 1.0,
} as const;

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

  // Simple progress tracking - just store progress values
  private episodeProgress: Map<string, number> = new Map(); // episodeKey -> progress (0-1)

  // Settings for watched episodes feature
  public isWatchedEpisodesEnabled: boolean = true;

  constructor(
    private cdr: ChangeDetectorRef,
    private continueWatchingService: ContinueWatchingService
  ) {}

  ngOnInit() {
    // Load default layout from localStorage if available
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (raw) {
        const settings: AppSettings = JSON.parse(raw);
        if (
          settings.playlistLayout === 'list' ||
          settings.playlistLayout === 'grid' ||
          settings.playlistLayout === 'poster'
        ) {
          this.layoutType = settings.playlistLayout;
        }
        if (typeof settings.enableScrollToEpisode === 'boolean') {
          this.scrollEnabled = settings.enableScrollToEpisode;
        }
      }
    } catch {
      // Ignore errors, fallback to default
    }

    // Load progress data from localStorage
    this.loadProgressData();

    // Load watched episodes settings
    this.loadWatchedEpisodesSettings();

    // Listen for settings changes
    window.addEventListener(
      'appSettingsChanged',
      this.onSettingsChanged.bind(this) as EventListener
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
      // Reload progress data when season changes
      if (changes['currentSeason'] || changes['seriesId']) {
        this.loadProgressData();
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

    // Simply emit the episode selection - no progress manipulation
    this.onEpisodeSelected(originalIndex, originalIndex);
  }
  private loadProgressData(): void {
    if (!this.seriesId || !this.isWatchedEpisodesEnabled) {
      this.episodeProgress.clear();
      return;
    }

    try {
      const progressKey = `${STORAGE_KEYS.EPISODE_PROGRESS}${this.seriesId}`;
      const progressData = localStorage.getItem(progressKey);

      if (progressData) {
        const parsed = JSON.parse(progressData);
        this.episodeProgress = new Map(Object.entries(parsed));
      } else {
        this.episodeProgress.clear();
      }
    } catch (error) {
      console.error('Failed to load episode progress data:', error);
      this.episodeProgress.clear();
    }
  }

  private saveProgressData(): void {
    if (!this.seriesId) return;

    try {
      const progressKey = `${STORAGE_KEYS.EPISODE_PROGRESS}${this.seriesId}`;
      const progressObj = Object.fromEntries(this.episodeProgress);
      localStorage.setItem(progressKey, JSON.stringify(progressObj));
    } catch (error) {
      console.error('Failed to save episode progress data:', error);
    }
  }

  private getEpisodeKey(season: number, episode: number): string {
    return `s${season}e${episode}`;
  }

  private getEpisodeProgress(season: number, episode: number): number {
    const key = this.getEpisodeKey(season, episode);
    return this.episodeProgress.get(key) || 0;
  }

  private setEpisodeProgress(
    season: number,
    episode: number,
    progress: number
  ): void {
    const key = this.getEpisodeKey(season, episode);

    if (progress <= PROGRESS_THRESHOLDS.MINIMUM_PROGRESS) {
      this.episodeProgress.delete(key);
    } else {
      // Cap progress to prevent false 100% completion
      const cappedProgress = Math.min(
        progress,
        PROGRESS_THRESHOLDS.MAXIMUM_PROGRESS
      );
      this.episodeProgress.set(key, cappedProgress);
    }

    this.saveProgressData();
  }

  /**
   * Get the watch progress for a specific episode by filtered index
   * @param filteredIndex The index in the filtered episodes array
   * @returns Object with progress ratio (0-1) and isWatched flag
   */
  getEpisodeProgressByFilteredIndex(filteredIndex: number): EpisodeProgress {
    const episode = this.filteredEpisodes[filteredIndex];
    if (!episode || !this.seriesId || !this.isWatchedEpisodesEnabled) {
      return { progress: 0, isWatched: false };
    }

    const progress = this.getEpisodeProgress(
      this.currentSeason,
      episode.number
    );

    return {
      progress,
      isWatched: progress > PROGRESS_THRESHOLDS.WATCHED_THRESHOLD,
    };
  }

  /**
   * Handle click on progress indicator to remove episode progress
   * @param filteredIndex The index in the filtered episodes array
   */
  onProgressClick(filteredIndex: number): void {
    const episode = this.filteredEpisodes[filteredIndex];
    if (!episode || !this.seriesId) return;

    const isCurrentEpisode = this.isEpisodeActiveByFilteredIndex(filteredIndex);

    // Prevent deletion of currently playing episode's progress
    if (isCurrentEpisode) {
      return;
    }

    // Remove the progress
    this.setEpisodeProgress(this.currentSeason, episode.number, 0);
    this.cdr.detectChanges();
  }

  /**
   * Update progress for the currently playing episode
   * @param progress Progress value between 0 and 1
   */
  public updateCurrentEpisodeProgress(progress: number): void {
    if (!this.isWatchedEpisodesEnabled || this.activeEpisodeIndex < 0) return;

    const episode = this.currentEpisodes[this.activeEpisodeIndex];
    if (!episode || progress <= PROGRESS_THRESHOLDS.MINIMUM_PROGRESS) return;

    this.setEpisodeProgress(this.activeEpisodeSeason, episode.number, progress);
    this.cdr.detectChanges();
  }

  /**
   * Mark an episode as fully watched (100%)
   * @param season Season number
   * @param episodeNumber Episode number
   */
  public markEpisodeAsFullyWatched(
    season: number,
    episodeNumber: number
  ): void {
    if (!this.isWatchedEpisodesEnabled) return;

    this.setEpisodeProgress(season, episodeNumber, 1.0);
    this.cdr.detectChanges();
  }

  /**
   * Update progress for external services (e.g., player component)
   * @param season Season number
   * @param episodeNumber Episode number
   * @param progress Progress value between 0 and 1
   */
  public updateEpisodeProgressImmediate(
    season: number,
    episodeNumber: number,
    progress: number
  ): void {
    if (
      !this.isWatchedEpisodesEnabled ||
      progress <= PROGRESS_THRESHOLDS.MINIMUM_PROGRESS
    )
      return;

    this.setEpisodeProgress(season, episodeNumber, progress);
    this.cdr.detectChanges();
  }

  // Settings management methods
  private loadWatchedEpisodesSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (raw) {
        const settings: AppSettings = JSON.parse(raw);
        if (typeof settings.enableWatchedEpisodes === 'boolean') {
          this.isWatchedEpisodesEnabled = settings.enableWatchedEpisodes;
        }
      }
    } catch (error) {
      console.error('Failed to load watched episodes settings:', error);
    }
  }

  private saveWatchedEpisodesSettings(): void {
    try {
      let settings: AppSettings = {};
      const raw = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (raw) {
        settings = JSON.parse(raw);
      }
      settings.enableWatchedEpisodes = this.isWatchedEpisodesEnabled;
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save watched episodes settings:', error);
    }
  }

  // Public method to refresh progress data
  public refreshWatchedEpisodes(): void {
    this.loadProgressData();
    this.cdr.detectChanges();
  }

  // Public methods for settings component
  /**
   * Toggle the watched episodes feature
   * @param enabled Whether to enable the feature
   */
  public toggleWatchedEpisodesFeature(enabled: boolean): void {
    this.isWatchedEpisodesEnabled = enabled;
    this.saveWatchedEpisodesSettings();
  }

  /**
   * Mark current episode as watched
   */
  public markCurrentEpisodeAsWatched(): void {
    if (!this.isWatchedEpisodesEnabled || this.activeEpisodeIndex < 0) return;

    const episode = this.currentEpisodes[this.activeEpisodeIndex];
    if (episode) {
      this.setEpisodeProgress(
        this.activeEpisodeSeason,
        episode.number,
        PROGRESS_THRESHOLDS.MAXIMUM_PROGRESS
      );
    }
  }

  /**
   * Clear all watched episodes for current series
   */
  public clearAllWatchedEpisodes(): void {
    if (!this.seriesId) return;

    this.episodeProgress.clear();
    this.saveProgressData();
  }

  /**
   * Clear all watched episodes for all series
   */
  public clearAllWatchedEpisodesForAllSeries(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEYS.EPISODE_PROGRESS)) {
          localStorage.removeItem(key);
        }
      });
      this.episodeProgress.clear();
    } catch (error) {
      console.error('Failed to clear all watched episodes:', error);
    }
  }

  /**
   * Clear all progress data (called from settings component)
   */
  public clearAllProgressData(): void {
    this.episodeProgress.clear();
    this.expandedDescriptions.clear();
    this.cdr.detectChanges();
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
      this.onSettingsChanged.bind(this) as EventListener
    );
  }

  private onSettingsChanged(event: Event): void {
    const customEvent = event as CustomEvent<AppSettings>;
    const settings = customEvent.detail;
    if (typeof settings.enableWatchedEpisodes === 'boolean') {
      this.isWatchedEpisodesEnabled = settings.enableWatchedEpisodes;
      if (this.isWatchedEpisodesEnabled) {
        this.loadProgressData();
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
}
