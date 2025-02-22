import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { findIndex } from 'rxjs';

interface Source {
  id: number;
  name: string;
  url: string;
  isEditing: boolean;
  enabled: boolean;
}

@Component({
  selector: 'app-table',
  standalone: true,
  templateUrl: './table.component.html',
  imports: [CommonModule, FormsModule],
})
export class TableComponent {
  searchInput: string = '';
  sourceIndex: number = 1;
  isSelected: boolean = false;
  sources: Source[] = [];
  isAdding: boolean = false;
  newName: string = '';
  newUrl: string = '';

  // table.component.ts
  searchInObject(): Source[] {
    return this.sources.filter(
      (source) =>
        source.url.includes(this.searchInput) ||
        source.name.includes(this.searchInput)
    );
  }

  trackById(index: number, source: Source): number {
    return source.id;
  }

  startAdd(): void {
    this.isAdding = true;
    this.newName = '';
    this.newUrl = '';
  }

  cancelAdd(): void {
    this.isAdding = false;
  }

  getDisplayName(source: Source): string {
    const cleaned = source.url
      .replace(/^https?:\/\/(?:www\.)?/i, '')
      .split('/')[0];
    const domainParts = cleaned.split('.');
    return domainParts.slice(0, 2).join('.');
  }

  confirmAdd(): void {
    if (this.newName.trim() || this.newUrl.trim()) {
      this.sources = [
        {
          id: this.sourceIndex++,
          name: this.newName,
          url: this.newUrl,
          isEditing: false,
          enabled: true,
        },
        ...this.sources,
      ];
    }
    this.isAdding = false;
  }

  removeSource(sourceId: number): void {
    this.sources = this.sources.filter((source) => source.id !== sourceId);
  }

  editSource(source: Source): void {
    source.isEditing = !source.isEditing;

    if (!source.isEditing) {
      if (!source.name.trim() && !source.url.trim()) {
        this.removeSource(source.id);
      }
    }
  }

  toggleSource(source: Source): void {
    source.enabled = !source.enabled;
    console.log('Toggled source:', source.enabled);
  }

  selectAll(): void {
    this.isSelected = !this.isSelected;
  }

  removeAllSources(): void {
    this.sources = [];
    this.sourceIndex = 1;
  }
}
