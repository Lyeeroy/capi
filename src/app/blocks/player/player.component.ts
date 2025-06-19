import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { TmdbService } from '../../services/tmdb.service';
import { LoadSourcesService } from './player.service';
import { FormsModule } from '@angular/forms';
import { IframeComponent } from './iframe/iframe.component';
import { ControlsComponent } from './controls/controls.component';
import { PlaylistComponent } from './playlist/playlist.component';
import { PlayerHeader } from './player-header/player-header.component';
import { InfoComponent } from './info/info.component';
import { EpisodeNavigationComponent } from './episode-navigation/episode-navigation.component';
import { ContinueWatchingService } from '../../services/continue-watching.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

// Import services
import {
  EpisodeManagementService,
  Episode,
  TMDBResponse,
} from './services/episode-management.service';
import { VideoProgressService } from './services/video-progress.service';
import { VideoSourceService, Source } from './services/video-source.service';
import { PlayerUIService } from './services/player-ui.service';

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
    IconLibComponent,
  ],
  providers: [
    LoadSourcesService,
    EpisodeManagementService,
    VideoProgressService,
    VideoSourceService,
    PlayerUIService,
  ],
})
export class PlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('playlistContainer') playlistContainer!: ElementRef;
  @ViewChild('videoContainer') videoContainer!: ElementRef;

  // Media info
  id: number | null = null;
  mediaType: 'tv' | 'movie' | null = null;
  names: string | null = null;

  // Subscriptions for cleanup
  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private tmdbService: TmdbService,
    private loadSourcesService: LoadSourcesService,
    private sanitizer: DomSanitizer,
    private continueWatchingService: ContinueWatchingService,
    private router: Router,
    // New services
    public episodeService: EpisodeManagementService,
    public progressService: VideoProgressService,
    public sourceService: VideoSourceService,
    public uiService: PlayerUIService
  ) {}
  ngOnInit() {
    // Load default layout from settings
    this.uiService.loadDefaultSettings();

    // Set up window resize listener for height calculation
    this.uiService.setupResizeListener(() => {
      this.uiService.matchPlaylistHeight(
        this.videoContainer,
        this.playlistContainer
      );
    });

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      const mediaTypeParam = params.get('mediaType');
      this.mediaType =
        mediaTypeParam === 'tv' || mediaTypeParam === 'movie'
          ? mediaTypeParam
          : null;

      // Initialize UI for media type
      this.uiService.initializeForMediaType(this.mediaType!);

      this.names = this.route.snapshot.queryParams['name'];
      const queryParams = this.route.snapshot.queryParams;
      const currentSeason = queryParams['season']
        ? Number(queryParams['season'])
        : 1;
      const currentEpisode = queryParams['episode']
        ? Number(queryParams['episode'])
        : 1;

      // Set episode service state
      this.episodeService.currentSeason = currentSeason;
      this.episodeService.currentEpisode = currentEpisode;
      this.episodeService.activeEpisodeSeason = currentSeason;

      this.initializeData();
      this.initializeSources();
    });

    // Initialize progress service beforeunload listener
    this.progressService.initializeBeforeUnloadListener();
  }
  ngAfterViewInit() {
    // Match playlist height to iframe after view initialization
    this.uiService.matchPlaylistHeight(
      this.videoContainer,
      this.playlistContainer
    );

    // Also try again after a longer delay in case content is still loading
    setTimeout(
      () =>
        this.uiService.matchPlaylistHeight(
          this.videoContainer,
          this.playlistContainer
        ),
      500
    );
    setTimeout(
      () =>
        this.uiService.matchPlaylistHeight(
          this.videoContainer,
          this.playlistContainer
        ),
      1000
    );
  }

  ngOnDestroy() {
    this.progressService.saveProgress(
      this.episodeService.currentEpisodes?.length
    );
    this.cleanup();
  }

  private cleanup(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    this.uiService.cleanup();
    this.progressService.cleanup();
  }

  private async initializeSources(): Promise<void> {
    await this.sourceService.initializeSources(
      this.id!,
      this.mediaType!,
      this.episodeService.currentSeason,
      this.episodeService.currentEpisode
    );
    this.reloadIframe();
  }

  private initializeData(): void {
    if (this.id !== null && this.mediaType) {
      this.episodeService
        .initializeEpisodeData(this.id, this.mediaType)
        .subscribe((response) => {
          if (this.mediaType === 'tv') {
            this.episodeService.seasonNumber =
              response?.number_of_seasons ?? this.episodeService.seasonNumber;
            this.names = response?.name ?? this.names;
            this.episodeService.responseData = response;

            // Initialize progress service
            this.progressService.initializeProgress(
              this.id!,
              this.mediaType,
              response,
              this.episodeService.currentSeason,
              this.episodeService.currentEpisode,
              this.episodeService.seasonNumber
            );

            if (this.episodeService.seasonNumber) {
              this.loadAllSeasonData();
            }
          } else {
            this.episodeService.responseData = response;
            // Initialize progress service for movies
            this.progressService.initializeProgress(
              this.id!,
              this.mediaType!,
              response,
              1,
              1,
              null
            );
          }
        });
    }
  }

  private loadAllSeasonData(): void {
    this.episodeService.getAllSeasonData().subscribe(
      (responses) => {
        this.episodeService.processSeasonData(responses);
        this.episodeService.updateCurrentEpisodes(
          this.episodeService.currentSeason
        );
        this.episodeService.setActiveEpisodeIndex();
        this.episodeService.updateUrl();
      },
      (error) => console.error('Error fetching season data:', error)
    );
  }
  // Delegate methods to services
  getCurrentTimeAndDuration(): { currentTime: number; duration: number } {
    return this.progressService.getCurrentTimeAndDuration();
  }

  saveProgress = (): void => {
    const episodeFinished = this.progressService.saveProgress(
      this.episodeService.currentEpisodes?.length
    );

    // Check for episode advancement
    if (episodeFinished) {
      const advancement = this.progressService.checkForEpisodeAdvancement();
      if (
        advancement.hasAdvanced &&
        advancement.newSeason &&
        advancement.newEpisode
      ) {
        // Update episode service state
        this.episodeService.currentSeason = advancement.newSeason;
        this.episodeService.currentEpisode = advancement.newEpisode;

        // Update source service
        this.sourceService.updateEpisodeInfo(
          advancement.newSeason,
          advancement.newEpisode
        );

        // Update URL
        this.episodeService.updateUrl();

        // Reload sources if season changed
        const queryParams = {
          ...this.route.snapshot.queryParams,
          season: advancement.newSeason,
          episode: advancement.newEpisode,
        };
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: queryParams,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });

        // If season changed, reload season data
        if (advancement.newSeason !== this.episodeService.activeEpisodeSeason) {
          this.loadAllSeasonData();
        }
      }
    }
  };

  findContinueWatchingIndex(): number {
    return this.progressService.findContinueWatchingIndex();
  }

  // Source management methods
  nextSource(): void {
    this.sourceService.nextSource();
    this.reloadIframe();
  }

  prevSource(): void {
    this.sourceService.prevSource();
    this.reloadIframe();
  }

  onSourceChange(newSourceUrl: string): void {
    this.sourceService.onSourceChange(newSourceUrl);
    this.reloadIframe();
  }

  reloadIframe(): void {
    this.sourceService.updateIframeUrl();
    this.uiService.reloadIframe();
  }

  // UI methods
  showPlaylist(): void {
    this.uiService.showPlaylist();
  }

  showDetails(): void {
    this.uiService.showDetails();
  }

  toggleDetailsExpansion(): void {
    this.uiService.toggleDetailsExpansion();
  }

  cancel(): void {
    this.location.back();
  }

  changeLayout(): void {
    this.uiService.changeLayout();
  }

  // Episode management methods
  playEpisode(index: number): void {
    this.episodeService.playEpisode(index);
    this.progressService.resetVideoState();
    this.progressService.updateEpisodeInfo(
      this.episodeService.currentSeason,
      this.episodeService.currentEpisode
    );
    this.sourceService.updateEpisodeInfo(
      this.episodeService.currentSeason,
      this.episodeService.currentEpisode
    );
    this.episodeService.updateUrl();
    this.reloadIframe();
  }

  onSeasonChange(newSeason: number): void {
    this.episodeService.onSeasonChange(newSeason);
    this.progressService.resetVideoState();

    // Only update URL if we're switching to the season of the currently playing episode
    if (newSeason === this.episodeService.activeEpisodeSeason) {
      this.episodeService.updateUrl();
    }
  }

  ascOrDescSort(): void {
    this.episodeService.ascOrDescSort();
  }

  // Episode navigation methods
  nextEpisode(index: number): void {
    const result = this.episodeService.nextEpisode();
    if (result.success) {
      this.progressService.resetVideoState();
      this.progressService.updateEpisodeInfo(
        this.episodeService.currentSeason,
        this.episodeService.currentEpisode
      );
      this.sourceService.updateEpisodeInfo(
        this.episodeService.currentSeason,
        this.episodeService.currentEpisode
      );
      this.episodeService.updateUrl();
      this.reloadIframe();
    } else if (result.needsSeasonChange && result.newSeason) {
      this.episodeService.moveToNextSeason();
      this.progressService.resetVideoState();
      this.progressService.updateEpisodeInfo(
        this.episodeService.currentSeason,
        this.episodeService.currentEpisode
      );
      this.sourceService.updateEpisodeInfo(
        this.episodeService.currentSeason,
        this.episodeService.currentEpisode
      );
      this.episodeService.updateUrl();
      this.reloadIframe();
    }
  }

  prevEpisode(index: number): void {
    const result = this.episodeService.prevEpisode();
    if (result.success) {
      this.progressService.resetVideoState();
      this.progressService.updateEpisodeInfo(
        this.episodeService.currentSeason,
        this.episodeService.currentEpisode
      );
      this.sourceService.updateEpisodeInfo(
        this.episodeService.currentSeason,
        this.episodeService.currentEpisode
      );
      this.episodeService.updateUrl();
      this.reloadIframe();
    } else if (result.needsSeasonChange && result.newSeason) {
      this.episodeService.moveToPreviousSeason();
      this.progressService.resetVideoState();
      this.progressService.updateEpisodeInfo(
        this.episodeService.currentSeason,
        this.episodeService.currentEpisode
      );
      this.sourceService.updateEpisodeInfo(
        this.episodeService.currentSeason,
        this.episodeService.currentEpisode
      );
      this.episodeService.updateUrl();
      this.reloadIframe();
    }
  }

  // Navigation helper methods
  hasNextEpisode(): boolean {
    return this.episodeService.hasNextEpisode();
  }

  hasPreviousEpisode(): boolean {
    return this.episodeService.hasPreviousEpisode();
  }

  getNextEpisodeLabel(): string {
    return this.episodeService.getNextEpisodeLabel();
  }

  getPreviousEpisodeLabel(): string {
    return this.episodeService.getPreviousEpisodeLabel();
  }

  // Continue watching
  resumeFromContinueWatching(entry: any): void {
    const queryParams: any = {};
    if (entry.mediaType === 'tv') {
      queryParams.season = entry.season;
      queryParams.episode = entry.episode;
    }
    this.router.navigate(['/player', entry.tmdbID, entry.mediaType], {
      queryParams,
    });
  }

  // Height calculation methods
  getPlaylistHeight(): number {
    return this.uiService.calculatePlaylistHeight(
      this.videoContainer,
      this.playlistContainer
    );
  }

  getIframeContainerHeight(): number | null {
    return this.uiService.getIframeContainerHeight();
  }

  // Getters for template access to service properties
  get currentEpisodes(): Episode[] {
    return this.episodeService.currentEpisodes;
  }

  get currentPosters(): string[] {
    return this.episodeService.currentPosters;
  }

  get totalSeasons(): number[] {
    return this.episodeService.totalSeasons;
  }

  get currentSeason(): number {
    return this.episodeService.currentSeason;
  }

  get currentEpisode(): number {
    return this.episodeService.currentEpisode;
  }

  get activeEpisodeIndex(): number {
    return this.episodeService.activeEpisodeIndex;
  }

  get activeEpisodeSeason(): number {
    return this.episodeService.activeEpisodeSeason;
  }

  get isSortedAscending(): boolean {
    return this.episodeService.isSortedAscending;
  }

  get responseData(): TMDBResponse | null {
    return this.episodeService.responseData;
  }

  get seasonNumber(): number | null {
    return this.episodeService.seasonNumber;
  }

  // UI state getters
  get layoutType(): 'list' | 'grid' | 'poster' | 'compact' {
    return this.uiService.layoutType;
  }

  get onShowPlaylist(): boolean {
    return this.uiService.onShowPlaylist;
  }

  get onShowDetails(): boolean {
    return this.uiService.onShowDetails;
  }

  get showIframe(): boolean {
    return this.uiService.showIframe;
  }

  get isDetailsExpanded(): boolean {
    return this.uiService.isDetailsExpanded;
  }

  get playlistHeight(): number {
    return this.uiService.playlistHeight;
  }

  // Source getters
  get sources(): Source[] {
    return this.sourceService.getSources();
  }

  get currentSourceUrl(): string {
    return this.sourceService.getCurrentSourceUrl();
  }

  get iframeUrl(): SafeResourceUrl {
    return this.sourceService.getCurrentIframeUrl();
  }
}
