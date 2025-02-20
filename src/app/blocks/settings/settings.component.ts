import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Source = {
  id: number;
  name: string;
  url: string;
  status: boolean;
};

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  isChecked: boolean = true;
  typedText: string | null = null;

  Ads() {
    if (this.isChecked === true) {
      console.log('is Not Checked ');
    } else console.log('is Checked ');
  }
  Typed() {
    console.log('Typed text: ', this.typedText);
  }
}
