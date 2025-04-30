import { Component, Input, OnInit } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-player-header',
  standalone: true,
  template: `
    <div class="flex items-center justify-between">
      <div class="flex items-center py-2">
        <button
          (click)="onGoBack()"
          class="flex items-center cursor-pointer text-sm text-gray-600 ml-2 hover:text-gray-800 active:text-gray-900 whitespace-nowrap"
        >
          <app-icon-lib ico="arrowLeft" class="w-4 h-4 mr-2"></app-icon-lib>
          Go back
        </button>
        <span class="text-sm text-gray-400 px-2">/</span>
        <h2
          class="text-sm font-semibold text-gray-600 truncate hover:text-gray-800 active:text-gray-900"
        >
          {{ responseData?.name || responseData?.title || 'Loading...' }}
        </h2>
      </div>

      <div class="hidden flex items-center gap-2">
        <button
          class="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 active:text-gray-900 cursor-pointer"
        >
          <app-icon-lib ico="play" class="w-4 h-4 mr-2"></app-icon-lib>
          Playlist
        </button>
        <span class="text-sm text-gray-400">/</span>
        <button
          class="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 active:text-gray-900 cursor-pointer"
        >
          <app-icon-lib ico="menu" class="w-4 h-4 mr-2"></app-icon-lib>
          Details
        </button>
      </div>
    </div>
  `,
  imports: [IconLibComponent, IconLibComponent],
})
export class PlayerHeader implements OnInit {
  constructor() {}

  @Input() responseData: any = null;

  currentEpisode: number = 1;
  currentSeason: number = 1;
  names: string = '"Show Name"';

  onGoBack() {
    window.history.back();
  }

  ngOnInit() {}
}
