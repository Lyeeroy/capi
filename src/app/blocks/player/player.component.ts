// src/app/blocks/player/player.component.ts

import { Component, NgModule, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

import { TmdbService } from '../../services/tmdb.service';
import { LoadSourcesService } from './player.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [LoadSourcesService],
})
export class PlayerComponent implements OnInit {
  // Media and TV show properties
  id: number | null = null;
  mediaType: string | null = null;
  names: string | null = null;
  seasonNumber: number | null = 0;
  totalSeasons: number[] = [];
  episodeNames: { [key: number]: { number: number; name: string }[] } = {};
  episodePosters: { [key: number]: string[] } = {};
  currentEpisodes: { number: number; name: string }[] = [];
  currentPosters: string[] = [];
  layoutType: 'list' | 'grid' | 'poster' = 'list';

  // Source-related properties
  sources: any = [];
  currentSourceUrl: string = ''; // Holds the currently selected source URL

  // Episode and season tracking
  currentSeason: number = 1;
  currentEpisode: number = 1;

  // iFrame properties
  iframeUrl: SafeResourceUrl;
  showIframe: boolean = true; // Flag to force re-creation of the iframe

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private tmdbService: TmdbService,
    private loadSourcesService: LoadSourcesService,
    private sanitizer: DomSanitizer
  ) {
    // Initialize with an empty safe URL
    this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      this.mediaType = params.get('mediaType');
      this.names = this.route.snapshot.queryParams['name'];

      // Read season and episode from URL
      const queryParams = this.route.snapshot.queryParams;
      this.currentSeason = queryParams['season']
        ? Number(queryParams['season'])
        : 1;
      this.currentEpisode = queryParams['episode']
        ? Number(queryParams['episode'])
        : 1;

      this.initializeData();

      // Load sources
      this.loadSourcesService.loadSources().then(() => {
        this.sources = this.loadSourcesService.sources;
        if (this.sources && this.sources.length > 0) {
          this.currentSourceUrl = this.sources[0].url;
          this.reloadIframe();
        }
      });
    });
  }

  nextSource() {
    const currentIndex = this.sources.findIndex(
      (source: { url: string }) => source.url === this.currentSourceUrl
    );
    const nextIndex = (currentIndex + 1) % this.sources.length;
    this.currentSourceUrl = this.sources[nextIndex].url;
    this.reloadIframe();
  }

  prevSource() {
    const currentIndex = this.sources.findIndex(
      (source: { url: string }) => source.url === this.currentSourceUrl
    );
    const previousIndex =
      (currentIndex - 1 + this.sources.length) % this.sources.length;
    this.currentSourceUrl = this.sources[previousIndex].url;
    this.reloadIframe();
  }

  /**
   * Initializes TV show data.
   */
  initializeData() {
    if (this.mediaType === 'tv' && this.id !== null) {
      this.tmdbService
        .callAPI('https://api.themoviedb.org/3', `/tv/${this.id}`, 'tv')
        .subscribe((response) => {
          if (response?.number_of_seasons) {
            this.seasonNumber = response.number_of_seasons;
            this.getAllSeasonData();
          }
        });
    }
  }

  /**
   * Loads data for all seasons.
   */
  getAllSeasonData() {
    if (this.seasonNumber) {
      const seasonObservables = Array.from(
        { length: this.seasonNumber },
        (_, i) =>
          this.tmdbService.callAPI(
            'https://api.themoviedb.org/3',
            `/tv/${this.id}/season/${i + 1}`,
            'tv'
          )
      );
      forkJoin(seasonObservables).subscribe(
        (responses) => {
          responses.forEach((response, index) => {
            if (response?.episodes) {
              this.totalSeasons.push(index + 1);
              this.episodeNames[index + 1] = response.episodes.map(
                (episode: any, episodeIndex: number) => ({
                  number: episodeIndex + 1,
                  name: episode.name,
                })
              );
              this.episodePosters[index + 1] = response.episodes.map(
                (episode: any) =>
                  episode.still_path
                    ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
                    : 'https://miro.medium.com/v2/resize:fit:300/0*E6pTrKTFvvLDOzzj.png'
              );
            }
          });
          // Set the initial episodes for season 1.
          this.updateCurrentEpisodes(1);
          this.updateUrl();
        },
        (error) => console.error('Error fetching season data:', error)
      );
    }
  }

  /**
   * Handles episode selection.
   */
  playEpisode(index: number) {
    this.currentEpisode = index + 1;
    this.updateCurrentEpisodes(this.currentSeason);

    // Update URL
    this.updateUrl();

    this.reloadIframe();
  }

  onSeasonChange(event: Event) {
    this.currentSeason = Number((event.target as HTMLSelectElement).value);
    this.updateCurrentEpisodes(this.currentSeason);

    // Update URL
    this.updateUrl();

    this.reloadIframe();
  }

  updateUrl() {
    const url = new URL(window.location.href);
    const queryParams = new URLSearchParams(url.search);

    if (this.currentSeason) {
      queryParams.set('season', this.currentSeason.toString());
    }
    if (this.currentEpisode) {
      queryParams.set('episode', this.currentEpisode.toString());
    }

    const newUrl = `${url.pathname}?${queryParams.toString()}`;
    this.location.replaceState(newUrl);
  }

  nextEpisode(index: number) {
    if (this.currentEpisode === this.currentEpisodes.length) {
      return;
    }
    this.currentEpisode = index + 1;
    this.updateCurrentEpisodes(this.currentSeason);

    // Update URL
    this.updateUrl();

    this.reloadIframe();
  }

  prevEpisode(index: number) {
    if (this.currentEpisode === 1) {
      return;
    }
    this.currentEpisode = index - 1;
    this.updateCurrentEpisodes(this.currentSeason);

    // Update URL
    this.updateUrl();

    this.reloadIframe();
  }

  /**
   * Handles source changes.
   */
  onSourceChange(event: any) {
    this.currentSourceUrl = event.target.value;
    this.reloadIframe();
  }

  /**
   * Forces the iframe to re-render by toggling its container.
   */
  reloadIframe() {
    this.showIframe = false;
    // A short delay allows the DOM to update.
    if (this.currentSourceUrl) {
      this.iframeUrl = this.translateIntoIframe(this.currentSourceUrl);
    }
    this.showIframe = true;
  }

  translateIntoIframe(url: string): SafeResourceUrl {
    // Regular expression to match the mapping URL.
    // Breakdown:
    //   Group 1: Base URL (e.g., "https://www.2embed.cc/")
    //   Group 2: The placeholder in the path (e.g., "#type")
    //   Group 3: Token for tv (e.g., "embed")
    //   Group 4: Token for movie (e.g., "embedtv")
    //   Group 5: The rest of the URL (e.g., "/#id&s=#season&e=#episode")
    const mappingRegex =
      /^(https?:\/\/[^\/]+\/)([^\/?]+)\?([^:]+):([^\/]+)(\/.*)$/;
    const match = url.match(mappingRegex);
    let newUrl: string;

    if (match) {
      const baseUrl = match[1]; // e.g., "https://www.2embed.cc/"
      const typePlaceholder = match[2]; // e.g., "#type"
      const tokenTv = match[3]; // e.g., "embed"
      const tokenMovie = match[4]; // e.g., "embedtv"
      const restOfUrl = match[5]; // e.g., "/#id&s=#season&e=#episode"

      // Choose replacement based on mediaType:
      const replacement = this.mediaType === 'movie' ? tokenMovie : tokenTv;

      // Construct the new URL: replace the type placeholder with the chosen token.
      newUrl = `${baseUrl}${replacement}${restOfUrl}`;

      // Replace the #id placeholder.
      newUrl = newUrl.replace(/#id/g, this.id?.toString() || '');

      if (this.mediaType === 'tv') {
        // For TV, replace season and episode placeholders with actual numbers.
        newUrl = newUrl
          .replace(/#season/g, this.currentSeason?.toString() || '')
          .replace(/#episode/g, this.currentEpisode?.toString() || '');
      } else {
        // For movies, remove any season/episode data.
        newUrl = newUrl
          // Remove query parameters like s, e, season, or episode.
          .replace(/([&?])(s|e|season|episode)=[^&]*/gi, '')
          // Remove season/episode segments from the path.
          .replace(/\/(season|episode)\/[^/]+/gi, '')
          // Remove any remaining placeholders.
          .replace(/#season|#episode/gi, '');
      }
    } else {
      // Fallback if the URL does not follow the mapping pattern.
      newUrl = url
        .replace(/#type/g, this.mediaType || 'tv')
        .replace(/#id/g, this.id?.toString() || '');
      if (this.mediaType === 'tv') {
        newUrl = newUrl
          .replace(/#season/g, this.currentSeason?.toString() || '')
          .replace(/#episode/g, this.currentEpisode?.toString() || '');
      } else {
        newUrl = newUrl
          .replace(/([&?])(s|e|season|episode)=[^&]*/gi, '')
          .replace(/\/(season|episode)\/[^/]+/gi, '')
          .replace(/#season|#episode/gi, '');
      }
    }

    // Cleanup: Remove redundant slashes except in the protocol.
    // This regex finds multiple slashes not preceded by a colon.
    newUrl = newUrl.replace(/([^:])\/{2,}/g, '$1/');

    // Optionally, remove a trailing slash if it is not needed.
    newUrl = newUrl.replace(/\/+(\?.*)?$/, '$1');

    return this.sanitizer.bypassSecurityTrustResourceUrl(newUrl);
  }

  /**
   * Updates the current episodes and posters for the given season.
   */
  updateCurrentEpisodes(seasonNumber: number) {
    if (this.episodeNames[seasonNumber] && this.episodePosters[seasonNumber]) {
      this.currentEpisodes = this.episodeNames[seasonNumber];
      this.currentPosters = this.episodePosters[seasonNumber];
    }
  }

  /**
   * Reverses the order of episodes and posters.
   */
  isSortedAscending = true; // just for 180deg
  ascOrDescSort() {
    this.currentEpisodes.reverse();
    this.currentPosters.reverse();
    this.isSortedAscending = !this.isSortedAscending;
  }

  /**
   * Navigates back to the previous page.
   */
  cancel() {
    this.location.back();
  }

  /**
   * Cycles through available layout types.
   */
  changeLayout() {
    this.layoutType =
      this.layoutType === 'list'
        ? 'grid'
        : this.layoutType === 'grid'
        ? 'poster'
        : 'list';
  }
}
