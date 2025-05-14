import {
  Component,
  HostListener,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentTabsComponent } from '../../../components/content-tabs/content-tabs.component';
import { SortHeaderComponent } from '../sort-header/sort-header.component';
import { CommonModule } from '@angular/common';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';

// Define constants for tile limits and increments for easier management
const INITIAL_TILE_LIMIT = 42;
const TILE_LIMIT_INCREMENT = 14;

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  standalone: true,
  imports: [
    ContentTabsComponent,
    SortHeaderComponent,
    CommonModule,
    IconLibComponent,
  ],
})
export class DiscoverComponent implements OnInit, AfterViewInit {
  tileLimit: number = INITIAL_TILE_LIMIT;
  isLoading: boolean = false;
  scrollThreshold: number = 100; // Pixels from bottom to trigger load during scroll

  // Cooldown for scroll-triggered loads (e.g., when user scrolls to bottom)
  scrollLoadCooldown: number = 1000; // 1 second
  // Cooldown for programmatic fill-screen loads (can be shorter for faster initial fill)
  initialFillLoadCooldown: number = 500; // 0.5 seconds
  lastLoadTime: number = 0;

  isFilterOpen: boolean = false;

  genreId: number = 0;
  sortValue: string = '';
  mediaType: 'movie' | 'tv' = 'movie';
  mergedEndpoint: string = ''; // Will be initialized in ngOnInit

  // --- New properties for initial screen fill logic ---
  private initialFillMaxAttempts = 5; // Safety break for how many times we try to fill the screen initially
  private initialFillAttempts = 0;
  private initialSetupDone = false; // Flag to ensure ngAfterViewInit logic runs only once for the very first load

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const newMediaType = data['mediaType'] || 'movie';
      const previousMediaType = this.mediaType;

      this.mediaType = newMediaType;
      this.mergedEndpoint = `/discover/${this.mediaType}`;

      // If initial setup is done and mediaType changes (e.g., navigating /discover/movie to /discover/tv)
      if (this.initialSetupDone && previousMediaType !== newMediaType) {
        console.log('MediaType changed, resetting state and refilling.');
        this.resetStateAndRefill();
      } else if (!this.initialSetupDone) {
        // For the very first component initialization, mergedEndpoint is set.
        // ngAfterViewInit will handle the first screen fill.
        console.log('Initial setup for mediaType:', this.mediaType);
      }
    });
  }

  ngAfterViewInit(): void {
    // This hook fires after the component's view and its children's views are initialized.
    // We use a small timeout to ensure that `app-content-tabs` has had a chance to render
    // its initial items based on `INITIAL_TILE_LIMIT`.
    setTimeout(() => {
      if (!this.initialSetupDone) {
        // Ensure this runs only once for the very first load
        console.log('ngAfterViewInit: Starting initial screen fill check.');
        this.fillScreenIfNeeded();
        this.initialSetupDone = true;
      }
    }, 100); // 100ms delay, adjust if necessary for your app-content-tabs rendering time
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScroll();
  }

  onGenreId(genreId: number): void {
    if (this.genreId === genreId) return; // No change
    console.log('Genre ID changed, resetting state and refilling.');
    this.genreId = genreId;
    this.resetStateAndRefill();
  }

  onSortBy(sortValue: string): void {
    if (this.sortValue === sortValue) return; // No change
    console.log('Sort value changed, resetting state and refilling.');
    this.sortValue = sortValue;
    this.resetStateAndRefill();
  }

  private resetStateAndRefill(): void {
    this.tileLimit = INITIAL_TILE_LIMIT;
    this.initialFillAttempts = 0; // Reset attempts for the new filter set
    this.lastLoadTime = 0; // Allow immediate load after reset
    this.isLoading = false; // Ensure not stuck in a loading state

    this.cdr.detectChanges(); // Apply changes immediately (e.g., hide spinner, update child inputs)

    // After resetting, check if the new (initial) content fills the screen.
    // Use a timeout similar to ngAfterViewInit.
    setTimeout(() => {
      console.log('State reset, attempting to fill screen with new content.');
      this.fillScreenIfNeeded();
    }, 100); // Delay to allow app-content-tabs to process input changes and render new initial data.
  }

  private checkScroll(): void {
    window.requestAnimationFrame(() => {
      if (this.isLoading) {
        // If a load operation is already in progress, do nothing.
        return;
      }

      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const now = Date.now();

      if (documentHeight <= windowHeight) {
        // Content does not fill the viewport.
        // This can happen after initial load or if filters reduce content significantly.
        // Try to load more items to fill the screen.
        // `fillScreenIfNeeded` has its own guards (isLoading, initialFillAttempts).
        console.log('checkScroll: Screen not full, attempting to fill.');
        this.fillScreenIfNeeded();
      } else {
        // Content is scrollable. Check if user is near the bottom.
        // This is for traditional infinite scroll. Apply scroll-specific cooldown.
        if (now - this.lastLoadTime < this.scrollLoadCooldown) {
          return; // Too soon for another scroll-triggered load.
        }
        const scrollPosition = windowHeight + window.scrollY;
        if (scrollPosition >= documentHeight - this.scrollThreshold) {
          console.log(
            'checkScroll: Near bottom of scrollable page, loading more.'
          );
          this.loadMore(false); // `false` indicates this is a scroll-triggered load
        }
      }
    });
  }

  private fillScreenIfNeeded(): void {
    if (this.isLoading) {
      console.log('fillScreenIfNeeded: Already loading, skipping.');
      return;
    }

    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;

    if (documentHeight <= windowHeight) {
      // Screen is not full
      if (this.initialFillAttempts < this.initialFillMaxAttempts) {
        console.log(
          `fillScreenIfNeeded: Screen not full. Attempt ${
            this.initialFillAttempts + 1
          }/${this.initialFillMaxAttempts}. Loading more items.`
        );
        this.initialFillAttempts++;
        this.loadMore(true); // `true` indicates this is part of the initial screen-filling process
      } else {
        console.warn(
          'fillScreenIfNeeded: Screen still not full, but max initial fill attempts reached. Further automatic loading for fill is stopped.'
        );
      }
    } else {
      // Screen is full or scrollable, no action needed from this method.
      console.log('fillScreenIfNeeded: Screen is already full or scrollable.');
    }
  }

  // Parameter `isInitialFill` helps to use different cooldowns and logic paths after loading.
  private loadMore(isInitialFill: boolean): void {
    if (this.isLoading) {
      console.log('loadMore: Already loading, skipping this call.');
      return; // Prevent concurrent loads
    }

    this.lastLoadTime = Date.now();
    this.isLoading = true;
    this.tileLimit += TILE_LIMIT_INCREMENT;
    console.log(
      `loadMore: Loading items... New tileLimit: ${this.tileLimit}. Is part of initial fill: ${isInitialFill}`
    );
    this.cdr.detectChanges(); // Update UI (e.g., show loading spinner)

    const currentCooldown = isInitialFill
      ? this.initialFillLoadCooldown
      : this.scrollLoadCooldown;

    // Simulate API call and rendering delay
    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges(); // Update UI (e.g., hide loading spinner)

      // After items are assumed to be loaded and rendered (due to `currentCooldown`):
      if (isInitialFill) {
        // If this load was part of the initial screen-filling, check again if more is needed.
        this.fillScreenIfNeeded();
      } else {
        // If this was a scroll-triggered load, re-evaluate scroll position.
        // This handles cases where newly loaded items might still not be enough to move far from bottom,
        // or simply to be ready for the next scroll event.
        this.checkScroll();
      }
    }, currentCooldown); // This cooldown should be adequate for items to load and render.
  }
}
