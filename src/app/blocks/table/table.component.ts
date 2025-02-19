import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  imports: [CommonModule],
})
export class TableComponent {
  sources: number[] = []; // Array to store sources

  addSource() {
    this.sources.unshift(this.sources.length + 1); // Insert at the beginning
  }
  trackByFn(index: number, item: number) {
    return item; // Helps Angular track items correctly
  }

  isModalVisible = false;
  isAdding = true;
  openOrClose: 'open' | 'close' = 'close';

  openModal(openOrClose: any) {
    console.log('openModal fired. var: ', this.openOrClose);
    if (this.openOrClose === 'close') {
      this.openOrClose = 'open';
      this.isModalVisible = true;
    } else if (this.openOrClose === 'open') {
      this.openOrClose = 'close';
      this.isModalVisible = false;
    }
  }
}
