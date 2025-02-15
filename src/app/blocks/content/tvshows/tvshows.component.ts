import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tvshows',
  templateUrl: './tvshows.component.html',
  imports: [CommonModule],
})
export class TvshowsComponent {
  API_KEY = '2c6781f841ce2ad1608de96743a62eb9';
  TMDB_URL = 'https://api.themoviedb.org/3';
  IMG_TMDB_URL = 'https://image.tmdb.org/t/p/w500';

  categories = [
    {
      title: 'Trending Movies',
      endpoint: '/trending/movie/week',
      mediaType: 'movie',
    },
    {
      title: 'Trending TV Shows',
      endpoint: '/trending/tv/week',
      mediaType: 'tv',
    },
    { title: 'In Cinema', endpoint: '/movie/upcoming', mediaType: 'movie' },
    {
      title: 'Popular Movies',
      endpoint: '/movie/popular',
      mediaType: 'movie',
    },
    { title: 'Popular TV Shows', endpoint: '/tv/popular', mediaType: 'tv' },
    {
      title: 'Top Rated Movies',
      endpoint: '/movie/top_rated',
      mediaType: 'movie',
    },
    {
      title: 'Top Rated TV Shows',
      endpoint: '/tv/top_rated',
      mediaType: 'tv',
    },
    {
      title: 'Now Playing',
      endpoint: '/movie/now_playing',
      mediaType: 'movie',
    },
    { title: 'On TV', endpoint: '/tv/on_the_air', mediaType: 'tv' },
  ];

  constructor(private http: HttpClient) {
    this.callAPI(this.TMDB_URL, '/movie/upcoming', 'movie');
  }
  names: string[] = [];
  //async ngOnInit(): Promise<void> {}

  callAPI(baseurl: string, endpoint: string, mediaType: string) {
    const options = {
      params: {
        api_key: this.API_KEY,
      },
    };
    this.http.get<any>(baseurl + endpoint, options).subscribe((response) => {
      this.names = response.results.map((result: any) => result.title);
    });
  }
}
