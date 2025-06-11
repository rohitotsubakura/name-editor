import '@testing-library/jest-dom'

// fabric.jsのモック
const MockPencilBrush = jest.fn().mockImplementation(function(canvas) {
  this.canvas = canvas
  this.color = '#000000'
  this.width = 10
  return this
})

jest.mock('fabric', () => ({
  Canvas: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    freeDrawingBrush: null,
    isDrawingMode: false,
    on: jest.fn(),
    renderAll: jest.fn(),
    toJSON: jest.fn(() => ({})),
    loadFromJSON: jest.fn((data, callback) => {
      if (callback) callback()
    }),
  })),
  PencilBrush: MockPencilBrush,
}))

// @erase2d/fabricのモック
jest.mock('@erase2d/fabric', () => ({
  EraserBrush: jest.fn().mockImplementation((canvas) => ({
    canvas,
    width: 20,
  })),
}))

// HTMLCanvasElementのモック
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  })),
})

// ResizeObserverのモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))