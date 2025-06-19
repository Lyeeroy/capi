import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
} from '@angular/core';

@Directive({
  selector: '[clickOutside]',
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private _elementRef: ElementRef) {}

  @HostListener('document:mousedown', ['$event'])
  onMousedown(event: MouseEvent) {
    if (!this._elementRef.nativeElement.contains(event.target)) {
      this.clickOutside.emit();
    }
  }
}
