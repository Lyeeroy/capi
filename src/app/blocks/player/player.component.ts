// src/app/blocks/player/player.component.ts
import { Component, OnInit, Renderer2, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';

import { TmdbService } from '../../services/tmdb.service';
import { LoadSourcesService } from './player.service';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  standalone: true,
  imports: [CommonModule],
  providers: [LoadSourcesService],
})
export class PlayerComponent implements OnInit {
  id: number | null = null;
  mediaType: string | null = null;
  names: string | null = null;
  seasonNumber: number | null = 0;
  totalSeasons: number[] = [];
  episodeNames: { [key: number]: { number: number; name: string }[] } = {};
  episodePosters: { [key: number]: string[] } = {};
  currentEpisodes: { number: number; name: string }[] = [];
  currentPosters: string[] = [];
  layoutType: 'list' | 'grid' | 'poster' = 'list';
  sources: any = [];

  currentSeason: number = 1;
  currentEpisode: number = 1;
  iframeUrl: SafeResourceUrl;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private tmdbService: TmdbService,
    private renderer: Renderer2,
    private el: ElementRef,
    private loadSourcesService: LoadSourcesService,
    private sanitizer: DomSanitizer
  ) {
    this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      this.mediaType = params.get('mediaType');
      this.names = this.route.snapshot.queryParams['name'];
      this.initializeData();
      this.loadSourcesService.loadSources().then(() => {
        this.sources = this.loadSourcesService.sources;
        console.log('component sources: ', this.sources);
      });
    });
  }

  initializeData() {
    if (this.mediaType === 'tv' && this.id !== null) {
      this.tmdbService
        .callAPI('https://api.themoviedb.org/3', `/tv/${this.id}`, 'tv')
        .subscribe((response) => {
          if (response?.number_of_seasons) {
            this.seasonNumber = response.number_of_seasons;
            this.getAllSeasonData();
          }
        });
    }
  }

  getAllSeasonData() {
    if (this.seasonNumber) {
      const seasonObservables = Array.from(
        { length: this.seasonNumber },
        (_, i) =>
          this.tmdbService.callAPI(
            'https://api.themoviedb.org/3',
            `/tv/${this.id}/season/${i + 1}`,
            'tv'
          )
      );

      forkJoin(seasonObservables).subscribe(
        (responses) => {
          responses.forEach((response, index) => {
            if (response?.episodes) {
              this.totalSeasons.push(index + 1);
              this.episodeNames[index + 1] = response.episodes.map(
                (episode: any, episodeIndex: number) => ({
                  number: episodeIndex + 1,
                  name: episode.name,
                })
              );
              this.episodePosters[index + 1] = response.episodes.map(
                (episode: any) =>
                  episode.still_path
                    ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
                    : 'https://miro.medium.com/v2/resize:fit:300/0*E6pTrKTFvvLDOzzj.png'
              );
            }
          });
          this.updateCurrentEpisodes(1);
          console.log('Seasons:', this.totalSeasons);
          console.log('Episode Names:', this.episodeNames);
        },
        (error) => console.error('Error fetching season data:', error)
      );
    }
  }

  playEpisode(index: number) {
    this.currentEpisode = index + 1;
    this.updateCurrentEpisodes(this.currentSeason);
    this.iframeUrl = this.translateIntoIframe(this.sources[0].url);
    console.log('Current iframe URL:', this.iframeUrl);
  }

  onSeasonChange(event: Event) {
    this.currentSeason = Number((event.target as HTMLSelectElement).value);
    this.updateCurrentEpisodes(this.currentSeason);
    this.iframeUrl = this.translateIntoIframe(this.sources[0].url);
    console.log('Current iframe URL:', this.iframeUrl);
  }

  onSourceChange(event: any) {
    const selectedSource = event.target.value;
    console.log('Selected source:', selectedSource);
    this.iframeUrl = this.translateIntoIframe(selectedSource);
  }

  translateIntoIframe(url: string): SafeResourceUrl {
    const mediaTypeValue = this.mediaType || 'tv';
    let newUrl = url
      .replace(/#type/g, mediaTypeValue)
      .replace(/#id/g, this.id?.toString() || '');

    if (mediaTypeValue === 'tv') {
      newUrl = newUrl
        .replace(/#season/g, this.currentSeason.toString())
        .replace(/#episode/g, this.currentEpisode.toString());
    } else {
      newUrl = newUrl.replace(/#season/g, '').replace(/#episode/g, '');
    }
    newUrl = newUrl.replace(/\/+$/, '');
    console.log('Translated iframe URL:', newUrl);
    return this.sanitizer.bypassSecurityTrustResourceUrl(newUrl);
  }

  updateCurrentEpisodes(seasonNumber: number) {
    if (this.episodeNames[seasonNumber] && this.episodePosters[seasonNumber]) {
      this.currentEpisodes = this.episodeNames[seasonNumber];
      this.currentPosters = this.episodePosters[seasonNumber];
    }
  }

  ascOrDescSort() {
    this.currentEpisodes.reverse();
    this.currentPosters.reverse();
  }

  cancel() {
    this.location.back();
  }

  changeLayout() {
    this.layoutType =
      this.layoutType === 'list'
        ? 'grid'
        : this.layoutType === 'grid'
        ? 'poster'
        : 'list';
  }
}
