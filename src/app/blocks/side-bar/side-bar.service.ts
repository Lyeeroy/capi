import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HighlightSlectedMenuRoute {
  // higlights slected <li> on click: $event (event: Event) -> mouse event
  handleClick(event: Event) {
    const target = event.target as HTMLElement;
    const activeRoute = target.closest('a')?.getAttribute('href');
    const menuItems = document.querySelectorAll('li[id^="li-menu-"]');
    menuItems.forEach((menuItem) => {
      if (menuItem.id.includes(activeRoute ?? '')) {
        menuItem.classList.add('bg-[#d9f3ea]');
      } else {
        menuItem.classList.remove('bg-[#d9f3ea]');
      }
    });
  }

  // higlights slected <li> on page load: called onInit jakoby
  ngAfterViewInit() {
    const url = window.location.pathname;
    const menuItems = document.querySelectorAll('li[id^="li-menu-"]');
    menuItems.forEach((menuItem) => {
      const menuItemUrl = menuItem.querySelector('a')?.getAttribute('href');
      if (menuItemUrl === url) {
        menuItem.classList.add('bg-[#d9f3ea]');
      } else {
        menuItem.classList.remove('bg-[#d9f3ea]');
      }
    });
  }
}
