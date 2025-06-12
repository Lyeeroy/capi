import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UniversalModalComponent } from '../../../forms/universal-modal.component';

@Component({
  selector: 'app-export',
  templateUrl: 'export.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule, UniversalModalComponent],
})
export class ExportComponent {
  constructor() {}

  @Input() isExportModalOpen: boolean = false;
  @Input() sources: any[] = [];
  @Output() isExportModalOpenEvent = new EventEmitter<boolean>();
  @Output() isExportModalOpenChange = new EventEmitter<boolean>();

  closeExportModal() {
    this.isExportModalOpen = false;
    this.isExportModalOpenEvent.emit(this.isExportModalOpen);
    this.isExportModalOpenChange.emit(this.isExportModalOpen);
  }

  textAreaValue: string = '';
  encodedVersion: boolean = false;

  exportDataText: string = '';

  encodedVersionChange() {
    this.encodedVersion = !this.encodedVersion;
  }

  textExportData() {
    const dataToExport = this.sources.map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      enabled: source.enabled,
    }));
    if (this.encodedVersion) {
      return this.shortenJsonData(dataToExport);
    } else {
      return JSON.stringify(dataToExport);
    }
  }

  shortenJsonData(jsonData: any[]): string {
    // TODO: implement this function to compress the data and return the compressed string
    return btoa(unescape(encodeURIComponent(JSON.stringify(jsonData))));
  }

  copyToClipboard(textArea: HTMLTextAreaElement) {
    navigator.clipboard.writeText(textArea.value);
  }

  showSubscribeWarningModal: boolean = false;

  handleSubscribeConfirm() {
    this.showSubscribeWarningModal = false;
    // Add logic to subscribe and replace sources here
  }

  handleSubscribeCancel() {
    this.showSubscribeWarningModal = false;
  }
}
