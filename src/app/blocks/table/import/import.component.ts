import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UniversalModalComponent } from '../../../forms/universal-modal.component';

@Component({
  selector: 'app-import',
  templateUrl: 'import.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule, UniversalModalComponent],
})
export class ImportComponent {
  @Input() isImportModalOpen: boolean = false;
  @Input() sources: any[] = [];

  @Output() sourcesEvent = new EventEmitter<any[]>();
  @Output() sourcesChange = new EventEmitter<any[]>();

  @Output() isImportModalOpenEvent = new EventEmitter<boolean>();
  @Output() isImportModalOpenChange = new EventEmitter<boolean>();

  importData: string = '';

  showOverwriteModal: boolean = false;
  pendingImportData: any = null;
  overwriteMode: 'replace' | 'append' | null = null;

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
      parsedImportData.map((source: any) => this.sources.push(source));
      this.closeImportModal();
    } else {
      this.pendingImportData = parsedImportData;
      this.showOverwriteModal = true;
    }
  }

  handleOverwriteConfirm(replace: boolean) {
    if (replace) {
      this.sources.splice(0, this.sources.length, ...this.pendingImportData);
    } else {
      this.pendingImportData.map((source: any) => this.sources.push(source));
    }
    this.showOverwriteModal = false;
    this.pendingImportData = null;
    this.closeImportModal();
  }

  handleOverwriteCancel() {
    this.showOverwriteModal = false;
    this.pendingImportData = null;
  }
}
