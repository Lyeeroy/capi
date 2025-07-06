import { Routes } from '@angular/router';

import { AnimeComponent } from './blocks/content/anime/anime.component';
import { SearchResultsComponent } from './blocks/search-results/search-results.component';
import { PlayerComponent } from './blocks/player/player.component';
import { TableComponent } from './blocks/table/table.component';
import { SettingsComponent } from './blocks/settings/settings.component';
import { HomeComponent } from './blocks/home/home.component';
import { DiscoverComponent } from './blocks/content/discover/discover.component';
import { WatchlistComponent } from './blocks/watchlist/watchlist.component';

export const routes: Routes = [
  {
    path: 'discover',
    component: DiscoverComponent,
    data: { mediaType: 'movie' }, // Default to movies
  },
  // Legacy routes for backward compatibility (redirects)
  {
    path: 'movies',
    redirectTo: '/discover',
    pathMatch: 'full',
  },
  {
    path: 'tvshows',
    redirectTo: '/discover',
    pathMatch: 'full',
  },
  {
    path: 'discover/anime',
    component: DiscoverComponent,
    data: { mediaType: 'anime' },
  },
  { path: 'anime', component: AnimeComponent },
  { path: 'searchResults/:query', component: SearchResultsComponent },
  { path: 'player/:id/:mediaType', component: PlayerComponent },
  { path: 'table', component: TableComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'watchlist', component: WatchlistComponent },
  {
    path: 'table/docs',
    loadComponent: () =>
      import('./blocks/table/docs/table-docs.component').then(
        (m) => m.TableDocsComponent
      ),
  },
  { path: '', component: HomeComponent },
];
