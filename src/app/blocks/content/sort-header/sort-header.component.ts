import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sort-header',
  templateUrl: './sort-header.component.html',
  imports: [CommonModule, FormsModule],
  standalone: true
})
export class SortHeaderComponent {
  @Input() mediaType: 'movie' | 'tv' = 'movie';
  @Output() genreId = new EventEmitter<number>();
  @Output() sortParam = new EventEmitter<string>();


  private readonly movieGenreMap = {
    'Action': 28,
    'Adventure': 12,
    'Animation': 16,
    'Comedy': 35,
    'Crime': 80,
    'Documentary': 99,
    'Drama': 18,
    'Family': 10751,
    'Fantasy': 14,
    'History': 36,
    'Horror': 27,
    'Music': 10402,
    'Mystery': 9648,
    'Romance': 10749,
    'Science Fiction': 878,
    'Thriller': 53,
    'War': 10752,
    'Western': 37
  };

  private readonly tvGenreMap = {
    'Action & Adventure': 10759,
    'Animation': 16,
    'Comedy': 35,
    'Crime': 80,
    'Documentary': 99,
    'Drama': 18,
    'Family': 10751,
    'Kids': 10762,
    'Mystery': 9648,
    'News': 10763,
    'Reality': 10764,
    'Sci-Fi & Fantasy': 10765,
    'Soap': 10766,
    'Talk': 10767,
    'War & Politics': 10768,
    'Western': 37
  };

  // Dynamic genre list based on media type
  get filteredGenres(): string[] {
    return this.mediaType === 'movie' 
      ? Object.keys(this.movieGenreMap) 
      : Object.keys(this.tvGenreMap);
  }

  onGenreSelected(genre: string) {
    const genreMap = this.mediaType === 'movie' 
      ? this.movieGenreMap 
      : this.tvGenreMap;
      const id = genreMap[genre as keyof typeof genreMap];

    if (id) {
      this.genreId.emit(id);
      console.log(`Selected ${this.mediaType} genre: ${genre} (ID: ${id})`);
    } else {
      console.warn(`Unknown ${this.mediaType} genre: ${genre}`);
    }
  }

  
  // New method for sort selection
  onSortSelected(sortValue: string) {
    this.sortParam.emit(sortValue);
    console.log(`Selected sort: ${sortValue}`);
  }
}