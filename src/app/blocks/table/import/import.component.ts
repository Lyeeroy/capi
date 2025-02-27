import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-import',
  templateUrl: 'import.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule],
})
export class ImportComponent {
  @Input() isImportModalOpen: boolean = false;
  @Input() sources: any[] = [];

  @Output() isImportModalOpenEvent = new EventEmitter<boolean>();
  @Output() isImportModalOpenChange = new EventEmitter<boolean>();

  importData: string = '';

  constructor() {}

  ngOnInit(): void {
    if (this.sources.length === 0) {
      console.log('array is empty bro');
    } else console.log('array is not empty');

    console.log('sources:', this.sources);
  }

  importDataViaModal() {
    //1. if local storage sources is already filled, ask first if he wants to erase data
    //2. if local storage sources is empty do not ask and skip to 3.

    if (this.sources.length === 0) {
      console.log('var is empty');
    } else {
      console.log('var is not empty');
      // TODO: Remove all sources toast window
      return;
    }
    //2. if local storage sources is empty do not ask and skip to 3.

    //3. import data
  }

  closeImportModal() {
    this.isImportModalOpen = false;
    this.isImportModalOpenEvent.emit(this.isImportModalOpen);
    this.isImportModalOpenChange.emit(this.isImportModalOpen);
  }

  saveImport() {
    // TODO: implement import logic
    this.closeImportModal();
  }
}
