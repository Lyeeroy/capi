import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule

interface Source {
  id: number;
  name: string;
  url: string;
  isEditing: boolean; // Add isEditing property
}

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
})
export class TableComponent {
  sourceIndex: number = 1;
  isSelected: boolean = false;
  sources: Source[] = [];

  addSource(): void {
    const newSource: Source = {
      id: this.sourceIndex++,
      name: '',
      url: '',
      isEditing: true, // Set isEditing to true for the new source
    };
    this.sources.push(newSource);
    console.log('Total sources:', this.sourceIndex - 1, ':)');
  }

  removeSource(sourceIndex: number): void {
    const index = this.sources.findIndex((source) => source.id === sourceIndex);
    console.log(index + 1, 'was removed :(');
    if (index !== -1) {
      this.sources.splice(index, 1);
    }
    this.reorganizeSourceIds();
  }

  removeAllSource() {
    this.sources = [];
    this.sourceIndex = 1;
  }

  reorganizeSourceIds(): void {
    this.sources.forEach((source, index) => {
      source.id = index + 1;
    });
    this.sourceIndex = this.sources.length + 1;
  }

  editSource(source: Source): void {
    source.isEditing = !source.isEditing; // Toggle isEditing for the specific source

    if (!source.isEditing) {
      // If exiting edit mode, check for empty fields
      if (!source.name && !source.url) {
        this.removeSource(source.id); // Remove if name and url are empty
      }
    }
  }

  shouldShowInput(source: Source): boolean {
    return source.isEditing; // Now checks source.isEditing
  }

  selectAll(): void {
    this.isSelected = !this.isSelected;
    console.log('isSelected:', this.isSelected);
  }
}
