import { Component, EventEmitter, OnInit, Input } from '@angular/core';
import { TmdbService } from '../../services/tmdb.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-content-tabs',
  templateUrl: './content-tabs.component.html',
  imports: [CommonModule, RouterModule],
  standalone: true,
})
export class ContentTabsComponent implements OnInit {
  @Input() trending: any[] = [];
  @Input() type: 'movie' | 'tv' = 'movie';

  constructor(private tmdbService: TmdbService, private router: Router) {}

  ngOnInit() {
    if (this.type) {
      this.tmdbService
        .callAPI(
          'https://api.themoviedb.org/3',
          `/trending/${this.type}/week`,
          this.type
        )
        .subscribe((data) => {
          console.log(this.type, 'data:', data);
          this.trending = data.results;
        });
    }
  }

  redirectToPlayer(index: number): void {
    const selectedItem = this.trending[index];
    this.router.navigate(['/player', selectedItem.id, this.type]);
  }
}
