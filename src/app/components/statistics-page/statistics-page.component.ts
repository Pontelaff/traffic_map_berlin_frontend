import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/api.service';
import { ChartStackedEvents } from './chart-types/chart-stacked-events';
import { ChartStackedDuration } from './chart-types/chart-stacked-duration';
import { ChartRadarEvents } from './chart-types/chart-radar-events';
import { ChartBubbleEvents } from './chart-types/chart-bubble-events';

import * as Chart from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

interface chartSelect {
  selector: number;
  viewValue: string;
  chart: any;
}

@Component({
  selector: 'app-statistics-page',
  templateUrl: './statistics-page.component.html',
  styleUrls: ['./statistics-page.component.css']
})
export class StatisticsPageComponent implements OnInit {

  minDate = new Date(2010, 0, 1);
  maxDate = new Date(2029, 11, 31);
  currDateStart = new Date();
  currDateEnd = new Date();

  allDistricts: string[] = ["Mitte", "Friedrichshain-Kreuzberg", "Pankow", "Charlottenburg-Wilmersdorf", "Spandau", "Steglitz-Zehlendorf", 
                            "Tempelhof-Schöneberg", "Neukölln", "Treptow-Köpenick", "Marzahn-Hellersdorf", "Lichtenberg", "Reinickendorf"];
  allEvents: string[] = ["Bauarbeiten", "Baustelle", "Fahrstreifensperrung","Gefahr", "Sperrung", "Störung", "Unfall"];
  allTimeSteps: number[] = [0, 2, 4, 8, 16];
  allPercentiles: number[] = [20, 40, 60, 80, 100];

  switches: any[] = [null, null];
  btnDurColor = "primary";
  btnPctColor = "white";
  cachedOpMode = 0;
  
  chartList: chartSelect[] = [
    {selector: 0, viewValue: 'Störungsdauer (Farbe)', chart: null},
    {selector: 1, viewValue: 'Störungsarten (Farbe)', chart: null},
    {selector: 2, viewValue: 'Störungsarten (Radar)', chart: null},
    {selector: 3, viewValue: 'Störungsarten (Blasen)', chart: null},
    {selector: 4, viewValue: '[temp]', chart: null}
  ];
  selection: chartSelect;
  
  selectedChartIndex: number;
  cachedChartIndex: number;
  queriesCompleted: number;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void 
  {
    this.currDateStart = new Date(2020, 3, 1);
    this.currDateEnd = new Date(2020, 6, 1);

    this.queriesCompleted = 0;

    /* determine min and max dates from database for date pickers */
    this.apiService.fetchFirstRelevantDate().subscribe((data:string)=>{
      this.minDate = new Date(data);
    });
    
    this.apiService.fetchLastRelevantDate().subscribe((data:string)=>{
      this.maxDate = new Date(data);
    });

    this.switches[0] = document.getElementById("btnDuration");
    this.switches[1] = document.getElementById("btnPercentile");
  }

  userClick() 
  {
    if(this.selectedChartIndex == undefined)
    {
      console.log("No chart selected");
      return;
    }

    if(this.selectedChartIndex != this.cachedChartIndex)    //only create new chart if type doesn't match currently displayed one
    {    
      this.cachedChartIndex = this.selectedChartIndex;        //update currently displayed chart index
      if(this.selection != undefined)         //destroy chart if doesn't exist
        this.selection.chart.destroy();
      this.createChart(this.selectedChartIndex);
    }
    else
      this.selection.chart.clearData();

    this.toggleContainer("yAxisConf");
      
    this.makeData();
  }

  toggleContainer(ctx: string)
  {
    let container = document.getElementById(ctx);
    if(this.selectedChartIndex == 0)
      container.style.display = "block";
    else
      container.style.display = "none";
  }

  userSwitch(switchId: number)
  {
    let reference: number[] = [];

    /* highlight selected button, adjust values in input boxes */
    if(switchId == 0)
    {
      this.btnDurColor = "primary";
      this.btnPctColor = "white";
      reference = this.allTimeSteps;
    }
    else
    {
      this.btnDurColor = "white";
      this.btnPctColor = "primary";
      reference = this.allPercentiles;
    }
  
    this.cachedOpMode = switchId;

    for(let idx = 0; idx < reference.length; idx++)
    {
      let ctx: string = "i" + idx;
      let val: unknown = reference[idx];
      (<HTMLInputElement>document.getElementById(ctx)).value = <string>val;
      (<HTMLInputElement>document.getElementById(ctx)).min = "0";
      (<HTMLInputElement>document.getElementById(ctx)).max = "100";
    }

    for(let idx = 1; idx < reference.length; idx++)
    {
      let ctx: string = "i" + idx;
      let val: unknown = reference[idx - 1];
      (<HTMLInputElement>document.getElementById(ctx)).min = <string>val;
    }

    for(let idx = 0; idx < reference.length - 1; idx++)
    {
      let ctx: string = "i" + idx;
      let val: unknown = reference[idx + 1];
      (<HTMLInputElement>document.getElementById(ctx)).max = <string>val;
    }
  }

  createChart(chartIndex: number)
  {
    this.selection = this.chartList[chartIndex];
    let ctx = document.getElementById('canvas') as HTMLCanvasElement;    //get html context

    switch(chartIndex)
    {
      case 0: { this.selection.chart = new ChartStackedDuration(ctx, this.allDistricts, this.allEvents); this.selection.chart.setOpMode(this.cachedOpMode); break; }
      case 1: { this.selection.chart = new ChartStackedEvents(ctx, this.allDistricts, this.allEvents); break; }
      case 2: { this.selection.chart = new ChartRadarEvents(ctx, this.allDistricts, this.allEvents); break; }
      case 3: { this.selection.chart = new ChartBubbleEvents(ctx, this.allDistricts, this.allEvents); break; }
      default: { console.log("Chart creation not available"); break; }
    }

    this.selection.chart.create();
  }

  makeData()
  {
    let startString = this.currDateStart.toISOString().slice(0, 10);
    let endString = this.currDateEnd.toISOString().slice(0, 10);

    if(this.selectedChartIndex < 0 || this.selectedChartIndex > 3)
    {
      console.log("Selection invalid");
      return;
    }

    this.generalUpdateRoutine(startString, endString, this.selectedChartIndex); 
  }

  generalUpdateRoutine(start: string, end: string, chartIdx: number)
  {
    if(this.selectedChartIndex == 0)
    {
      this.selection.chart.setOpMode(this.cachedOpMode);
      let intervals = [];
      intervals.length = this.allTimeSteps.length;
      for(let idx = 0; idx < this.allTimeSteps.length; idx++)
      {
        let ctx: string = "i" + idx;
        let val:unknown = (<HTMLInputElement>document.getElementById(ctx)).value;
        intervals[idx] = <number>val;
      }
      this.selection.chart.setIntervals(intervals);
    }

    console.log(this.allTimeSteps);
        
    this.selection.chart.indicateBusy();

    this.queriesCompleted = 0;

    for(let districtIdx = 0; districtIdx < this.allDistricts.length; districtIdx++)
    {
      this.apiService.fetchTimeframeFromDistrict(start, end, this.allDistricts[districtIdx]).subscribe((data:any[])=>{
        
        this.selection.chart.addData(data, districtIdx);

        this.queriesCompleted++;
        this.updateSelected(); 
      });
    }
  }

  updateSelected()
  {
    if(this.queriesCompleted != this.allDistricts.length)
      return;
    
    this.selection.chart.update();
  }
}
