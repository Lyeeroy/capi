import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-yn-modal',
  standalone: true,
  template: `
    <div
      *ngIf="isYnOpen"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <!-- Backdrop with blur effect -->
      <div
        class="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        (click)="closeYnModal()"
      ></div>

      <!-- Modal container with enter/exit transitions -->
      <div
        class="relative w-full max-w-md lg:max-w-2xl transform transition-all"
      >
        <div class="relative rounded-xl bg-white shadow-2xl">
          <!-- Modal header -->
          <div class="flex items-center justify-between p-6 pb-0">
            <h3 class="text-2xl font-bold text-slate-700">{{ title }}</h3>
            <button
              class="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="closeYnModal()"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Modal content -->
          <div class="p-6">
            <div class="space-y-4">
              <p class="text-sm text-slate-600">{{ message }}</p>
              <div class="flex items-center justify-center gap-4">
                <button
                  class="cursor-pointer w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 font-semibold text-white transition-all hover:from-green-600 hover:to-emerald-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  (click)="onYesClick()"
                >
                  Yes
                </button>
                <button
                  class="cursor-pointer w-full rounded-lg bg-gradient-to-r from-red-500 to-rose-600 px-6 py-3 font-semibold text-white transition-all hover:from-red-600 hover:to-rose-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  (click)="onNoClick()"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  imports: [CommonModule],
})
export class YnComponent {
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() isYnOpen: boolean = false;

  @Output() answerEvent = new EventEmitter<string>();

  @Output() isYnOpenChange = new EventEmitter<boolean>();
  @Output() isYnOpenEvent = new EventEmitter<boolean>();

  closeYnModal() {
    this.isYnOpen = false;
    this.isYnOpenChange.emit(this.isYnOpen);
    this.isYnOpenEvent.emit(this.isYnOpen);
  }

  onYesClick() {
    this.answerEvent.emit('yes');
    this.closeYnModal();
  }

  onNoClick() {
    this.answerEvent.emit('no');
    this.closeYnModal();
  }
}

/* usage:



html:
<!-- app.component.html -->
<app-yn-modal
  [title]="YnTitle"
  [message]="YnMessage"
  (answerEvent)="handleYnAnswer($event)"
  [(isYnOpen)]="isYnOpen"
></app-yn-modal>

ts:

 YnMessage: string = 'Do you like hot moms?';
  YnTitle: string = 'Are you sure?';
  handleYnAnswer(event: any) {
    // Handle the answer event here
    console.log('Yn answer:', event);
  }

    */
