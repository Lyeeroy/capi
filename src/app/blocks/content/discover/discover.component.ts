import {
  Component,
  HostListener,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentTabsComponent } from '../../../components/content-tabs/content-tabs.component';
import { CommonModule } from '@angular/common';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

const INITIAL_TILE_LIMIT = 42;
const TILE_LIMIT_INCREMENT = 14;

interface Genre {
  id: number;
  name: string;
}

interface Country {
  code: string;
  name: string;
}

interface Network {
  id: number; // This will be used as the display ID
  name: string;
  mediaTypes?: ('movie' | 'tv' | 'anime')[];
  tvNetworkId?: number; // Specific ID for TV shows
  movieProviderId?: number; // Specific ID for movies
}

interface SortOption {
  value: string;
  label: string;
}

interface QuickAccessOption {
  value: string;
  label: string;
  mediaTypes?: ('movie' | 'tv' | 'anime')[];
}

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  standalone: true,
  imports: [ContentTabsComponent, CommonModule, IconLibComponent, FormsModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' })),
      ]),
    ]),
  ],
})
export class DiscoverComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sortDropdown') sortDropdown!: ElementRef;

  tileLimit: number = INITIAL_TILE_LIMIT;
  isLoading: boolean = false;
  isLoadingFilters: boolean = false;
  scrollThreshold: number = 100;
  scrollLoadCooldown: number = 1000;
  initialFillLoadCooldown: number = 500;
  lastLoadTime: number = 0;

  // UI State
  isSortDropdownOpen: boolean = false;
  isFilterPanelOpen: boolean = false;

  // Active Filter State (used for actual filtering)
  selectedGenres: number[] = [];
  selectedCountry: string = '';
  selectedYear: string = '';
  minScore: number = 0;
  selectedNetwork: string = '';

  // Pending Filter State (used in modal before applying)
  pendingSelectedGenres: number[] = [];
  pendingSelectedCountry: string = '';
  pendingSelectedYear: string = '';
  pendingMinScore: number = 0;
  pendingSelectedNetwork: string = '';

  // Media & Sort State
  mediaType: 'movie' | 'tv' | 'anime' = 'movie';
  sortMode:
    | 'discover'
    | 'trending'
    | 'topRated'
    | 'nowPlaying'
    | 'upcoming'
    | 'airingToday'
    | 'onTheAir' = 'discover';
  currentSortBy: string = 'popularity.desc';
  mergedEndpoint: string = '';

  // Initial fill logic
  private initialFillMaxAttempts = 5;
  private initialFillAttempts = 0;
  private initialSetupDone = false;

  // Sort Options for Movies
  movieSortOptions: SortOption[] = [
    { value: 'popularity.desc', label: 'Popularity ↓' },
    { value: 'popularity.asc', label: 'Popularity ↑' },
    { value: 'vote_average.desc', label: 'Average Score ↓' },
    { value: 'vote_average.asc', label: 'Average Score ↑' },
    { value: 'primary_release_date.desc', label: 'Release Date (Newest)' },
    { value: 'primary_release_date.asc', label: 'Release Date (Oldest)' },
    { value: 'title.asc', label: 'Title A-Z' },
    { value: 'title.desc', label: 'Title Z-A' },
    { value: 'revenue.desc', label: 'Revenue ↓' },
    { value: 'revenue.asc', label: 'Revenue ↑' },
  ];

  // Sort Options for TV Shows
  tvSortOptions: SortOption[] = [
    { value: 'popularity.desc', label: 'Popularity ↓' },
    { value: 'popularity.asc', label: 'Popularity ↑' },
    { value: 'vote_average.desc', label: 'Average Score ↓' },
    { value: 'vote_average.asc', label: 'Average Score ↑' },
    { value: 'first_air_date.desc', label: 'First Air Date (Newest)' },
    { value: 'first_air_date.asc', label: 'First Air Date (Oldest)' },
    { value: 'name.asc', label: 'Name A-Z' },
    { value: 'name.desc', label: 'Name Z-A' },
  ];

  // Quick Access Options
  quickAccessOptions: QuickAccessOption[] = [
    { value: 'trending', label: 'Trending This Week' },
    { value: 'topRated', label: 'Top Rated' },
    { value: 'nowPlaying', label: 'Now Playing', mediaTypes: ['movie'] },
    { value: 'upcoming', label: 'Upcoming', mediaTypes: ['movie'] },
    {
      value: 'airingToday',
      label: 'Airing Today',
      mediaTypes: ['tv', 'anime'],
    },
    { value: 'onTheAir', label: 'On The Air', mediaTypes: ['tv', 'anime'] },
    { value: 'discover', label: 'Custom Sort & Filter' },
  ];

  // Available Genres
  availableGenres: Genre[] = [];

  // Available Countries
  availableCountries: Country[] = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'IN', name: 'India' },
    { code: 'CN', name: 'China' },
    { code: 'MX', name: 'Mexico' },
    { code: 'BR', name: 'Brazil' },
    { code: 'RU', name: 'Russia' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'AT', name: 'Austria' },
  ];

  // Available Networks/Streaming Services
  // Note: id is just for display purposes, tvNetworkId is used for TV, movieProviderId for movies
  availableNetworks: Network[] = [
    {
      id: 1,
      name: 'Netflix',
      mediaTypes: ['movie', 'tv', 'anime'],
      tvNetworkId: 213, // Netflix TV network ID
      movieProviderId: 8, // Netflix movie provider ID
    },
    {
      id: 2,
      name: 'HBO',
      mediaTypes: ['tv'],
      tvNetworkId: 49, // HBO TV network ID
    },
    {
      id: 3,
      name: 'HBO Max',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 3186, // HBO Max TV network ID
      movieProviderId: 384, // HBO Max movie provider ID
    },
    {
      id: 4,
      name: 'Amazon Prime Video',
      mediaTypes: ['movie', 'tv', 'anime'],
      tvNetworkId: 1024, // Amazon TV network ID
      movieProviderId: 9, // Amazon movie provider ID
    },
    {
      id: 5,
      name: 'Apple TV+',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 2552, // Apple TV+ TV network ID
      movieProviderId: 350, // Apple TV+ movie provider ID
    },
    {
      id: 6,
      name: 'Disney+',
      mediaTypes: ['movie', 'tv', 'anime'],
      tvNetworkId: 2739, // Disney+ TV network ID
      movieProviderId: 337, // Disney+ movie provider ID
    },
    {
      id: 7,
      name: 'Hulu',
      mediaTypes: ['movie', 'tv', 'anime'],
      tvNetworkId: 453, // Hulu TV network ID
      movieProviderId: 15, // Hulu movie provider ID
    },
    {
      id: 8,
      name: 'Paramount+',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 4330, // Paramount+ TV network ID
      movieProviderId: 531, // Paramount+ movie provider ID
    },
    {
      id: 9,
      name: 'Peacock',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 3353, // Peacock TV network ID
      movieProviderId: 387, // Peacock movie provider ID
    },
    {
      id: 10,
      name: 'Max',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 1899, // Max TV network ID
      movieProviderId: 1899, // Max movie provider ID
    },
    {
      id: 11,
      name: 'Crackle',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 283, // Crackle TV network ID
      movieProviderId: 283, // Crackle movie provider ID
    },
    {
      id: 12,
      name: 'Crunchyroll',
      mediaTypes: ['anime', 'tv'],
      tvNetworkId: 1112, // Crunchyroll TV network ID
      movieProviderId: 283, // Crunchyroll movie provider ID
    },
    {
      id: 13,
      name: 'Paramount Network',
      mediaTypes: ['tv'],
      tvNetworkId: 531, // Paramount Network TV ID
    },
    {
      id: 14,
      name: 'Fox',
      mediaTypes: ['tv'],
      tvNetworkId: 19, // Fox TV network ID
    },
    {
      id: 15,
      name: 'AMC',
      mediaTypes: ['tv'],
      tvNetworkId: 174, // AMC TV network ID
    },
    {
      id: 16,
      name: 'NBC',
      mediaTypes: ['tv'],
      tvNetworkId: 6, // NBC TV network ID
    },
    {
      id: 17,
      name: 'CBS',
      mediaTypes: ['tv'],
      tvNetworkId: 16, // CBS TV network ID
    },
    {
      id: 18,
      name: 'ABC',
      mediaTypes: ['tv'],
      tvNetworkId: 2, // ABC TV network ID
    },
    {
      id: 19,
      name: 'FX',
      mediaTypes: ['tv'],
      tvNetworkId: 88, // FX TV network ID
    },
    {
      id: 20,
      name: 'Starz',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 318, // Starz TV network ID
      movieProviderId: 43, // Starz movie provider ID
    },
    {
      id: 21,
      name: 'Showtime',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 67, // Showtime TV network ID
      movieProviderId: 37, // Showtime movie provider ID
    },
    {
      id: 22,
      name: 'BBC One',
      mediaTypes: ['tv'],
      tvNetworkId: 4, // BBC One TV network ID
    },
    {
      id: 23,
      name: 'YouTube Premium',
      mediaTypes: ['movie', 'tv'],
      tvNetworkId: 1436, // YouTube Premium TV network ID
      movieProviderId: 188, // YouTube Premium movie provider ID
    },
  ];

  // Available Years
  availableYears: number[] = [];

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear + 1; year >= 1900; year--) {
      this.availableYears.push(year);
    }
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const newMediaType = data['mediaType'] || 'movie';
      const previousMediaType = this.mediaType;

      this.mediaType = newMediaType;

      if (this.mediaType === 'anime') {
        this.selectedGenres = [16];
        this.pendingSelectedGenres = [16];
      }

      // Pre-load genres immediately
      this.loadGenresSync();
      this.updateEndpoint();

      if (this.initialSetupDone && previousMediaType !== newMediaType) {
        this.resetStateAndRefill();
      }
    });

    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.initialSetupDone) {
        this.fillScreenIfNeeded();
        this.initialSetupDone = true;
      }
    }, 100);
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScroll();
  }

  // Load genres synchronously (immediate)
  loadGenresSync(): void {
    if (this.mediaType === 'movie' || this.mediaType === 'anime') {
      this.availableGenres = [
        { id: 28, name: 'Action' },
        { id: 12, name: 'Adventure' },
        { id: 16, name: 'Animation' },
        { id: 35, name: 'Comedy' },
        { id: 80, name: 'Crime' },
        { id: 99, name: 'Documentary' },
        { id: 18, name: 'Drama' },
        { id: 10751, name: 'Family' },
        { id: 14, name: 'Fantasy' },
        { id: 36, name: 'History' },
        { id: 27, name: 'Horror' },
        { id: 10402, name: 'Music' },
        { id: 9648, name: 'Mystery' },
        { id: 10749, name: 'Romance' },
        { id: 878, name: 'Science Fiction' },
        { id: 10770, name: 'TV Movie' },
        { id: 53, name: 'Thriller' },
        { id: 10752, name: 'War' },
        { id: 37, name: 'Western' },
      ];
    } else {
      this.availableGenres = [
        { id: 10759, name: 'Action & Adventure' },
        { id: 16, name: 'Animation' },
        { id: 35, name: 'Comedy' },
        { id: 80, name: 'Crime' },
        { id: 99, name: 'Documentary' },
        { id: 18, name: 'Drama' },
        { id: 10751, name: 'Family' },
        { id: 10762, name: 'Kids' },
        { id: 9648, name: 'Mystery' },
        { id: 10763, name: 'News' },
        { id: 10764, name: 'Reality' },
        { id: 10765, name: 'Sci-Fi & Fantasy' },
        { id: 10766, name: 'Soap' },
        { id: 10767, name: 'Talk' },
        { id: 10768, name: 'War & Politics' },
        { id: 37, name: 'Western' },
      ];
    }
  }

  // Load genres based on media type (with animation)
  loadGenres(): void {
    this.isLoadingFilters = true;

    setTimeout(() => {
      this.loadGenresSync();
      this.isLoadingFilters = false;
      this.cdr.detectChanges();
    }, 300);
  }

  // Get sort options based on media type
  getSortOptionsForMediaType(): SortOption[] {
    return this.mediaType === 'movie'
      ? this.movieSortOptions
      : this.tvSortOptions;
  }

  // Get filtered quick access options based on media type
  getFilteredQuickAccessOptions(): QuickAccessOption[] {
    return this.quickAccessOptions.filter(
      (option) =>
        !option.mediaTypes || option.mediaTypes.includes(this.mediaType)
    );
  }

  // Get filtered networks based on media type
  getFilteredNetworks(): Network[] {
    return this.availableNetworks.filter(
      (network) =>
        !network.mediaTypes || network.mediaTypes.includes(this.mediaType)
    );
  }

  // Toggle sort dropdown
  toggleSortDropdown(): void {
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
  }

  // Toggle filter panel
  toggleFilterPanel(): void {
    if (!this.isFilterPanelOpen) {
      // Opening the panel
      this.isFilterPanelOpen = true;

      // Ensure genres are loaded
      if (this.availableGenres.length === 0) {
        this.loadGenresSync();
      }

      // Copy current active filters to pending (for editing)
      this.pendingSelectedGenres = [...this.selectedGenres];
      this.pendingSelectedCountry = this.selectedCountry;
      this.pendingSelectedYear = this.selectedYear;
      this.pendingMinScore = this.minScore;
      this.pendingSelectedNetwork = this.selectedNetwork;

      // Force immediate change detection
      this.cdr.detectChanges();

      // Force another change detection after a brief delay to ensure rendering
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    } else {
      // Closing the panel
      this.isFilterPanelOpen = false;
    }
  }

  closeFilterPanel(): void {
    this.isFilterPanelOpen = false;
  }

  // Handle outside clicks
  handleOutsideClick(event: MouseEvent): void {
    if (
      this.sortDropdown &&
      !this.sortDropdown.nativeElement.contains(event.target)
    ) {
      this.isSortDropdownOpen = false;
    }
  }

  // Get current sort label
  getSortLabel(): string {
    if (this.sortMode !== 'discover') {
      const option = this.quickAccessOptions.find(
        (o) => o.value === this.sortMode
      );
      return option ? option.label : 'Sort';
    }
    const options = this.getSortOptionsForMediaType();
    const option = options.find((o) => o.value === this.currentSortBy);
    return option ? option.label : 'Sort';
  }

  // Quick access change
  onQuickAccessChange(mode: string): void {
    this.sortMode = mode as any;
    this.isSortDropdownOpen = false;
    this.updateEndpoint();
    this.resetStateAndRefill();
  }

  // Sort option change
  onSortOptionChange(sortBy: string): void {
    this.currentSortBy = sortBy;
    this.sortMode = 'discover';
    this.isSortDropdownOpen = false;
    this.updateEndpoint();
    this.resetStateAndRefill();
  }

  // Media type change
  onMediaTypeChange(newMediaType: 'movie' | 'tv' | 'anime'): void {
    if (this.mediaType === newMediaType) return;

    this.mediaType = newMediaType;

    // Clear all filters when switching media types
    this.selectedGenres = [];
    this.selectedCountry = '';
    this.selectedYear = '';
    this.minScore = 0;
    this.selectedNetwork = '';

    // Clear pending filters as well
    this.pendingSelectedGenres = [];
    this.pendingSelectedCountry = '';
    this.pendingSelectedYear = '';
    this.pendingMinScore = 0;
    this.pendingSelectedNetwork = '';

    // For anime, set animation genre (16) as default
    if (this.mediaType === 'anime') {
      this.selectedGenres = [16];
      this.pendingSelectedGenres = [16];
    }

    // Reset to default sort
    this.currentSortBy = 'popularity.desc';
    this.sortMode = 'discover';

    // Load appropriate genres for the new media type
    this.loadGenresSync();
    this.updateEndpoint();
    this.resetStateAndRefill();
  }

  // Genre toggle (works with PENDING state in modal)
  toggleGenre(genreId: number): void {
    const index = this.pendingSelectedGenres.indexOf(genreId);
    if (index > -1) {
      this.pendingSelectedGenres.splice(index, 1);
    } else {
      this.pendingSelectedGenres.push(genreId);
    }
    // Force change detection to update UI immediately
    this.cdr.detectChanges();
  }

  // Remove genre from active filters (from chip)
  removeGenre(genreId: number): void {
    this.selectedGenres = this.selectedGenres.filter((id) => id !== genreId);
    this.applyFiltersDirectly();
  }

  getGenreName(genreId: number): string {
    const genre = this.availableGenres.find((g) => g.id === genreId);
    return genre ? genre.name : '';
  }

  // Country
  removeCountry(): void {
    this.selectedCountry = '';
    this.applyFiltersDirectly();
  }

  getCountryName(code: string): string {
    const country = this.availableCountries.find((c) => c.code === code);
    return country ? country.name : code;
  }

  // Year
  removeYear(): void {
    this.selectedYear = '';
    this.applyFiltersDirectly();
  }

  // Min score
  removeMinScore(): void {
    this.minScore = 0;
    this.applyFiltersDirectly();
  }

  // Network
  removeNetwork(): void {
    this.selectedNetwork = '';
    this.applyFiltersDirectly();
  }

  getNetworkName(id: string): string {
    const network = this.availableNetworks.find((n) => n.id.toString() === id);
    return network ? network.name : id;
  }

  // Check if has active filters
  hasActiveFilters(): boolean {
    const hasGenres =
      this.selectedGenres.length > 0 &&
      !(
        this.mediaType === 'anime' &&
        this.selectedGenres.length === 1 &&
        this.selectedGenres[0] === 16
      );

    return (
      hasGenres ||
      !!this.selectedCountry ||
      !!this.selectedYear ||
      this.minScore > 0 ||
      !!this.selectedNetwork
    );
  }

  // Check if has pending filters
  hasPendingFilters(): boolean {
    const hasGenres =
      this.pendingSelectedGenres.length > 0 &&
      !(
        this.mediaType === 'anime' &&
        this.pendingSelectedGenres.length === 1 &&
        this.pendingSelectedGenres[0] === 16
      );

    return (
      hasGenres ||
      !!this.pendingSelectedCountry ||
      !!this.pendingSelectedYear ||
      this.pendingMinScore > 0 ||
      !!this.pendingSelectedNetwork
    );
  }

  // Get active filter count
  getActiveFilterCount(): number {
    let count = 0;

    const genreCount =
      this.mediaType === 'anime'
        ? Math.max(0, this.selectedGenres.length - 1)
        : this.selectedGenres.length;
    count += genreCount;

    if (this.selectedCountry) count++;
    if (this.selectedYear) count++;
    if (this.minScore > 0) count++;
    if (this.selectedNetwork) count++;
    return count;
  }

  // Apply filters from modal (copies pending to active)
  applyFilters(): void {
    this.selectedGenres = [...this.pendingSelectedGenres];
    this.selectedCountry = this.pendingSelectedCountry;
    this.selectedYear = this.pendingSelectedYear;
    this.minScore = this.pendingMinScore;
    this.selectedNetwork = this.pendingSelectedNetwork;

    this.closeFilterPanel();
    this.updateEndpoint();
    this.resetStateAndRefill();
  }

  // Apply filters directly (for chip removals)
  private applyFiltersDirectly(): void {
    this.updateEndpoint();
    this.resetStateAndRefill();
  }

  // Clear all filters (in modal - works with pending)
  clearAllFilters(): void {
    this.pendingSelectedGenres = this.mediaType === 'anime' ? [16] : [];
    this.pendingSelectedCountry = '';
    this.pendingSelectedYear = '';
    this.pendingMinScore = 0;
    this.pendingSelectedNetwork = '';
    this.cdr.detectChanges();
  }

  // Get effective sort by - builds the complete query string with filters
  getEffectiveSortBy(): string | undefined {
    if (this.sortMode !== 'discover') {
      return undefined;
    }

    // Create URLSearchParams to properly handle parameter encoding
    const searchParams = new URLSearchParams();

    // Add the sort_by parameter
    searchParams.set('sort_by', this.currentSortBy);

    // Add country filter (use ACTIVE filters, not pending)
    if (this.selectedCountry) {
      searchParams.set('with_origin_country', this.selectedCountry);
    }

    // Add year filter (different parameter names for movies vs TV)
    if (this.selectedYear) {
      if (this.mediaType === 'movie') {
        searchParams.set('primary_release_year', this.selectedYear);
        searchParams.set('year', this.selectedYear);
      } else {
        searchParams.set('first_air_date_year', this.selectedYear);
      }
    }

    // Add minimum score filter
    if (this.minScore > 0) {
      searchParams.set('vote_average.gte', this.minScore.toString());
      // Also add minimum vote count to get reliable ratings
      searchParams.set('vote_count.gte', '100');
    }

    // Add network filter - USE CORRECT IDS BASED ON MEDIA TYPE
    if (this.selectedNetwork) {
      const selectedNetworkObj = this.availableNetworks.find(
        (n) => n.id.toString() === this.selectedNetwork
      );

      if (selectedNetworkObj) {
        if (this.mediaType === 'movie') {
          // For MOVIES: use movieProviderId with watch_providers
          if (selectedNetworkObj.movieProviderId) {
            searchParams.set(
              'with_watch_providers',
              selectedNetworkObj.movieProviderId.toString()
            );
            searchParams.set('watch_region', 'US');
          }
        } else {
          // For TV/ANIME: use tvNetworkId with networks
          if (selectedNetworkObj.tvNetworkId) {
            searchParams.set(
              'with_networks',
              selectedNetworkObj.tvNetworkId.toString()
            );
          }
        }
      }
    }

    if (this.mediaType === 'anime') {
      searchParams.set('with_original_language', 'ja');
      searchParams.set('with_genres', '16');
    }

    // Return the encoded parameters string
    return searchParams.toString();
  }

  // Get effective genre ID - handles multiple genres
  getEffectiveGenreId(): number {
    if (this.mediaType === 'anime') return 16;
    if (this.sortMode === 'discover' && this.selectedGenres.length > 0) {
      return this.selectedGenres[0]; // Return first selected genre
    }
    return 0;
  }

  // Update endpoint
  private getEndpoint(): string {
    const isAnime = this.mediaType === 'anime';
    const baseMediaType = isAnime ? 'tv' : this.mediaType;

    switch (this.sortMode) {
      case 'discover':
        return `/discover/${baseMediaType}`;
      case 'trending':
        return `/trending/${baseMediaType}/week`;
      case 'topRated':
        return `/${baseMediaType}/top_rated`;
      case 'nowPlaying':
        return baseMediaType === 'movie'
          ? '/movie/now_playing'
          : '/tv/on_the_air';
      case 'upcoming':
        return baseMediaType === 'movie'
          ? '/movie/upcoming'
          : '/tv/airing_today';
      case 'airingToday':
        return '/tv/airing_today';
      case 'onTheAir':
        return '/tv/on_the_air';
      default:
        return `/discover/${baseMediaType}`;
    }
  }

  updateEndpoint(): void {
    this.mergedEndpoint = this.getEndpoint();
  }

  // Items filtered callback
  onItemsFiltered(event: {
    requested: number;
    received: number;
    displayed: number;
  }): void {
    const filteringReduction = event.requested - event.displayed;
    const significantReduction = filteringReduction > event.requested * 0.5;

    if (
      significantReduction &&
      !this.isLoading &&
      event.displayed < event.requested
    ) {
      setTimeout(() => {
        this.fillScreenIfNeeded();
      }, 200);
    }
  }

  // Reset state and refill
  private resetStateAndRefill(): void {
    this.tileLimit = INITIAL_TILE_LIMIT;
    this.initialFillAttempts = 0;
    this.lastLoadTime = 0;
    this.isLoading = false;

    if (this.mediaType === 'anime' && !this.selectedGenres.includes(16)) {
      this.selectedGenres = [16];
    }

    this.updateEndpoint();
    this.cdr.detectChanges();

    setTimeout(() => {
      this.fillScreenIfNeeded();
    }, 100);
  }

  // Check scroll
  private checkScroll(): void {
    window.requestAnimationFrame(() => {
      if (this.isLoading) return;

      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const now = Date.now();

      if (documentHeight <= windowHeight) {
        this.fillScreenIfNeeded();
      } else {
        if (now - this.lastLoadTime < this.scrollLoadCooldown) return;
        const scrollPosition = windowHeight + window.scrollY;
        if (scrollPosition >= documentHeight - this.scrollThreshold) {
          this.loadMore(false);
        }
      }
    });
  }

  // Fill screen if needed
  private fillScreenIfNeeded(): void {
    if (this.isLoading) return;

    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;

    if (documentHeight <= windowHeight) {
      if (this.initialFillAttempts < this.initialFillMaxAttempts) {
        this.initialFillAttempts++;
        this.loadMore(true);
      } else {
        this.initialFillAttempts = 0;
      }
    } else {
      this.initialFillAttempts = 0;
    }
  }

  // Load more
  private loadMore(isInitialFill: boolean): void {
    if (this.isLoading) return;

    this.lastLoadTime = Date.now();
    this.isLoading = true;
    this.tileLimit += TILE_LIMIT_INCREMENT;
    this.cdr.detectChanges();

    const currentCooldown = isInitialFill
      ? this.initialFillLoadCooldown
      : this.scrollLoadCooldown;

    setTimeout(() => {
      this.isLoading = false;
      this.cdr.detectChanges();

      if (isInitialFill) {
        this.fillScreenIfNeeded();
      } else {
        this.checkScroll();
      }
    }, currentCooldown);
  }
}
