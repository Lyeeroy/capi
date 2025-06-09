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
  private lastPlayedIndex: number = -1;
  @ViewChildren('episodeBtn, episodeList')
  episodeElements!: QueryList<ElementRef>;
  private initialScrollDone = false;

  ngOnInit() {
    this.loadLastPlayed();
    this.cacheLastPlayedIndex();
  }

  ngAfterViewInit() {
    this.scrollToActiveEpisode(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['seriesId'] && !changes['seriesId'].firstChange) {
      this.loadLastPlayed();
      this.cacheLastPlayedIndex();
    }

    if (changes['currentSeason'] || changes['currentEpisodes']) {
      this.loadLastPlayed();
      this.cacheLastPlayedIndex();
      setTimeout(() => this.scrollToActiveEpisode(), 0);
    }
  }

  private loadLastPlayed(): void {
    if (!this.seriesId) {
      this.lastPlayed = null;
      this.lastPlayedIndex = -1;
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

  private cacheLastPlayedIndex(): void {
    // Cache the index of the last played episode for the current season
    if (this.lastPlayed && this.lastPlayed.season === this.currentSeason) {
      this.lastPlayedIndex = this.currentEpisodes.findIndex(
        (ep) => ep.number === this.lastPlayed!.episode
      );
    } else {
      this.lastPlayedIndex = -1;
    }
  }

  private scrollToActiveEpisode(initial = false) {
    if (this.lastPlayedIndex < 0) return;
    if (this.lastPlayed && this.currentSeason !== this.lastPlayed.season)
      return;
    if (this.initialScrollDone && !initial) return;
    const el =
      document.getElementById('episode-btn-' + this.lastPlayedIndex) ||
      document.getElementById('episode-list-' + this.lastPlayedIndex);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.initialScrollDone = true;
    }
  }

  onSeasonChange(event: Event) {
    const newSeason = Number((event.target as HTMLSelectElement).value);
    this.seasonChange.emit(newSeason);
    // No need to reload or recalculate here, handled by ngOnChanges
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
      this.lastPlayedIndex = actualIndex;
    } else {
      this.lastPlayedIndex = -1;
    }
    this.episodeSelected.emit(actualIndex);
    this.initialScrollDone = true;
  }

  isEpisodeActiveByIndex(index: number): boolean {
    // Use cached index for efficiency
    return index === this.lastPlayedIndex && this.lastPlayedIndex >= 0;
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
