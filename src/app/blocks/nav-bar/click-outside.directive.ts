import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  NgZone,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';

@Directive({
  selector: '[clickOutside]',
})
export class ClickOutsideDirective implements AfterViewInit, OnDestroy {
  @Output() clickOutside = new EventEmitter<void>();
  private listening = false;
  private timeoutId: any;

  constructor(private _elementRef: ElementRef, private ngZone: NgZone) {}

  ngAfterViewInit() {
    // Delay listening to avoid immediate close on open
    this.timeoutId = setTimeout(() => {
      this.listening = true;
    }, 100); // Increased delay to 100ms
  }

  ngOnDestroy() {
    clearTimeout(this.timeoutId);
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  onDocumentClick(event: MouseEvent | TouchEvent) {
    if (!this.listening) return;

    const target = event.target as Node;
    if (!this._elementRef.nativeElement.contains(target)) {
      this.ngZone.run(() => this.clickOutside.emit());
    }
  }
}
