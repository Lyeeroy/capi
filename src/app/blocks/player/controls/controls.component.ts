// src/app/blocks/player/controls/controls.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-controls',
  standalone: true, // Mark the component as standalone
  templateUrl: './controls.component.html',
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

  toggleSourcesExpansion(): void {
    this.isSourcesExpanded = !this.isSourcesExpanded;

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
