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
  @Input() layoutType: 'list' | 'grid' | 'poster' = 'list';
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
      return;

    // Try different element IDs based on layout type
    let el: HTMLElement | null = null;

    if (this.layoutType === 'grid') {
      el = document.getElementById('episode-btn-' + this.activeEpisodeIndex);
    } else if (this.layoutType === 'list') {
      el = document.getElementById('episode-list-' + this.activeEpisodeIndex);
    } else if (this.layoutType === 'poster') {
      el = document.getElementById('episode-poster-' + this.activeEpisodeIndex);
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
}
