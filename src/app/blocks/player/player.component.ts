import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, Subscription } from 'rxjs';
import { TmdbService } from '../../services/tmdb.service';
import { LoadSourcesService } from './player.service';
import { FormsModule } from '@angular/forms';
import { IframeComponent } from './iframe/iframe.component';
import { ControlsComponent } from './controls/controls.component';
import { PlaylistComponent } from './playlist/playlist.component';
import { PlayerHeader } from './player-header/player-header.component';
import { InfoComponent } from './info/info.component';
import { EpisodeNavigationComponent } from './episode-navigation/episode-navigation.component';
import { RecommendationsComponent } from './recommendations/recommendations.component';
import { ContinueWatchingService } from '../../services/continue-watching.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

// Interfaces for better type safety
interface Episode {
  number: number;
  name: string;
  description?: string;
}

interface Source {
  id: number;
  name: string;
  type: 'tv' | 'movie';
  season: number;
  episode: number;
  url: string;
  enabled: boolean;
}

interface TMDBResponse {
  id: number;
  name?: string;
  title?: string;
  poster_path?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  seasons?: any[];
  episodes?: any[];
}

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styles: [
    `
      /* Hide headers from child components when in unified view */
      #unified-panel app-info > div > div:first-child {
        display: none !important;
      }

      #unified-panel app-playlist > div > div:first-child {
        display: none !important;
      }

      /* Remove borders from child components */
      #unified-panel app-info > div {
        border: none !important;
        border-radius: 0 !important;
        background: transparent !important;
      }

      #unified-panel app-playlist > div {
        border: none !important;
        border-radius: 0 !important;
      }

      /* Ensure proper border radius for playlist when details collapsed */
      #unified-panel app-playlist.rounded-t-none > div {
        border-top-left-radius: 0 !important;
        border-top-right-radius: 0 !important;
      }
    `,
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PlayerHeader,
    IframeComponent,
    ControlsComponent,
    PlaylistComponent,
    InfoComponent,
    EpisodeNavigationComponent,
    RecommendationsComponent,
    IconLibComponent,
  ],
  providers: [LoadSourcesService],
})
export class PlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  isRecommendationsModalOpen: boolean = false;
  openRecommendationsModal(): void {
    this.isRecommendationsModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeRecommendationsModal(): void {
    this.isRecommendationsModalOpen = false;
    document.body.style.overflow = 'auto';
  }
  @ViewChild('playlistContainer') playlistContainer!: ElementRef;
  @ViewChild('videoContainer') videoContainer!: ElementRef;
  @ViewChild(PlaylistComponent) playlistComponent!: PlaylistComponent;

  // Media info
  id: number | null = null;
  mediaType: 'tv' | 'movie' | null = null;
  names: string | null = null;
  responseData: TMDBResponse | null = null;

  // Season/Episode data
  seasonNumber: number | null = 0;
  totalSeasons: number[] = [];
  episodeNames: Record<number, Episode[]> = {};
  episodePosters: Record<number, string[]> = {};
  currentEpisodes: Episode[] = [];
  currentPosters: string[] = [];

  // Current state
  currentSeason: number = 1; // Season currently being viewed in playlist
  currentEpisode: number = 1; // Episode currently being viewed in playlist
  activeEpisodeIndex: number = -1;
  activeEpisodeSeason: number = 1;

  // Actually playing episode/season (separate from viewing)
  playingEpisode: number = 1;
  playingSeason: number = 1;
  // UI state
  layoutType: 'list' | 'grid' | 'poster' | 'compact' = 'list';
  onShowPlaylist: boolean = true;
  onShowDetails: boolean = false;
  showIframe: boolean = true;
  isDetailsExpanded: boolean = false; // legacy, not used for modal
  isDetailsModalOpen: boolean = false;
  playlistHeight: number = 0;

  // Video sources
  sources: Source[] = [];
  currentSourceUrl: string = '';
  iframeUrl: SafeResourceUrl;

  // Video progress tracking
  private videoCurrentTime: number = 0;
  private videoDuration: number = 0;
  private progressInterval: any;
  private episodeFinished = false;
  private readonly HARDCODED_DURATION = 900;

  // Fullscreen state
  isFullscreen: boolean = false;

  // Subscriptions for cleanup
  private routeSubscription?: Subscription;

  // Constants
  private readonly MAPPING_REGEX =
    /^(https?:\/\/[^\/]+\/)([^\/?]+)\?([^:]+):([^\/]+)(\/.*)$/;

  // Window resize tracking
  private resizeListener?: () => void;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private tmdbService: TmdbService,
    private loadSourcesService: LoadSourcesService,
    private sanitizer: DomSanitizer,
    private continueWatchingService: ContinueWatchingService,
    private router: Router
  ) {
    this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }
  ngOnInit() {
    // Clean up and synchronize continue watching with playlist system
    this.continueWatchingService.cleanupAndSynchronize();

    // Load default layout from settings
    this.loadDefaultSettings();

    // Set up window resize listener for height calculation
    this.setupResizeListener();

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      const mediaTypeParam = params.get('mediaType');
      this.mediaType =
        mediaTypeParam === 'tv' || mediaTypeParam === 'movie'
          ? mediaTypeParam
          : null;

      // Details are collapsed by default for all media types
      this.names = this.route.snapshot.queryParams['name'];
      const queryParams = this.route.snapshot.queryParams;
      this.currentSeason = queryParams['season']
        ? Number(queryParams['season'])
        : 1;
      this.currentEpisode = queryParams['episode']
        ? Number(queryParams['episode'])
        : 1;

      // Set the playing episode/season (these represent what's actually playing)
      this.playingSeason = this.currentSeason;
      this.playingEpisode = this.currentEpisode;

      // Set the active episode season to current season on load
      this.activeEpisodeSeason = this.currentSeason;

      // Mark episode as accessed when navigating via continue watching (for playlist marking)
      if (this.mediaType === 'tv' && this.id) {
        this.continueWatchingService.markEpisodeAsAccessed(
          String(this.id),
          this.playingSeason,
          this.playingEpisode
        );
      }

      // Try to restore currentTime and check for episode advancement from continue watching
      const cwList = this.continueWatchingService.getList();

      // First look for exact match (same episode)
      let entry = cwList.find(
        (e) =>
          e.tmdbID === String(this.id) &&
          e.mediaType === this.mediaType &&
          (this.mediaType === 'movie' ||
            (e.season === this.playingSeason &&
              e.episode === this.playingEpisode))
      );

      // If exact match not found for TV, check if there's an entry with the next episode
      // (which may have been auto-incremented by continueWatchingService)
      if (!entry && this.mediaType === 'tv') {
        const advancedEntry = cwList.find(
          (e) =>
            e.tmdbID === String(this.id) &&
            e.mediaType === 'tv' &&
            e.season === this.playingSeason &&
            e.episode === this.playingEpisode + 1 &&
            e.currentTime === 0 // Confirm this is an auto-advanced entry (current time will be 0)
        );
        // If found an auto-advanced entry, update our current episode and use that entry
        if (advancedEntry && typeof advancedEntry.episode === 'number') {
          this.playingEpisode = advancedEntry.episode;
          this.currentEpisode = this.playingEpisode;
          entry = advancedEntry;

          // Update URL without reloading to reflect the correct episode
          const newQueryParams = {
            ...queryParams,
            episode: this.playingEpisode,
          };
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: newQueryParams,
            queryParamsHandling: 'merge',
            replaceUrl: true, // Don't add to browser history
          });
        }
      }

      if (entry && typeof entry.currentTime === 'number') {
        this.videoCurrentTime = entry.currentTime;
      } else {
        this.videoCurrentTime = 0;
      }

      this.initializeData();
      this.loadSourcesService.loadSources().then(() => {
        this.sources = this.loadSourcesService.sources.map((source) => ({
          ...source,
          enabled: true, // Default all sources to enabled
        }));
        if (this.sources && this.sources.length > 0) {
          // Try to load the last used source if the setting is enabled
          try {
            const settings = JSON.parse(
              localStorage.getItem('appSettings') || '{}'
            );
            if (settings.rememberLastSource) {
              const lastSource = localStorage.getItem('lastSource');
              if (
                lastSource &&
                this.sources.some((source) => source.url === lastSource)
              ) {
                this.currentSourceUrl = lastSource;
                this.reloadIframe();
                return;
              }
            }
          } catch (error) {
            console.warn('Failed to load last source:', error);
          }

          // Fallback to first source if no remembered source or if loading fails
          this.currentSourceUrl = this.sources[0].url;
          this.reloadIframe();
        }
      });
    });
    window.addEventListener('beforeunload', this.saveProgress);
    this.progressInterval = setInterval(() => this.saveProgress(), 5000);
  }
  ngAfterViewInit() {
    // Match playlist height to iframe after view initialization
    this.matchPlaylistHeight();

    // Also try again after a longer delay in case content is still loading
    setTimeout(() => this.matchPlaylistHeight(), 500);
    setTimeout(() => this.matchPlaylistHeight(), 1000);
  }
  ngOnDestroy() {
    this.saveProgress();

    // Process completed episodes before cleanup
    this.continueWatchingService.processCompletedEpisodes();

    // Restore body overflow if component is destroyed while in fullscreen
    document.body.style.overflow = 'auto';

    this.cleanup();
  }

  private cleanup(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.resizeListener && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
    window.removeEventListener('beforeunload', this.saveProgress);
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
  getCurrentTimeAndDuration(): { currentTime: number; duration: number } {
    this.updateVideoDurationFromTMDB();
    this.validateCurrentTime();

    // Only increment currentTime if not finished
    if (!this.episodeFinished && this.videoCurrentTime < this.videoDuration) {
      this.videoCurrentTime = Math.min(
        this.videoCurrentTime + 5,
        this.videoDuration
      );
    } else if (
      this.videoCurrentTime >= this.videoDuration &&
      !this.episodeFinished
    ) {
      this.videoCurrentTime = this.videoDuration;
      this.episodeFinished = true;
      this.stopProgressTracking();

      // If a TV show episode is finished, automatically update URL to next episode
      if (
        this.mediaType === 'tv' &&
        this.currentEpisodes &&
        this.playingEpisode < this.currentEpisodes.length
      ) {
        const nextEpisode = this.playingEpisode + 1;

        // Update URL without reloading to reflect the next episode
        const queryParams = {
          ...this.route.snapshot.queryParams,
          episode: nextEpisode,
        };
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: queryParams,
          queryParamsHandling: 'merge',
          replaceUrl: true, // Don't add to browser history
        });
      }
    }

    return {
      currentTime: this.videoCurrentTime,
      duration: this.videoDuration,
    };
  }
  private updateVideoDurationFromTMDB(): void {
    // Always try to get the most accurate duration from TMDB
    const runtime = this.getDurationFromResponse();
    if (runtime > 0) {
      // Use 70% of TMDB runtime as the effective duration
      this.videoDuration = Math.floor(runtime * 0.7);
    } else if (
      !this.videoDuration ||
      this.videoDuration === this.HARDCODED_DURATION
    ) {
      // Only fall back to hardcoded values if we don't have any duration set yet
      this.videoDuration = this.mediaType === 'movie' ? 4200 : 900;
    }
  }

  private validateCurrentTime(): void {
    if (
      typeof this.videoCurrentTime !== 'number' ||
      this.videoCurrentTime < 0
    ) {
      this.videoCurrentTime = 0;
    }
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  getDurationFromResponse(): number {
    // For movies, TMDB returns 'runtime' in minutes
    if (this.mediaType === 'movie' && this.responseData?.runtime) {
      return this.responseData.runtime * 60; // convert to seconds
    }
    // For TV, TMDB returns 'episode_run_time' as array of minutes (average per episode)
    if (this.mediaType === 'tv') {
      // Try to get runtime for the current episode if available
      if (
        this.responseData?.seasons &&
        Array.isArray(this.responseData.seasons) &&
        this.currentSeason &&
        this.currentEpisode
      ) {
        const season = this.responseData.seasons.find(
          (s: any) => s.season_number === this.currentSeason
        );
        if (season && season.episodes && Array.isArray(season.episodes)) {
          const episode = season.episodes.find(
            (ep: any) => ep.episode_number === this.currentEpisode
          );
          if (episode && episode.runtime) {
            return episode.runtime * 60;
          }
        }
      }
      // Fallback: use average episode runtime
      if (
        this.responseData?.episode_run_time &&
        Array.isArray(this.responseData.episode_run_time) &&
        this.responseData.episode_run_time.length > 0
      ) {
        return this.responseData.episode_run_time[0] * 60;
      }
    }
    return 0;
  }
  saveProgress = () => {
    if (!this.id || !this.mediaType) return;
    // Only skip saving if API response is not loaded yet
    if (!this.responseData) return;
    const { currentTime, duration } = this.getCurrentTimeAndDuration();

    // If API response is loaded, allow saving even if duration is fallback (some movies/TV lack duration)
    let totalEpisodesInSeason = undefined;
    if (this.mediaType === 'tv' && this.currentEpisodes) {
      totalEpisodesInSeason = this.currentEpisodes.length;
    }

    // Calculate progress for immediate playlist update
    const progress = duration > 0 ? currentTime / duration : 0;

    // Immediately update playlist component with current progress (no delay)
    if (
      this.playlistComponent &&
      this.mediaType === 'tv' &&
      typeof this.playlistComponent.updateEpisodeProgressImmediate ===
        'function'
    ) {
      this.playlistComponent.updateEpisodeProgressImmediate(
        this.playingSeason,
        this.playingEpisode,
        progress
      );
    }

    // Save progress to continue watching service
    this.continueWatchingService.saveOrAdvance(
      {
        tmdbID: String(this.id),
        mediaType: this.mediaType as 'movie' | 'tv',
        season: this.mediaType === 'tv' ? this.playingSeason : undefined,
        episode: this.mediaType === 'tv' ? this.playingEpisode : undefined,
        currentTime,
        duration,
        poster_path: this.responseData?.poster_path,
        title: this.responseData?.title,
        name: this.responseData?.name,
      },
      totalEpisodesInSeason,
      this.totalSeasons?.length // Pass total number of seasons
    );

    // Refresh playlist watched episodes after saving progress (fallback for background sync)
    if (this.playlistComponent) {
      this.playlistComponent.refreshWatchedEpisodes();
    }
  };

  findContinueWatchingIndex(): number {
    const list = this.continueWatchingService.getList();
    return list.findIndex(
      (e) =>
        e.tmdbID === String(this.id) &&
        e.mediaType === this.mediaType &&
        (this.mediaType === 'movie' ||
          (e.season === this.playingSeason &&
            e.episode === this.playingEpisode))
    );
  }
  nextSource() {
    let currentIndex = this.sources.findIndex(
      (source) => source.url === this.currentSourceUrl && source.enabled
    );
    let nextIndex = (currentIndex + 1) % this.sources.length;
    while (!this.sources[nextIndex].enabled) {
      nextIndex = (nextIndex + 1) % this.sources.length;
    }
    this.currentSourceUrl = this.sources[nextIndex].url;
    this.reloadIframe();
  }
  showPlaylist(): void {
    this.onShowDetails = false;
    this.onShowPlaylist = true;
  }

  showDetails(): void {
    this.onShowPlaylist = false;
    this.onShowDetails = true;
  }

  openDetailsModal(): void {
    this.isDetailsModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    document.body.style.overflow = 'auto';
  }

  cancel(): void {
    this.location.back();
  }
  changeLayout(): void {
    const layoutOrder: Array<'list' | 'grid' | 'poster' | 'compact'> = [
      'list',
      'grid',
      'poster',
      'compact',
    ];
    const currentIndex = layoutOrder.indexOf(this.layoutType);
    this.layoutType = layoutOrder[(currentIndex + 1) % layoutOrder.length];
  }
  prevSource() {
    let currentIndex = this.sources.findIndex(
      (source) => source.url === this.currentSourceUrl && source.enabled
    );
    let previousIndex =
      (currentIndex - 1 + this.sources.length) % this.sources.length;
    while (!this.sources[previousIndex].enabled) {
      previousIndex =
        (previousIndex - 1 + this.sources.length) % this.sources.length;
    }
    this.currentSourceUrl = this.sources[previousIndex].url;
    this.reloadIframe();
  }

  initializeData() {
    if (this.id !== null) {
      if (this.mediaType === 'tv') {
        this.tmdbService
          .callAPI('https://api.themoviedb.org/3', `/tv/${this.id}`, 'tv')
          .subscribe((response) => {
            this.seasonNumber =
              response?.number_of_seasons ?? this.seasonNumber;
            this.names = response?.name ?? this.names;
            this.responseData = response;
            // Update duration immediately when response is received
            this.updateVideoDurationFromTMDB();
            if (this.seasonNumber) {
              this.getAllSeasonData();
            }
          });
      } else if (this.mediaType === 'movie') {
        this.tmdbService
          .callAPI('https://api.themoviedb.org/3', `/movie/${this.id}`, 'movie')
          .subscribe((response) => {
            this.responseData = response;
            // Update duration immediately when response is received
            this.updateVideoDurationFromTMDB();
          });
      }
    }
  }

  getAllSeasonData() {
    if (this.seasonNumber) {
      this.totalSeasons = Array.from(
        { length: this.seasonNumber },
        (_, i) => i + 1
      );
      const seasonObservables = this.totalSeasons.map((seasonNum) =>
        this.tmdbService.callAPI(
          'https://api.themoviedb.org/3',
          `/tv/${this.id}/season/${seasonNum}`,
          'tv'
        )
      );
      forkJoin(seasonObservables).subscribe(
        (responses) => {
          responses.forEach((response, index) => {
            if (response?.episodes) {
              const seasonNum = index + 1;
              this.episodeNames[seasonNum] = response.episodes.map(
                (episode: any, episodeIndex: number) => ({
                  number: episodeIndex + 1,
                  name: episode.name,
                  description: episode.overview || 'No description available.',
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
          this.updateCurrentEpisodes(this.currentSeason);
          // Set the correct active episode index after data is loaded
          this.setActiveEpisodeIndex();
          this.updateUrl();
        },
        (error) => console.error('Error fetching season data:', error)
      );
    }
  }

  // Add this new method to properly set the active episode index
  setActiveEpisodeIndex() {
    if (this.currentEpisodes && this.currentEpisodes.length > 0) {
      const idx = this.currentEpisodes.findIndex(
        (ep) => ep.number === this.playingEpisode
      );
      this.activeEpisodeIndex = idx !== -1 ? idx : -1;
      this.activeEpisodeSeason = this.playingSeason;
    }
  }

  playEpisode(index: number) {
    this.saveProgress(); // Save progress of the current episode before switching

    if (this.currentEpisodes[index]) {
      this.currentEpisode = this.currentEpisodes[index].number;
      this.activeEpisodeIndex = index;
      this.activeEpisodeSeason = this.currentSeason;

      // Update the actually playing episode/season
      this.playingEpisode = this.currentEpisode;
      this.playingSeason = this.currentSeason;
    } else {
      this.activeEpisodeIndex = -1;
    }
    this.videoCurrentTime = 0;
    this.videoDuration = this.HARDCODED_DURATION;
    this.episodeFinished = false;
    if (!this.progressInterval) {
      this.progressInterval = setInterval(() => this.saveProgress(), 5000);
    }
    this.updateUrl();
    this.reloadIframe();
  }
  onSeasonChange(newSeason: number) {
    this.currentSeason = newSeason;
    this.updateCurrentEpisodes(this.currentSeason);

    // Only update activeEpisodeIndex if we're changing to the season of the currently playing episode
    if (newSeason === this.activeEpisodeSeason) {
      const idx = this.currentEpisodes.findIndex(
        (ep) => ep.number === this.playingEpisode
      );
      this.activeEpisodeIndex = idx !== -1 ? idx : -1;
    } else {
      this.activeEpisodeIndex = -1;
      // When switching to a different season, don't change playingEpisode
      // or update URL until user actually selects an episode
    }

    // Do NOT update activeEpisodeSeason here; it should only change when playEpisode is called
    this.videoCurrentTime = 0;
    this.videoDuration = this.HARDCODED_DURATION;
    this.episodeFinished = false;
    if (!this.progressInterval) {
      this.progressInterval = setInterval(() => this.saveProgress(), 5000);
    }

    // Only update URL if we're switching to the season of the currently playing episode
    if (newSeason === this.activeEpisodeSeason) {
      this.updateUrl();
    }
  }

  updateCurrentEpisodes(seasonNumber: number) {
    if (this.episodeNames[seasonNumber] && this.episodePosters[seasonNumber]) {
      this.currentEpisodes = this.episodeNames[seasonNumber];
      this.currentPosters = this.episodePosters[seasonNumber];

      // Only set active episode index if we're viewing the season of the currently playing episode
      if (seasonNumber === this.activeEpisodeSeason) {
        const idx = this.currentEpisodes.findIndex(
          (ep) => ep.number === this.playingEpisode
        );
        this.activeEpisodeIndex = idx !== -1 ? idx : -1;
      } else {
        this.activeEpisodeIndex = -1;
      }
    } else {
      this.currentEpisodes = [];
      this.currentPosters = [];
      this.activeEpisodeIndex = -1;
    }
  }

  isSortedAscending = true;
  ascOrDescSort() {
    this.currentEpisodes.reverse();
    this.currentPosters.reverse();
    this.isSortedAscending = !this.isSortedAscending;
    this.updateActiveEpisodeIndex();
  }

  updateActiveEpisodeIndex() {
    if (!this.currentEpisodes || !Array.isArray(this.currentEpisodes)) {
      this.activeEpisodeIndex = -1;
      return;
    }
    const idx = this.currentEpisodes.findIndex(
      (ep) => ep.number === this.playingEpisode
    );
    this.activeEpisodeIndex = idx !== -1 ? idx : -1;
  }
  resumeFromContinueWatching(entry: any) {
    // Mark episode as accessed when navigating via continue watching
    if (entry.mediaType === 'tv' && entry.season && entry.episode) {
      this.continueWatchingService.markEpisodeAsAccessed(
        entry.tmdbID,
        entry.season,
        entry.episode
      );
    }

    const queryParams: any = {};
    if (entry.mediaType === 'tv') {
      queryParams.season = entry.season;
      queryParams.episode = entry.episode;
    }
    this.router.navigate(['/player', entry.tmdbID, entry.mediaType], {
      queryParams,
    });
  }

  onSourceChange(newSourceUrl: string) {
    this.currentSourceUrl = newSourceUrl;
    this.reloadIframe();

    // Save the selected source if rememberLastSource is enabled
    try {
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      if (settings.rememberLastSource) {
        localStorage.setItem('lastSource', newSourceUrl);
      }
    } catch (error) {
      console.warn('Failed to save last source:', error);
    }
  }

  reloadIframe() {
    if (this.currentSourceUrl) {
      this.iframeUrl = this.translateIntoIframe(this.currentSourceUrl);
    }
    this.showIframe = false;
    setTimeout(() => (this.showIframe = true), 0);
  }
  // Helper to calculate absolute episode number for #no token
  private getAbsoluteEpisodeNumber(): number {
    if (
      this.mediaType !== 'tv' ||
      !this.playingSeason ||
      !this.playingEpisode
    ) {
      return 1;
    }
    let total = 0;
    for (let s = 1; s < this.playingSeason; s++) {
      total += this.episodeNames[s]?.length || 0;
    }
    return total + this.playingEpisode;
  }

  translateIntoIframe(url: string): SafeResourceUrl {
    let newUrl: string;
    const match = url.match(this.MAPPING_REGEX);

    if (match) {
      const [_, baseUrl, __, tokenTv, tokenMovie, restOfUrl] = match;
      const replacement = this.mediaType === 'movie' ? tokenMovie : tokenTv;
      newUrl = `${baseUrl}${replacement}${restOfUrl}`;
      newUrl = newUrl.replace(/#id/g, this.id?.toString() || '');
    } else {
      newUrl = url
        .replace(/#type/g, this.mediaType || 'tv')
        .replace(/#id/g, this.id?.toString() || '');
    }

    if (this.mediaType === 'tv') {
      // Replace #no="number", #no=number, or #no with base+offset logic
      const absOffset = this.getAbsoluteEpisodeNumber() - 1; // offset from first episode
      // Replace #no="number"
      newUrl = newUrl.replace(/#no="(\d+)"/g, (_match, base) =>
        (parseInt(base, 10) + absOffset).toString()
      );
      // Replace #no=number
      newUrl = newUrl.replace(/#no=(\d+)/g, (_match, base) =>
        (parseInt(base, 10) + absOffset).toString()
      );
      // Replace #no (no base, fallback to offset+1)
      newUrl = newUrl.replace(/#no(?![=\w])/g, (absOffset + 1).toString());
      newUrl = newUrl
        .replace(/#season/g, this.playingSeason.toString())
        .replace(/#episode/g, this.playingEpisode.toString());
    } else {
      newUrl = newUrl
        .replace(/([&?])(s|e|season|episode)=[^&]*/gi, '')
        .replace(/\/(season|episode)\/[^/]+/gi, '')
        .replace(/-*(#season|#episode)-*/gi, '')
        .replace(/--+/g, '-')
        .replace(/-+$/g, '');
    }

    newUrl = newUrl
      .replace(/([^:])\/{2,}/g, '$1/')
      .replace(/\/+(\?.*)?$/, '$1')
      .replace(/\?+$/, '')
      .replace(/-+$/g, '');

    return this.sanitizer.bypassSecurityTrustResourceUrl(newUrl);
  }

  nextEpisode(index: number) {
    if (!this.isViewingSameSeasonAsActive()) {
      return;
    }

    // Get current episode index in the (possibly sorted) array
    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return;

    // Navigate based on sort order
    let nextIndex: number;
    if (this.isSortedAscending) {
      // Ascending: next episode is at currentIndex + 1
      nextIndex = currentIndex + 1;
      if (nextIndex >= this.currentEpisodes.length) {
        // At the end, try to move to next season
        if (this.currentSeason < this.totalSeasons.length) {
          this.moveToNextSeason();
          return;
        }
        return; // No next episode/season available
      }
    } else {
      // Descending: next episode is at currentIndex - 1 (going down the list)
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        // At the end of descending list, try to move to next season
        if (this.currentSeason < this.totalSeasons.length) {
          this.moveToNextSeason();
          return;
        }
        return; // No next episode/season available
      }
    }

    // Set the new episode
    const nextEpisode = this.currentEpisodes[nextIndex];
    if (nextEpisode) {
      this.currentEpisode = nextEpisode.number;
      this.activeEpisodeIndex = nextIndex;
      this.activeEpisodeSeason = this.currentSeason;

      // Update the actually playing episode/season
      this.playingEpisode = this.currentEpisode;
      this.playingSeason = this.currentSeason;

      this.resetVideoState();
      this.updateUrl();
      this.reloadIframe();
    }
  }
  prevEpisode(index: number) {
    if (!this.isViewingSameSeasonAsActive()) {
      return;
    }

    // Mark current episode as watched before switching to previous
    if (this.playlistComponent) {
      this.playlistComponent.markCurrentEpisodeAsWatched();
    }

    // Get current episode index in the (possibly sorted) array
    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return;

    // Navigate based on sort order
    let prevIndex: number;
    if (this.isSortedAscending) {
      // Ascending: previous episode is at currentIndex - 1
      prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        // At the beginning, try to move to previous season
        if (this.currentSeason > 1) {
          this.moveToPreviousSeason();
          return;
        }
        return; // No previous episode/season available
      }
    } else {
      // Descending: previous episode is at currentIndex + 1 (going up the list)
      prevIndex = currentIndex + 1;
      if (prevIndex >= this.currentEpisodes.length) {
        // At the beginning of descending list, try to move to previous season
        if (this.currentSeason > 1) {
          this.moveToPreviousSeason();
          return;
        }
        return; // No previous episode/season available
      }
    }

    // Set the new episode
    const prevEpisode = this.currentEpisodes[prevIndex];
    if (prevEpisode) {
      this.currentEpisode = prevEpisode.number;
      this.activeEpisodeIndex = prevIndex;
      this.activeEpisodeSeason = this.currentSeason;

      // Update the actually playing episode/season
      this.playingEpisode = this.currentEpisode;
      this.playingSeason = this.currentSeason;

      this.resetVideoState();
      this.updateUrl();
      this.reloadIframe();
    }
  }

  // Helper methods for episode navigation
  private getEpisodeToAdvanceFrom(): number {
    return this.isViewingSameSeasonAsActive() ? this.playingEpisode : 0;
  }

  private getEpisodeToBackFrom(): number {
    return this.isViewingSameSeasonAsActive()
      ? this.playingEpisode
      : this.currentEpisodes.length + 1;
  }

  private isViewingSameSeasonAsActive(): boolean {
    return (
      this.currentSeason === this.activeEpisodeSeason &&
      this.activeEpisodeIndex >= 0
    );
  }
  private moveToNextSeason(): void {
    this.currentSeason++;
    this.updateCurrentEpisodes(this.currentSeason);

    setTimeout(() => {
      // When moving to next season, start from the beginning based on sort order
      if (this.isSortedAscending) {
        // Ascending: start with episode 1 (first in array)
        this.setCurrentEpisode(1);
      } else {
        // Descending: start with the highest episode number (first in array)
        const firstEpisode = this.currentEpisodes[0];
        if (firstEpisode) {
          this.setCurrentEpisode(firstEpisode.number);
        }
      }

      // Update the actually playing episode/season
      this.playingEpisode = this.currentEpisode;
      this.playingSeason = this.currentSeason;

      this.resetVideoState();
      this.updateUrl();
      this.reloadIframe();
    }, 0);
  }

  private moveToPreviousSeason(): void {
    this.currentSeason--;
    this.updateCurrentEpisodes(this.currentSeason);

    setTimeout(() => {
      // When moving to previous season, start from the end based on sort order
      if (this.isSortedAscending) {
        // Ascending: start with the last episode (last in array)
        const lastEpisode =
          this.currentEpisodes[this.currentEpisodes.length - 1];
        if (lastEpisode) {
          this.setCurrentEpisode(lastEpisode.number);
        }
      } else {
        // Descending: start with episode 1 (last in array)
        this.setCurrentEpisode(1);
      }

      // Update the actually playing episode/season
      this.playingEpisode = this.currentEpisode;
      this.playingSeason = this.currentSeason;

      this.resetVideoState();
      this.updateUrl();
      this.reloadIframe();
    }, 0);
  }
  private setCurrentEpisode(episodeNumber: number): void {
    this.currentEpisode = episodeNumber;
    // Find the correct index for this episode number in the current (possibly sorted) array
    const idx = this.currentEpisodes.findIndex(
      (ep) => ep.number === episodeNumber
    );
    this.activeEpisodeIndex = idx !== -1 ? idx : -1;
    this.activeEpisodeSeason = this.currentSeason;
  }

  private resetVideoState(): void {
    this.videoCurrentTime = 0;
    this.videoDuration = this.HARDCODED_DURATION;
    this.episodeFinished = false;
    if (!this.progressInterval) {
      this.progressInterval = setInterval(() => this.saveProgress(), 5000);
    }
  }
  updateUrl(): void {
    const url = new URL(window.location.href);
    const queryParams = new URLSearchParams(url.search);
    queryParams.set('season', this.playingSeason.toString());
    queryParams.set('episode', this.playingEpisode.toString());
    const newUrl = `${url.pathname}?${queryParams.toString()}`;
    this.location.replaceState(newUrl);
  }
  // Helper methods to check episode availability across seasons
  hasNextEpisode(): boolean {
    if (!this.isViewingSameSeasonAsActive()) {
      return false;
    }

    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return false;

    if (this.isSortedAscending) {
      // Ascending: can go next if not at the end of array or if there's a next season
      return (
        currentIndex < this.currentEpisodes.length - 1 ||
        this.currentSeason < this.totalSeasons.length
      );
    } else {
      // Descending: can go next if not at the beginning of array or if there's a next season
      return currentIndex > 0 || this.currentSeason < this.totalSeasons.length;
    }
  }

  hasPreviousEpisode(): boolean {
    if (!this.isViewingSameSeasonAsActive()) {
      return false;
    }
    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return false;

    if (this.isSortedAscending) {
      // Ascending: can go back if not at the beginning of array or if there's a previous season
      return currentIndex > 0 || this.currentSeason > 1;
    } else {
      // Descending: can go back if not at the end of array or if there's a previous season
      return (
        currentIndex < this.currentEpisodes.length - 1 || this.currentSeason > 1
      );
    }
  }
  getNextEpisodeLabel(): string {
    if (!this.isViewingSameSeasonAsActive()) {
      return 'Next Episode';
    }

    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return 'Next Episode';

    if (this.isSortedAscending) {
      // Ascending: next means higher episode number
      if (currentIndex < this.currentEpisodes.length - 1) {
        return 'Next Episode';
      } else if (this.currentSeason < this.totalSeasons.length) {
        return `Season ${this.currentSeason + 1} Ep 1`;
      }
    } else {
      // Descending: next means going down the list (lower episode number)
      if (currentIndex > 0) {
        return 'Next Episode';
      } else if (this.currentSeason < this.totalSeasons.length) {
        return `Season ${this.currentSeason + 1} Ep 1`;
      }
    }
    return 'Next Episode';
  }

  getPreviousEpisodeLabel(): string {
    if (!this.isViewingSameSeasonAsActive()) {
      return 'Prev Episode';
    }

    const currentIndex = this.activeEpisodeIndex;
    if (currentIndex === -1) return 'Prev Episode';

    if (this.isSortedAscending) {
      // Ascending: previous means lower episode number
      if (currentIndex > 0) {
        return 'Prev Episode';
      } else if (this.currentSeason > 1) {
        const prevSeasonEpisodes = this.episodeNames[this.currentSeason - 1];
        const lastEpNum = prevSeasonEpisodes?.length || 1;
        return `S${this.currentSeason - 1} Ep ${lastEpNum}`;
      }
    } else {
      // Descending: previous means going up the list (higher episode number)
      if (currentIndex < this.currentEpisodes.length - 1) {
        return 'Prev Episode';
      } else if (this.currentSeason > 1) {
        return `S${this.currentSeason - 1} Ep 1`;
      }
    }
    return 'Prev Episode';
  }
  getPlaylistHeight(): number {
    if (typeof window === 'undefined') return 400; // SSR fallback

    if (window.innerWidth < 1024) {
      // Mobile: use 80vh for better mobile experience
      return Math.round(window.innerHeight * 0.8);
    }

    // Get the video container and desktop controls elements
    const videoContainer = this.videoContainer?.nativeElement;
    const desktopControls = document.getElementById('desktop-controls');

    if (videoContainer) {
      // Calculate the height based on the video container and controls
      const videoHeight = videoContainer.offsetHeight;
      const controlsHeight = desktopControls ? desktopControls.offsetHeight : 0;
      return videoHeight + controlsHeight + 8; // 8px for the gap
    }

    // Fallback: calculate height to match video aspect ratio
    const containerWidth = window.innerWidth;
    const gap = 16; // 1rem gap
    const videoContainerWidth = containerWidth * 0.75 - gap / 2;
    const aspectRatioHeight = videoContainerWidth * (9 / 16); // 16:9 aspect ratio
    const estimatedControlsHeight = 60; // Estimate controls height

    return Math.round(aspectRatioHeight + estimatedControlsHeight + 8);
  }

  getIframeContainerHeight(): number | null {
    if (typeof window === 'undefined') return null; // SSR fallback

    if (window.innerWidth < 1024) {
      // Mobile: set explicit height to match playlist
      return window.innerWidth * (9 / 16);
    }

    // Desktop: let aspect-video class handle it
    return null;
  }
  private setupResizeListener(): void {
    if (typeof window === 'undefined') return;

    this.resizeListener = () => {
      // Re-match heights when window resizes
      this.matchPlaylistHeight();
    };

    window.addEventListener('resize', this.resizeListener);
  }

  getResponsivePlaylistHeight(): number {
    if (typeof window === 'undefined') return 500; // Default fallback

    if (window.innerWidth < 1024) {
      // Mobile: Return fixed height based on media type to match recommendations component
      return this.mediaType === 'tv' ? 700 : 800;
    } else {
      // Desktop: Use dynamic height matching video container
      return this.playlistHeight || 500; // Fallback to 500 if not set yet
    }
  }

  private loadDefaultSettings(): void {
    try {
      const settings = localStorage.getItem('appSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        if (parsedSettings.playlistLayout) {
          this.layoutType = parsedSettings.playlistLayout;
        }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
      // Keep default layout if settings loading fails
    }
  }

  private matchPlaylistHeight(): void {
    if (typeof window === 'undefined') return;

    setTimeout(() => {
      const videoContainer = this.videoContainer?.nativeElement;
      const playlistContainer = this.playlistContainer?.nativeElement;
      const desktopControls = document.getElementById('desktop-controls');

      console.log('Matching heights...');
      console.log('videoContainer:', videoContainer);
      console.log('playlistContainer:', playlistContainer);

      if (playlistContainer) {
        if (window.innerWidth < 1024) {
          // Mobile: Use 80vh for better mobile experience
          const mobileHeight = Math.round(window.innerHeight * 0.8);
          this.playlistHeight = mobileHeight;
          console.log(
            'Set mobile playlist height to 80vh:',
            mobileHeight + 'px'
          );
        } else if (videoContainer) {
          // Desktop: Match video container height + controls height
          const videoHeight = videoContainer.offsetHeight;
          const controlsHeight = desktopControls
            ? desktopControls.offsetHeight
            : 0;
          const totalHeight = videoHeight + controlsHeight + 8; // 8px for the gap
          console.log('video height:', videoHeight);
          console.log('controls height:', controlsHeight);
          console.log('total height:', totalHeight);

          this.playlistHeight = totalHeight;
          console.log(
            'Set desktop playlist height to match video + controls:',
            totalHeight + 'px'
          );
        }
      } else {
        console.log('Playlist container not found');
      }
    }, 100);
  }

  // Fullscreen functionality
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      // Prevent scrolling when in fullscreen
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scrolling when exiting fullscreen
      document.body.style.overflow = 'auto';
    }
  }

  exitFullscreen(): void {
    this.isFullscreen = false;
    // Restore scrolling when exiting fullscreen
    document.body.style.overflow = 'auto';
  }

  // Listen for Escape key to exit fullscreen
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isFullscreen) {
      this.exitFullscreen();
    }
  }
}
