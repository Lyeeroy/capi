import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-header',
  standalone: true,
  template: `
    <div
      class="py-2 flex flex-col lg:flex-row justify-start lg:justify-between items-start lg:items-center gap-2 lg:gap-0"
    >
      <nav
        class="flex px-5 py-3 text-gray-700 border border-gray-200 rounded-xl bg-gray-50 w-full lg:w-fit max-w-full"
        aria-label="Breadcrumb"
        [class.hidden]="!showName"
        [class.flex]="showName"
      >
        <ol
          class="inline-flex items-center gap-1 md:gap-2 rtl:gap-x-reverse min-w-0 w-full"
        >
          <li class="inline-flex items-center flex-shrink-0">
            <button
              (click)="onGoBack()"
              class="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer whitespace-nowrap"
            >
              Go Back
            </button>
          </li>

          <li
            aria-current="page"
            class="min-w-0 flex-grow cursor-pointer"
            (click)="toggleTitleExpansion()"
          >
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
                class="block ms-1 text-sm text-gray-600 md:ms-2 font-semibold w-full"
                [class.whitespace-nowrap]="!isTitleExpanded"
                [class.overflow-hidden]="!isTitleExpanded"
                [class.text-ellipsis]="!isTitleExpanded"
                [class.min-w-0]="!isTitleExpanded"
              >
                {{ responseData?.name || responseData?.title || 'Loading...' }}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      <div
        class=" flex px-5 py-3 gap-2 text-gray-700 border border-gray-200 rounded-xl bg-gray-50 w-full lg:w-fit max-w-full flex-shrink-0 justify-between lg:justify-normal"
        [class.hidden]="!showDetailsAndPlaylist"
        [class.flex]="showDetailsAndPlaylist"
      >
        <button
          class="flex items-center text-sm font-medium hover:text-blue-800 active:text-blue-600 whitespace-nowrap transition-all duration-200 ease-in-out"
          (click)="onShowPlaylist()"
          [class.text-blue-600]="highlightPlaylist"
          [class.text-gray-600]="!highlightPlaylist"
          [disabled]="mediaType === 'movie'"
          [class.cursor-not-allowed]="mediaType === 'movie'"
          [class.cursor-pointer]="mediaType !== 'movie'"
        >
          <app-icon-lib ico="play" class="w-4 h-4 mr-2"></app-icon-lib>
          Playlist
        </button>
        <span class="text-sm text-gray-400 hidden sm:block">/</span>
        <div class="hidden text-blue-600">xd</div>
        <button
          class="flex items-center text-sm font-medium  hover:text-blue-800 active:text-blue-600 cursor-pointer whitespace-nowrap transition-all duration-200 ease-in-out"
          (click)="onShowDetails()"
          [class.text-blue-600]="highlightDetails"
          [class.text-gray-600]="!highlightDetails"
          [disabled]="mediaType === 'movie'"
        >
          <app-icon-lib ico="menu" class="w-4 h-4 mr-2"></app-icon-lib>
          Details
        </button>
      </div>
    </div>
  `,
  imports: [IconLibComponent, IconLibComponent, CommonModule],
})
export class PlayerHeader implements OnInit {
  constructor() {}

  @Input() responseData: any = null;

  currentEpisode: number = 1;
  currentSeason: number = 1;
  names: string = '"Show Name"';

  isTitleExpanded: boolean = false;

  @Input() showName: boolean = false;
  @Input() showDetailsAndPlaylist: boolean = false;
  @Input() mediaType: string = 'tv';

  @Output() showPlaylist = new EventEmitter<void>();
  @Output() showDetails = new EventEmitter<void>();

  highlightPlaylist: boolean = true;
  highlightDetails: boolean = false;

  onGoBack() {
    window.history.back();
  }

  toggleTitleExpansion() {
    this.isTitleExpanded = !this.isTitleExpanded;
  }

  onShowPlaylist() {
    this.showPlaylist.emit();
    this.highlightPlaylist = true;
    this.highlightDetails = false;
  }

  onShowDetails() {
    this.showDetails.emit();
    this.highlightDetails = true;
    this.highlightPlaylist = false;
  }

  ngOnInit() {
    if (this.mediaType === 'tv') {
      this.highlightPlaylist = true;
      this.highlightDetails = false;
    } else if (this.mediaType === 'movie') {
      this.highlightDetails = true;
      this.highlightPlaylist = false;
    }
  }
}
