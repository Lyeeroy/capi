// This file is deprecated and replaced by universal-modal.component.ts
// Safe to delete after migration to UniversalModalComponent is complete.

// src/app/forms/yn.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-yn-modal',
  standalone: true,
  template: `
    <div
      *ngIf="isYnOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-labelledby="yn-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop with blur effect -->
      <div
        class="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        (click)="closeYnModal('backdrop')"
        aria-hidden="true"
      ></div>

      <!-- Modal container -->
      <div
        class="relative w-full max-w-md transform transition-all bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        <!-- Modal header -->
        <div
          class="flex items-start justify-between p-5 border-b border-gray-200"
        >
          <h3 class="text-xl font-semibold text-gray-800" id="yn-modal-title">
            {{ title }}
          </h3>
          <button
            type="button"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
            (click)="closeYnModal('close-button')"
            aria-label="Close modal"
          >
            <svg
              class="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </div>

        <!-- Modal content -->
        <div class="p-6 space-y-6">
          <p class="text-base leading-relaxed text-gray-600">{{ message }}</p>
        </div>

        <!-- Modal footer -->
        <div
          class="flex items-center justify-end p-4 space-x-2 border-t border-gray-200 rounded-b"
        >
          <button
            (click)="onNoClick()"
            type="button"
            class="text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
          >
            No
          </button>
          <button
            (click)="onYesClick()"
            type="button"
            class="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  `,
  imports: [CommonModule],
})
export class YnComponent {
  @Input() title: string = 'Confirmation'; // Default title
  @Input() message: string = 'Are you sure?'; // Default message
  @Input() isYnOpen: boolean = false;

  // Use specific type for better clarity in parent component
  @Output() answerEvent = new EventEmitter<'yes' | 'no'>();
  // Needed for the [(isYnOpen)] two-way binding syntax sugar
  @Output() isYnOpenChange = new EventEmitter<boolean>();

  closeYnModal(source: 'backdrop' | 'close-button' | 'action') {
    // Optionally handle different close sources if needed
    this.isYnOpen = false;
    this.isYnOpenChange.emit(this.isYnOpen);
    // We don't emit 'no' on backdrop/close button click unless explicitly desired
  }

  onYesClick() {
    this.answerEvent.emit('yes');
    this.closeYnModal('action');
  }

  onNoClick() {
    this.answerEvent.emit('no');
    this.closeYnModal('action');
  }
}

/* --- Usage Example Update ---

Make sure the parent component handles the event with the correct type:

// parent.component.ts
isYnOpen = false;
YnTitle = 'Proceed?';
YnMessage = 'Do you really want to do this?';

handleYnAnswer(answer: 'yes' | 'no') { // <-- Use specific type here
  console.log('Yn answer:', answer);
  if (answer === 'yes') {
    // Perform action
  } else {
    // Handle 'no' or cancellation
  }
}

// parent.component.html
<button (click)="isYnOpen = true">Show Modal</button>

<app-yn-modal
  [title]="YnTitle"
  [message]="YnMessage"
  (answerEvent)="handleYnAnswer($event)"
  [(isYnOpen)]="isYnOpen"
></app-yn-modal>

*/
