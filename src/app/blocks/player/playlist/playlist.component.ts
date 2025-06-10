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
}

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
export class PlaylistComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() names: string = '';
  @Input() totalSeasons: number[] = [];
  @Input() currentSeason: number = 1;
  @Input() currentEpisodes: Episode[] = [];
  @Input() currentPosters: string[] = [];
  @Input() layoutType: 'list' | 'grid' | 'poster' = 'list';
  @Input() isSortedAscending: boolean = true;
  @Input() seriesId: string = '';
  @Input() activeEpisodeIndex: number = 0;
  @Input() currentEpisode: number = 1;
  @Output() seasonChange = new EventEmitter<number>();
  @Output() episodeSelected = new EventEmitter<number>();
  @Output() layoutChange = new EventEmitter<void>();
  @Output() sortToggle = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  private lastPlayedKey = '';
  lastPlayed: LastPlayed | null = null;
  @ViewChildren('episodeBtn, episodeList')
  episodeElements!: QueryList<ElementRef>;
  private initialScrollDone = false;

  ngOnInit() {
    this.loadLastPlayed();
  }

  ngAfterViewInit() {
    this.scrollToActiveEpisode(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['seriesId'] && !changes['seriesId'].firstChange) {
      this.loadLastPlayed();
    }

    if (
      changes['currentSeason'] ||
      changes['currentEpisodes'] || // Listen for episode list changes too
      changes['activeEpisodeIndex']
    ) {
      this.loadLastPlayed();
      setTimeout(() => this.scrollToActiveEpisode(), 0);
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
        localStorage.removeItem(this.lastPlayedKey);
      }
    } else {
      this.lastPlayed = null;
    }
  }

  private scrollToActiveEpisode(initial = false) {
    // Scroll only if we are viewing the season that is currently playing
    if (this.lastPlayed && this.currentSeason !== this.lastPlayed.season) {
      return;
    }
    if (this.initialScrollDone && !initial) return;
    if (typeof this.activeEpisodeIndex !== 'number') return;
    const el =
      document.getElementById('episode-btn-' + this.activeEpisodeIndex) ||
      document.getElementById('episode-list-' + this.activeEpisodeIndex);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.initialScrollDone = true;
    }
  }

  // FIX: Simplified the method to only emit the change.
  onSeasonChange(event: Event) {
    const newSeason = Number((event.target as HTMLSelectElement).value);
    this.seasonChange.emit(newSeason);
    // All other logic is removed. The component will react to the new
    // inputs from the parent, and `isEpisodeActiveByIndex` will correctly
    // determine the highlight state during the re-render.
  }

  onEpisodeSelected(logicalIndex: number, actualIndex: number) {
    const selectedEpisode = this.currentEpisodes[actualIndex];
    if (selectedEpisode) {
      this.lastPlayed = {
        season: this.currentSeason,
        episode: selectedEpisode.number,
      };
      if (this.seriesId) {
        localStorage.setItem(
          this.lastPlayedKey,
          JSON.stringify(this.lastPlayed)
        );
      }
    }
    this.episodeSelected.emit(actualIndex);
    this.initialScrollDone = true;
  }

  isEpisodeActiveByIndex(index: number): boolean {
    if (!this.lastPlayed) return false;
    // This logic is correct. It ensures an episode is only highlighted if
    // we are viewing the correct season.
    if (this.currentSeason !== this.lastPlayed.season) return false;

    const activeIndexInCurrentList = this.currentEpisodes.findIndex(
      (ep) => ep.number === this.lastPlayed!.episode
    );
    return index === activeIndexInCurrentList;
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

  // This method is not used and can be safely removed.
  private clearHighlights() {
    /* ... */
  }
}
