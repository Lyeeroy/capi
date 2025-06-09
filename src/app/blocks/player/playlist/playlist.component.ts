import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

export interface Episode {
  number: number;
  name: string;
}

// A simple type for what we store as the "playing" episode
type LastPlayed = {
  season: number;
  episode: number;
};

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [CommonModule, FormsModule, IconLibComponent],
  templateUrl: './playlist.component.html',
})
export class PlaylistComponent implements OnInit, OnChanges {
  @Input() names: string = '';
  @Input() totalSeasons: number[] = [];
  @Input() currentSeason: number = 1; // This is the season being VIEWED
  @Input() currentEpisodes: Episode[] = [];
  @Input() currentPosters: string[] = [];
  @Input() layoutType: 'list' | 'grid' | 'poster' = 'list';
  @Input() isSortedAscending: boolean = true;
  @Input() seriesId: string = '';

  @Output() seasonChange = new EventEmitter<number>();
  @Output() episodeSelected = new EventEmitter<number>();
  @Output() layoutChange = new EventEmitter<void>();
  @Output() sortToggle = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  private lastPlayedKey = '';
  // This is our single source of truth for what is "playing"
  lastPlayed: LastPlayed | null = null;

  ngOnInit() {
    // Initialize the lastPlayed state when the component is first created.
    this.loadLastPlayed();
  }

  ngOnChanges(changes: SimpleChanges) {
    // If the seriesId changes, we need to reload the state for the new series.
    if (changes['seriesId'] && !changes['seriesId'].firstChange) {
      this.loadLastPlayed();
    }
  }

  private loadLastPlayed(): void {
    if (!this.seriesId) {
      this.lastPlayed = null;
      return;
    }
    this.lastPlayedKey = `playlist_last_played_${this.seriesId}`;
    const stored = localStorage.getItem(this.lastPlayedKey);
    if (stored) {
      try {
        this.lastPlayed = JSON.parse(stored) as LastPlayed;
      } catch {
        this.lastPlayed = null;
        localStorage.removeItem(this.lastPlayedKey); // Clean up corrupted data
      }
    } else {
      this.lastPlayed = null;
    }
  }

  onSeasonChange(event: Event) {
    const newSeason = Number((event.target as HTMLSelectElement).value);
    this.seasonChange.emit(newSeason);
  }

  onEpisodeSelected(logicalIndex: number, actualIndex: number) {
    const selectedEpisode = this.currentEpisodes[actualIndex];

    if (selectedEpisode) {
      // Update our source of truth for what is now "playing".
      this.lastPlayed = {
        season: this.currentSeason,
        episode: selectedEpisode.number,
      };
      // Persist this state to localStorage if a seriesId is available.
      if (this.seriesId) {
        localStorage.setItem(
          this.lastPlayedKey,
          JSON.stringify(this.lastPlayed)
        );
      }
    }

    // Notify the parent component with the logical index, preserving the original contract.
    this.episodeSelected.emit(logicalIndex);
  }

  /**
   * Checks if a given episode is the one currently marked as playing.
   * This is the definitive check used for highlighting in the template.
   * @param episode The episode object from the ngFor loop.
   * @returns True if the episode should be highlighted, otherwise false.
   */
  isEpisodeActive(episode: Episode): boolean {
    if (!this.lastPlayed) {
      return false;
    }
    // An episode is active ONLY if the season being viewed matches the played season
    // AND the episode number matches the played episode number.
    return (
      this.currentSeason === this.lastPlayed.season &&
      episode.number === this.lastPlayed.episode
    );
  }

  onLayoutChange() {
    this.layoutChange.emit();
  }
  onSortToggle() {
    this.sortToggle.emit();
  }
  onClose() {
    this.close.emit();
  }
}
