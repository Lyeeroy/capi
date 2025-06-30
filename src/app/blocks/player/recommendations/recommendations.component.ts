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
}

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, IconLibComponent],
  templateUrl: './recommendations.component.html',
})
export class RecommendationsComponent implements OnInit, OnChanges {
  @Input() seriesId: string = '';
  @Input() mediaType: 'tv' | 'movie' = 'tv';
  @Input() isExpanded: boolean = false;

  recommendations: RecommendationItem[] = [];
  isLoading: boolean = false;
  error: string = '';

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
}
