import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBarComponent } from './blocks/side-bar/side-bar.component';
import { HeaderComponent } from './blocks/header/header.component';
import { NavBarComponent } from './blocks/nav-bar/nav-bar.component';
import { SourceSubscriptionService } from './services/source-subscription.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SideBarComponent, HeaderComponent, NavBarComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  title = 'capi';

  private themeService = inject(ThemeService);

  constructor(public sourceSub: SourceSubscriptionService) {}

  ngOnInit(): void {
    this.sourceSub.initSubscriptionState();
    // If no themeMode is set, default to 'system' (which will use system dark mode if set)
    const saved = localStorage.getItem('themeMode');
    if (!saved) {
      this.themeService.setThemeMode('system');
    } else {
      this.themeService.setThemeMode(this.themeService.getCurrentTheme().mode);
    }
  }
}
