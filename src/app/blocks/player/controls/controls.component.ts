// controls.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-controls',
  templateUrl: 'controls.component.html',
  imports: [CommonModule, FormsModule, IconLibComponent],
})
export class ControlsComponent {
  @Input() sources: any[] = [];
  @Input() currentSourceUrl: string = '';
  @Input() currentEpisode: number = 1;

  @Output() sourceChanged = new EventEmitter<string>();
  @Output() episodeChanged = new EventEmitter<number>();

  prevSource() {
    const currentIndex = this.sources.findIndex(
      (source) => source.url === this.currentSourceUrl
    );
    if (currentIndex > 0) {
      this.currentSourceUrl = this.sources[currentIndex - 1].url;
      this.sourceChanged.emit(this.currentSourceUrl);
    }
  }

  nextSource() {
    const currentIndex = this.sources.findIndex(
      (source) => source.url === this.currentSourceUrl
    );
    if (currentIndex < this.sources.length - 1) {
      this.currentSourceUrl = this.sources[currentIndex + 1].url;
      this.sourceChanged.emit(this.currentSourceUrl);
    }
  }

  onSourceChange(event: any) {
    this.currentSourceUrl = event.target.value;
    this.sourceChanged.emit(this.currentSourceUrl);
  }

  prevEpisode() {
    if (this.currentEpisode > 1) {
      this.currentEpisode--;
      this.episodeChanged.emit(this.currentEpisode);
    }
  }

  nextEpisode() {
    this.currentEpisode++;
    this.episodeChanged.emit(this.currentEpisode);
  }
}
