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

export interface Episode {
  number: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [CommonModule, FormsModule, IconLibComponent],
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

  constructor(private cdr: ChangeDetectorRef) {}

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
    this.filteredEpisodes = [...this.currentEpisodes];
  }
  ngAfterViewInit() {
    // Use longer delay for initial scroll to ensure all elements are rendered
    setTimeout(() => {
      this.scrollToActiveEpisode(true);
    }, 200);
  }
  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['currentSeason'] ||
      changes['currentEpisodes'] ||
      changes['activeEpisodeIndex'] ||
      changes['activeEpisodeSeason']
    ) {
      this.filteredEpisodes = [...this.currentEpisodes];
      this.filterEpisodes();

      // Use debounced scroll for changes
      this.debouncedScrollToActiveEpisode(false, 100);
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
      this.activeEpisodeIndex < 0
    )
      return;

    // Find the filtered index for the active episode
    const activeEpisode = this.currentEpisodes[this.activeEpisodeIndex];
    if (!activeEpisode) return;

    const filteredIndex = this.filteredEpisodes.findIndex(
      (ep) => ep.number === activeEpisode.number
    );

    if (filteredIndex === -1) return; // Active episode is filtered out

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      this.attemptScroll(filteredIndex, initial);
    }, 50);
  }
  private attemptScroll(
    filteredIndex: number,
    initial = false,
    retryCount = 0
  ) {
    const maxRetries = 3;
    let el: HTMLElement | null = null;

    // Try different element IDs based on layout type
    if (this.layoutType === 'grid') {
      el = document.getElementById('episode-btn-' + filteredIndex);
    } else if (this.layoutType === 'list') {
      el = document.getElementById('episode-list-' + filteredIndex);
    } else if (this.layoutType === 'poster') {
      el = document.getElementById(
        'episode-poster-' + this.getOriginalIndex(filteredIndex)
      );
    } else if (this.layoutType === 'compact') {
      el = document.getElementById(
        'episode-compact-' + this.getOriginalIndex(filteredIndex)
      );
    }

    if (el) {
      // Check if element is visible and has dimensions
      const rect = el.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) {
        // Check if element is already in viewport
        if (!this.isElementInViewport(el)) {
          this.smoothScrollToElement(el);
        }

        if (initial) {
          this.initialScrollDone = true;
        }
        return;
      }
    }

    // Retry if element not found or not ready, up to maxRetries
    if (retryCount < maxRetries) {
      setTimeout(() => {
        this.attemptScroll(filteredIndex, initial, retryCount + 1);
      }, 100 * (retryCount + 1)); // Exponential backoff
    } else {
      console.warn(
        `Failed to scroll to episode after ${maxRetries} attempts. Layout: ${this.layoutType}, FilteredIndex: ${filteredIndex}`
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
    this.onEpisodeSelected(originalIndex, originalIndex);
  }
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
  onClose() {
    this.close.emit();
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

  getDisplayDescription(episode: Episode, episodeIndex: number): string {
    if (!episode.description) return 'No description available.';

    const isExpanded = this.isDescriptionExpanded(episodeIndex);
    const maxLength = 120;

    if (isExpanded || episode.description.length <= maxLength) {
      return episode.description;
    }

    return episode.description.substring(0, maxLength) + '...';
  }
  getSmartHeight(): string {
    // Let the parent container handle the height with CSS
    return '100%';
  }

  private getCalculatedHeight(): number {
    const headerHeight = 120; // Header + controls
    const episodeCount = this.filteredEpisodes.length;

    if (this.layoutType === 'grid') {
      const containerWidth =
        window.innerWidth < 1024 ? window.innerWidth - 48 : 300 - 24;
      const episodesPerRow = Math.max(1, Math.floor(containerWidth / 72)); // Ensure at least 1 per row
      const rows = Math.ceil(episodeCount / episodesPerRow);
      return headerHeight + Math.max(rows * 50, 100) + 24; // Minimum height + padding
    } else if (this.layoutType === 'list') {
      return headerHeight + Math.max(episodeCount * 45, 100) + 24; // Minimum height + padding
    } else {
      // poster
      const containerWidth =
        window.innerWidth < 1024 ? window.innerWidth - 48 : 300;
      const episodesPerRow = Math.max(1, Math.floor(containerWidth / 220)); // Ensure at least 1 per row
      const rows = Math.ceil(episodeCount / episodesPerRow);
      return headerHeight + Math.max(rows * 280, 200) + 24; // Minimum height + padding
    }
  }
  getEpisodesMaxHeight(): string {
    // Only constrain height when details are NOT expanded
    if (!this.isDetailsExpanded) {
      if (typeof window !== 'undefined') {
        const viewportHeight = window.innerHeight;
        // Calculate 60% of the viewport height
        const targetHeight = Math.floor(viewportHeight * 0.6);
        // Still account for header and other UI elements (approximately 150px)
        const availableHeight = targetHeight - 150;
        const minHeight = 300; // Minimum height for good UX
        const maxHeight = Math.max(availableHeight, minHeight);
        return `${maxHeight}px`;
      }
      return 'calc(70vh - 150px)'; // Fallback for SSR
    }

    // When details are expanded, don't constrain height - let it grow as needed
    return 'auto';
  }

  private getMinContentHeight(): number {
    const episodeCount = this.filteredEpisodes.length;
    if (episodeCount === 0) return 200; // Empty state height

    if (this.layoutType === 'grid') {
      return Math.min(episodeCount * 50, 400); // Max 400px for grid
    } else if (this.layoutType === 'list') {
      return Math.min(episodeCount * 45, 600); // Max 600px for list
    } else {
      return Math.min(episodeCount * 280, 800); // Max 800px for poster
    }
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

  getPosterMinHeight(): string {
    const episodeCount = this.filteredEpisodes.length;
    if (episodeCount === 0) return '200px'; // Empty state
    if (episodeCount <= 4) {
      // Small number of episodes, calculate exact height
      const containerWidth =
        window.innerWidth < 1024 ? window.innerWidth - 48 : 300;
      const episodesPerRow = Math.max(1, Math.floor(containerWidth / 220));
      const rows = Math.ceil(episodeCount / episodesPerRow);
      return `${Math.max(rows * 280, 200)}px`;
    }
    const containerWidth =
      window.innerWidth < 1024 ? window.innerWidth - 48 : 300;
    const episodesPerRow = Math.max(1, Math.floor(containerWidth / 220));
    const rows = Math.ceil(episodeCount / episodesPerRow);
    return `${rows * 280}px`;
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

  private getScrollContainer(): HTMLElement | null {
    // Find the scrollable container for the playlist
    const container = document.querySelector(
      '.playlist-container'
    ) as HTMLElement;
    if (container) return container;

    // Fallback to finding by class patterns
    const episodesContainer = document.querySelector(
      '[class*="overflow-y-auto"]'
    ) as HTMLElement;
    return episodesContainer;
  }

  private isElementInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const container = this.getScrollContainer();

    if (!container) {
      // Fall back to window viewport
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
          (window.innerWidth || document.documentElement.clientWidth)
      );
    }

    const containerRect = container.getBoundingClientRect();
    return rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;
  }

  private smoothScrollToElement(element: HTMLElement): void {
    const container = this.getScrollContainer();

    if (container && container !== element.offsetParent) {
      // Calculate scroll position relative to container
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const containerScrollTop = container.scrollTop;

      const elementTop =
        elementRect.top - containerRect.top + containerScrollTop;
      const containerHeight = containerRect.height;
      const elementHeight = elementRect.height;

      // Center the element in the container
      const targetScrollTop =
        elementTop - (containerHeight - elementHeight) / 2;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
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

  /**
   * Public method to trigger scroll to active episode
   * Can be called from parent components when needed
   */
  public refreshScroll(): void {
    setTimeout(() => {
      this.scrollToActiveEpisode();
    }, 50);
  }

  /**
   * Force scroll even if disabled in settings (for debugging)
   */
  public forceScroll(): void {
    const wasEnabled = this.scrollEnabled;
    this.scrollEnabled = true;
    setTimeout(() => {
      this.scrollToActiveEpisode();
      this.scrollEnabled = wasEnabled;
    }, 50);
  }

  /**
   * SCROLL FUNCTIONALITY IMPROVEMENTS:
   *
   * 1. Fixed element ID mapping issues by using filtered indices correctly
   * 2. Added retry mechanism with exponential backoff for DOM readiness
   * 3. Improved viewport detection and smooth scrolling
   * 4. Added proper container detection for nested scrolling
   * 5. Removed mobile restrictions - now works on all screen sizes
   * 6. Added resize handling for responsive behavior
   * 7. Better timing for DOM updates and layout changes
   * 8. Public methods for external control and debugging
   */ @HostListener('window:resize', ['$event'])
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

  private debouncedScrollToActiveEpisode(initial = false, delay = 50) {
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
  }
}
