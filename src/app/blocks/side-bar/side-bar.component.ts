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
    { label: 'Home', route: '', svg: `assets/side-bar/home.svg` },
    {
      label: 'Discover',
      route: '/discover',
      svg: `assets/side-bar/movie.svg`,
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
