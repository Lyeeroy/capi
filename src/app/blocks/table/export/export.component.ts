import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-export',
  templateUrl: 'export.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule],
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

  exportDataText: string = '';

  exportData() {
    const dataToExport = this.sources.map((source) => ({
      name: source.name,
      url: source.url,
    }));
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(dataToExport));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'sources.json');
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  copyToClipboard() {
    const textArea = document.createElement('textarea');
    textArea.value = this.exportDataText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
}
