import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'selector-name',
  templateUrl: 'export.component.html',
  standalone: true,
  imports: [FormsModule],
})
export class ExportComponent implements OnInit {
  constructor() {}
  ngOnInit() {}

  isExportModalOpen: boolean = false;
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
