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
      return dataToExport;
    }
  }

  shortenJsonData(jsonData: any[]) {
    // Define replacements for common URL patterns and placeholders
    const urlReplacements: [string, string][] = [
      ['https://', 'a'], // Protocol
      ['http://', 'b'], // Unused but defined for completeness
      ['/embed/', 'c'], // Common path
      ['embed/', 'd'], // Alternate path format
      ['#type', 't'], // Placeholders
      ['#id', 'd'],
      ['#season', 's'],
      ['#episode', 'e'],
      ['?tmdb=', 'f'], // Query parameters
      ['&season=', 'g'],
      ['&episode=', 'h'],
      ['?type=', 'i'], // Additional parameter patterns
      ['&id=', 'j'],
      ['/embed', 'k'], // Path variations
      ['embed', 'l'],
      ['//', 'm'], // Reduce redundant slashes
      ['=', 'n'], // Frequently used characters
      ['&', 'o'],
      ['/', 'p'],
      ['-', 'q'],
    ];

    // Compress each source entry into a minimal string format
    const compressedString = jsonData
      .map((source) => {
        // Apply URL replacements
        let url = source.url;
        for (const [search, replace] of urlReplacements) {
          url = url.split(search).join(replace);
        }

        // Convert to compact format: id,name,url,enabled
        return `${source.id},${source.name},${url},${source.enabled ? 1 : 0}`;
      })
      .join(';'); // Use ';' to separate entries

    // Base64 encode the compressed string
    return btoa(compressedString);
  }
  copyToClipboard(textArea: HTMLTextAreaElement) {
    navigator.clipboard.writeText(textArea.value);
  }
}
