import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  ContinueWatchingService,
  ContinueWatchingEntry,
} from '../../services/continue-watching.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-continue-watching-list',
  templateUrl: './continue-watching-list.component.html',
  standalone: true,
  imports: [CommonModule],
})
export class ContinueWatchingListComponent implements OnInit {
  list: ContinueWatchingEntry[] = [];
  number = 0;

  constructor(
    private continueWatchingService: ContinueWatchingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadList();
  }

  loadList() {
    this.list = this.continueWatchingService
      .getList()
      .filter(
        (entry) =>
          (entry.mediaType === 'tv' &&
            entry.currentTime < entry.duration &&
            entry.duration >= 900) ||
          (entry.mediaType === 'movie' &&
            entry.currentTime < entry.duration &&
            entry.duration >= 4200)
      );
  }

  resume(entry: ContinueWatchingEntry) {
    // Mark episode as accessed when navigating via continue watching
    if (entry.mediaType === 'tv' && entry.season && entry.episode) {
      this.continueWatchingService.markEpisodeAsAccessed(
        entry.tmdbID,
        entry.season,
        entry.episode
      );
    }

    const queryParams: any = {};
    if (entry.mediaType === 'tv') {
      queryParams.season = entry.season;
      queryParams.episode = entry.episode;
    }
    this.router.navigate(['/player', entry.tmdbID, entry.mediaType], {
      queryParams,
    });
  }

  remove(index: number) {
    this.continueWatchingService.removeEntry(index);
    this.loadList();
  }

  clearAll() {
    this.continueWatchingService.clearAll();
    this.loadList();
  }
}
