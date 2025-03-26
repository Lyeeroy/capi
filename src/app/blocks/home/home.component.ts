import { Component } from '@angular/core';

import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { CarouselComponent } from './carousel/carousel.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ContentTabsComponent, CarouselComponent, CommonModule],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  trendingMediaType: string = 'movie'; // Default tab
  discoverMediaType: string = 'movie'; // Default tab
}
