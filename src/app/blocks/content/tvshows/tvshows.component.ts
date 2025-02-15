import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmdbService } from '../../../services/tmdb.service';

@Component({
  selector: 'app-tvshows',
  templateUrl: './tvshows.component.html',
  imports: [CommonModule],
})
export class TvshowsComponent implements OnInit {
  names: string[] = [];
  background: string[] = [];
  rating: string[] = [];
  IMG_TMDB_URL = 'https://image.tmdb.org/t/p/w500';

  constructor(private tmdbService: TmdbService) {}

  ngOnInit(): void {
    this.tmdbService
      .callAPI('https://api.themoviedb.org/3', '/trending/tv/week', 'tv')
      .subscribe((response) => {
        this.rating = response.results.map(
          (result: any) => result.vote_average
        );
        const mediaType = response.results[0].media_type;
        if (mediaType === 'tv') {
          this.names = response.results.map((result: any) => result.name);
        } else if (mediaType === 'movie') {
          this.names = response.results.map((result: any) => result.title);
        }
        this.background = response.results.map(
          (result: any) => result.poster_path
        );
      });
  }
}
