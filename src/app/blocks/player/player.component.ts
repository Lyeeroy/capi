// src/app/blocks/player/player.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

import { TmdbService } from '../../services/tmdb.service';
import { LoadSourcesService } from './player.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  standalone: true,
  imports: [CommonModule],
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
    // Retrieve route parameters and query parameters.
    this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      this.mediaType = params.get('mediaType');
      this.names = this.route.snapshot.queryParams['name'];
      this.initializeData();

      // Load available sources.
      this.loadSourcesService.loadSources().then(() => {
        this.sources = this.loadSourcesService.sources;
        if (this.sources && this.sources.length > 0) {
          // Set the default selected source to the first one.
          this.currentSourceUrl = this.sources[0].url;
          this.reloadIframe();
        }
      });
    });
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
    this.reloadIframe();
  }

  nextEpisode(index: number) {
    // if its last episode disable next button
    if (this.currentEpisode === this.currentEpisodes.length) {
      return;
    }
    this.currentEpisode = index + 1;
    this.updateCurrentEpisodes(this.currentSeason);
    this.reloadIframe();
  }

  prevEpisode(index: number) {
    if (this.currentEpisode === 1) {
      return;
    }
    this.currentEpisode = index - 1;
    this.updateCurrentEpisodes(this.currentSeason);
    this.reloadIframe();
  }

  /**
   * Handles season changes.
   */
  onSeasonChange(event: Event) {
    this.currentSeason = Number((event.target as HTMLSelectElement).value);
    this.updateCurrentEpisodes(this.currentSeason);
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

  /**
   * Replaces tokens in the source URL and appends a cache-buster.
   */
  translateIntoIframe(url: string): SafeResourceUrl {
    let newUrl = url
      .replace(/#type(&[\w]+=\w+)*/g, this.mediaType || 'tv')
      .replace(/#id/g, this.id?.toString() || '');

    if (this.mediaType === 'tv') {
      newUrl = newUrl
        .replace(/#season/g, this.currentSeason?.toString() || '')
        .replace(/#episode/g, this.currentEpisode?.toString() || '');
    } else {
      newUrl = newUrl
        .replace(/([&?])(season|episode)=[^&]*/g, '') // Remove season & episode query params
        .replace(/\/(season|episode)\/[^/]+/g, '') // Remove season & episode from path
        .replace(/#season|#episode/g, ''); // Remove remaining placeholders
    }

    // Clean up redundant slashes and dashes
    newUrl = newUrl.replace(/\/{2,}/g, '/').replace(/-{2,}/g, '-');

    // Remove trailing slashes/dashes, but keep query params
    newUrl = newUrl.replace(
      /([-\/]+)(\?.*)?$/,
      (_, match, query) =>
        (query ? '' : match.replace(/[-\/]+$/, '')) + (query || '')
    );

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
  ascOrDescSort() {
    this.currentEpisodes.reverse();
    this.currentPosters.reverse();
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
