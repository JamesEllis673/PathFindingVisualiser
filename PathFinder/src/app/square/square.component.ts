import { Component, Input, AfterViewInit } from '@angular/core';
import {Square} from "../app.component";

@Component({
  selector: 'app-square',
  templateUrl: './square.component.html',
  styleUrls: ['./square.component.scss']
})
export class SquareComponent implements AfterViewInit {
  @Input()
  public squareConfig: Square;

  @Input()
  public gridSize: number;

  public ngAfterViewInit(): void {
    console.log("squareCreated");
    document.getElementById(`x${this.squareConfig.coordinates.x}y${this.squareConfig.coordinates.y}`).style.padding = `${46 / (this.gridSize * 2)}vw`;
  }
}
