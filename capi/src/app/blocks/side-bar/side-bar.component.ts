import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-side-bar',
  imports: [CommonModule, RouterModule],
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
}
