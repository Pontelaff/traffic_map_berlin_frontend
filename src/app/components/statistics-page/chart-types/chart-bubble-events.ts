import * as Chart from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChartBase } from './chartBase'


interface Bubble {
    x: number,
    y: number,
    r: number
}

export class ChartBubbleEvents extends ChartBase {

    maxBubbleRadius: number = 50;


    containerSetup()
    {
        this.initContainer3D(2, this.relevantEvents.length, this.allDistricts.length);
    }

    addData(incomingData: any, districtIdx: number)
    {
        incomingData.forEach(entry => {
        for(let eventIdx = 0; eventIdx < this.allEvents.length; eventIdx++)
        {
            if(this.allEvents[eventIdx] == entry.consequence.summary)
            {
                /*fill occurence data*/
                let relevantIdx = this.eventsToRelevantMap[eventIdx];
                this.data[0][relevantIdx][districtIdx]++;

                /*fill duration data*/
                let dateFrom = entry.validities[0].timeFrom;
                let dateTo = entry.validities[0].timeTo;
                let diffMinutes = this.calculateTimespanInMinutes(new Date(dateFrom), new Date(dateTo));
                this.data[1][relevantIdx][districtIdx] += diffMinutes;
            }
        }
        });
    }

    determineMaximum(data: any)
    {
        let max = 0;
        data.forEach(element => {
            element.forEach(element => {
                if(element > max)
                max = element;
            });
        });

        return max;
    }

    update()
    {
        let occurenceData = this.data[0];
        let maxOccurences = this.determineMaximum(occurenceData);
        if(maxOccurences == 0)
            maxOccurences = 1;

        let durationData = this.data[1];
        let maxDuration = this.determineMaximum(durationData);
        if(maxDuration == 0)
            maxDuration = 0.1;

        for(let eventIdx = 0; eventIdx < occurenceData.length; eventIdx++)
        {
            for(let districtIdx = 0; districtIdx < this.allDistricts.length; districtIdx++)
            {
                let dataIndex = eventIdx * this.allDistricts.length + districtIdx;

                /*set radii of bubbles relative to maximum occurence count, scaled to maxOccurences and maxBubbleRadius*/
                let normalizedRadius = this.maxBubbleRadius * (occurenceData[eventIdx][districtIdx] / maxOccurences);
                normalizedRadius = Math.round(normalizedRadius * 10) / 10;
                this.chart.data.datasets[0].data[dataIndex].r = normalizedRadius;
                
                /*set background color of bubbles relative to maximum duration count, scaled to maxDuration*/
                let ratio = durationData[eventIdx][districtIdx] / maxDuration;
                let normalizedLightness = 75 - ratio * 50;          //caps at lightness between 25% and 75% with higher durations being darker
                let colorString = 'hsl(0, 0%, ' + normalizedLightness + '%)';
                this.chart.data.datasets[0].backgroundColor[dataIndex] = colorString;

                /*set labels for tooltips in absolute numbers*/
                this.chart.data.datasets[0].hoverBackgroundColor[dataIndex] = occurenceData[eventIdx][districtIdx];

                this.chart.data.datasets[0].hoverBorderColor[dataIndex] = durationData[eventIdx][districtIdx];
            }
        }

        this.chart.update();

    }

    generateData()
    {
        let data = [];

        for(let y = 0.5; y < this.relevantEvents.length; y++)
        {
            for(let x = 0.5; x < this.allDistricts.length; x ++)
            {
                data.push({
                    x: x,
                    y: y,
                    r: this.maxBubbleRadius / 2,
                })
            }
        }
        return data;
    }

    create()
    {
        let districts = this.allDistricts;
        let events = this.relevantEvents;

        let colorList: string[] = [];
        colorList.length = this.allDistricts.length * this.relevantEvents.length;
        colorList.fill('hsl(0, 0%, 50%)');  //fill with gray

        this.chart = new Chart(this.ctx, {
            plugins: [ChartDataLabels],
            type: 'bubble',
            data: {
                labels: this.allDistricts,
                datasets: [
                    {
                        data: this.generateData(),
                        backgroundColor: colorList,
                        hoverBackgroundColor: [],      //actually storing absolute occurence counts, using hoverBackgroundColor as tooltip data container since labels stopped working 
                        hoverBorderColor: []      //actually storing absolute total duration, same as hoverBackgroundColor
                    }
                ],
                    
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                  display: false
                },
                hover: {
                  mode: null
                },
                elements: {
                    point: {
                        backgroundColor: "rgba(120, 256, 32, 0.6)"
                    }
                },
                tooltips: {
                    enabled: true,
                    displayColors: false,
                    callbacks: {
                        label: function(tooltipItem, data) {
                            let multiLineReturn = [""];

                            let eventIndex = Math.floor(tooltipItem.index / districts.length);
                            let districtIndex = tooltipItem.index % districts.length;
                            let description = "Aufkommen von " + events[eventIndex] + " in " + districts[districtIndex] + ": ";

                            let occurences = data.datasets[tooltipItem.datasetIndex].hoverBackgroundColor[tooltipItem.index];
                            if(occurences != undefined)
                                description += occurences;

                            multiLineReturn[0] = description;
                            description = "Dauer insgesamt: "

                            let duration = data.datasets[tooltipItem.datasetIndex].hoverBorderColor[tooltipItem.index];
                            if(duration != undefined)
                            {
                                /*convert to days, hours, minutes */
                                let minutes = duration % 60;
                                let minuteDescriptor: string;
                                (minutes == 1) ? minuteDescriptor = "Minute" : minuteDescriptor = "Minuten";

                                let hours = Math.floor(duration / 60) % 24;
                                let hourDescriptor: string;
                                (hours == 1) ? hourDescriptor = "Stunde" : hourDescriptor = "Stunden";

                                let days = Math.floor(duration / (60 * 24));
                                let dayDescriptor: string;
                                (days == 1) ? dayDescriptor = "Tag" : dayDescriptor = "Tage";

                                description += days + " " + dayDescriptor + ", " + hours + " " + hourDescriptor + ", " + minutes + " " + minuteDescriptor;
                            }

                            multiLineReturn.push(description);

                            return multiLineReturn;
                        }
                    }
                },
                plugins: {
                  datalabels: {
                    display: false,
                  }
                },
                scales: {
                    xAxes: [{
                        ticks:{     //set custom label
                            max: 12,
                            min: 0,
                            stepSize: 0.5,
                            callback: function(value, index, values) {
                                if(<number>value - Math.round(<number>value) == 0)
                                    return null;
                                else
                                    return districts[Math.round(<number>value) - 1];
                            }
                        }
                    }],
                  yAxes: [{
                    ticks: {  //set custom label
                      max: 5,
                      min: 0,
                      stepSize: 0.5,
                      callback: function(value, index, values) {
                        if(<number>value - Math.round(<number>value) == 0)
                            return null;
                        else
                            return events[Math.round(<number>value) - 1];
                      }
                    }
                  }],
                }
            }

        });
    }

}