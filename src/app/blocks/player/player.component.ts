import { Component, OnInit, Renderer2, ElementRef } from '@angular/core';
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
  episodeNames: { [key: number]: { number: number; name: string }[] } = {};
  episodePosters: { [key: number]: string[] } = {};
  currentEpisodes: { number: number; name: string }[] = [];
  currentPosters: string[] = [];
  layoutType: number = 1; // 1: ep number, ep name; 2: ep number, ep name, poster; 3: tiles with only number

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private tmdbService: TmdbService,
    private renderer: Renderer2,
    private el: ElementRef
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
              this.episodeNames[index + 1] = response.episodes.map(
                (episode: any, episodeIndex: number) => ({
                  number: episodeIndex + 1,
                  name: episode.name,
                })
              );
              this.episodePosters[index + 1] = response.episodes.map(
                (episode: any) =>
                  episode.still_path
                    ? 'https://image.tmdb.org/t/p/w500' + episode.still_path
                    : 'https://miro.medium.com/v2/resize:fit:300/0*E6pTrKTFvvLDOzzj.png'
              );
            }
          });
          this.updateCurrentEpisodes(1);
          console.log('Season:', this.totalSeasons);
          console.log('Episode Names:', this.episodeNames);
        })
        .catch((error) => console.error('Error fetching season data:', error));
    }
  }

  onSeasonChange(event: Event) {
    const selectedSeason = Number((event.target as HTMLSelectElement).value);
    this.updateCurrentEpisodes(selectedSeason);
  }

  updateCurrentEpisodes(seasonNumber: number) {
    if (this.episodeNames[seasonNumber] && this.episodePosters[seasonNumber]) {
      this.currentEpisodes = this.episodeNames[seasonNumber];
      this.currentPosters = this.episodePosters[seasonNumber];
    }
  }

  ascOrDescSort() {
    this.currentEpisodes.reverse();
    this.currentPosters.reverse();
  }

  cancel() {
    this.location.back();
  }
}
