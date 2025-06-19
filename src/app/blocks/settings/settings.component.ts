import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UniversalModalComponent } from '../../forms/universal-modal.component';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { ContinueWatchingService } from '../../services/continue-watching.service';

// Settings interface for future extensibility
interface AppSettings {
  playlistLayout: 'list' | 'grid' | 'poster' | 'compact';
  enableContinueWatching: boolean;
  enableScrollToEpisode: boolean;
  showWatchedEpisodes: boolean;
  // Add more settings here (e.g., darkMode: boolean)
}

const SETTINGS_KEY = 'appSettings';

// Event to notify components of settings changes
const SETTINGS_CHANGE_EVENT = 'appSettingsChanged';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, UniversalModalComponent, IconLibComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  isUniversalOpen = false;
  isUniversalOpenCW = false;
  // Settings state
  settings: AppSettings = {
    playlistLayout: 'list',
    enableContinueWatching: true,
    enableScrollToEpisode: true,
    showWatchedEpisodes: true,
    // Add more defaults here
  };

  constructor(private continueWatchingService: ContinueWatchingService) {
    this.loadSettings();
  }

  ngOnInit() {
    // Load settings from localStorage on init
    try {
      const raw = localStorage.getItem('appSettings');
      if (raw) {
        const loaded = JSON.parse(raw);
        this.settings = {
          ...this.settings,
          ...loaded,
        };
      }
    } catch {}
  }

  // Load settings from localStorage
  loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch {
      // Ignore errors, use defaults
    }
  }
  // Save settings to localStorage
  saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));

    // Dispatch custom event to notify other components
    window.dispatchEvent(
      new CustomEvent(SETTINGS_CHANGE_EVENT, {
        detail: this.settings,
      })
    );
  } // Handler for playlist layout change
  onPlaylistLayoutChange(layout: 'list' | 'grid' | 'poster' | 'compact') {
    this.settings.playlistLayout = layout;
    this.saveSettings();
  }

  onEnableContinueWatchingChange(value: boolean) {
    this.settings.enableContinueWatching = value;
    localStorage.setItem('appSettings', JSON.stringify(this.settings));
  }

  // Handler for scroll to episode change
  onEnableScrollToEpisodeChange(value: boolean) {
    this.settings.enableScrollToEpisode = value;
    this.saveSettings();
  }

  // Handler for show watched episodes change
  onShowWatchedEpisodesChange(value: boolean) {
    this.settings.showWatchedEpisodes = value;
    this.saveSettings();
  }

  handleUniversalConfirm() {
    this.isUniversalOpen = false;
    // Remove all items from localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        localStorage.removeItem(key);
      }
    }
    window.location.reload();
  }

  handleUniversalConfirmCW() {
    this.isUniversalOpenCW = false;
    localStorage.removeItem('continueWatching');
  }
}
