import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'universal-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="open"
      class="fixed inset-0 z-50 flex items-center justify-center  bg-black/20"
      (click)="cancel.emit()"
    >
      <div
        class="bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-w-sm w-full p-6"
        (click)="$event.stopPropagation()"
      >
        <h3 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          {{ title }}
        </h3>
        <p class="mb-4 text-gray-700 dark:text-gray-300">{{ message }}</p>
        <ng-content></ng-content>
        <div *ngIf="!customButtons" class="flex justify-end gap-2 mt-4">
          <button
            (click)="cancel.emit()"
            class="cursor-pointer px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700"
          >
            {{ cancelLabel }}
          </button>
          <button
            (click)="confirm.emit()"
            class="cursor-pointer px-4 py-2 rounded-lg bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800 border border-blue-600 dark:border-blue-700"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class UniversalModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel: string = 'Confirm';
  @Input() cancelLabel: string = 'Cancel';
  @Input() customButtons: boolean = false; // If true, use <ng-content> for custom buttons
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
