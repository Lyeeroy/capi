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
  @Output() prevEpisodeClick = new EventEmitter<void>();
  @Output() nextEpisodeClick = new EventEmitter<void>();
  @Output() prevSourceClick = new EventEmitter<void>();
  @Output() nextSourceClick = new EventEmitter<void>();

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

  prevEpisode() {
    this.prevEpisodeClick.emit();
  }

  nextEpisode() {
    this.nextEpisodeClick.emit();
  }

  currentSeason = 1;

  scrollSources(amount: number) {
    const scroller = document.querySelector('.scrollbar-hide');
    scroller?.scrollBy({ left: amount, behavior: 'smooth' });
  }

  onSourceChangeManual(url: string) {
    this.currentSourceUrl = url;
    // Your existing source change logic here
  }
}
