import {ApplicationRef, Component, OnInit} from '@angular/core';

//TODO: Calculate distance from start by number of parents?

export type Coordinates = {
  x: number;
  y: number;
}

export type Square = {
  coordinates: Coordinates;
  isWall: boolean;
  isStart: boolean;
  isEnd: boolean;
  isPartOfRoute: boolean;
  isPartOfOpenList: boolean;
  isPartOfClosedList: boolean;
}

export type Node = {
  parent: Node | null;
  square: Square;
  spacesFromStart: number;
  distanceFromEnd: number;
  totalNodeCost: number;
}

export enum clickType {
  wall,
  start,
  end
}

export enum PathFinderAlgorithm {
  aStar,
  dijkstras
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public squares: Array<Array<Square>>;
  public clickType: clickType = clickType.wall;
  private readonly _applicationRef: ApplicationRef;

  constructor(applicationRef: ApplicationRef) {
    this._applicationRef = applicationRef;
  }

  public ngOnInit(): void {
    this.squares = [];
    const numberOfRows: number = 100;

    for (let i = 0; i < numberOfRows; i++) {
      this.squares.push([]);

      for (let j = 0; j < numberOfRows; j++) {
        this.squares[i].push({
          coordinates: {x: j, y: numberOfRows - 1 - i},
          isWall: false,
          isStart: false,
          isEnd: false,
          isPartOfRoute: false,
          isPartOfOpenList: false,
          isPartOfClosedList: false
        });
      }
    }
  }

  public setClickToWall(): void {
    this.clickType = clickType.wall;
  }

  public setClickToStart(): void {
    this.clickType = clickType.start;
  }

  public setClickToEnd(): void {
    this.clickType = clickType.end;
  }

  public squareOnClick(square: Square): void {
    if (this.clickType === clickType.wall) {
      square.isWall = !square.isWall;
      square.isStart = false;
      square.isEnd = false;
    }

    if (this.clickType === clickType.start) {
      square.isStart = !square.isStart;
      square.isWall = false;
      square.isEnd = false;
    }

    if (this.clickType === clickType.end) {
      square.isEnd = !square.isEnd;
      square.isStart = false;
      square.isWall = false;
    }
  }

  public resetPath(): void {
    for (let square of this.squares.flat()) {
      square.isPartOfRoute = false;
      square.isPartOfOpenList = false;
      square.isPartOfClosedList = false;
    }
  }

  public randomWalls(): void {
    for (let square of this.squares.flat()) {
      square.isWall = Math.random() < 0.35;

      if (square.coordinates.x === 0 && square.coordinates.y === 0) {
        square.isWall = false;
        square.isStart = true;
      }

      if (square.coordinates.x === this.squares.length - 1 && square.coordinates.y === this.squares.length - 1) {
        square.isWall = false;
        square.isEnd = true;
      }
    }
  }

  public async runPathFinder(algortihm: PathFinderAlgorithm): Promise<void> {
    const squares: Array<Square> = this.squares.flat();
    const starts: Array<Square> = squares.filter((square: Square) => square.isStart);
    const ends: Array<Square> = squares.filter((square: Square) => square.isEnd);

    let delayInMs: number = 75;

    if (starts.length > 1 || starts.length === 0) {
      return;
    }

    if (ends.length > 1 || ends.length === 0) {
      return;
    }

    const startSquare: Square = starts[0];
    const endSquare: Square = ends[0];
    const startNode: Node = {
      parent: null,
      square: startSquare,
      spacesFromStart: 0,
      distanceFromEnd: this._findDistanceFromEnd(endSquare, startSquare),
      totalNodeCost: this._findTotalNodeCost(startSquare, endSquare, startSquare)
    };

    const openList: Array<Node> = [];
    const closedList: Array<Node> = [startNode]

    this._updateOpenList(startNode, squares, openList, closedList, startSquare, endSquare);

    if (algortihm === PathFinderAlgorithm.aStar) {
      await this._findRouteAStar(squares, openList, closedList, startSquare, endSquare, delayInMs);
    }

    if (algortihm === PathFinderAlgorithm.dijkstras) {
      await this._findRouteDijkstras(squares, openList, closedList, startSquare, endSquare, delayInMs);
    }
  }

  private async _findRouteAStar(squares: Array<Square>, openList: Array<Node>, closedList: Array<Node>, startSquare: Square, endSquare: Square, delayInMs: number): Promise<void> {
    const currentNode = this._getNextNode(openList);

    if (currentNode) {
      if (currentNode.distanceFromEnd > currentNode.parent!.distanceFromEnd && delayInMs > 0 && Math.random() < 0.35) {
        delayInMs = delayInMs - 1;
      }

      await this._highlightLists(closedList, openList, delayInMs);
    }

    if (!currentNode) {
      await this._routeImpossible();
      return;
    }

    if (currentNode.square === endSquare) {
      await this._highlightFinalRoute(currentNode);
      return;
    }

    openList.splice(openList.indexOf(currentNode), 1);
    closedList.push(currentNode);

    this._updateOpenList(currentNode, squares, openList, closedList, startSquare, endSquare);
    await this._findRouteAStar(squares, openList, closedList, startSquare, endSquare, delayInMs);
  }

