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

  constructor(private http: HttpClient) {
    this.callAPI(this.TMDB_URL, '/movie/upcoming', 'movie');
  }

  //async ngOnInit(): Promise<void> {}

  names: string[] = [];
  background: string[] = [];
  rating: string[] = [];
  callAPI(baseurl: string, endpoint: string, mediaType: string) {
    const options = {
      params: {
        api_key: this.API_KEY,
      },
    };
    this.http.get<any>(baseurl + endpoint, options).subscribe((response) => {
      console.log(response);
      this.names = response.results.map((result: any) => result.title);
      this.background = response.results.map(
        (result: any) => result.poster_path
      );
      this.rating = response.results.map((result: any) => result.vote_average);
    });
  }
}
