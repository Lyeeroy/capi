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

  @Output() sourcesEvent = new EventEmitter<any[]>();
  @Output() sourcesChange = new EventEmitter<any[]>();

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

  closeImportModal() {
    this.isImportModalOpen = false;
    this.isImportModalOpenEvent.emit(this.isImportModalOpen);
    this.isImportModalOpenChange.emit(this.isImportModalOpen);
  }

  // TODO: replace confirm with better solution
  saveImport() {
    let parsedImportData;
    try {
      parsedImportData = JSON.parse(this.importData);
    } catch (e) {
      try {
        parsedImportData = JSON.parse(atob(this.importData));
      } catch (e) {
        console.error(
          'Failed to parse import data as JSON or decode from base64',
          e
        );
        alert('Import data is not valid JSON or base64 encoded JSON.');
        return;
      }
    }

    if (this.sources.length === 0) {
      console.log('var is empty');
      parsedImportData.map((source: any) => this.sources.push(source));
    } else {
      console.log('var is not empty');
      if (
        confirm(
          'Existing sources found. Overwrite all? (OK = replace, Cancel = append)'
        )
      ) {
        console.log('overwrite');
        this.sources.splice(0, this.sources.length, ...parsedImportData);
      } else {
        console.log('append');
        parsedImportData.map((source: any) => this.sources.push(source));
      }
    }
    this.closeImportModal();
  }
}
