import { Component, Input, OnInit } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-player-header',
  standalone: true,
  template: `
    <div
      class="py-2 flex flex-col md:flex-row justify-start md:justify-between items-start md:items-center gap-2 md:gap-0"
    >
      <nav
        class="flex px-5 py-3 text-gray-700 border border-gray-200 rounded-xl bg-gray-50 w-fit max-w-full"
        aria-label="Breadcrumb"
      >
        <ol
          class="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse min-w-0"
        >
          <li class="inline-flex items-center flex-shrink-0">
            <button
              (click)="onGoBack()"
              class="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer whitespace-nowrap"
            >
              Go back
            </button>
          </li>

          <li aria-current="page" class="min-w-0">
            <div class="flex items-center">
              <svg
                class="rtl:rotate-180 block w-3 h-3 mx-1 text-gray-400 flex-shrink-0"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 6 10"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 9 4-4-4-4"
                />
              </svg>
              <span
                class="block ms-1 text-sm text-gray-600 md:ms-2 font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {{ responseData?.name || responseData?.title || 'Loading...' }}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      <div
        class="hidden flex px-5 py-3 gap-2 text-gray-700 border border-gray-200 rounded-xl bg-gray-50 w-fit max-w-full flex-shrink-0"
      >
        <button
          class="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 active:text-gray-900 cursor-pointer whitespace-nowrap"
        >
          <app-icon-lib ico="play" class="w-4 h-4 mr-2"></app-icon-lib>
          Playlist
        </button>
        <span class="text-sm text-gray-400 hidden sm:block">/</span>
        <button
          class="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 active:text-gray-900 cursor-pointer whitespace-nowrap"
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
