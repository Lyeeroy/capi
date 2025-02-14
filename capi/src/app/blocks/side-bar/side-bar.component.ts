import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-side-bar',
  imports: [CommonModule],
  templateUrl: './side-bar.component.html',
})
export class SideBarComponent {
  menuItems = [
    {
      label: 'TV Shows',
      route: '/',
      svg: `assets/side-bar/tvshow.svg`,
    },
    { label: 'Movies', route: '/', svg: `assets/side-bar/tvshow.svg` },
    { label: 'Anime', route: '/', svg: `assets/side-bar/tvshow.svg` },
    { label: 'History', route: '/', svg: `assets/side-bar/tvshow.svg` },
    { label: 'Watchlist', route: '/', svg: `assets/side-bar/tvshow.svg` },
    { label: 'Settings', route: '/', svg: `assets/side-bar/tvshow.svg` },
  ];
}
