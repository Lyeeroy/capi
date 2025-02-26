import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { findIndex } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
  DragDrop,
} from '@angular/cdk/drag-drop';

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
  imports: [CommonModule, FormsModule, CdkDrag, CdkDragHandle, CdkDropList],
})
export class TableComponent {
  searchInput: string = '';
  sourceIndex: number = 1;
  isSelected: boolean = false;
  sources: Source[] = [];
  isAdding: boolean = false;
  newName: string = '';
  newUrl: string = '';
  showConfirmation: boolean = false;

  isSaving: boolean = false;

  //menu:
  isMenuOpen = false;
  private timeout: any;

  constructor(private sanitizer: DomSanitizer) {
    this.loadData();
  }

  searchInObject(): Source[] {
    return this.sources.filter(
      (source) =>
        source.url.includes(this.searchInput) ||
        source.name.includes(this.searchInput)
    );
  }

  onDrop(event: CdkDragDrop<any[]>) {
    const filteredSources = this.searchInObject();

    // Get actual items from original sources array
    const movedItem = filteredSources[event.previousIndex];
    const targetItem = filteredSources[event.currentIndex];

    // Find their positions in the original array
    const previousIndex = this.sources.indexOf(movedItem);
    const currentIndex = this.sources.indexOf(targetItem);

    if (previousIndex !== -1 && currentIndex !== -1) {
      // Move item in the original sources array
      moveItemInArray(this.sources, previousIndex, currentIndex);

      // Reassign IDs based on new positions
      this.sources.forEach((source, index) => {
        source.id = index + 1;
      });

      this.sourceIndex = this.sources.length + 1; // Update for new items
    }
  }

  trackById(index: number, source: Source): number {
    return source.id;
  }

  isExportModalOpen: boolean = false;
  exportData(): void {
    this.isExportModalOpen = !this.isExportModalOpen;
  }

  exportDataText: string = '';
  decodeExportData(): void {
    this.isExportModalOpen = !this.isExportModalOpen;
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

  highlightUrl(url: string): SafeHtml {
    if (!url) {
      return url;
    }
    let highlighted = url;
    highlighted = highlighted.replace(
      /(#type)/gi,
      '<span class="bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-semibold text-xs">$1</span>'
    );
    highlighted = highlighted.replace(
      /(#id)/gi,
      '<span class="bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-semibold text-xs">$1</span>'
    );
    highlighted = highlighted.replace(
      /(#season)/gi,
      '<span class="bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold text-xs">$1</span>'
    );
    highlighted = highlighted.replace(
      /(#episode)/gi,
      '<span class="bg-green-100 text-green-600 px-2 py-1 rounded-full font-semibold text-xs">$1</span>'
    );

    // Bypass Angular's security to safely bind the generated HTML.
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
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
    this.saveData();
  }
  // menu
  showMenu(event?: Event): void {
    event?.stopPropagation();
    clearTimeout(this.timeout);
    this.isMenuOpen = true;
  }

  hideMenu(): void {
    this.timeout = setTimeout(() => (this.isMenuOpen = false), 200);
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu = () => (this.isMenuOpen = false);
  // -----
  confirmDelete(): void {
    this.showConfirmation = false;
    this.removeAllSources();
  }

  cancelDelete(): void {
    this.showConfirmation = false;
  }

  saveData(): void {
    this.sources.forEach((source) => {
      if (!source.name) {
        source.name = this.getDisplayName(source);
      }
    });
    localStorage.setItem('sources', JSON.stringify(this.sources));
    console.log('Saving data...');

    this.isSaving = true;
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      this.isSaving = false;
    }, Math.floor(Math.random() * (1420 - 420 + 1)) + 420);
  }

  loadData(): void {
    const storedData = localStorage.getItem('sources');
    if (storedData) {
      this.sources = JSON.parse(storedData);
      if (this.sources.length > 0) {
        // Set sourceIndex to the highest existing ID + 1
        this.sourceIndex = Math.max(...this.sources.map((s) => s.id)) + 1;
      }
    }
    console.log('Loading data...');
  }
}
