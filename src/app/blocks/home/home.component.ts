import { Component } from '@angular/core';
import { CarouselComponent } from './carousel/carousel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CarouselComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  mediaItems = [
    {
      backdropUrl: 'placebear.com/400/300',
      title: 'The Shawshank Redemption',
      releaseDate: '1994-09-23',
      mediaType: 'movie',
      overview:
        'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    },
  ];
}
