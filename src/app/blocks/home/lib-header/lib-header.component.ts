import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IconLibComponent } from '../../../svg-icons/icon-lib.component';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-header',
  standalone: true,
  imports: [IconLibComponent, RouterLink, CommonModule],
  template: `
    <div class="flex justify-between items-center p-4">
      <div class="flex items-center">
        <span
          class="bg-gray-100 border border-gray-200 rounded-lg p-2 mr-3 flex items-center justify-center"
          aria-hidden="true"
        >
          <app-icon-lib [ico]="icon" class="w-5 h-5"></app-icon-lib>
        </span>
        <div>
          <h2 class="text-base font-semibold">{{ title }}</h2>
          <p class="text-xs text-gray-600">{{ desc }}</p>
        </div>
      </div>
      <a
        *ngIf="actionLabel && actionHandler; else defaultAction"
        (click)="actionHandler()"
        class="text-sm text-gray-500 flex items-center cursor-pointer"
        [attr.aria-label]="actionLabel"
        style="user-select: none;"
      >
        {{ actionLabel }}
        <span class="ml-1">›</span>
      </a>
      <ng-template #defaultAction>
        <a
          routerLink="/discover"
          class="text-sm text-gray-500 flex items-center"
          [attr.aria-label]="'View all ' + title"
        >
          View All
          <span routerLinkActive="router-link-active" class="ml-1">›</span>
        </a>
      </ng-template>
    </div>
  `,
})
export class LibHeaderComponent {
  @Input() title!: string;
  @Input() icon!: string;
  @Input() desc!: string;
  @Input() actionLabel?: string;
  @Input() actionHandler?: () => void;
  @Output() clear = new EventEmitter<void>();
}
