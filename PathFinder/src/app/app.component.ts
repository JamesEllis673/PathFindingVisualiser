import {ApplicationRef, Component} from '@angular/core';

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
  parent: Node;
  square: Square;
  spacesOnRouteToStart: number;
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
export class AppComponent {
  public squares: Array<Array<Square>>;
  public clickType: clickType = clickType.wall;
  public delayInMs: number;
  public resetting: boolean = false;
  public routeLength: number = 0;
  public gridSize: number = 50;
  private _routeNotFoundDueToReset: boolean = false;
  private readonly _applicationRef: ApplicationRef;

  constructor(applicationRef: ApplicationRef) {
    this._applicationRef = applicationRef;
  }

  public createGrid(): void {
    if (this.squares) {
      this.clear();
    }

    this.squares = [];

    for (let i = 0; i < this.gridSize; i++) {
      this.squares.push([]);

      for (let j = 0; j < this.gridSize; j++) {
        this.squares[i].push({
          coordinates: {x: j, y: this.gridSize - 1 - i},
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
    switch (this.clickType) {
      case clickType.wall:
        square.isWall = !square.isWall;
        square.isStart = false;
        square.isEnd = false;
        break;
      case clickType.start:
        square.isStart = !square.isStart;
        square.isWall = false;
        square.isEnd = false;
        break;
      case clickType.end:
        square.isEnd = !square.isEnd;
        square.isStart = false;
        square.isWall = false;
        break;
    }
  }

  public reset(): void {
    this.routeLength = 0;
    this.resetting = true;
    this._clearRouteStyles();
  }

  public clear(): void {
    for (let square of this.squares.flat()) {
      square.isStart = false;
      square.isEnd = false;
      square.isWall = false;
    }

    this.reset();
  }

  public randomWalls(): void {
    if (this.squares) {
      this.clear();

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
  }

  public async runPathFinder(algorithm: PathFinderAlgorithm): Promise<void> {
    const squares: Array<Square> = this.squares.flat();
    const starts: Array<Square> = squares.filter((square: Square) => square.isStart);
    const ends: Array<Square> = squares.filter((square: Square) => square.isEnd);

    this.resetting = false;
    this.routeLength = 0;
    this.delayInMs = 50;

    if (starts.length !== 1) {
      await this._routeImpossible();
      return;
    }

    if (ends.length !== 1) {
      await this._routeImpossible();
      return;
    }

    const startSquare: Square = starts[0];
    const endSquare: Square = ends[0];
    const distanceFromEnd = this._findDistanceFromEnd(endSquare, startSquare);
    const startNode: Node = {
      parent: null,
      square: startSquare,
      spacesOnRouteToStart: 0,
      spacesFromStart: 0,
      distanceFromEnd: distanceFromEnd,
      totalNodeCost: distanceFromEnd
    };

    const openList: Array<Node> = [];
    const closedList: Array<Node> = [startNode]

    this._updateOpenList(startNode, squares, openList, closedList, startSquare, endSquare);

    if (algorithm === PathFinderAlgorithm.aStar) {
      await this._findRouteAStar(squares, openList, closedList, startSquare, endSquare);
    }

    if (algorithm === PathFinderAlgorithm.dijkstras) {
      await this._findRouteDijkstras(squares, openList, closedList, startSquare, endSquare);
    }
  }

  private async _findRouteAStar(squares: Array<Square>, openList: Array<Node>, closedList: Array<Node>, startSquare: Square, endSquare: Square): Promise<void> {
    const currentNode: Node = this._getNextNode(openList);

    if (await this._isRouteFinishedOrImpossible(currentNode, openList, closedList, endSquare)) {
      return;
    }

    openList.splice(openList.indexOf(currentNode), 1);
    closedList.push(currentNode);

    this._updateOpenList(currentNode, squares, openList, closedList, startSquare, endSquare);
    await this._findRouteAStar(squares, openList, closedList, startSquare, endSquare);
  }

  private _resetPath(openList: Array<Node>, closedList: Array<Node>): void {
    this._clearRouteStyles();
    openList.splice(0, openList.length);
    closedList.splice(0, closedList.length)
    this.resetting = false;
    this._routeNotFoundDueToReset = true;
  }

  private _clearRouteStyles(): void {
    for (let square of this.squares.flat()) {
      square.isPartOfRoute = false;
      square.isPartOfOpenList = false;
      square.isPartOfClosedList = false;
    }
  }

  private async _findRouteDijkstras(squares: Array<Square>, openList: Array<Node>, closedList: Array<Node>, startSquare: Square, endSquare: Square): Promise<void> {
    const currentNode: Node = openList[0];

    if (await this._isRouteFinishedOrImpossible(currentNode, openList, closedList, endSquare)) {
      return;
    }

    openList.splice(openList.indexOf(currentNode), 1);
    closedList.push(currentNode);

    this._updateOpenList(currentNode, squares, openList, closedList, startSquare, endSquare);
    await this._findRouteDijkstras(squares, openList, closedList, startSquare, endSquare);
  }

  private async _isRouteFinishedOrImpossible(currentNode: Node, openList: Array<Node>, closedList: Array<Node>, endSquare: Square): Promise<boolean> {
    if (currentNode) {
      if (currentNode.distanceFromEnd > currentNode.parent!.distanceFromEnd && this.delayInMs > 0 && Math.random() < 0.35) {
        this.delayInMs = this.delayInMs - 1;
      }

      await this._highlightLists(closedList, openList);
    } else {
      await this._routeImpossible();
      return true;
    }

    if (currentNode.square === endSquare) {
      await this._highlightFinalRoute(currentNode);
      return true;
    }

    return false;
  }

  private async _highlightLists(closedList: Array<Node>, openList: Array<Node>): Promise<void> {
    for (let node of closedList) {
      node.square.isPartOfOpenList = false;
      node.square.isPartOfClosedList = true;
    }

    for (let node of openList) {
      node.square.isPartOfClosedList = false;
      node.square.isPartOfOpenList = true;
    }

    await this._timeout(this.delayInMs);
    this._applicationRef.tick();
  }

  private async _highlightFinalRoute(node: Node): Promise<void> {
    if (node.parent) {
      node.square.isPartOfClosedList = false;
      node.square.isPartOfRoute = true;
      await this._timeout(0);
      this.routeLength++;
      this._applicationRef.tick();
      await this._highlightFinalRoute(node.parent);
    }

    return;
  }

  private async _routeImpossible(): Promise<void> {
    if (!this._routeNotFoundDueToReset) {
      const nonEndSquares: Array<Square> = this._getNonEndSquares(this.squares);

      await this._flashRed(nonEndSquares, 2);
    }

    this._routeNotFoundDueToReset = false;
  }

  private _getNonEndSquares(squares: Array<Array<Square>>): Array<Square> {
    return squares.flat().filter((square: Square) => !square.isEnd);
  }

  private async _flashRed(squaresToFlash: Array<Square>, times: number): Promise<void> {
    for (let square of squaresToFlash) {
      square.isEnd = true;
    }

    await this._timeout(150);
    this._applicationRef.tick();

    for (let square of squaresToFlash) {
      square.isEnd = false;
    }

    await this._timeout(150);
    this._applicationRef.tick();

    if (times > 1) {
      times = times - 1;
      await this._flashRed(squaresToFlash, times);
    }
  }

  private _getNextNode(openList: Array<Node>): Node {
    const nodeCost: number = Math.min(...openList.map((node: Node) => node.totalNodeCost));

    return openList.find((node: Node) => node.totalNodeCost === nodeCost) ?? null;
  }

  private _updateOpenList(currentNode: Node, squares: Array<Square>, openList: Array<Node>, closedList: Array<Node>, startSquare: Square, endSquare: Square): void {
    if (this.resetting) {
      this._resetPath(openList, closedList);
      return;
    }

    const adjacentSquares: Array<Square> = squares.filter((square: Square) => (this._findXDistance(square, currentNode) + this._findYDistance(square, currentNode) === 1));

    for (let square of adjacentSquares) {
      if (closedList.map((node: Node) => node.square).includes(square)) {
        const index: number = closedList.map((node: Node) => node.square).indexOf(square);
        const spacesFromStartOfCurrentParent: number = closedList[index].parent ? closedList[index].parent.spacesOnRouteToStart : 0;

        if (this._findSpacesOnRouteToStart(currentNode.square, currentNode.parent) < spacesFromStartOfCurrentParent) {
          closedList.splice(index, 1);
          closedList.push({
            parent: currentNode,
            square,
            spacesOnRouteToStart: this._findSpacesOnRouteToStart(square, currentNode),
            spacesFromStart: this._findSpacesFromStart(startSquare, square),
            distanceFromEnd: this._findDistanceFromEnd(endSquare, square),
            totalNodeCost: this._findTotalNodeCost(endSquare, square, currentNode)
          });
        }
      }

      if (!closedList.map((node: Node) => node.square).includes(square) && !square.isWall) {
        if (openList.map((node: Node) => node.square).includes(square)) {
          const index: number = openList.map((node: Node) => node.square).indexOf(square);
          const spacesFromStartOfCurrentParent: number = openList[index].parent!.spacesOnRouteToStart;

          if (this._findSpacesOnRouteToStart(currentNode.square, currentNode.parent) < spacesFromStartOfCurrentParent) {
            openList.splice(index, 1);
            openList.push({
              parent: currentNode,
              square,
              spacesOnRouteToStart: this._findSpacesOnRouteToStart(square, currentNode),
              spacesFromStart: this._findSpacesFromStart(startSquare, square),
              distanceFromEnd: this._findDistanceFromEnd(endSquare, square),
              totalNodeCost: this._findTotalNodeCost(endSquare, square, currentNode)
            });
          }
        }

        else {
          openList.push({
            parent: currentNode,
            square,
            spacesOnRouteToStart: this._findSpacesOnRouteToStart(square, currentNode),
            spacesFromStart: this._findSpacesFromStart(startSquare, square),
            distanceFromEnd: this._findDistanceFromEnd(endSquare, square),
            totalNodeCost: this._findTotalNodeCost(endSquare, square, currentNode)
          });
        }
      }
    }
  }

  private _findSpacesOnRouteToStart(currentSquare: Square, parentNode: Node): number {
    let square: Square = currentSquare;
    let parent: Node = parentNode;
    let count: number = 0

    while (parent) {
      count++;
      square = parent.square;
      parent = parent.parent;
    }

    return count;
  }

  private _findSpacesFromStart(startSquare: Square, currentSquare: Square): number {
    return Math.abs(startSquare.coordinates.x - currentSquare.coordinates.x) + Math.abs(startSquare.coordinates.y - currentSquare.coordinates.y);
  }

  private _findDistanceFromEnd(endSquare: Square, currentSquare: Square): number {
    return Math.pow(currentSquare.coordinates.x - endSquare.coordinates.x, 2) + Math.pow(currentSquare.coordinates.y - endSquare.coordinates.y, 2);
  }

  private _findTotalNodeCost(endSquare: Square, square: Square, currentNode: Node): number {
    return this._findSpacesOnRouteToStart(square, currentNode) + (this._findDistanceFromEnd(endSquare, square) * 2.5);
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
