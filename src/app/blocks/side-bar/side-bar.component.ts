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
    { label: 'Movies', route: '/movies', svg: `assets/side-bar/tvshow.svg` },
    { label: 'Anime', route: '/anime', svg: `assets/side-bar/tvshow.svg` },
    { label: 'History', route: '/history', svg: `assets/side-bar/tvshow.svg` },
    {
      label: 'Watchlist',
      route: '/watchlist',
      svg: `assets/side-bar/tvshow.svg`,
    },
    {
      label: 'Settings',
      route: '/settings',
      svg: `assets/side-bar/tvshow.svg`,
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
