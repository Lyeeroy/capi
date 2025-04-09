import { Component } from '@angular/core';

import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { CarouselComponent } from './carousel/carousel.component';
import { CommonModule } from '@angular/common';
import { ContentTabsNetflixLikeComponent } from '../../components/content-tabs-netflix-like/content-tabs-netflix-like.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ContentTabsComponent,
    CommonModule,
    ContentTabsNetflixLikeComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  trendingMediaType: string = 'movie'; // Default tab
  discoverMediaType: string = 'movie'; // Default tab
}
