import { AfterViewInit, Component } from '@angular/core';
import { ApiService } from 'src/app/api.service';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { element } from 'protractor';
import { ElementSchemaRegistry } from '@angular/compiler';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit {

  constructor(private apiService: ApiService) {  }

  private map:any;

  lastTwoWeeks = [];
  trafficData = [];
  dataTo:Date = new Date();
  dataFrom:Date = new Date();

  markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
  //   iconCreateFunction: function(cluster) {
	// 	var childCount = cluster.getChildCount();

	// 	var c = ' marker-cluster-';
	// 	if (childCount < 10) {
	// 		c += 'small';
	// 	} else if (childCount < 100) {
	// 		c += 'medium';
	// 	} else {
	// 		c += 'large';
	// 	}

	// 	return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster marker-cluster' + c, iconSize: new L.Point(50, 50) });
	// }
  });

  constructionSiteIcon = L.icon({
    iconUrl: 'assets/200px-Construction.png',
    iconSize:     [50, 44], // size of the icon
    iconAnchor:   [25, 22], // point of the icon which will correspond to marker's location
    popupAnchor:  [0, -24] // point from which the popup should open relative to the iconAnchor
  });

  dangerIcon = L.icon({
    iconUrl: 'assets/200px-Danger.png',
    iconSize:     [50, 44], // size of the icon
    iconAnchor:   [25, 22], // point of the icon which will correspond to marker's location
    popupAnchor:  [0, -24] // point from which the popup should open relative to the iconAnchor
  });

  trafficJamIcon = L.icon({
    iconUrl: 'assets/200px-Traffic-Jam.png',
    iconSize:     [50, 44], // size of the icon
    iconAnchor:   [25, 22], // point of the icon which will correspond to marker's location
    popupAnchor:  [0, -24] // point from which the popup should open relative to the iconAnchor
  });

  roadClosureIcon = L.icon({
    iconUrl: 'assets/200px-Closure.png',
    iconSize:     [50, 50], // size of the icon
    iconAnchor:   [25, 25], // point of the icon which will correspond to marker's location
    popupAnchor:  [0, -27] // point from which the popup should open relative to the iconAnchor
  });

  ngAfterViewInit(): void {
    this.dataFrom.setDate(this.dataFrom.getDate()-14);
    this.initMap();
  }

  addEvent(event: MatDatepickerInputEvent<Date>) {
    this.makeData();
  }
  
  private initMap(): void {
    this.map = L.map('map', {
      center: [ 52.518426, 13.404950 ],
      zoom: 12
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 10,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    tiles.addTo(this.map);

    this.makeData();
  }

  makeData()
  {

    let dataFromFormatted = this.dataFrom.toISOString().slice(0, 10);
    let dataToFormatted = this.dataTo.toISOString().slice(0, 10);
    this.fetchData(this.apiService.fetchFromTo(dataFromFormatted, dataToFormatted).subscribe((data:any[])=>{ 
       console.log("Data Length " + data.length);
      this.trafficData = data;})).then(value => {
      //console.log("LastTwoWeeks Length " + this.lastTwoWeeks.length);

      this.addMarkers();
    })
  }
  
  fetchData(x)      //resumes after 1 sec
  {
    return new Promise(resolve => {
      setTimeout(() => {
      resolve(x);
      }, 2000);
      });
  }

  addMarkers()
  {
    this.trafficData.forEach(element => {
      if (element != null){
        let cause = "";
        let popUpContent = "<p>";
        if(element.consequence.summary != null)
          popUpContent += "<b>" + element.name + "</b>";
          cause = element.consequence.summary;
        if(element.streets != null)
          popUpContent += "<b> - " + element.streets[0] + "</b>";
        if(element.section != null)
          popUpContent += "<br><br>" + element.section;
        if(element.description != null)
          popUpContent += "<br><br>" + element.description;
        if(element.validities[0] != null)
          popUpContent += "<br><br>Von: " + element.validities[0].timeFrom
                        + "<br>Bis: " + element.validities[0].timeTo;
        popUpContent += "</p>";

        let icon = null;
        if(cause == "Sperrung")
          icon = this.roadClosureIcon;
        else if(cause == "Baustelle" || cause == "Bauarbeiten")
          icon = this.constructionSiteIcon;        
        else if(cause == "Stau")
          icon = this.trafficJamIcon;
        else //if(element.name == "Gefahr" || element.name == "Unfall")
          icon = this.dangerIcon;
        if(element.location != null){
          let marker = this.addMarker(element.location.coordinates[1], element.location.coordinates[0], icon);
          marker.bindPopup(popUpContent, {className: "popup"});
          this.markers.addLayer(marker);
        }
      }
    });
    this.map.addLayer(this.markers)
  }

  addMarker(x:number, y:number, icon:any) {
    if(icon == null)
      return L.marker([x, y]);
    else
      return L.marker([x, y], {icon: icon});
  }
}