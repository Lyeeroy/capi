import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBarComponent } from './blocks/side-bar/side-bar.component';
import { HeaderComponent } from './blocks/header/header.component';
import { NavBarComponent } from './blocks/nav-bar/nav-bar.component';
import { SourceSubscriptionService } from './services/source-subscription.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SideBarComponent, HeaderComponent, NavBarComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  title = 'capi';

  constructor(public sourceSub: SourceSubscriptionService) {}

  ngOnInit(): void {
    this.sourceSub.initSubscriptionState();
  }
}
