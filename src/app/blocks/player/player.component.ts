// src/app/blocks/player/player.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TmdbService } from '../../services/tmdb.service';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class PlayerComponent implements OnInit {
  id: number | null = null;
  mediaType: string | null = null;
  names: string | null = null;
  seasonNumber: number | null = 0;
  episodes: number | null = 0;
  totalSeasons: number[] = [];
  episodeNames: string[] = [];
  episodePosters: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private tmdbService: TmdbService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      this.mediaType = params.get('mediaType');
      this.names = this.route.snapshot.queryParams['name'];
      this.initializeData();
    });
  }

  initializeData() {
    if (this.mediaType === 'tv' && this.id !== null) {
      this.tmdbService
        .callAPI('https://api.themoviedb.org/3', `/tv/${this.id}`, 'tv')
        .subscribe((response) => {
          if (response && response.number_of_seasons !== undefined) {
            this.seasonNumber = response.number_of_seasons;
            this.getAllSeasonData();
          }
        });
    }
  }

  getAllSeasonData() {
    if (this.seasonNumber) {
      const seasonObservables = Array.from(
        { length: this.seasonNumber },
        (_, i) =>
          this.tmdbService.callAPI(
            'https://api.themoviedb.org/3',
            `/tv/${this.id}/season/${i + 1}`,
            'tv'
          )
      );

      Promise.all(seasonObservables.map((obs) => obs.toPromise()))
        .then((responses) => {
          responses.forEach((response, index) => {
            if (response && response.episodes) {
              this.totalSeasons.push(index + 1);
              this.episodes = response.episodes.length;
              this.episodeNames.push(
                ...response.episodes.map((episode: any) => episode.name)
              );
              this.episodePosters.push(
                ...response.episodes.map((episode: any) => episode.still_path)
              );
            }
          });
          console.log('Season:', this.totalSeasons);
          console.log('Episode Names:', this.episodeNames);
        })
        .catch((error) => console.error('Error fetching season data:', error));
    }
  }

  onSeasonChange(event: Event) {
    const selectedSeason = (event.target as HTMLSelectElement).value;
    this.nameOfEachEpisode(Number(selectedSeason));
  }

  nameOfEachEpisode(seasonNumber: number) {
    if (this.id !== null && this.mediaType === 'tv') {
      this.tmdbService
        .callAPI(
          'https://api.themoviedb.org/3',
          `/tv/${this.id}/season/${seasonNumber}`,
          'tv'
        )
        .subscribe((data) => {
          this.episodeNames = data.episodes.map((episode: any) => episode.name);
          this.episodePosters = data.episodes.map(
            (episode: any) => episode.still_path
          );
          console.log('Episode Names:', this.episodeNames);
        });
    }
  }

  cancel() {
    this.location.back();
  }
}
