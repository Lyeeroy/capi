// icon-lib.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-icon-lib',
  template: `<span [innerHTML]="sanitizedIcon"></span>`,
})
export class IconLibComponent implements OnInit {
  @Input() ico: string = '';
  @Input() class: string = '';

  icons: { [key: string]: string } = {
    arrowLeft: `<svg class="{{ class }}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>`,
    arrowRight: `<svg class="{{ class }}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`,
    menu: `<svg class="{{ class }}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    sort: `<svg class="{{ class }}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>`,
    play: `<svg class="{{ class }}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>`,
    chevronDown: `<svg class="{{ class }}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`,
  };

  sanitizedIcon: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.updateIcon();
  }

  ngOnChanges(): void {
    this.updateIcon();
  }

  updateIcon() {
    let svgString = this.icons[this.ico];
    if (svgString) {
      const classAttribute = this.class ? `class="${this.class}"` : '';
      svgString = svgString.replace('class="{{ class }}"', classAttribute);
      this.sanitizedIcon = this.sanitizer.bypassSecurityTrustHtml(svgString);
    } else {
      this.sanitizedIcon = ''; // Or a default icon/error message
    }
  }
}
