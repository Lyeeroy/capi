import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UniversalModalComponent } from '../../forms/universal-modal.component';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { ContinueWatchingService } from '../../services/continue-watching.service';

// Settings interface for future extensibility
interface AppSettings {
  playlistLayout: 'list' | 'grid' | 'poster' | 'compact';
  enableContinueWatching: boolean;
  enableScrollToEpisode: boolean;
  enableWatchedEpisodes: boolean;
  // Add more settings here (e.g., darkMode: boolean)
}

const SETTINGS_KEY = 'appSettings';

// Event to notify components of settings changes
const SETTINGS_CHANGE_EVENT = 'appSettingsChanged';

@Component({
  selector: 'app-settings',
  imports: [
    CommonModule,
    FormsModule,
    UniversalModalComponent,
    IconLibComponent,
  ],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  isUniversalOpen = false;
  isUniversalOpenCW = false;
  isUniversalOpenWatched = false; // modal for watched episodes
  // Settings state
  settings: AppSettings = {
    playlistLayout: 'list',
    enableContinueWatching: true,
    enableScrollToEpisode: true,
    enableWatchedEpisodes: true,
    // Add more defaults here
  };

  isGeneralExpanded = true;
  isPlaylistExpanded = true;
  isDangerExpanded = true;

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

  // Handler for watched episodes feature toggle
  onEnableWatchedEpisodesChange(value: boolean) {
    this.settings.enableWatchedEpisodes = value;
    this.saveSettings();
  }

  // Clear all watched episodes data
  clearAllWatchedEpisodes() {
    this.isUniversalOpenWatched = true;
  }

  handleUniversalConfirmWatched() {
    this.isUniversalOpenWatched = false;
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage);
      // Remove all watched episodes keys
      keys.forEach((key) => {
        if (key.startsWith('watched_episodes_')) {
          localStorage.removeItem(key);
        }
      });
      // Notify that settings changed to refresh components
      this.saveSettings();
    } catch (error) {
      console.error('Error clearing all watched episodes:', error);
    }
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

  // Scroll to section by id with smooth behavior
  scrollToSection(event: Event, sectionId: string) {
    event.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleSection(section: 'general' | 'playlist' | 'danger') {
    if (section === 'general') this.isGeneralExpanded = !this.isGeneralExpanded;
    if (section === 'playlist')
      this.isPlaylistExpanded = !this.isPlaylistExpanded;
    if (section === 'danger') this.isDangerExpanded = !this.isDangerExpanded;
  }
}
