import { Component, OnInit } from '@angular/core';

import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { CarouselComponent } from './carousel/carousel.component';
import { CommonModule } from '@angular/common';
import { ContentTabsNetflixLikeComponent } from '../../components/content-tabs-netflix-like/content-tabs-netflix-like.component';
import { LibHeaderComponent } from './lib-header/lib-header.component';
import { ContinueWatchingListComponent } from './continue-watching-list.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ContentTabsNetflixLikeComponent,
    CarouselComponent,
    LibHeaderComponent,
    ContentTabsComponent,
    ContinueWatchingListComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  trendingMediaType: string = 'movie';
  discoverMediaType: string = 'movie';
  enableContinueWatching = true;
  hasContinueWatching = false;

  ngOnInit() {
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        this.enableContinueWatching = settings.enableContinueWatching !== false;
      }
    } catch {
      this.enableContinueWatching = true;
    }
    // Check if continueWatching exists and is non-empty and has valid unfinished entries
    try {
      const cwRaw = localStorage.getItem('continueWatching');
      if (cwRaw) {
        const arr = JSON.parse(cwRaw);
        this.hasContinueWatching =
          Array.isArray(arr) &&
          arr.some(
            (entry: any) =>
              (entry.mediaType === 'tv' &&
                entry.currentTime < entry.duration &&
                entry.duration >= 900) ||
              (entry.mediaType === 'movie' &&
                entry.currentTime < entry.duration &&
                entry.duration >= 4200)
          );
      } else {
        this.hasContinueWatching = false;
      }
    } catch {
      this.hasContinueWatching = false;
    }
  }
}
