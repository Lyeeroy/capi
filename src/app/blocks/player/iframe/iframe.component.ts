import { CommonModule } from '@angular/common';
import { Component, Input, ElementRef } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-iframe',
  template: `
    <ng-container *ngIf="showIframe">
      <iframe
        #iframeElement
        [src]="iframeUrl"
        class="w-full h-full aspect-video rounded-2xl"
        frameborder="0"
        allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      ></iframe>
    </ng-container>
  `,
  imports: [CommonModule],
})
export class IframeComponent {
  @Input() iframeUrl!: SafeResourceUrl;
  @Input() showIframe = false;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    const iframe = this.elementRef.nativeElement.querySelector('iframe');
    if (iframe) {
      iframe.onload = () => {
        this.showIframe = true;
      };
    }
  }
}
