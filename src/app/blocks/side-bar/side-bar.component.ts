import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { HighlightSlectedMenuRoute } from './side-bar.service';
@Component({
  selector: 'app-side-bar',
  imports: [CommonModule, RouterModule, RouterLink],
  templateUrl: './side-bar.component.html',
})
export class SideBarComponent {
  menuItems = [
    {
      label: 'TV Shows',
      route: '/tvshows',
      svg: `assets/side-bar/tvshow.svg`,
    },
    { label: 'Movies', route: '/movies', svg: `assets/side-bar/movie.svg` },
    { label: 'Anime', route: '/anime', svg: `assets/side-bar/anime.svg` },
    { label: 'History', route: '/history', svg: `assets/side-bar/history.svg` },
    {
      label: 'Watchlist',
      route: '/watchlist',
      svg: `assets/side-bar/save.svg`,
    },
    {
      label: 'Settings',
      route: '/settings',
      svg: `assets/side-bar/settings.svg`,
    },
  ];

  constructor(private highlightSlectedMenuRoute: HighlightSlectedMenuRoute) {}

  handleClick(event: Event) {
    this.highlightSlectedMenuRoute.handleClick(event);
  }

  ngAfterViewInit() {
    this.highlightSlectedMenuRoute.ngAfterViewInit();
  }
}
