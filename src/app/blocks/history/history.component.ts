import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HistoryService, HistoryEntry } from '../../services/history.service';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, IconLibComponent],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css'],
})
export class HistoryComponent implements OnInit {
  groupedHistory: { [key: string]: HistoryEntry[] } = {};
  dateKeys: string[] = [];
  isLoading = true;

  constructor(private historyService: HistoryService, private router: Router) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.isLoading = true;
    setTimeout(() => {
      this.groupedHistory = this.historyService.getGroupedHistory();
      this.dateKeys = Object.keys(this.groupedHistory).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );
      this.isLoading = false;
    }, 100);
  }

  navigateToItem(entry: HistoryEntry) {
    this.router.navigate(['/player', entry.tmdbID, entry.mediaType]);
  }

  removeFromHistory(entry: HistoryEntry, dateKey: string) {
    const dayEntries = this.groupedHistory[dateKey];
    const index = dayEntries.findIndex(
      (item) =>
        item.tmdbID === entry.tmdbID &&
        item.mediaType === entry.mediaType &&
        item.season === entry.season &&
        item.episode === entry.episode &&
        item.deletedAt === entry.deletedAt
    );

    if (index !== -1) {
      // Calculate the global index
      let globalIndex = 0;
      for (const key of this.dateKeys) {
        if (key === dateKey) {
          globalIndex += index;
          break;
        }
        globalIndex += this.groupedHistory[key].length;
      }

      this.historyService.removeEntry(globalIndex);
      this.loadHistory();
    }
  }

  clearAllHistory() {
    if (
      confirm(
        'Are you sure you want to clear all history? This action cannot be undone.'
      )
    ) {
      this.historyService.clearAll();
      this.loadHistory();
    }
  }

  getDisplayTitle(entry: HistoryEntry): string {
    return this.historyService.getDisplayTitle(entry);
  }

  getTimeAgo(timestamp: number): string {
    return this.historyService.getTimeAgo(timestamp);
  }

  getReasonText(reason: string): string {
    switch (reason) {
      case 'completed':
        return 'Completed';
      case 'manual':
        return 'Manually removed';
      case 'overflow':
        return 'Auto-removed (list full)';
      default:
        return 'Removed';
    }
  }

  getReasonIcon(reason: string): string {
    switch (reason) {
      case 'completed':
        return 'checkCircle';
      case 'manual':
        return 'times';
      case 'overflow':
        return 'archive';
      default:
        return 'history';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  }

  getWatchedPercentageText(percentage?: number): string {
    if (!percentage) return '';
    return `${Math.round(percentage)}% watched`;
  }

  trackByFn(index: number, entry: HistoryEntry): string {
    return `${entry.tmdbID}-${entry.mediaType}-${entry.season || 0}-${
      entry.episode || 0
    }-${entry.deletedAt}`;
  }
}
