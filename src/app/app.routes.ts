import { Routes } from '@angular/router';

import { MoviesComponent } from './blocks/content/movies/movies.component';
import { TvshowsComponent } from './blocks/content/tvshows/tvshows.component';
import { AnimeComponent } from './blocks/content/anime/anime.component';

export const routes: Routes = [
  { path: 'tvshows', component: TvshowsComponent },
  { path: 'movies', component: MoviesComponent },
  { path: 'anime', component: AnimeComponent },
];
