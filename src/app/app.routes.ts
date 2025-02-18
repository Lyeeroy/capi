import { Routes } from '@angular/router';

import { MoviesComponent } from './blocks/content/movies/movies.component';
import { TvshowsComponent } from './blocks/content/tvshows/tvshows.component';
import { AnimeComponent } from './blocks/content/anime/anime.component';
import { SearchResultsComponent } from './blocks/search-results/search-results.component';
import { PlayerComponent } from './blocks/player/player.component';
import { TableComponent } from './blocks/table/table.component';

export const routes: Routes = [
  { path: 'tvshows', component: TvshowsComponent },
  { path: 'movies', component: MoviesComponent },
  { path: 'anime', component: AnimeComponent },
  { path: 'searchResults/:query', component: SearchResultsComponent },
  { path: 'player/:id/:mediaType', component: PlayerComponent },
  { path: 'table', component: TableComponent },
];
