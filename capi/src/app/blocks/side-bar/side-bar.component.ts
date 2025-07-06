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
      label: 'Discover',
      route: '/discover',
      svg: `assets/side-bar/movie.svg`,
    },
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
}
