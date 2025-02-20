import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule

interface Source {
  id: number;
  name: string;
  url: string;
  status: boolean;
}

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
})
export class TableComponent {
  sources: Source[] = []; // Array to store sources as objects

  newSource: Source = { id: 0, name: '', url: '', status: true }; // Model for new/edited source
  editingSourceId: number | null = null; // Track ID of source being edited

  isModalVisible: boolean = false;
  isSelected: boolean = false;
  isAdding: boolean = true;
  openOrClose: 'open' | 'close' = 'close';

  addSource(): void {
    this.isAdding = true; // Set mode to adding
    this.editingSourceId = null; // Reset editing ID
    this.newSource = {
      id: this.sources.length + 1,
      name: '',
      url: '',
      status: true,
    }; // Initialize newSource for adding, default status to true
    this.openModal('open'); // Open modal for adding
  }

  saveSource(): void {
    if (!this.newSource.name && !this.newSource.url) {
      this.closeModal(); // Close modal if both name and url are empty
      return; // Do not add if no data provided
    }

    if (this.isAdding) {
      this.sources.unshift({
        ...this.newSource,
        id:
          this.sources.length > 0
            ? Math.max(...this.sources.map((s) => s.id)) + 1
            : 1,
      }); // Add new source to the beginning with a new ID
    } else if (this.editingSourceId !== null) {
      const index: number = this.sources.findIndex(
        (source) => source.id === this.editingSourceId
      );
      if (index > -1) {
        this.sources[index] = { ...this.newSource, id: this.editingSourceId }; // Update existing source
      }
    }
    this.closeModal(); // Close modal after saving
  }

  trackByFn(index: number, item: Source): number {
    return item.id; // Track items by their unique ID
  }

  openModal(openOrClose: 'open' | 'close'): void {
    console.log('openModal fired. var: ', this.openOrClose);
    if (this.openOrClose === 'close') {
      this.openOrClose = 'open';
      this.isModalVisible = true;
    }
  }

  closeModal(): void {
    this.openOrClose = 'close';
    this.isModalVisible = false;
    this.newSource = { id: 0, name: '', url: '', status: true }; // Reset newSource when modal closes, default status to true
    this.editingSourceId = null;
  }

  editSource(source: Source): void {
    console.log('Edit source: ', source);
    this.isAdding = false; // Set mode to editing
    this.editingSourceId = source.id; // Store the ID of the source being edited
    this.newSource = { ...source }; // Populate modal form with source data
    this.openModal('open'); // Open modal for editing
  }

  deleteSource(source: Source): void {
    const index: number = this.sources.findIndex((s) => s.id === source.id);
    if (index > -1) {
      this.sources.splice(index, 1); // Remove the element at the specified index
    }
  }

  toggleStatus(source: Source): void {
    source.status = !source.status;
    console.log(`Source ${source.id} status toggled to ${source.status}`);
  }

  selectAll(): void {
    console.log('checkboxes should be all checked now');
    if (this.isSelected === false) {
      this.isSelected = true;
    } else this.isSelected = false;
  }
}
