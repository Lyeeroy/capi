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
    return `S${this.currentSeason}:E${this.currentEpisode}`;
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
    // This could be enhanced to show actual episode count if available
    return 'Navigate Episodes';
  }
}