  private async _findRouteDijkstras(squares: Array<Square>, openList: Array<Node>, closedList: Array<Node>, startSquare: Square, endSquare: Square, delayInMs: number): Promise<void> {
    const currentNode = openList[0];

    if (currentNode) {
      if (currentNode.distanceFromEnd > currentNode.parent!.distanceFromEnd && delayInMs > 0 && Math.random() < 0.35) {
        delayInMs = delayInMs - 1;
      }

      await this._highlightLists(closedList, openList, delayInMs);
    }

    if (!currentNode) {
      await this._routeImpossible();
      return;
    }

    if (currentNode.square === endSquare) {
      await this._highlightFinalRoute(currentNode);
      return;
    }

    openList.splice(openList.indexOf(currentNode), 1);
    closedList.push(currentNode);

    this._updateOpenList(currentNode, squares, openList, closedList, startSquare, endSquare);
    await this._findRouteDijkstras(squares, openList, closedList, startSquare, endSquare, delayInMs);
  }

  private async _highlightLists(closedList: Array<Node>, openList: Array<Node>, delayInMs: number): Promise<void> {
    for (let node of closedList) {
      node.square.isPartOfOpenList = false;
      node.square.isPartOfClosedList = true;
    }

    for (let node of openList) {
      node.square.isPartOfClosedList = false;
      node.square.isPartOfOpenList = true;
    }

    await this._timeout(delayInMs);
    this._applicationRef.tick();
  }

  private async _highlightFinalRoute(node: Node): Promise<void> {
    if (!!node.parent) {
      node.square.isPartOfClosedList = false;
      node.square.isPartOfRoute = true;
      await this._timeout(60);
      this._applicationRef.tick();
      await this._highlightFinalRoute(node.parent);
    }

    return;
  }

  private async _routeImpossible(): Promise<void> {
    const nonEndSquares = this.squares.flat().filter((square: Square) => !square.isEnd);

    for (let square of nonEndSquares) {
      square.isEnd = true;
    }

    await this._timeout(150);
    this._applicationRef.tick();

    for (let square of nonEndSquares) {
      square.isEnd = false;
    }

    await this._timeout(150);
    this._applicationRef.tick();

    for (let square of nonEndSquares) {
      square.isEnd = true;
    }

    await this._timeout(150);
    this._applicationRef.tick();

    for (let square of nonEndSquares) {
      square.isEnd = false;
    }

    await this._timeout(150);
    this._applicationRef.tick();
  }

  private _getNextNode(openList: Array<Node>): Node | null {
    const nodeCost: number = Math.min(...openList.map((node: Node) => node.totalNodeCost));

    return openList.find((node: Node) => node.totalNodeCost === nodeCost) ?? null;
  }

  private _updateOpenList(currentNode: Node, squares: Array<Square>, openList: Array<Node>, closedList: Array<Node>, startSquare: Square, endSquare: Square): void {
    const adjacentSquares: Array<Square> = squares.filter((square: Square) => (this._findXDistance(square, currentNode) === 1 && this._findYDistance(square, currentNode) === 0) || (this._findXDistance(square, currentNode) === 0 && this._findYDistance(square, currentNode) === 1));

    for (let square of adjacentSquares) {
      if (!closedList.map((node: Node) => node.square).includes(square) && !square.isWall) {
        if (openList.map((node: Node) => node.square).includes(square)) {
          const index = openList.map((node: Node) => node.square).indexOf(square);
          const spacesFromStartOfCurrentParent: number = openList[index].parent!.spacesFromStart;

          if (this._findSpacesFromStart(startSquare, currentNode.square) < spacesFromStartOfCurrentParent) {
            openList.splice(index, 1);
            openList.push({
              parent: currentNode,
              square,
              spacesFromStart: this._findSpacesFromStart(startSquare, square),
              distanceFromEnd: this._findDistanceFromEnd(endSquare, square),
              totalNodeCost: this._findTotalNodeCost(startSquare, endSquare, square)
            });
          }
        }

        else {
          openList.push({
            parent: currentNode,
            square,
            spacesFromStart: this._findSpacesFromStart(startSquare, square),
            distanceFromEnd: this._findDistanceFromEnd(endSquare, square),
            totalNodeCost: this._findTotalNodeCost(startSquare, endSquare, square)
          });
        }
      }
    }
  }

  private _findSpacesFromStart(startSquare: Square, currentSquare: Square): number {
    return Math.abs(startSquare.coordinates.x - currentSquare.coordinates.x) + Math.abs(startSquare.coordinates.y - currentSquare.coordinates.y);
  }

  private _findDistanceFromEnd(endSquare: Square, currentSquare: Square): number {
    return (Math.pow(currentSquare.coordinates.x - endSquare.coordinates.x, 2) + Math.pow(currentSquare.coordinates.y - endSquare.coordinates.y, 2)) /2;
  }

  private _findTotalNodeCost(startSquare: Square, endSquare: Square, currentSquare: Square): number {
    return this._findSpacesFromStart(startSquare, currentSquare) + this._findDistanceFromEnd(endSquare, currentSquare);
  }

  private _timeout(ms: number): Promise<null> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private _findXDistance(square: Square, currentNode: Node): number {
    return Math.abs(square.coordinates.x - currentNode.square.coordinates.x);
  }

  private _findYDistance(square: Square, currentNode: Node): number {
    return Math.abs(square.coordinates.y - currentNode.square.coordinates.y);
  }
}