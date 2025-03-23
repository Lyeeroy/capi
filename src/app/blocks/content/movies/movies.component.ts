import { Component } from '@angular/core';
import { ContentTabsComponent } from '../../../components/content-tabs/content-tabs.component';

@Component({
  selector: 'app-movies',
  templateUrl: './movies.component.html',
  standalone: true,
  imports: [ContentTabsComponent],
})
export class MoviesComponent {}

// // src/app/blocks/content/movies/movies.component.ts
// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { TmdbService } from '../../../services/tmdb.service';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-movies',
//   templateUrl: './movies.component.html',
//   imports: [CommonModule],
// })
// export class MoviesComponent implements OnInit {
//   names: string[] = [];
//   background: string[] = [];
//   rating: string[] = [];
//   ids: number[] = [];
//   mediaTypes: string[] = [];
//   IMG_TMDB_URL = 'https://image.tmdb.org/t/p/w500';

//   constructor(private tmdbService: TmdbService, private router: Router) {}

//   ngOnInit(): void {
//     this.tmdbService
//       .callAPI('https://api.themoviedb.org/3', '/trending/movie/week', 'movie')
//       .subscribe((response) => {
//         this.rating = response.results.map(
//           (result: any) => result.vote_average
//         );
//         this.ids = response.results.map((result: any) => result.id);
//         this.mediaTypes = response.results.map(
//           (result: any) => result.media_type || 'movie'
//         );

//         const mediaType = response.results[0]?.media_type;
//         if (mediaType === 'tv') {
//           this.names = response.results.map((result: any) => result.name);
//         } else {
//           this.names = response.results.map((result: any) => result.title);
//         }
//         this.background = response.results.map(
//           (result: any) => result.poster_path
//         );
//       });
//   }

//   redirectToPlayer(index: number) {
//     this.router.navigate(['/player', this.ids[index], this.mediaTypes[index]], {
//       queryParams: { name: this.names[index] }, // Pass the name in the URL
//     });
//   }
// }
