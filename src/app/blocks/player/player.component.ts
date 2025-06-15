import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
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
export class PlayerComponent implements OnInit, OnDestroy {
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
  activeEpisodeIndex: number = -1;
  activeEpisodeSeason: number = 1; // NEW: track the season of the playing episode
  sources: any = [];
  currentSourceUrl: string = '';
  currentSeason: number = 1;
  currentEpisode: number = 1;
  iframeUrl: SafeResourceUrl;
  showIframe: boolean = true;
  responseData: any = null;

  onShowPlaylist: boolean = true;
  onShowDetails: boolean = false;

  private mappingRegex: RegExp =
    /^(https?:\/\/[^\/]+\/)([^\/?]+)\?([^:]+):([^\/]+)(\/.*)$/;
  private videoCurrentTime: number = 0;
  private videoDuration: number = 0;
  private progressInterval: any;
  private episodeFinished = false;
  private HARDCODED_DURATION = 900; // default, will be set in ngOnInit

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
    this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      this.mediaType = params.get('mediaType');
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
        this.sources = this.loadSourcesService.sources;
        if (this.sources && this.sources.length > 0) {
          this.currentSourceUrl = this.sources[0].url;
          this.reloadIframe();
        }
      });
    });
    window.addEventListener('beforeunload', this.saveProgress);
    this.progressInterval = setInterval(() => this.saveProgress(), 5000);
  }

  ngOnDestroy() {
    this.saveProgress();
    window.removeEventListener('beforeunload', this.saveProgress);
    clearInterval(this.progressInterval);
  }

  getCurrentTimeAndDuration(): { currentTime: number; duration: number } {
    if (!this.videoDuration || this.videoDuration === this.HARDCODED_DURATION) {
      // Try to update videoDuration from TMDB response if possible
      const runtime = this.getDurationFromResponse();
      if (runtime > 0) {
        this.videoDuration = Math.floor(runtime * 0.7); // Use 70% of TMDB runtime
      } else {
        this.videoDuration = this.mediaType === 'movie' ? 4200 : 900;
      }
    }
    if (
      typeof this.videoCurrentTime !== 'number' ||
      this.videoCurrentTime < 0
    ) {
      this.videoCurrentTime = 0;
    }

    // Only increment currentTime if not finished
    if (!this.episodeFinished && this.videoCurrentTime < this.videoDuration) {
      this.videoCurrentTime = Math.min(
        this.videoCurrentTime + 5,
        this.videoDuration
      );
      // Do not advance episode here!
    } else if (
      this.videoCurrentTime >= this.videoDuration &&
      !this.episodeFinished
    ) {
      this.videoCurrentTime = this.videoDuration;
      this.episodeFinished = true;
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
      // Do NOT increment currentEpisode here!
      // Advancing to the next episode should only happen when the user explicitly selects it.
    }
    return {
      currentTime: this.videoCurrentTime,
      duration: this.videoDuration,
    };
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
      (source: { url: string; enabled: boolean }) =>
        source.url === this.currentSourceUrl && source.enabled
    );
    let nextIndex = (currentIndex + 1) % this.sources.length;
    while (!this.sources[nextIndex].enabled) {
      nextIndex = (nextIndex + 1) % this.sources.length;
    }
    this.currentSourceUrl = this.sources[nextIndex].url;
    this.reloadIframe();
  }

  showPlaylist() {
    this.onShowDetails = false;
    this.onShowPlaylist = true;
  }
  showDetails() {
    this.onShowPlaylist = false;
    this.onShowDetails = true;
  }

  prevSource() {
    let currentIndex = this.sources.findIndex(
      (source: { url: string; enabled: boolean }) =>
        source.url === this.currentSourceUrl && source.enabled
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
    }

    // Do NOT update activeEpisodeSeason here; it should only change when playEpisode is called
    this.videoCurrentTime = 0;
    this.videoDuration = this.HARDCODED_DURATION;
    this.episodeFinished = false;
    if (!this.progressInterval) {
      this.progressInterval = setInterval(() => this.saveProgress(), 5000);
    }
    this.updateUrl();
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

  cancel() {
    this.location.back();
  }

  changeLayout() {
    this.layoutType = this.layoutType === 'list' ? 'grid' : 'list';
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
    const match = url.match(this.mappingRegex);

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
    if (this.currentEpisode < this.currentEpisodes.length) {
      this.currentEpisode = index + 1;
      this.updateCurrentEpisodes(this.currentSeason);
      this.videoCurrentTime = 0;
      this.videoDuration = this.HARDCODED_DURATION;
      this.episodeFinished = false;
      if (!this.progressInterval) {
        this.progressInterval = setInterval(() => this.saveProgress(), 5000);
      }
      this.updateUrl();
      this.reloadIframe();
    }
  }

  prevEpisode(index: number) {
    if (this.currentEpisode > 1) {
      this.currentEpisode = index - 1;
      this.updateCurrentEpisodes(this.currentSeason);
      this.videoCurrentTime = 0;
      this.videoDuration = this.HARDCODED_DURATION;
      this.episodeFinished = false;
      if (!this.progressInterval) {
        this.progressInterval = setInterval(() => this.saveProgress(), 5000);
      }
      this.updateUrl();
      this.reloadIframe();
    }
  }

  updateUrl() {
    const url = new URL(window.location.href);
    const queryParams = new URLSearchParams(url.search);
    queryParams.set('season', this.currentSeason.toString());
    queryParams.set('episode', this.currentEpisode.toString());
    const newUrl = `${url.pathname}?${queryParams.toString()}`;
    this.location.replaceState(newUrl);
  }
}
