import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-episode-navigation',
  standalone: true,
  templateUrl: './episode-navigation.component.html',
  styleUrls: ['../player-modals.css'],
  imports: [IconLibComponent, CommonModule],
})
export class EpisodeNavigationComponent {
  @Input() names: string = '';
  @Input() currentEpisode: number = 1;
  @Input() currentSeason: number = 1;
  @Input() mediaType: string = 'tv';
  @Input() responseData: any;
  @Input() hasPreviousEpisode: boolean = false;
  @Input() hasNextEpisode: boolean = false;
  @Input() previousEpisodeLabel: string = '';
  @Input() nextEpisodeLabel: string = '';

  @Output() previousEpisodeClick = new EventEmitter<void>();
  @Output() nextEpisodeClick = new EventEmitter<void>();

  isEpisodeNavExpanded: boolean = false;

  ngOnInit() {
    // Load episode navigation expansion state from localStorage if needed
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        if (typeof settings.episodeNavExpanded === 'boolean') {
          this.isEpisodeNavExpanded = settings.episodeNavExpanded;
        }
      }
    } catch {
      // Ignore errors, use default
    }
  }
  // Reference to the modal elements for animation
  @ViewChild('modalOverlay') modalOverlay?: ElementRef;
  @ViewChild('modalContent') modalContent?: ElementRef;

  isClosingAnimation = false;

  toggleEpisodeNavExpansion(): void {
    if (this.isEpisodeNavExpanded) {
      // Handle closing animation
      this.isClosingAnimation = true;

      // Add closing animation classes
      setTimeout(() => {
        if (this.modalOverlay?.nativeElement) {
          this.modalOverlay.nativeElement.classList.add('closing');
        }
        if (this.modalContent?.nativeElement) {
          this.modalContent.nativeElement.classList.add('closing');
        }

        // Wait for animation to complete before hiding
        setTimeout(() => {
          this.isEpisodeNavExpanded = false;
          this.isClosingAnimation = false;
          this.saveExpansionState();
        }, 250); // Match animation duration
      }, 0);
    } else {
      // Simply open
      this.isEpisodeNavExpanded = true;
      this.saveExpansionState();
    }
  }

  private saveExpansionState(): void {
    // Save state to localStorage
    try {
      const raw = localStorage.getItem('appSettings') || '{}';
      const settings = JSON.parse(raw);
      settings.episodeNavExpanded = this.isEpisodeNavExpanded;
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch {
      // Ignore errors
    }
  }

  onPreviousEpisode() {
    if (this.hasPreviousEpisode) {
      this.previousEpisodeClick.emit();
    }
  }

  onNextEpisode() {
    if (this.hasNextEpisode) {
      this.nextEpisodeClick.emit();
    }
  }

  getCurrentEpisodeInfo(): string {
    if (this.mediaType === 'movie') {
      return this.responseData?.title || this.names || 'Movie';
    }
    // Format season and episode with leading zeros, but only up to two digits
    const seasonStr =
      this.currentSeason < 10
        ? `0${this.currentSeason}`
        : `${this.currentSeason}`;
    const episodeStr =
      this.currentEpisode < 10
        ? `0${this.currentEpisode}`
        : `${this.currentEpisode}`;
    return `S${seasonStr}:E${episodeStr}`;
  }

  getSubtitle(): string {
    if (this.mediaType === 'movie') {
      const year = this.responseData?.release_date?.substring(0, 4);
      return year ? `Released ${year}` : 'Movie';
    }
    return this.names || 'TV Series';
  }

  getEpisodeCount(): string {
    if (this.mediaType === 'movie') {
      return 'Feature Film';
    }
    // Show next episode info, including season change if needed
    if (!this.hasNextEpisode) {
      return 'No Next Ep.';
    }
    let nextSeason = this.currentSeason;
    let nextEpisode = this.currentEpisode + 1;
    // Try to get episode count for current season from responseData
    let episodesInSeason = 0;
    if (this.responseData && this.responseData.seasons) {
      const seasonData = this.responseData.seasons.find(
        (s: any) => s.season_number === this.currentSeason
      );
      if (seasonData && seasonData.episode_count) {
        episodesInSeason = seasonData.episode_count;
      }
    }
    if (episodesInSeason && nextEpisode > episodesInSeason) {
      // Move to next season, episode 1
      nextSeason++;
      nextEpisode = 1;
    }
    const seasonStr = nextSeason < 10 ? `0${nextSeason}` : `${nextSeason}`;
    const episodeStr = nextEpisode < 10 ? `0${nextEpisode}` : `${nextEpisode}`;
    return `S${seasonStr}:E${episodeStr}`;
  }

  copyEpisodeInfoToClipboard() {
    let text = '';
    if (this.mediaType === 'movie') {
      text = this.responseData?.title || this.names || 'Movie';
    } else {
      const name = this.names || this.responseData?.name || 'TV Show';
      const seasonStr =
        this.currentSeason < 10
          ? `0${this.currentSeason}`
          : `${this.currentSeason}`;
      const episodeStr =
        this.currentEpisode < 10
          ? `0${this.currentEpisode}`
          : `${this.currentEpisode}`;
      text = `${name} S${seasonStr}E${episodeStr}`;
    }
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      // fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
}
