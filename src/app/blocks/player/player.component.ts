import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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

  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PlayerHeader,
    IframeComponent,
    ControlsComponent,
    PlaylistComponent,
    InfoComponent,
    IconLibComponent,
  ],
  providers: [LoadSourcesService],
})
export class PlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('playlistContainer') playlistContainer!: ElementRef;
  @ViewChild('videoContainer') videoContainer!: ElementRef;
  
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
  currentSeason: number = 1;
  currentEpisode: number = 1;
  activeEpisodeIndex: number = -1;
  activeEpisodeSeason: number = 1;

  // UI state
  layoutType: 'list' | 'grid' | 'poster' = 'list';
  onShowPlaylist: boolean = true;
  onShowDetails: boolean = false;
  showIframe: boolean = true;

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
    // Set up window resize listener for height calculation
    this.setupResizeListener();
    
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      const mediaTypeParam = params.get('mediaType');
      this.mediaType =
        mediaTypeParam === 'tv' || mediaTypeParam === 'movie'
          ? mediaTypeParam
          : null;
      this.names = this.route.snapshot.queryParams['name'];
      const queryParams = this.route.snapshot.queryParams;
      this.currentSeason = queryParams['season']
        ? Number(queryParams['season'])
        : 1;
      this.currentEpisode = queryParams['episode']
        ? Number(queryParams['episode'])
        : 1;

      // Set the active episode season to current season on load
      this.activeEpisodeSeason = this.currentSeason;

      // Set videoDuration based on TMDB runtime if available
      setTimeout(() => {
        const runtime = this.getDurationFromResponse();
        if (runtime > 0) {
          this.videoDuration = Math.floor(runtime * 0.7); // Use 70% of TMDB runtime
        } else {
          // fallback to hardcoded: use full default duration
          this.videoDuration = this.mediaType === 'movie' ? 4200 : 900;
        }
      }, 0);

      // Try to restore currentTime from continue watching
      const cwList = this.continueWatchingService.getList();
      const entry = cwList.find(
        (e) =>
          e.tmdbID === String(this.id) &&
          e.mediaType === this.mediaType &&
          (this.mediaType === 'movie' ||
            (e.season === this.currentSeason &&
              e.episode === this.currentEpisode))
      );
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
          this.currentSourceUrl = this.sources[0].url;
          this.reloadIframe();
        }
      });
    });
    window.addEventListener('beforeunload', this.saveProgress);
    this.progressInterval = setInterval(() => this.saveProgress(), 5000);
  }  ngAfterViewInit() {
    // Match playlist height to iframe after view initialization
    this.matchPlaylistHeight();
    
    // Also try again after a longer delay in case content is still loading
    setTimeout(() => this.matchPlaylistHeight(), 500);
    setTimeout(() => this.matchPlaylistHeight(), 1000);
  }
  ngOnDestroy() {
    this.saveProgress();
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
    }

    return {
      currentTime: this.videoCurrentTime,
      duration: this.videoDuration,
    };
  }

  private updateVideoDurationFromTMDB(): void {
    if (!this.videoDuration || this.videoDuration === this.HARDCODED_DURATION) {
      const runtime = this.getDurationFromResponse();
      this.videoDuration =
        runtime > 0
          ? Math.floor(runtime * 0.7)
          : this.mediaType === 'movie'
          ? 4200
          : 900;
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
    const { currentTime, duration } = this.getCurrentTimeAndDuration();

    let totalEpisodesInSeason = undefined;
    if (this.mediaType === 'tv' && this.currentEpisodes) {
      totalEpisodesInSeason = this.currentEpisodes.length;
    }

    this.continueWatchingService.saveOrAdvance(
      {
        tmdbID: String(this.id),
        mediaType: this.mediaType as 'movie' | 'tv',
        season: this.mediaType === 'tv' ? this.currentSeason : undefined,
        episode: this.mediaType === 'tv' ? this.currentEpisode : undefined,
        currentTime,
        duration,
        poster_path: this.responseData?.poster_path,
        title: this.responseData?.title,
        name: this.responseData?.name,
      },
      totalEpisodesInSeason
    );
  };

  findContinueWatchingIndex(): number {
    const list = this.continueWatchingService.getList();
    return list.findIndex(
      (e) =>
        e.tmdbID === String(this.id) &&
        e.mediaType === this.mediaType &&
        (this.mediaType === 'movie' ||
          (e.season === this.currentSeason &&
            e.episode === this.currentEpisode))
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

  cancel(): void {
    this.location.back();
  }

  changeLayout(): void {
    const layoutOrder: Array<'list' | 'grid' | 'poster'> = [
      'list',
      'grid',
      'poster',
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
            if (this.seasonNumber) {
              this.getAllSeasonData();
            }
          });
      } else if (this.mediaType === 'movie') {
        this.tmdbService
          .callAPI('https://api.themoviedb.org/3', `/movie/${this.id}`, 'movie')
          .subscribe((response) => {
            this.responseData = response;
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
        (ep) => ep.number === this.currentEpisode
      );
      this.activeEpisodeIndex = idx !== -1 ? idx : -1;
      this.activeEpisodeSeason = this.currentSeason;
    }
  }

  playEpisode(index: number) {
    if (this.currentEpisodes[index]) {
      this.currentEpisode = this.currentEpisodes[index].number;
      this.activeEpisodeIndex = index;
      this.activeEpisodeSeason = this.currentSeason;
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
        (ep) => ep.number === this.currentEpisode
      );
      this.activeEpisodeIndex = idx !== -1 ? idx : -1;
    } else {
      this.activeEpisodeIndex = -1;
      // When switching to a different season, don't change currentEpisode
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
          (ep) => ep.number === this.currentEpisode
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
      (ep) => ep.number === this.currentEpisode
    );
    this.activeEpisodeIndex = idx !== -1 ? idx : -1;
  }
  resumeFromContinueWatching(entry: any) {
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
  }

  reloadIframe() {
    if (this.currentSourceUrl) {
      this.iframeUrl = this.translateIntoIframe(this.currentSourceUrl);
    }
    this.showIframe = false;
    setTimeout(() => (this.showIframe = true), 0);
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
      newUrl = newUrl
        .replace(/#season/g, this.currentSeason.toString())
        .replace(/#episode/g, this.currentEpisode.toString());
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
    const episodeToAdvanceFrom = this.getEpisodeToAdvanceFrom();

    // Check if we're at the last episode of the current season
    if (episodeToAdvanceFrom === this.currentEpisodes.length) {
      // If there's a next season available, move to it
      if (this.currentSeason < this.totalSeasons.length) {
        this.moveToNextSeason();
        return;
      }
      // If no next season available, do nothing
      return;
    }

    // Advance to next episode in current season
    this.setCurrentEpisode(episodeToAdvanceFrom + 1);
    this.resetVideoState();
    this.updateUrl();
    this.reloadIframe();
  }

  prevEpisode(index: number) {
    const episodeToBackFrom = this.getEpisodeToBackFrom();

    // Check if we're at the first episode of the current season
    if (episodeToBackFrom <= 1) {
      if (this.currentSeason > 1) {
        this.moveToPreviousSeason();
      }
      return;
    }

    // Go back to previous episode in current season
    this.setCurrentEpisode(episodeToBackFrom - 1);
    this.resetVideoState();
    this.updateUrl();
    this.reloadIframe();
  }

  // Helper methods for episode navigation
  private getEpisodeToAdvanceFrom(): number {
    return this.isViewingSameSeasonAsActive() ? this.currentEpisode : 0;
  }

  private getEpisodeToBackFrom(): number {
    return this.isViewingSameSeasonAsActive()
      ? this.currentEpisode
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
    this.setCurrentEpisode(1);
    this.updateCurrentEpisodes(this.currentSeason);
    this.resetVideoState();
    this.updateUrl();
    this.reloadIframe();
  }

  private moveToPreviousSeason(): void {
    this.currentSeason--;
    this.updateCurrentEpisodes(this.currentSeason);

    setTimeout(() => {
      this.setCurrentEpisode(this.currentEpisodes.length);
      this.resetVideoState();
      this.updateUrl();
      this.reloadIframe();
    }, 0);
  }

  private setCurrentEpisode(episodeNumber: number): void {
    this.currentEpisode = episodeNumber;
    this.activeEpisodeIndex = episodeNumber - 1;
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
    queryParams.set('season', this.currentSeason.toString());
    queryParams.set('episode', this.currentEpisode.toString());
    const newUrl = `${url.pathname}?${queryParams.toString()}`;
    this.location.replaceState(newUrl);
  }

  // Helper methods to check episode availability across seasons
  hasNextEpisode(): boolean {
    const episodeToCheck = this.getEpisodeToAdvanceFrom();
    return (
      episodeToCheck < this.currentEpisodes.length ||
      this.currentSeason < this.totalSeasons.length
    );
  }

  hasPreviousEpisode(): boolean {
    const episodeToCheck = this.getEpisodeToBackFrom();
    return episodeToCheck > 1 || this.currentSeason > 1;
  }

  getNextEpisodeLabel(): string {
    const episodeToCheck = this.getEpisodeToAdvanceFrom();

    if (episodeToCheck < this.currentEpisodes.length) {
      return 'Next Episode';
    } else if (this.currentSeason < this.totalSeasons.length) {
      return `Season ${this.currentSeason + 1} Ep 1`;
    }
    return 'Next Episode';
  }

  getPreviousEpisodeLabel(): string {
    const episodeToCheck = this.getEpisodeToBackFrom();

    if (episodeToCheck > 1) {
      return 'Prev Episode';
    } else if (this.currentSeason > 1) {
      const prevSeasonEpisodes = this.episodeNames[this.currentSeason - 1];
      const lastEpNum = prevSeasonEpisodes?.length || 1;
      return `S${this.currentSeason - 1} Ep ${lastEpNum}`;
    }
    return 'Prev Episode';
  }  getPlaylistHeight(): number {
    if (typeof window === 'undefined') return 400; // SSR fallback
    
    if (window.innerWidth < 1024) {
      // Mobile: use viewport width to calculate 16:9 aspect ratio
      return window.innerWidth * (9 / 16);
    }

    // Desktop: calculate height to match video aspect ratio (not the entire container)
    // Get the video container width (75% of viewport width minus gap)
    const containerWidth = window.innerWidth;
    const gap = 16; // 1rem gap
    const videoContainerWidth = (containerWidth * 0.75) - (gap / 2);
    const aspectRatioHeight = videoContainerWidth * (9 / 16); // 16:9 aspect ratio
    
    return Math.round(aspectRatioHeight);
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
  }  private matchPlaylistHeight(): void {
    if (typeof window === 'undefined') return;
    
    setTimeout(() => {
      const videoContainer = this.videoContainer?.nativeElement;
      const playlistContainer = this.playlistContainer?.nativeElement;
      
      console.log('Matching heights...');
      console.log('videoContainer:', videoContainer);
      console.log('playlistContainer:', playlistContainer);
      
      if (videoContainer && playlistContainer) {
        const videoHeight = videoContainer.offsetHeight;
        console.log('video height:', videoHeight);
        
        playlistContainer.style.height = `${videoHeight}px`;
        playlistContainer.style.minHeight = `${videoHeight}px`;
        console.log('Set playlist height to:', videoHeight + 'px');
      } else {
        console.log('Containers not found');
      }
    }, 100);
  }
}
