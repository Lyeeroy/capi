import { Component } from '@angular/core';
import { ContentTabsComponent } from '../../../components/content-tabs/content-tabs.component';
import { SortHeaderComponent } from '../sort-header/sort-header.component';

@Component({
  selector: 'app-movies',
  templateUrl: './movies.component.html',
  standalone: true,
  imports: [ContentTabsComponent, SortHeaderComponent],
})
export class MoviesComponent {}
