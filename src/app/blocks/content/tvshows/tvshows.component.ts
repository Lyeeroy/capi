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
  BASE_URL = 'https://api.themoviedb.org/3';
  IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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

  constructor(private http: HttpClient) {}
  names: string[] = [];
  async ngOnInit(): Promise<void> {
    console.log('OnInit works ty kundo');
    interface TVShowData {
      results: { name: string }[];
    }
    try {
      const data = await this.http
        .get<TVShowData>(
          `${this.BASE_URL}${this.categories[1].endpoint}?api_key=${this.API_KEY}`,
          { responseType: 'json' }
        )
        .toPromise();

      if (data) {
        this.names = data.results.map((element) => element.name);
        console.log(this.names);
      } else {
        console.error('No data');
      }
    } catch (error) {
      console.error(error);
    }
  }
}
