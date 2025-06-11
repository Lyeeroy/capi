import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { ExportComponent } from './export/export.component';
import { ImportComponent } from './import/import.component';
import { YnComponent } from '../../forms/yn.component';
import { IconLibComponent } from '../../svg-icons/icon-lib.component';
import { SourceSubscriptionService } from '../../services/source-subscription.service';
import { Router, RouterLink, RouterModule } from '@angular/router';

interface Source {
  id: number;
  name: string;
  url: string;
  isEditing: boolean;
  enabled: boolean;
  selected: boolean;
}

// To store the clean, saved state
type OriginalSource = Omit<Source, 'isEditing' | 'selected'>;

@Component({
  selector: 'app-table',
  standalone: true,
  templateUrl: './table.component.html',
  imports: [
    CommonModule,
    FormsModule,
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    ExportComponent,
    ImportComponent,
    YnComponent,
    IconLibComponent,
    RouterModule, // <-- add RouterModule for routerLink
  ],
})
export class TableComponent implements OnInit, OnDestroy {
  searchInput: string = '';
  sourceIndex: number = 1;
  sources: Source[] = [];
  private originalSources: OriginalSource[] = []; // For tracking unsaved changes (persistent part only)

  isAdding: boolean = false;
  newName: string = '';
  newUrl: string = '';

  isYnOpenDelete: boolean = false;
  YnTitleDelete: string = 'Delete all existing sources?';
  YnMessageDelete: string =
    'Are you sure you want to delete all sources? This action cannot be undone.';

  isYnOpenDiscard: boolean = false; // For discard confirmation
  YnTitleDiscard: string = 'Discard Unsaved Changes?';
  YnMessageDiscard: string =
    'Are you sure you want to discard all changes made since the last save? This action cannot be undone.';

  isSaving: boolean = false;
  hasUnsavedChanges: boolean = false;

  isExportModalOpen: boolean = false;
  isImportModalOpen: boolean = false;

  isMenuOpen = false;
  private menuTimeout: any;

  isAllSelected: boolean = false;
  isBulkEditingSelected: boolean = false; // For "Edit Selected" / "Done Editing Selected" button state

