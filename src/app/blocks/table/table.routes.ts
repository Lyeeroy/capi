import { Routes } from '@angular/router';
import { TableComponent } from './table.component';
import { TableDocsComponent } from './docs/table-docs.component';

export const TABLE_ROUTES: Routes = [
  {
    path: '',
    component: TableComponent,
  },
  {
    path: 'docs',
    component: TableDocsComponent,
  },
];