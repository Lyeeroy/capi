import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Source {
  id: number;
  name: string;
  url: string;
  isEditing: boolean;
}

@Component({
  selector: 'app-table',
  standalone: true,
  templateUrl: './table.component.html',
  imports: [CommonModule, FormsModule],
})
export class TableComponent {
  sourceIndex: number = 1;
  isSelected: boolean = false;
  sources: Source[] = [];
  isAdding: boolean = false;
  newName: string = '';
  newUrl: string = '';

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

  // Function to handle display logic
  getDisplayName(source: Source): string {
    // Remove protocol and www subdomain
    const cleaned = source.url
      .replace(/^https?:\/\/(?:www\.)?/i, '')
      .split('/')[0]; // Remove any paths after domain

    // Split domain parts and take first two segments
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

  selectAll(): void {
    this.isSelected = !this.isSelected;
  }

  removeAllSources(): void {
    this.sources = [];
    this.sourceIndex = 1;
  }
}
