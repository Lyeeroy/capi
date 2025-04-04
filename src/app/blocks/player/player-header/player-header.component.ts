import { Component, OnInit } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-player-header',
  standalone: true,
  template: `
    <div class="hidden flex items-center gap-2 mr-3">
      <button
        (click)="onGoBack()"
        class="flex items-center gap-2 text-gray-900"
      >
        <app-icon-lib ico="arrowLeft" class="w-5 h-5"></app-icon-lib>
        <span>Go back home</span>
      </button>
      <span class="text-gray-900 text-sm font-semibold"
        >| {{ names }} Season {{ currentSeason }} Episode
        {{ currentEpisode }}</span
      >
    </div>
  `,
  imports: [IconLibComponent],
})
export class PlayerHeader implements OnInit {
  constructor() {}

  currentEpisode: number = 1;
  currentSeason: number = 1;
  names: string = '"Show Name"';

  onGoBack() {}

  ngOnInit() {}
}
