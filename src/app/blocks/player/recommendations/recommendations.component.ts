import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { TmdbService } from '../../../services/tmdb.service';
import { Router } from '@angular/router';

interface RecommendationItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  media_type: 'tv' | 'movie';
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  genre_ids?: number[];
  genres?: string[];
}

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, IconLibComponent],
  templateUrl: './recommendations.component.html',
})
export class RecommendationsComponent implements OnInit, OnChanges {
  @Input() hideHeader: boolean = false;
  @Input() seriesId: string = '';
  @Input() mediaType: 'tv' | 'movie' = 'tv';
  @Input() isExpanded: boolean = false;
  @Input() panelHeight?: number;

  recommendations: RecommendationItem[] = [];
  isLoading: boolean = false;
  error: string = '';
  expandedDescriptions: Set<number> = new Set();
  expandedItems: Set<number> = new Set();

  // Genre mappings for TMDB
  private movieGenres: { [key: number]: string } = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
  };

  private tvGenres: { [key: number]: string } = {
    10759: 'Action & Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    10762: 'Kids',
    9648: 'Mystery',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    37: 'Western',
  };

  constructor(private tmdbService: TmdbService, private router: Router) {}

  ngOnInit() {
    if (this.seriesId) {
      this.loadRecommendations();
    }
    // Auto-expand for movies
    if (this.mediaType === 'movie') {
      this.isExpanded = true;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['seriesId'] && !changes['seriesId'].firstChange) {
      this.loadRecommendations();
    }
    // Auto-expand for movies when media type changes
    if (changes['mediaType'] && this.mediaType === 'movie') {
      this.isExpanded = true;
    }
  }

  loadRecommendations() {
    if (!this.seriesId) return;

    this.isLoading = true;
    this.error = '';

    const endpoint = `/${this.mediaType}/${this.seriesId}/recommendations`;

    this.tmdbService.fetchFromTmdb(endpoint, { page: '1' }).subscribe({
      next: (response) => {
        this.recommendations = response.results
          .slice(0, 10) // Limit to 10 recommendations
          .map((item: any) => ({
            ...item,
            media_type: item.media_type || this.mediaType,
            genres: this.mapGenres(
              item.genre_ids || [],
              item.media_type || this.mediaType
            ),
          }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading recommendations:', error);
        this.error = 'Failed to load recommendations';
        this.isLoading = false;
      },
    });
  }

  toggleExpansion() {
    this.isExpanded = !this.isExpanded;
  }

  navigateToItem(item: RecommendationItem) {
    if (item.media_type === 'movie') {
      this.router.navigate([`/player/${item.id}/movie`]);
    } else {
      this.router.navigate([`/player/${item.id}/tv`], {
        queryParams: { season: 1, episode: 1 },
      });
    }
  }

  getDisplayTitle(item: RecommendationItem): string {
    return item.title || item.name || 'Unknown Title';
  }

  getYear(item: RecommendationItem): string {
    const date = item.release_date || item.first_air_date;
    return date ? new Date(date).getFullYear().toString() : '';
  }

  trackByFn(index: number, item: RecommendationItem): number {
    return item.id;
  }

  mapGenres(genreIds: number[], mediaType: string): string[] {
    const genreMap = mediaType === 'movie' ? this.movieGenres : this.tvGenres;
    return genreIds
      .slice(0, 3)
      .map((id) => genreMap[id])
      .filter(Boolean);
  }

  toggleDescription(itemId: number): void {
    if (this.expandedDescriptions.has(itemId)) {
      this.expandedDescriptions.delete(itemId);
    } else {
      this.expandedDescriptions.add(itemId);
    }
  }

  isDescriptionExpanded(itemId: number): boolean {
    return this.expandedDescriptions.has(itemId);
  }

  toggleItemExpansion(itemId: number): void {
    if (this.expandedItems.has(itemId)) {
      this.expandedItems.delete(itemId);
    } else {
      this.expandedItems.add(itemId);
    }
  }

  isItemExpanded(itemId: number): boolean {
    return this.expandedItems.has(itemId);
  }
}
