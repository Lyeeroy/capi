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

  totalSeasons: number[] = [];
  episodeNames: string[] = [];
  episodePosters: string[] = [];

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

    this.DataOfEpisodesInEachSeason();
  }

  // Get the number of episodes for each season in parallel
  async DataOfEpisodesInEachSeason() {
    // Call numberOfSeasons to know the number of season
    await this.numberOfSeasons();

    if (this.seasonNumber === null) {
      return;
    }
    // For every season, call numberOfEpisodesInSeason
    for (let i = 1; i <= this.seasonNumber; i++) {
      await this.numberOfEpisodesInSeason(i);
      //console log the result per 1 season
      this.totalSeasons.push(i);

      console.log(
        `numberOfEpisodesInEachSeason: Episodes for Season ${i}:`,
        this.episodes
      );
      console.log('Season: ', this.totalSeasons);
      //episode names for each season
      this.nameOfEachEpisode(i);
    }
  }

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

          //Call numberOfEpisodesInSeason and pass seasonNumber: probably slow as fuck: lets look at it later!

          //await this.numberOfEpisodesInSeason(this.seasonNumber ?? 0);
        }
      } catch (error) {
        console.error('Error fetching number of seasons:', error);
      }
    }
    return null;
  }

  async numberOfEpisodesInSeason(seasonNumber: number): Promise<void> {
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
        //console.log(`Episodes for Season ${seasonNumber}:`, this.episodes);
      }
    } catch (error) {
      console.error(
        `Error fetching episodes for season ${seasonNumber}:`,
        error
      );
    }
  }

  nameOfEachEpisode(seasonNumber: number) {
    try {
      const response = this.tmdbService
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
    } catch (error) {
      console.error(
        `Error fetching episode names for season ${seasonNumber}:`,
        error
      );
    }
  }

  cancel() {
    this.location.back(); // Go back to the previous page
  }
}
