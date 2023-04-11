import {Component, Input} from '@angular/core';
import {Square} from "../app.component";

@Component({
  selector: 'app-square',
  templateUrl: './square.component.html',
  styleUrls: ['./square.component.scss']
})
export class SquareComponent {
  @Input()
  public squareConfig: Square;
}
