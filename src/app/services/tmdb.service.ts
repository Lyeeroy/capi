// src/app/services/tmdb.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TmdbService {
  API_KEY = '2c6781f841ce2ad1608de96743a62eb9';
  //TMDB_URL = 'https://api.themoviedb.org/3';

  constructor(private http: HttpClient) {}

  callAPI(
    baseurl: string,
    endpoint: string,
    mediaType: string
  ): Observable<any> {
    const options = {
      params: {
        api_key: this.API_KEY,
      },
    };
    return this.http.get<any>(baseurl + endpoint, options);
  }
}
