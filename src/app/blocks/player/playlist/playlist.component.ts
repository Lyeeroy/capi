import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

export interface Episode {
  number: number;
  name: string;
}

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [CommonModule, FormsModule, IconLibComponent],
  templateUrl: './playlist.component.html',
})
export class PlaylistComponent {
  @Input() names: string = '';
  @Input() totalSeasons: number[] = [];
  @Input() currentSeason: number = 1;
  @Input() currentEpisodes: Episode[] = [];
  @Input() currentPosters: string[] = [];
  @Input() layoutType: 'list' | 'grid' | 'poster' = 'list';
  @Input() isSortedAscending: boolean = true;
  @Input() activeEpisodeIndex: number = 0;

  @Output() seasonChange = new EventEmitter<number>();
  @Output() episodeSelected = new EventEmitter<number>();
  @Output() layoutChange = new EventEmitter<void>();
  @Output() sortToggle = new EventEmitter<void>();

  onSeasonChange(event: Event) {
    const newSeason = Number((event.target as HTMLSelectElement).value);
    this.seasonChange.emit(newSeason);
  }

  onEpisodeSelected(index: number) {
    this.episodeSelected.emit(index);
  }

  onLayoutChange() {
    this.layoutChange.emit();
  }

  onSortToggle() {
    this.sortToggle.emit();
  }
}
