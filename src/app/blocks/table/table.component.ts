import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule

interface Source {
  id: number;
  name: string;
  url: string;
}

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  imports: [CommonModule, FormsModule], // Add FormsModule to imports
})
export class TableComponent {
  // sourceCounter:
  sourceIndex: number = 1;
  //isSelected:
  isSelected: boolean = false;
  //addSource:
  sources: Source[] = [];

  sourcesTotal: number[] = [];

  addSource(): void {
    this.sources.push({
      id: this.sourceIndex++,
      name: '?',
      url: 'http://example.com/1',
    });
    console.log('Total sources:', this.sourceIndex - 1, ':)');
  }

  removeSource(sourceIndex: number): void {
    const index = this.sources.findIndex((source) => source.id === sourceIndex);
    console.log(index + 1, 'was removed :(');
    if (index !== -1) {
      this.sources.splice(index, 1);
    }
    //go through an object variable (forEach) and reorganize the id when 1 is removed
    this.sources.forEach((source, index) => {
      source.id = index + 1;
    });
    this.sourceIndex = this.sources.length + 1; //gotta push +1 because it goes from 0
  }

  removeAllSource() {
    this.sources = [];
    this.sourceIndex = 1;
  }

  selectAll(): void {
    this.isSelected = !this.isSelected;
    console.log('isSelected:', this.isSelected);
  }
}