  private editCache = new Map<
    number,
    { name: string; url: string; enabled: boolean }
  >();

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    public sourceSub: SourceSubscriptionService, // <-- inject service
    private router: Router // <-- inject router
  ) {}

  ngOnInit(): void {
    this.loadData();
    document.addEventListener('click', this.closeMenuOutside);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.closeMenuOutside);
    clearTimeout(this.menuTimeout);
  }

  // --- Data Loading, Saving, and Change Tracking ---
  private _deepCloneSourcesForComparison(sources: Source[]): OriginalSource[] {
    return JSON.parse(
      JSON.stringify(
        sources.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          enabled: s.enabled,
        }))
      )
    );
  }

  private _checkForChanges(): void {
    const currentPersistentSources = this._deepCloneSourcesForComparison(
      this.sources
    );
    this.hasUnsavedChanges =
      JSON.stringify(currentPersistentSources) !==
      JSON.stringify(this.originalSources);
    this.cdr.detectChanges();
  }

  loadData(): void {
    const storedData = localStorage.getItem('sources');
    if (storedData) {
      const parsedOriginalSources: OriginalSource[] = JSON.parse(storedData);
      this.sources = parsedOriginalSources.map((s, index) => ({
        ...s,
        id: s.id || index + 1, // Ensure ID exists
        isEditing: false,
        selected: false,
      }));
      this.originalSources = this._deepCloneSourcesForComparison(this.sources); // Store clean state
    } else {
      this.sources = [];
      this.originalSources = [];
    }
    this._reIndexSources(); // Ensures IDs are consistent and sourceIndex is updated
    this.hasUnsavedChanges = false;
    this.isBulkEditingSelected = false;
    this.updateMasterCheckboxState();
    this.editCache.clear();
    this.isAdding = false;
  }

  saveData(): void {
    this.isSaving = true;
    this.sources.forEach((source) => {
      if (!source.name && source.url) {
        source.name = this.getDisplayName(source);
      }
      source.isEditing = false; // Ensure all editing states are cleared on save
      // source.selected remains as is, user might want to continue working with selection
    });
    this._reIndexSources();

    const dataToSave = this.sources.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      enabled: s.enabled,
    }));
    localStorage.setItem('sources', JSON.stringify(dataToSave));
    this.originalSources = this._deepCloneSourcesForComparison(this.sources); // Update baseline

    this.hasUnsavedChanges = false;
    this.isBulkEditingSelected = false; // Reset bulk edit state
    this.editCache.clear(); // Clear any pending individual edit caches

    setTimeout(() => {
      this.isSaving = false;
      this.cdr.detectChanges();
    }, Math.floor(Math.random() * (1000 - 400 + 1)) + 400);
  }

  discardChanges(): void {
    // Revert sources to the last saved state using originalSources
    this.sources = this.originalSources.map((original) => ({
      ...original,
      isEditing: false,
      selected: false,
    }));

    this._reIndexSources();

    // Reset transient UI states
    this.isAdding = false;
    this.newName = '';
    this.newUrl = '';
    this.editCache.clear();
    this.hasUnsavedChanges = false;
    this.isBulkEditingSelected = false;

    this.updateMasterCheckboxState();
    this.isYnOpenDiscard = false; // Close confirmation modal
    this.cdr.detectChanges();
  }

  handleYnAnswerForDiscard(answer: 'yes' | 'no'): void {
    if (answer === 'yes') {
      this.discardChanges();
    }
    this.isYnOpenDiscard = false;
  }

  // --- Source Manipulation ---
  private _reIndexSources(): void {
    this.sources.forEach((source, index) => {
      source.id = index + 1;
    });
    this.sourceIndex = this.sources.length + 1;
  }

  searchInObject(): Source[] {
    if (!this.searchInput.trim()) {
      return this.sources;
    }
    const searchTerm = this.searchInput.toLowerCase();
    return this.sources.filter(
      (source) =>
        source.url.toLowerCase().includes(searchTerm) ||
        source.name.toLowerCase().includes(searchTerm)
    );
  }

  onDrop(event: CdkDragDrop<Source[]>) {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    const filteredSources = this.searchInObject();
    const movedItem = filteredSources[event.previousIndex];
    const targetItem = filteredSources[event.currentIndex];

    const originalPreviousIndex = this.sources.findIndex(
      (s) => s.id === movedItem.id
    );
    const originalCurrentIndex = this.sources.findIndex(
      (s) => s.id === targetItem.id
    );

    if (originalPreviousIndex !== -1 && originalCurrentIndex !== -1) {
      moveItemInArray(
        this.sources,
        originalPreviousIndex,
        originalCurrentIndex
      );
      this._reIndexSources();
      this._checkForChanges();
    }
  }

  trackById(index: number, source: Source): number {
    return source.id;
  }

  startAdd(): void {
    this.isAdding = true;
    this.newName = '';
    this.newUrl = '';
  }

  cancelAdd(): void {
    this.isAdding = false;
  }

  confirmAdd(): void {
    const trimmedName = this.newName.trim();
    const trimmedUrl = this.newUrl.trim();

    if (trimmedUrl) {
      // URL is mandatory for a new source
      const newSource: Source = {
        id: 0,
        name: trimmedName || this.getDisplayName({ url: trimmedUrl } as Source),
        url: trimmedUrl,
        isEditing: false,
        enabled: true,
        selected: false,
      };
      this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
      this.sources = [newSource, ...this.sources];
      this._reIndexSources();
      this._checkForChanges();
    }
    this.isAdding = false;
  }

  getDisplayName(source: Partial<Source>): string {
    if (!source.url) return 'Unknown';
    try {
      const url = new URL(source.url);
      let hostname = url.hostname;
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      const parts = hostname.split('.');
      if (parts.length > 2) {
        if (
          parts[parts.length - 2].length <= 3 &&
          parts[parts.length - 1].length <= 3 &&
          parts.length > 2
        ) {
          return parts.slice(-3).join('.');
        }
        return parts.slice(-2).join('.');
      }
      return hostname;
    } catch (e) {
      const cleaned = source.url
        .replace(/^https?:\/\/(?:www\.)?/i, '')
        .split('/')[0];
      const domainParts = cleaned.split('.');
      return domainParts.length > 1
        ? domainParts.slice(0, 2).join('.')
        : cleaned;
    }
  }

  highlightUrl(url: string): SafeHtml {
    if (!url) return 'No URL provided';
    let highlighted = url;
    const replacements = [
      { regex: /(#type)/gi, class: 'bg-orange-100 text-orange-600' },
      { regex: /(#id)/gi, class: 'bg-blue-100 text-blue-600' },
      { regex: /(#season)/gi, class: 'bg-red-100 text-red-600' },
      { regex: /(#episode)/gi, class: 'bg-green-100 text-green-600' },
    ];
    replacements.forEach((rep) => {
      highlighted = highlighted.replace(
        rep.regex,
        `<span class="${rep.class} px-1 py-0.5 rounded font-semibold text-xs">$1</span>`
      );
    });
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  removeSource(sourceId: number): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    this.sources = this.sources.filter((source) => source.id !== sourceId);
    this._reIndexSources();
    this.updateMasterCheckboxState();
    this._checkForChanges();
  }

  editSource(source: Source): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    source.isEditing = false;
    this.editCache.delete(source.id);
    if (!source.name.trim() && !source.url.trim()) {
      this.removeSource(source.id); // This calls _checkForChanges
    } else {
      if (!source.name.trim() && source.url.trim()) {
        source.name = this.getDisplayName(source);
      }
      this._checkForChanges();
    }
  }

  toggleEditMode(source: Source): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    if (!source.isEditing) {
      this.editCache.set(source.id, {
        name: source.name,
        url: source.url,
        enabled: source.enabled,
      });
      source.isEditing = true;
    } else {
      this.editSource(source); // Effectively "save"
    }
  }

  cancelSourceEdit(source: Source): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    if (source.isEditing) {
      const cached = this.editCache.get(source.id);
      if (cached) {
        source.name = cached.name;
        source.url = cached.url;
        source.enabled = cached.enabled;
      }
      source.isEditing = false;
      this.editCache.delete(source.id);
      this._checkForChanges();
    }
  }

  toggleSource(source: Source): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    source.enabled = !source.enabled;
    this._checkForChanges();
  }

  // --- Selection Logic ---
  updateMasterCheckboxState(): void {
    const filteredSources = this.searchInObject();
    if (filteredSources.length === 0) {
      this.isAllSelected = false;
      return;
    }
    this.isAllSelected = filteredSources.every((s) => s.selected);
  }

  toggleSelectAll(): void {
    const filteredSources = this.searchInObject();
    filteredSources.forEach((s) => (s.selected = this.isAllSelected));
    this.onRowSelectionChange(); // To update bulk edit state if needed
  }

  onRowSelectionChange(): void {
    this.updateMasterCheckboxState();
    if (!this.anyRowsSelected() && this.isBulkEditingSelected) {
      this.isBulkEditingSelected = false;
    }
  }

  anyRowsSelected(): boolean {
    return this.sources.some((s) => s.selected);
  }

  // --- Bulk Actions ---
  isEditingAllVisible: boolean = false;
  editAllSources(): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    this.isEditingAllVisible = !this.isEditingAllVisible;
    this.searchInObject().forEach((source) => {
      if (this.isEditingAllVisible) {
        if (!source.isEditing) {
          this.editCache.set(source.id, {
            name: source.name,
            url: source.url,
            enabled: source.enabled,
          });
          source.isEditing = true;
        }
      } else {
        if (source.isEditing) {
          this.editSource(source);
        }
      }
    });
    this._checkForChanges();
  }

  toggleBulkEditSelected(): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    if (!this.anyRowsSelected()) return; // Should be disabled, but as a safeguard

    if (!this.isBulkEditingSelected) {
      // Action: "Edit Selected"
      let itemsPutToEdit = 0;
      this.searchInObject()
        .filter((s) => s.selected)
        .forEach((s) => {
          if (!s.isEditing) {
            this.editCache.set(s.id, {
              name: s.name,
              url: s.url,
              enabled: s.enabled,
            });
            s.isEditing = true;
            itemsPutToEdit++;
          }
        });
      if (itemsPutToEdit > 0) {
        this.isBulkEditingSelected = true;
        this._checkForChanges(); // isEditing state changed
      }
    } else {
      // Action: "Done Editing Selected"
      this.searchInObject()
        .filter((s) => s.selected && s.isEditing)
        .forEach((s) => {
          this.editSource(s); // This saves individual edit, sets isEditing = false, and calls _checkForChanges
        });
      this.isBulkEditingSelected = false;
      // _checkForChanges is handled by editSource calls.
    }
  }

  deleteSelectedSources(): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    this.sources = this.sources.filter((s) => !s.selected);
    this._reIndexSources();
    this.isAllSelected = false; // Master checkbox should be unchecked
    if (this.isBulkEditingSelected) {
      // If we were bulk editing, and deleted all, reset state
      this.isBulkEditingSelected = false;
    }
    this.updateMasterCheckboxState();
    this._checkForChanges();
  }

  removeAllSources(): void {
    this.sourceSub.unsubscribeFromDefaults(); // <-- auto-unsubscribe
    this.sources = [];
    this._reIndexSources();
    this.isAllSelected = false;
    this.isBulkEditingSelected = false;
    this.updateMasterCheckboxState();
    this._checkForChanges();
    this.isYnOpenDelete = false;
  }

  handleYnAnswerForDeleteSources(answer: 'yes' | 'no'): void {
    if (answer === 'yes') {
      this.removeAllSources();
    }
    this.isYnOpenDelete = false;
  }

  // --- Menu Logic ---
  showMenu(event?: Event): void {
    event?.stopPropagation();
    clearTimeout(this.menuTimeout);
    this.isMenuOpen = true;
  }

  hideMenu(): void {
    this.menuTimeout = setTimeout(() => {
      this.isMenuOpen = false;
      this.cdr.detectChanges();
    }, 200);
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenuOutside = (event?: MouseEvent): void => {
    // Make event optional for programmatic close
    // Basic check for menu open. More complex logic to check if click is outside menu can be added if needed.
    if (this.isMenuOpen) {
      // If event is provided, check if click was outside specific menu elements
      if (event) {
        const target = event.target as HTMLElement;
        const menuButton = document.getElementById('quickActionsButton'); // Add ID to button
        const menuDropdown = document.getElementById('quickActionsMenu'); // Add ID to menu
        if (menuButton && menuButton.contains(target)) return; // Click on button, let toggleMenu handle
        if (menuDropdown && menuDropdown.contains(target)) return; // Click inside menu
      }
      this.isMenuOpen = false;
      this.cdr.detectChanges();
    }
  };

  // --- Import/Export Modal Handling ---
  onImportModalChange(isOpen: boolean): void {
    this.isImportModalOpen = isOpen;
    if (!isOpen) {
      this.sources.forEach((s) => {
        s.isEditing = false;
        s.selected = false;
      });

      this._reIndexSources();
      this._checkForChanges();

      this.updateMasterCheckboxState();
      this.isBulkEditingSelected = false;
      this.cdr.detectChanges();
    }
  }

  onExportModalChange(isOpen: boolean): void {
    this.isExportModalOpen = isOpen;
  }

  // --- Subscription Logic ---
  subscribeToDefaultSources(): void {
    this.sourceSub.subscribeToDefaults();
    this.loadData();
    this.cdr.detectChanges();
  }

  unsubscribeFromDefaultSources(): void {
    this.sourceSub.unsubscribeFromDefaults();
    this.loadData();
    this.cdr.detectChanges();
  }

  get isSubscribed(): boolean {
    return this.sourceSub.isSubscribed();
  }

  // RemoveIsNewcomerFromLocalStorage is now handled by subscribeToDefaultSources
  removeIsNewcomerFromLocalStorage() {
    this.subscribeToDefaultSources();
  }

  openDocs(): void {
    this.router.navigate(['/table/docs']);
  }
}
