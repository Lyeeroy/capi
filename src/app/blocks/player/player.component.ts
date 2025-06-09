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
  activeEpisodeIndex: number = 0;
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
  private readonly HARDCODED_DURATION = 600;

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

      // --- Highlight fix: load last played from localStorage if available ---
      if (this.id && this.mediaType === 'tv') {
        const lastPlayedKey = `playlist_last_played_${this.id}`;
        const stored = localStorage.getItem(lastPlayedKey);
        if (stored) {
          try {
            const lastPlayed = JSON.parse(stored);
            if (
              lastPlayed &&
              typeof lastPlayed.season === 'number' &&
              typeof lastPlayed.episode === 'number'
            ) {
              this.currentSeason = lastPlayed.season;
              this.currentEpisode = lastPlayed.episode;
            }
          } catch {
            // ignore corrupted data
          }
        }
      }
      // --- End highlight fix ---

      this.initializeData();
      this.loadSourcesService.loadSources().then(() => {
        this.sources = this.loadSourcesService.sources;
        if (this.sources && this.sources.length > 0) {
          this.currentSourceUrl = this.sources[0].url;
          this.reloadIframe();
        }
      });
    });
    // Optionally, listen for pause or beforeunload to save progress
    window.addEventListener('beforeunload', this.saveProgress);
    // Periodically save progress (simulate, replace with real player integration)
    this.progressInterval = setInterval(() => this.saveProgress(), 5000);
  }

  ngOnDestroy() {
    this.saveProgress();
    window.removeEventListener('beforeunload', this.saveProgress);
    clearInterval(this.progressInterval);
  }

  // Simulate getting currentTime and duration from player (hardcoded only)
  getCurrentTimeAndDuration(): { currentTime: number; duration: number } {
    if (!this.videoDuration) this.videoDuration = this.HARDCODED_DURATION;
    if (typeof this.videoCurrentTime !== 'number' || this.videoCurrentTime < 0)
      this.videoCurrentTime = 0;

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
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
      if (
        this.mediaType === 'tv' &&
        this.currentEpisodes &&
        this.currentEpisode < this.currentEpisodes.length
      ) {
        this.currentEpisode++;
      }
    }
    return {
      currentTime: this.videoCurrentTime,
      duration: this.videoDuration,
    };
  }

  // No TMDB duration fetch, always use hardcoded
  getDurationFromResponse(): number {
    return 0;
  }

  // Call this when video pauses or component is destroyed
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
            console.log('Response:', this.responseData);
            if (this.seasonNumber) {
              this.getAllSeasonData();
            }
          });
      } else if (this.mediaType === 'movie') {
        this.tmdbService
          .callAPI('https://api.themoviedb.org/3', `/movie/${this.id}`, 'movie')
          .subscribe((response) => {
            //this.names = response?.title ?? this.names;
            this.responseData = response;
            console.log('Response:', this.responseData);
          });
      }
    }
  }

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
          this.updateCurrentEpisodes(this.currentSeason);
          // --- Always update localStorage for highlight ---
          if (this.id && this.mediaType === 'tv') {
            localStorage.setItem(
              `playlist_last_played_${this.id}`,
              JSON.stringify({
                season: this.currentSeason,
                episode: this.currentEpisode,
              })
            );
          }
          // --- End highlight fix ---
          this.updateUrl();
        },
        (error) => console.error('Error fetching season data:', error)
      );
    }
  }

  playEpisode(index: number) {
    this.currentEpisode = this.isSortedAscending
      ? this.currentEpisodes[index]?.number || index + 1
      : this.currentEpisodes[index]?.number ||
        this.currentEpisodes.length - index;
    this.updateCurrentEpisodes(this.currentSeason);
    this.videoCurrentTime = 0;
    this.videoDuration = this.HARDCODED_DURATION;
    this.episodeFinished = false;
    if (!this.progressInterval) {
      this.progressInterval = setInterval(() => this.saveProgress(), 5000);
    }
    // Store last played in localStorage for highlight
    if (this.id) {
      localStorage.setItem(
        `playlist_last_played_${this.id}`,
        JSON.stringify({
          season: this.currentSeason,
          episode: this.currentEpisode,
        })
      );
    }
    // --- Highlight fix: update activeEpisodeIndex ---
    const idx = this.currentEpisodes.findIndex(
      (ep) => ep.number === this.currentEpisode
    );
    this.activeEpisodeIndex = idx !== -1 ? idx : 0;
    // --- End highlight fix ---
    this.updateUrl();
    this.reloadIframe();
  }

  highlightActiveEpisode(index: number) {
    this.activeEpisodeIndex = index;
  }

  onSeasonChange(newSeason: number) {
    this.currentSeason = newSeason;
    this.updateCurrentEpisodes(this.currentSeason);
    this.videoCurrentTime = 0;
    this.videoDuration = this.HARDCODED_DURATION;
    this.episodeFinished = false;
    if (!this.progressInterval) {
      this.progressInterval = setInterval(() => this.saveProgress(), 5000);
    }
    // Remove highlight if current episode is not in this season
    if (this.id) {
      const found = this.currentEpisodes.find(
        (ep) => ep.number === this.currentEpisode
      );
      if (!found) {
        localStorage.removeItem(`playlist_last_played_${this.id}`);
        // --- Highlight fix: reset activeEpisodeIndex if not found ---
        this.activeEpisodeIndex = 0;
      } else {
        // --- Highlight fix: update activeEpisodeIndex if found ---
        const idx = this.currentEpisodes.findIndex(
          (ep) => ep.number === this.currentEpisode
        );
        this.activeEpisodeIndex = idx !== -1 ? idx : 0;
      }
    }
    this.updateUrl();
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

  onSourceChange(newSourceUrl: string) {
    this.currentSourceUrl = newSourceUrl;
    this.reloadIframe();
  }

  reloadIframe() {
    this.highlightActiveEpisode(this.currentEpisode - 1);
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

    // Handle TV-specific replacements
    if (this.mediaType === 'tv') {
      newUrl = newUrl
        .replace(/#season/g, this.currentSeason.toString())
        .replace(/#episode/g, this.currentEpisode.toString());
    } else {
      // For movies, remove any season/episode references
      newUrl = newUrl
        .replace(/([&?])(s|e|season|episode)=[^&]*/gi, '')
        .replace(/\/(season|episode)\/[^/]+/gi, '')
        .replace(/-*(#season|#episode)-*/gi, '')
        .replace(/--+/g, '-') // Replace multiple consecutive hyphens with single hyphen
        .replace(/-+$/g, ''); // Remove trailing hyphens
    }

    // Clean up the URL
    newUrl = newUrl
      .replace(/([^:])\/{2,}/g, '$1/') // Fix double slashes
      .replace(/\/+(\?.*)?$/, '$1') // Remove trailing slashes before query params
      .replace(/\?+$/, '') // Remove trailing question marks
      .replace(/-+$/g, ''); // Remove trailing hyphens again (final cleanup)

    return this.sanitizer.bypassSecurityTrustResourceUrl(newUrl);
  }
  updateCurrentEpisodes(seasonNumber: number) {
    if (this.episodeNames[seasonNumber] && this.episodePosters[seasonNumber]) {
      this.currentEpisodes = this.episodeNames[seasonNumber];
      this.currentPosters = this.episodePosters[seasonNumber];
      // --- Always update localStorage for highlight ---
      if (this.id && this.mediaType === 'tv') {
        localStorage.setItem(
          `playlist_last_played_${this.id}`,
          JSON.stringify({
            season: this.currentSeason,
            episode: this.currentEpisode,
          })
        );
      }
      // --- End highlight fix ---
      const idx = this.currentEpisodes.findIndex(
        (ep) => ep.number === this.currentEpisode
      );
      this.activeEpisodeIndex = idx !== -1 ? idx : 0;
      // --- Highlight fix: keep currentEpisode in sync with activeEpisodeIndex ---
      if (this.currentEpisodes[this.activeEpisodeIndex]) {
        this.currentEpisode =
          this.currentEpisodes[this.activeEpisodeIndex].number;
      }
      // --- End highlight fix ---
    }
  }

  isSortedAscending = true;
  ascOrDescSort() {
    this.currentEpisodes.reverse();
    this.currentPosters.reverse();
    this.isSortedAscending = !this.isSortedAscending;
  }

  cancel() {
    this.location.back();
  }

  changeLayout() {
    this.layoutType = this.layoutType === 'list' ? 'grid' : 'list';
    // this.layoutType =
    //   this.layoutType === 'list'
    //     ? 'grid'
    //     : this.layoutType === 'grid'
    //     ? 'poster'
    //     : 'list';
  }

  // Remove time from URL when resuming
  resumeFromContinueWatching(entry: any) {
    const queryParams: any = {};
    if (entry.mediaType === 'tv') {
      queryParams.season = entry.season;
      queryParams.episode = entry.episode;
    }
    // Do NOT add time to queryParams
    this.router.navigate(['/player', entry.tmdbID, entry.mediaType], {
      queryParams,
    });
  }
}
