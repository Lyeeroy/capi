// src/app/blocks/player/player.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TmdbService } from '../../services/tmdb.service';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

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
  }

  // Get the seasons and episodes from API: and fill it into the UI
  async numberOfSeasons(): Promise<number | null> {
    if (this.mediaType === 'tv') {
      try {
        const response = await this.tmdbService
          .callAPI('https://api.themoviedb.org/3', `/tv/${this.id}`, 'tv')
          .toPromise();

        if (response && response.number_of_seasons !== undefined) {
          this.seasonNumber = response.number_of_seasons;
          console.log(
            'numberOfSeasons() This',
            this.mediaType,
            'has:',
            this.seasonNumber,
            'seasons'
          );

          // Call numberOfEpisodesInEachSeason and pass seasonNumber
          await this.numberOfEpisodesInEachSeason(this.seasonNumber ?? 0);

          return this.seasonNumber;
        }
      } catch (error) {
        console.error('Error fetching number of seasons:', error);
      }
    }
    return null;
  }

  async numberOfEpisodesInEachSeason(seasonNumber: number): Promise<void> {
    try {
      const response = await this.tmdbService
        .callAPI(
          'https://api.themoviedb.org/3',
          `/tv/${this.id}/season/${seasonNumber}`,
          'tv'
        )
        .toPromise();

      if (response && response.episodes) {
        this.episodes = response.episodes;
        console.log(`Episodes for Season ${seasonNumber}:`, this.episodes);
      }
    } catch (error) {
      console.error(
        `Error fetching episodes for season ${seasonNumber}:`,
        error
      );
    }
  }

  cancel() {
    this.location.back(); // Go back to the previous page
  }
}
