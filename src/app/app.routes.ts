import { Routes } from '@angular/router';

import { AnimeComponent } from './blocks/content/anime/anime.component';
import { SearchResultsComponent } from './blocks/search-results/search-results.component';
import { PlayerComponent } from './blocks/player/player.component';
import { TableComponent } from './blocks/table/table.component';
import { SettingsComponent } from './blocks/settings/settings.component';
import { HomeComponent } from './blocks/home/home.component';
import { DiscoverComponent } from './blocks/content/discover/discover.component';

export const routes: Routes = [
  {
    path: 'movies',
    component: DiscoverComponent,
    data: { mediaType: 'movie' },
  },
  {
    path: 'tvshows',
    component: DiscoverComponent,
    data: { mediaType: 'tv' },
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
  { path: 'discover', component: DiscoverComponent },
  { path: '', component: HomeComponent },
];
