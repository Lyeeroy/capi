// src/app/blocks/player/controls/controls.component.ts
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-controls',
  standalone: true, // Mark the component as standalone
  templateUrl: './controls.component.html',
  styleUrls: ['../player-modals.css'],
  imports: [FormsModule, IconLibComponent, CommonModule], // Include FormsModule in the imports array
})
export class ControlsComponent {
  @Input() currentSourceUrl!: string;
  @Input() sources: { name: string; url: string; enabled: boolean }[] = [];
  @Input() currentEpisode: any;
  @Input() mediaType: string = '';

  @Output() sourceChange = new EventEmitter<string>();
  @Output() prevSourceClick = new EventEmitter<void>();
  @Output() nextSourceClick = new EventEmitter<void>();

  isSourcesExpanded: boolean = false;

  ngOnInit() {
    // Load sources expansion state from localStorage if needed
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        if (typeof settings.sourcesExpanded === 'boolean') {
          this.isSourcesExpanded = settings.sourcesExpanded;
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

  toggleSourcesExpansion(): void {
    if (this.isSourcesExpanded) {
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
          this.isSourcesExpanded = false;
          this.isClosingAnimation = false;
          this.saveExpansionState();
        }, 250); // Match animation duration
      }, 0);
    } else {
      // Simply open
      this.isSourcesExpanded = true;
      this.saveExpansionState();
    }
  }

  private saveExpansionState(): void {
    // Save state to localStorage
    try {
      const raw = localStorage.getItem('appSettings') || '{}';
      const settings = JSON.parse(raw);
      settings.sourcesExpanded = this.isSourcesExpanded;
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch {
      // Ignore errors
    }
  }

  prevSource() {
    this.prevSourceClick.emit();
  }

  nextSource() {
    this.nextSourceClick.emit();
  }

  onSourceSelect(source: any) {
    this.currentSourceUrl = source.url;
    this.sourceChange.emit(source.url);
  }

  getCurrentSourceName(): string {
    const currentSource = this.sources.find(
      (source) => source.url === this.currentSourceUrl && source.enabled
    );
    return currentSource ? currentSource.name : 'No Source';
  }

  getEnabledSources() {
    return this.sources.filter((source) => source.enabled);
  }
}
