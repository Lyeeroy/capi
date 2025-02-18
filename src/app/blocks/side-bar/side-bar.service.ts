// src/app/blocks/side-bar/side-bar.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HighlightSlectedMenuRoute {
  handleClick(event: Event) {
    const target = event.target as HTMLElement;
    const activeRoute = target.closest('a')?.getAttribute('href');
    const menuItems = document.querySelectorAll('#sidebar-menu li');

    menuItems.forEach((menuItem) => {
      if (menuItem.id.includes(activeRoute ?? '')) {
        menuItem.classList.add('selected');
      } else {
        menuItem.classList.remove('selected');
      }
    });
  }

  ngAfterViewInit() {
    const url = window.location.pathname;
    const menuItems = document.querySelectorAll('#sidebar-menu li');

    menuItems.forEach((menuItem) => {
      const menuItemUrl = menuItem.querySelector('a')?.getAttribute('href');
      if (menuItemUrl === url) {
        menuItem.classList.add('selected');
      }
    });
  }
}
