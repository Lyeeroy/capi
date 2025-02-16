import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBarComponent } from './blocks/side-bar/side-bar.component';
import { HeaderComponent } from './blocks/header/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SideBarComponent, HeaderComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'capi';
}
