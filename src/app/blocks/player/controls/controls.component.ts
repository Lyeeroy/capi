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

  sourceLayout: 'dropdown' | 'grid' = 'dropdown';

  ngOnInit() {
    // Load source layout from localStorage
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const settings = JSON.parse(raw);
        if (settings.sourceLayout) {
          this.sourceLayout = settings.sourceLayout;
        }
      }
    } catch {
      // Ignore errors, use default
    }
  }

  onSourceChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.sourceChange.emit(target.value);
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
}
