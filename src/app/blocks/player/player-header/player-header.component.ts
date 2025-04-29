import { Component, Input, OnInit } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-player-header',
  standalone: true,
  template: `
    <div class="flex items-center p-2">
      <button (click)="onGoBack()" class="cursor-pointer"><- Go back</button>
      <span class="text-gray-900 text-sm px-1"> / </span>
      <h2 class=" text-gray-900 truncate px-1">
        {{ responseData?.name || responseData?.title || 'Loading...' }}
      </h2>
    </div>
  `,
  imports: [IconLibComponent],
})
export class PlayerHeader implements OnInit {
  constructor() {}

  @Input() responseData: any = null;

  currentEpisode: number = 1;
  currentSeason: number = 1;
  names: string = '"Show Name"';

  onGoBack() {}

  ngOnInit() {}
}
