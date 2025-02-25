// src/app/blocks/player/player.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class LoadSourcesService {
  sources: {
    id: number;
    name: string;
    type: 'tv' | 'movie';
    season: number;
    episode: number;
    url: string;
  }[] = [];

  constructor(private router: Router) {}

  async loadSources() {
    const sources = JSON.parse(localStorage.getItem('sources') || '[]');
    const promises = sources.map(async (source: { url: any }) => {
      console.log('source', source);
      const { url } = source;
      const matchResult = url.match(
        /^https:\/\/.*\/player\/(?<id>\d+)\/(?<type>tv|movie)\?name=(?<name>[^&]+)(?:&season=(?<season>\d+))?(?:&episode=(?<episode>\d+))?/
      );
      console.log('matchResult', matchResult);
      if (!matchResult?.groups) {
        return source;
      }
      const { id, type, season, episode, name } = matchResult.groups;
      console.log(
        'id, type, season, episode, name',
        id,
        type,
        season,
        episode,
        name
      );
      let nameToUse: string;
      if (type === 'tv') {
        nameToUse = `${id} - ${season}`;
      } else {
        nameToUse = decodeURIComponent(name);
      }
      console.log('nameToUse', nameToUse);
      return {
        ...source,
        id: +id,
        type,
        season: +season,
        episode: +episode,
        name: nameToUse,
      };
    });
    this.sources = await Promise.all(promises);
    console.log('this.sources', this.sources);
  }
}
