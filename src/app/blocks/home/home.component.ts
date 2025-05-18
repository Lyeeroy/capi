import { Component } from '@angular/core';

import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { CarouselComponent } from './carousel/carousel.component';
import { CommonModule } from '@angular/common';
import { ContentTabsNetflixLikeComponent } from '../../components/content-tabs-netflix-like/content-tabs-netflix-like.component';
import { LibHeaderComponent } from './lib-header/lib-header.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ContentTabsNetflixLikeComponent,
    CarouselComponent,
    LibHeaderComponent,
    ContentTabsComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  trendingMediaType: string = 'movie';
  discoverMediaType: string = 'movie';
}
