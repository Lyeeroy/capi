// src/app/blocks/player/player.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

import { TmdbService } from '../../services/tmdb.service';
import { LoadSourcesService } from './player.service';
import { FormsModule } from '@angular/forms';

// Import SVG icons
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { IframeComponent } from './iframe/iframe.component';
import { ControlsComponent } from './controls/controls.component';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconLibComponent,
    IframeComponent,
    ControlsComponent,
  ],
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

  activeEpisodeIndex: number = 0;

  // Source-related properties
  sources: any = [];
  currentSourceUrl: string = '';

  // Episode and season tracking
  currentSeason: number = 1;
  currentEpisode: number = 1;

  // iFrame properties
  iframeUrl: SafeResourceUrl;
  showIframe: boolean = true;

  // Precompile the mapping regex for translateIntoIframe to avoid re-compilation.
  private mappingRegex: RegExp =
    /^(https?:\/\/[^\/]+\/)([^\/?]+)\?([^:]+):([^\/]+)(\/.*)$/;

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

      // Read season and episode from URL query params.
      const queryParams = this.route.snapshot.queryParams;
      this.currentSeason = queryParams['season']
        ? Number(queryParams['season'])
        : 1;
      this.currentEpisode = queryParams['episode']
        ? Number(queryParams['episode'])
        : 1;

      this.initializeData();

      // Load sources asynchronously
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
          this.seasonNumber = response?.number_of_seasons ?? this.seasonNumber;
          this.names = response?.name ?? this.names;
          if (this.seasonNumber) {
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
              const seasonNum = index + 1;
              this.totalSeasons.push(seasonNum);
              this.episodeNames[seasonNum] = response.episodes.map(
                (episode: any, episodeIndex: number) => ({
                  number: episodeIndex + 1,
                  name: episode.name,
                })
              );
              this.episodePosters[seasonNum] = response.episodes.map(
                (episode: any) =>
                  episode.still_path
                    ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
                    : 'https://miro.medium.com/v2/resize:fit:300/0*E6pTrKTFvvLDOzzj.png'
              );
            }
          });

          // Set the initial episodes for the current season.
          this.updateCurrentEpisodes(this.currentSeason);
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
    this.updateUrl();
    this.reloadIframe();
  }

  highlightActiveEpisode(index: number) {
    this.activeEpisodeIndex = index - 1;
  }

  onSeasonChange(event: Event) {
    this.currentSeason = Number((event.target as HTMLSelectElement).value);
    this.updateCurrentEpisodes(this.currentSeason);
    // Optionally update URL or reload the iframe here if needed.
  }

  updateUrl() {
    const url = new URL(window.location.href);
    const queryParams = new URLSearchParams(url.search);
    queryParams.set('season', this.currentSeason.toString());
    queryParams.set('episode', this.currentEpisode.toString());
    const newUrl = `${url.pathname}?${queryParams.toString()}`;
    this.location.replaceState(newUrl);
  }

  nextEpisode(index: number) {
    if (this.currentEpisode < this.currentEpisodes.length) {
      this.currentEpisode = index + 1;
      this.updateCurrentEpisodes(this.currentSeason);
      this.updateUrl();
      this.reloadIframe();
    }
  }

  prevEpisode(index: number) {
    if (this.currentEpisode > 1) {
      this.currentEpisode = index - 1;
      this.updateCurrentEpisodes(this.currentSeason);
      this.updateUrl();
      this.reloadIframe();
    }
  }

  /**
   * Handles source changes.
   */
  onSourceChange(newSourceUrl: string) {
    this.currentSourceUrl = newSourceUrl;
    this.reloadIframe();
  }

  /**
   * Forces the iframe to re-render by toggling its container.
   */
  reloadIframe() {
    this.highlightActiveEpisode(this.currentEpisode);
    // Update iframe URL using the new source before toggling.
    if (this.currentSourceUrl) {
      this.iframeUrl = this.translateIntoIframe(this.currentSourceUrl);
    }
    // Toggle iframe display to force re-render.
    this.showIframe = false;
    // Using a short timeout ensures the DOM registers the change.
    setTimeout(() => (this.showIframe = true), 0);
  }

  /**
   * Translates a given source URL into an iframe-friendly URL.
   */
  translateIntoIframe(url: string): SafeResourceUrl {
    let newUrl: string;
    const match = url.match(this.mappingRegex);

    if (match) {
      const baseUrl = match[1];
      const typePlaceholder = match[2];
      const tokenTv = match[3];
      const tokenMovie = match[4];
      const restOfUrl = match[5];
      const replacement = this.mediaType === 'movie' ? tokenMovie : tokenTv;
      newUrl = `${baseUrl}${replacement}${restOfUrl}`;
      newUrl = newUrl.replace(/#id/g, this.id?.toString() || '');
      if (this.mediaType === 'tv') {
        newUrl = newUrl
          .replace(/#season/g, this.currentSeason.toString())
          .replace(/#episode/g, this.currentEpisode.toString());
      } else {
        newUrl = newUrl
          .replace(/([&?])(s|e|season|episode)=[^&]*/gi, '')
          .replace(/\/(season|episode)\/[^/]+/gi, '')
          .replace(/#season|#episode/gi, '');
      }
    } else {
      newUrl = url
        .replace(/#type/g, this.mediaType || 'tv')
        .replace(/#id/g, this.id?.toString() || '');
      if (this.mediaType === 'tv') {
        newUrl = newUrl
          .replace(/#season/g, this.currentSeason.toString())
          .replace(/#episode/g, this.currentEpisode.toString());
      } else {
        newUrl = newUrl
          .replace(/([&?])(s|e|season|episode)=[^&]*/gi, '')
          .replace(/\/(season|episode)\/[^/]+/gi, '')
          .replace(/#season|#episode/gi, '');
      }
    }
    // Cleanup redundant slashes.
    newUrl = newUrl.replace(/([^:])\/{2,}/g, '$1/');
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
  isSortedAscending = true;
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
