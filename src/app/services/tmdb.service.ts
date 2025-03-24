import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly API_KEY = '2c6781f841ce2ad1608de96743a62eb9';
  private readonly BASE_URL = 'https://api.themoviedb.org/3';

  constructor(private http: HttpClient) {}

  // Old function (kept for compatibility)
  callAPI(
    baseurl: string,
    endpoint: string,
    mediaType: string
  ): Observable<any> {
    const options = {
      params: { api_key: this.API_KEY },
    };
    return this.http.get<any>(baseurl + endpoint, options);
  }

  // New function (simpler, more flexible)
  fetchFromTmdb(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Observable<any> {
    let httpParams = new HttpParams().set('api_key', this.API_KEY);

    // Append extra parameters dynamically
    Object.entries(params).forEach(([key, value]) => {
      httpParams = httpParams.set(key, value.toString());
    });

    return this.http.get<any>(`${this.BASE_URL}${endpoint}`, {
      params: httpParams,
    });
  }
}
