import { Component, OnInit } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-player-header',
  standalone: true,
  template: `
    <button
      (click)="onGoBack()"
      class="hidden flex items-center gap-1.5 group py-2 px-3 sm:px-4 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium text-xs sm:text-sm transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <app-icon-lib
        ico="arrowLeft"
        class="w-3 h-3 sm:w-3.5 sm:h-3.5 transform transition-transform duration-150 group-hover:-translate-x-0.5"
      ></app-icon-lib>
      <span>Go back</span>
    </button>
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
