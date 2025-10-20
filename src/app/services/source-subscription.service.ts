import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SourceSubscriptionService {
  // https://rentry.co/onbksdgu
  private readonly defaultSources = [
    {
      id: 1,
      name: '111movies.com',
      url: 'https://111movies.com/#type/#id/#season/#episode',
      enabled: true,
    },
    {
      id: 2,
      name: 'vidlink.pro',
      url: 'https://vidlink.pro/#type/#id/#season/#episode',
      enabled: true,
    },
    {
      id: 3,
      name: 'vidfast.pro',
      url: 'https://vidfast.pro/#type/#id/#season/#episode',
      enabled: true,
    },
    {
      id: 4,
      name: 'spencerdevs.xyz',
      url: 'https://spencerdevs.xyz/#type/#id/#season/#episode',
      enabled: true,
    },
    {
      id: 5,
      name: 'vidsrc.vip',
      url: 'https://vidsrc.vip/embed/#type/#id/#season/#episode',
      enabled: true,
    },
    {
      id: 6,
      name: 'vidsrc.xyz',
      url: 'https://vidsrc.xyz/embed/#type?tmdb=#id&season=#season&episode=#episode',
      enabled: true,
    },
  ];
  private readonly sourcesKey = 'sources';
  private readonly isSubscribedKey = 'isSubscribed';

  initSubscriptionState(): void {
    if (localStorage.getItem(this.isSubscribedKey) === null) {
      // First visit: subscribe by default
      this.subscribeToDefaults();
    } else if (this.isSubscribed()) {
      this.loadDefaultSources();
    }
  }

  subscribeToDefaults(): void {
    // If user has custom sources, confirm before overwriting
    const customSources = this.getCustomSources();
    // if (customSources.length > 0) {
    //   if (
    //     !confirm(
    //       'You have custom sources. Subscribing will remove them. Continue?'
    //     )
    //   ) {
    //     return;
    //   }
    // }
    this.saveSources(this.defaultSources);
    localStorage.setItem(this.isSubscribedKey, 'true');
  }

  unsubscribeFromDefaults(): void {
    // Remove default sources, allow user to edit freely
    localStorage.setItem(this.isSubscribedKey, 'false');
    // Optionally clear sources or leave user's last state
    // localStorage.removeItem(this.sourcesKey);
  }

  isSubscribed(): boolean {
    return localStorage.getItem(this.isSubscribedKey) === 'true';
  }

  getCustomSources(): any[] {
    const sources = this.getSources();
    // Custom sources = any that are not in defaultSources by url
    const defaultUrls = new Set(this.defaultSources.map((s) => s.url));
    return sources.filter((s) => !defaultUrls.has(s.url));
  }

  getSources(): any[] {
    const data = localStorage.getItem(this.sourcesKey);
    return data ? JSON.parse(data) : [];
  }

  saveSources(sources: any[]): void {
    localStorage.setItem(this.sourcesKey, JSON.stringify(sources));
  }

  loadDefaultSources(): void {
    this.saveSources(this.defaultSources);
  }
}
