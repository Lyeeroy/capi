import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-table-docs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './table-docs.component.html',
})
export class TableDocsComponent {}
