import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-playlist',
  templateUrl: './playlist.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class PlaylistComponent {
  @Input() totalSeasons: number[] = [];
  @Input() currentEpisodes: { number: number; name: string }[] = [];
  @Input() currentPosters: string[] = [];
  @Output() seasonChange = new EventEmitter<number>();
  @Output() sortEpisodes = new EventEmitter<void>();

  onSeasonChange(event: Event) {
    const selectedSeason = Number((event.target as HTMLSelectElement).value);
    this.seasonChange.emit(selectedSeason);
  }

  ascOrDescSort() {
    this.sortEpisodes.emit();
  }
}
