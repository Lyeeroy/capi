import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  AfterViewInit,
  ViewChildren,
  QueryList,
  ElementRef,
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
export class PlaylistComponent implements OnInit, OnChanges, AfterViewInit {
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
    this.scrollToActiveEpisode(true);
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
      setTimeout(() => this.scrollToActiveEpisode(), 0);
    }
  }

  private scrollToActiveEpisode(initial = false) {
    // Check if scrolling is enabled in settings
    if (!this.scrollEnabled) return;

    // Do not scroll if screen size is under 1024px
    if (window.innerWidth < 1024) return;
    // Only scroll if the active episode is in the currently viewed season
    if (this.activeEpisodeSeason !== this.currentSeason) return;
    // Remove the initialScrollDone check to allow scrolling when episodes are selected
    if (
      typeof this.activeEpisodeIndex !== 'number' ||
      this.activeEpisodeIndex < 0
    )
      return; // Try different element IDs based on layout type
    let el: HTMLElement | null = null;

    if (this.layoutType === 'grid') {
      el = document.getElementById('episode-btn-' + this.activeEpisodeIndex);
    } else if (this.layoutType === 'list') {
      el = document.getElementById('episode-list-' + this.activeEpisodeIndex);
    } else if (this.layoutType === 'poster') {
      el = document.getElementById('episode-poster-' + this.activeEpisodeIndex);
    } else if (this.layoutType === 'compact') {
      el = document.getElementById(
        'episode-compact-' + this.activeEpisodeIndex
      );
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (initial) {
        this.initialScrollDone = true;
      }
    }
  }

  onSeasonChange(event: Event) {
    const newSeason = Number((event.target as HTMLSelectElement).value);
    this.seasonChange.emit(newSeason);
  }

  onEpisodeSelected(logicalIndex: number, actualIndex: number) {
    this.episodeSelected.emit(actualIndex);
    // Remove this line to allow scrolling when episodes are selected
    // this.initialScrollDone = true;
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
    // Force height recalculation after filtering
    setTimeout(() => {
      // Trigger change detection for height calculations
    }, 0);
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
    // Trigger scroll to active episode after layout change
    setTimeout(() => this.scrollToActiveEpisode(), 100);
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
    // Ensure episodes container has proper height
    return 'calc(100% - 120px)'; // Subtract header height
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
    if (episodeCount <= 12) {
      // Small number of episodes, calculate exact height
      const containerWidth =
        window.innerWidth < 1024 ? window.innerWidth - 48 : 300 - 24;
      const episodesPerRow = Math.max(1, Math.floor(containerWidth / 72));
      const rows = Math.ceil(episodeCount / episodesPerRow);
      return `${Math.max(rows * 50, 100)}px`;
    }
    const containerWidth =
      window.innerWidth < 1024 ? window.innerWidth - 48 : 300 - 24;
    const episodesPerRow = Math.max(1, Math.floor(containerWidth / 72));
    const rows = Math.ceil(episodeCount / episodesPerRow);
    return `${rows * 50}px`;
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
}
