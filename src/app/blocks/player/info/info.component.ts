import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { Episode } from '../playlist/playlist.component';

@Component({
  selector: 'app-info',
  templateUrl: 'info.component.html',
  standalone: true,
  imports: [CommonModule, IconLibComponent],
})
export class InfoComponent implements OnInit {
  constructor() {}

  @Input() names: string = '';
  @Input() totalSeasons: number[] = [];
  @Input() currentSeason: number = 1;
  @Input() currentEpisodes: Episode[] = [];
  @Input() currentPosters: string[] = [];
  @Input() episodeData: any[] = [];
  @Input() responseData: any = null;
  @Input() mediaType: string = '';

  @Output() close = new EventEmitter<void>();

  isMouseOutside = false;

  ngOnInit() {}

  @HostListener('document:keydown.escape', ['$event'])
  handleEscKey(event: KeyboardEvent) {
    this.close.emit();
  }

  handleMouseMovement(event: MouseEvent) {
    // Get the main content container
    const mainContent = document.querySelector('.info-main-content');
    if (!mainContent) return;

    // Get the boundaries of the main content
    const rect = mainContent.getBoundingClientRect();
    
    // Check if the mouse is outside the main content area
    this.isMouseOutside = (
      event.clientX < rect.left - 20 || 
      event.clientX > rect.right + 20 || 
      event.clientY < rect.top - 20 || 
      event.clientY > rect.bottom + 20
    );
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.handleMouseMovement(event);
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    // Get the main content container and modal container
    const mainContent = document.querySelector('.info-main-content');
    if (!mainContent) return;

    // Get the click target
    const target = event.target as HTMLElement;
    
    // Don't close if clicking inside the main content or on the close button
    if (target.closest('.info-main-content') || target.closest('button')) {
      return;
    }

    // Get the boundaries of the main content
    const rect = mainContent.getBoundingClientRect();
    
    // Check if the click is outside the main content area
    if (
      event.clientX < rect.left - 20 || 
      event.clientX > rect.right + 20 || 
      event.clientY < rect.top - 20 || 
      event.clientY > rect.bottom + 20
    ) {
      this.close.emit();
    }
  }
}
