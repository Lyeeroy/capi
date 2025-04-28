import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-info',
  templateUrl: 'info.component.html',
  imports: [CommonModule],
})
export class InfoComponent implements OnInit {
  constructor() {}

  @Input() names: string = '';
  @Input() totalSeasons: number[] = [];
  @Input() currentSeason: number = 1;
  @Input() currentEpisodes: { number: number; name: string }[] = [];
  @Input() currentPosters: string[] = [];
  @Input() episodeData: any[] = [];
  @Input() responseData: any = null;

  ngOnInit() {}
}
