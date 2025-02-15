import { Routes } from '@angular/router';

import { HeaderComponent } from './blocks/header/header.component';
import { CardComponent } from './blocks/card/card.component';

export const routes: Routes = [
  { path: 'tvshows', component: HeaderComponent },
  { path: 'movies', component: CardComponent },
];
