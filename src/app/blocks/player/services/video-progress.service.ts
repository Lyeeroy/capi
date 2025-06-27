import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ContinueWatchingService } from '../../../services/continue-watching.service';
import { TMDBResponse } from './episode-management.service';

@Injectable({
  providedIn: 'root',
})
export class VideoProgressService {
  // Video progress tracking
  private videoCurrentTime: number = 0;
  private videoDuration: number = 0;
  private progressInterval: any;
  private episodeFinished = false;
  private readonly HARDCODED_DURATION = 900;

  // Media info needed for progress tracking
  private id: number | null = null;
  private mediaType: 'tv' | 'movie' | null = null;
  private responseData: TMDBResponse | null = null;
  private currentSeason: number = 1;
  private currentEpisode: number = 1;
  private seasonNumber: number | null = 0;

  // Reference to playlist component for immediate updates
  private playlistComponent: any = null;

  constructor(
    private continueWatchingService: ContinueWatchingService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  /**
   * Initialize video progress tracking
   */
  initializeProgress(
    id: number,
    mediaType: 'tv' | 'movie',
    responseData: TMDBResponse | null,
    currentSeason: number,
    currentEpisode: number,
    seasonNumber: number | null
  ): void {
    this.id = id;
    this.mediaType = mediaType;
    this.responseData = responseData;
    this.currentSeason = currentSeason;
    this.currentEpisode = currentEpisode;
    this.seasonNumber = seasonNumber;

    // Try to restore currentTime from continue watching
    this.restoreProgressFromContinueWatching();

    // Start progress tracking
    this.startProgressTracking();
  }

  /**
   * Register playlist component for immediate progress updates
   */
  registerPlaylistComponent(playlistComponent: any): void {
    this.playlistComponent = playlistComponent;
    // Mark the current episode as clicked when playback starts
    if (this.playlistComponent && typeof this.playlistComponent.markActiveEpisodeAsClicked === 'function') {
      this.playlistComponent.markActiveEpisodeAsClicked();
    }
  }

  /**
   * Update current episode info
   */
  updateEpisodeInfo(season: number, episode: number): void {
    this.currentSeason = season;
    this.currentEpisode = episode;
  }

  /**
   * Update response data
   */
  updateResponseData(responseData: TMDBResponse): void {
    this.responseData = responseData;
    this.updateVideoDurationFromTMDB();
  }

  /**
   * Restore progress from continue watching service
   */
  private restoreProgressFromContinueWatching(): void {
    const cwList = this.continueWatchingService.getList();

    // First look for exact match (same episode)
    let entry = cwList.find(
      (e) =>
        e.tmdbID === String(this.id) &&
        e.mediaType === this.mediaType &&
        (this.mediaType === 'movie' ||
          (e.season === this.currentSeason &&
            e.episode === this.currentEpisode))
    );

    // If exact match not found for TV, check for auto-advanced entries
    if (!entry && this.mediaType === 'tv') {
      // Check for next episode in same season
      const advancedEntry = cwList.find(
        (e) =>
          e.tmdbID === String(this.id) &&
          e.mediaType === 'tv' &&
          e.season === this.currentSeason &&
          e.episode === this.currentEpisode + 1 &&
          e.currentTime === 0
      );

      if (advancedEntry && typeof advancedEntry.episode === 'number') {
        this.currentEpisode = advancedEntry.episode;
        entry = advancedEntry;
        this.updateUrlForAdvancedEpisode();
      } else {
        // Check for next season's first episode
        const nextSeasonEntry = cwList.find(
          (e) =>
            e.tmdbID === String(this.id) &&
            e.mediaType === 'tv' &&
            e.season === this.currentSeason + 1 &&
            e.episode === 1 &&
            e.currentTime === 0
        );

        if (
          nextSeasonEntry &&
          typeof nextSeasonEntry.season === 'number' &&
          typeof nextSeasonEntry.episode === 'number'
        ) {
          this.currentSeason = nextSeasonEntry.season;
          this.currentEpisode = nextSeasonEntry.episode;
          entry = nextSeasonEntry;
          this.updateUrlForAdvancedSeason();
        }
      }
    }

    if (entry && typeof entry.currentTime === 'number') {
      this.videoCurrentTime = entry.currentTime;
    } else {
      this.videoCurrentTime = 0;
    }
  }

  /**
   * Update URL for advanced episode
   */
  private updateUrlForAdvancedEpisode(): void {
    const queryParams = {
      ...this.route.snapshot.queryParams,
      episode: this.currentEpisode,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Update URL for advanced season
   */
  private updateUrlForAdvancedSeason(): void {
    const queryParams = {
      ...this.route.snapshot.queryParams,
      season: this.currentSeason,
      episode: this.currentEpisode,
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Get current time and duration with auto-increment logic
   */
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
      if (this.mediaType === 'tv') {
        this.handleEpisodeCompletion();
      }
    }

    return {
      currentTime: this.videoCurrentTime,
      duration: this.videoDuration,
    };
  }

  /**
   * Handle episode completion for TV shows
   */
  private handleEpisodeCompletion(): void {
    // This will be handled by the component calling saveProgress
    // which will use continueWatchingService to advance episodes
  }

  /**
   * Update video duration from TMDB data
   */
  private updateVideoDurationFromTMDB(): void {
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

  /**
   * Get duration from TMDB response
   */
  private getDurationFromResponse(): number {
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

  /**
   * Validate current time
   */
  private validateCurrentTime(): void {
    if (
      typeof this.videoCurrentTime !== 'number' ||
      this.videoCurrentTime < 0
    ) {
      this.videoCurrentTime = 0;
    }
  }

  /**
   * Save progress to continue watching service
   */
  saveProgress = (totalEpisodesInSeason?: number): boolean => {
    if (!this.id || !this.mediaType) return false;
    // Only skip saving if API response is not loaded yet
    if (!this.responseData) return false;

    const { currentTime, duration } = this.getCurrentTimeAndDuration();

    // Immediately update playlist component with current progress
    if (this.playlistComponent && 
        typeof this.playlistComponent.updateEpisodeProgressImmediate === 'function' &&
        this.mediaType === 'tv') {
      const progress = duration > 0 ? currentTime / duration : 0;
      this.playlistComponent.updateEpisodeProgressImmediate(
        this.currentSeason, 
        this.currentEpisode, 
        progress
      );
    }

    // Save progress to continue watching service
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
      totalEpisodesInSeason,
      this.seasonNumber || undefined
    );

    return this.episodeFinished;
  };

  /**
   * Save progress wrapper for beforeunload event
   */
  private saveProgressOnUnload = (): void => {
    this.saveProgress();
  };

  /**
   * Reset video state (for new episode)
   */
  resetVideoState(): void {
    this.videoCurrentTime = 0;
    this.videoDuration = this.HARDCODED_DURATION;
    this.episodeFinished = false;
    if (!this.progressInterval) {
      this.startProgressTracking();
    }
  }

  /**
   * Start progress tracking interval
   */
  startProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    this.progressInterval = setInterval(() => this.saveProgress(), 5000);
  }

  /**
   * Stop progress tracking
   */
  stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Find continue watching index
   */
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

  /**
   * Check if episode has advanced and update accordingly
   */
  checkForEpisodeAdvancement(): {
    hasAdvanced: boolean;
    newSeason?: number;
    newEpisode?: number;
  } {
    if (this.episodeFinished && this.mediaType === 'tv') {
      const cwList = this.continueWatchingService.getList();
      const updatedEntry = cwList.find(
        (e) => e.tmdbID === String(this.id) && e.mediaType === 'tv'
      );

      if (
        updatedEntry &&
        typeof updatedEntry.episode === 'number' &&
        typeof updatedEntry.season === 'number'
      ) {
        const hasAdvanced =
          updatedEntry.season > this.currentSeason ||
          (updatedEntry.season === this.currentSeason &&
            updatedEntry.episode > this.currentEpisode);

        if (hasAdvanced) {
          const oldSeason = this.currentSeason;
          this.currentSeason = updatedEntry.season;
          this.currentEpisode = updatedEntry.episode;
          this.resetVideoState();

          return {
            hasAdvanced: true,
            newSeason: this.currentSeason,
            newEpisode: this.currentEpisode,
          };
        }
      }
    }

    return { hasAdvanced: false };
  }

  /**
   * Cleanup progress tracking
   */
  cleanup(): void {
    this.stopProgressTracking();

    // Save final progress before cleanup
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.saveProgressOnUnload);
    }
  }

  /**
   * Initialize beforeunload listener
   */
  initializeBeforeUnloadListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.saveProgressOnUnload);
    }
  }

  /**
   * Get current progress state
   */
  getProgressState(): {
    currentTime: number;
    duration: number;
    episodeFinished: boolean;
  } {
    return {
      currentTime: this.videoCurrentTime,
      duration: this.videoDuration,
      episodeFinished: this.episodeFinished,
    };
  }
}
