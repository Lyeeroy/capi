import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-controls',
  standalone: true, // Mark the component as standalone
  templateUrl: './controls.component.html',
  imports: [FormsModule, IconLibComponent], // Include FormsModule in the imports array
})
export class ControlsComponent {
  @Input() currentSourceUrl!: string;
  @Input() sources: { name: string; url: string }[] = [];
  @Input() currentEpisode: any; // Replace 'any' with the actual type if known

  @Output() sourceChange = new EventEmitter<string>();
  @Output() prevEpisodeClick = new EventEmitter<void>();
  @Output() nextEpisodeClick = new EventEmitter<void>();
  @Output() prevSourceClick = new EventEmitter<void>();
  @Output() nextSourceClick = new EventEmitter<void>();

  onSourceChange(event: any) {
    this.sourceChange.emit(event.target.value);
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
}
