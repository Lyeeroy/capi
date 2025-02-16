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

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private tmdbService: TmdbService
  ) {}

  ngOnInit() {
    // Update UI with the route parameters
    this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      this.mediaType = params.get('mediaType');
    });

    this.route.queryParams.subscribe((queryParams) => {
      this.names = queryParams['name']; // Retrieve the name from the URL
    });

    console.log(this.id, this.mediaType, this.names);

    this.numberOfSeasons();
    this.numberOfEpisodesInEachSeason();
  }

  // Get the seasons and episodes from API: and fill it into the UI
  // const { episodes } = await fetchData(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${apiKey}`
  // result: this.seasonNumber = single number
  numberOfSeasons() {
    if (this.mediaType === 'tv') {
      this.tmdbService
        .callAPI('https://api.themoviedb.org/3', `/tv/${this.id}`, 'tv')
        .subscribe((response) => {
          this.seasonNumber = response.number_of_seasons;
          console.log(
            'This',
            this.mediaType,
            'has:',
            this.seasonNumber,
            'seasons'
          );
        });
    }
  }
  //`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${apiKey}`
  numberOfEpisodesInEachSeason() {
    if (this.mediaType === 'tv') {
      this.tmdbService
        .callAPI(
          'https://api.themoviedb.org/3',
          `/tv/${this.id}/season/${this.seasonNumber}`,
          'tv'
        )
        .subscribe((response) => {
          this.episodes = response.number_of_seasons;
          console.log(response);
        });
    }
  }

  cancel() {
    this.location.back(); // Go back to the previous page
  }
}
