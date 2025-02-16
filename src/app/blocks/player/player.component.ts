import { Component } from '@angular/core';

interface Episode {
  id: number;
  episode_number: number;
  title: string;
  still_path: string | null;
  isActive?: boolean;
}

interface Season {
  id: number;
  season_number: number;
  episodes: Episode[];
  poster_path: string | null;
}

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css'],
})
export class PlayerComponent {
  seasons: Season[] = [];
  season: Season | null = null;
  episode: Episode | null = null;
}
