import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { Episode } from '../playlist/playlist.component';

@Component({
  selector: 'app-info',
  templateUrl: 'info.component.html',
  imports: [CommonModule, IconLibComponent],
})
export class InfoComponent implements OnInit {
  constructor() {}

  @Input() names: string = '';
  @Input() totalSeasons: number[] = [];
  @Input() currentSeason: number = 1;
  @Input() currentEpisodes: Episode[] = [];
  @Input() currentPosters: string[] = [];
  @Input() episodeData: any[] = [];
  @Input() responseData: any = null;
  @Input() mediaType: string = '';

  @Output() close = new EventEmitter<void>();

  ngOnInit() {}

  closeInfo() {
    this.close.emit();
  }
}
