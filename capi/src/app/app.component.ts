import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBarComponent } from './blocks/side-bar/side-bar.component';
import { HeaderComponent } from './blocks/header/header.component';
import { CardComponent } from './blocks/card/card.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SideBarComponent, HeaderComponent, CardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'capi';
}
