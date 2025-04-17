import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBarComponent } from './blocks/side-bar/side-bar.component';
import { HeaderComponent } from './blocks/header/header.component';
import { NavBarComponent } from './blocks/nav-bar/nav-bar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SideBarComponent, HeaderComponent, NavBarComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'capi';

  constructor() {
    this.initializeNewcomerStatus();
  }

  private initializeNewcomerStatus(): void {
    if (this.isFirstVisit()) {
      this.setNewcomerStatus(true);
    }
  }

  private isFirstVisit(): boolean {
    return !localStorage.getItem('isNewcomer');
  }

  private setNewcomerStatus(status: boolean): void {
    localStorage.setItem('isNewcomer', status.toString());
  }

  getNewcomerStatus(): boolean {
    return localStorage.getItem('isNewcomer') === 'true';
  }

  ngOnInit(): void {
    if (this.getNewcomerStatus()) {
      this.initializeSources();
      console.log('Welcome, newcomer! Here are some default sources.');
      this.setNewcomerStatus(false);
    }
  }

  private initializeSources(): void {
    const defaultSources = [
      {
        id: 1,
        name: 'vidsrc.cc',
        url: 'https://vidsrc.cc/v3/embed/#type/#id/#season/#episode',
        enabled: true,
      },
      {
        id: 2,
        name: 'vidsrc.xyz',
        url: 'https://vidsrc.xyz/embed/#type?tmdb=#id&season=#season&episode=#episode',
        enabled: true,
      },
      {
        id: 3,
        name: '111movies.com',
        url: 'https://111movies.com/#type/#id/#season/#episode',
        enabled: true,
      },
      {
        id: 4,
        name: 'vidsrc.su',
        url: 'https://vidsrc.su/embed/#type/#id/#season/#episode',
        enabled: true,
      },
      {
        id: 5,
        name: 'moviesapi.club',
        url: 'https://moviesapi.club/#type/#id-#season-#episode',
        enabled: true,
      },
      {
        id: 6,
        name: 'rivestream.org',
        url: 'https://rivestream.org/embed?type=#type&id=#id&season=#season&episode=#episode',
        enabled: true,
      },
      {
        id: 7,
        name: '2embed.cc',
        url: 'https://www.2embed.cc/#type?embedtv:embed/#id&s=#season&e=#episode',
        enabled: true,
      },
      {
        id: 8,
        name: 'Cineby',
        url: 'https://player.videasy.net/#type/#id/#season/#episode',
        enabled: true,
      },
      {
        id: 9,
        name: 'embed.su',
        url: 'https://embed.su/embed/#type/#id/#season/#episode',
        enabled: true,
      },
      {
        id: 10,
        name: 'player.smashy',
        url: 'https://player.smashy.stream/#type/#id?s=#season&e=#episode',
        enabled: true,
      },
      {
        id: 12,
        name: 'player.autoembed',
        url: 'https://player.autoembed.cc/embed/#type/#id/#season/#episode',
        enabled: true,
      },
      {
        id: 13,
        name: 'vidsrc.vip',
        url: 'https://vidsrc.vip/embed/#type/#id/#season/#episode',
        enabled: true,
      },
      {
        id: 14,
        name: 'vidlink',
        url: 'https://vidlink.pro/#type/#id/#season/#episode',
        enabled: true,
      },
    ];
    localStorage.setItem('sources', JSON.stringify(defaultSources));
  }
}
