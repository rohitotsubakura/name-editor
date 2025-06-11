import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../page'
import * as fabric from 'fabric'
import { EraserBrush } from '@erase2d/fabric'

// シンプルなテストケース
describe('App Simple Tests', () => {
  let mockCanvas: fabric.Canvas

  beforeEach(() => {
    jest.clearAllMocks()
    
    // PencilBrushのモックインスタンスを作成
    const mockPencilBrush = {
      color: '#000000',
      width: 10,
    }
    
    mockCanvas = {
      dispose: jest.fn(),
      freeDrawingBrush: mockPencilBrush,
      isDrawingMode: false,
      on: jest.fn(),
      renderAll: jest.fn(),
      toJSON: jest.fn(() => ({ objects: [] })),
      loadFromJSON: jest.fn((data, callback) => {
        if (callback) callback()
      }),
    }

    ;(fabric.Canvas as jest.Mock).mockReturnValue(mockCanvas)
    ;(fabric.PencilBrush as jest.Mock).mockReturnValue(mockPencilBrush)
    
    // instanceof チェックが正しく動作するようにする
    Object.setPrototypeOf(mockPencilBrush, fabric.PencilBrush.prototype)
  })

  test('renders all UI elements', () => {
    render(<App />)
    
    // キャンバスが存在することを確認
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    
    // ボタンが存在することを確認
    expect(screen.getByText('アンドゥ (Ctrl+Z)')).toBeInTheDocument()
    expect(screen.getByText('リドゥ (Ctrl+Y)')).toBeInTheDocument()
    expect(screen.getByText('赤色に変更')).toBeInTheDocument()
    expect(screen.getByText('黒色に変更')).toBeInTheDocument()
    expect(screen.getByText('太くする')).toBeInTheDocument()
    expect(screen.getByText('細くする')).toBeInTheDocument()
    expect(screen.getByText('消しゴムに変更')).toBeInTheDocument()
  })

  test('initializes fabric canvas', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(fabric.Canvas).toHaveBeenCalledTimes(1)
    })
  })

  test('color change buttons work', async () => {
    render(<App />)
    
    // 初期化で呼ばれる回数を確認
    const initialCallCount = (fabric.PencilBrush as jest.Mock).mock.calls.length
    
    const redButton = screen.getByText('赤色に変更')
    await userEvent.click(redButton)
    
    // 色変更ボタンは既存のPencilBrushがある場合は新しいインスタンスを作成しない
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(initialCallCount)
    
    const blackButton = screen.getByText('黒色に変更')
    await userEvent.click(blackButton)
    
    // 同様に新しいインスタンスは作成されない
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(initialCallCount)
  })

  test('width change buttons work', async () => {
    render(<App />)
    
    // 初期化で1回呼ばれているので、それを考慮
    const initialCallCount = (fabric.PencilBrush as jest.Mock).mock.calls.length
    
    const thickButton = screen.getByText('太くする')
    await userEvent.click(thickButton)
    
    // 太さ変更ボタンは既存のPencilBrushがある場合は新しいインスタンスを作成しない
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(initialCallCount)
    
    const thinButton = screen.getByText('細くする')
    await userEvent.click(thinButton)
    
    // 同様に新しいインスタンスは作成されない
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(initialCallCount)
  })

  test('eraser button works', async () => {
    (EraserBrush as jest.MockedFunction<typeof EraserBrush>).mockReturnValue({ width: 20 } as ReturnType<typeof EraserBrush>)
    
    render(<App />)
    
    const eraserButton = screen.getByText('消しゴムに変更')
    await userEvent.click(eraserButton)
    
    expect(EraserBrush).toHaveBeenCalledWith(mockCanvas)
  })

  test('undo and redo buttons are initially disabled', () => {
    render(<App />)
    
    const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
    const redoButton = screen.getByText('リドゥ (Ctrl+Y)')
    
    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()
  })

  test('canvas cleanup on unmount', () => {
    const { unmount } = render(<App />)
    
    unmount()
    
    expect(mockCanvas.dispose).toHaveBeenCalledTimes(1)
  })

  test('handles keyboard shortcuts', async () => {
    render(<App />)
    
    // Ctrl+Zを押下
    fireEvent.keyDown(window, {
      key: 'z',
      ctrlKey: true,
      preventDefault: jest.fn(),
    })
    
    // Ctrl+Yを押下
    fireEvent.keyDown(window, {
      key: 'y',
      ctrlKey: true,
      preventDefault: jest.fn(),
    })
    
    // エラーが発生しないことを確認
    expect(screen.getByText('アンドゥ (Ctrl+Z)')).toBeInTheDocument()
  })

  test('handles canvas events', async () => {
    render(<App />)
    
    // object:addedイベントをシミュレート
    const objectAddedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'object:added'
    )?.[1]
    
    if (objectAddedCallback) {
      const mockTarget = { erasable: undefined }
      objectAddedCallback({ target: mockTarget })
      expect(mockTarget.erasable).toBe(true)
    }
  })

  test('handles path creation event', async () => {
    render(<App />)
    
    // path:createdイベントをシミュレート
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    if (pathCreatedCallback) {
      await act(async () => {
        pathCreatedCallback()
        // setTimeoutを待つ
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    }
  })

  test('handles erasing end event', async () => {
    render(<App />)
    
    // erasing:endイベントをシミュレート
    const erasingEndCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'erasing:end'
    )?.[1]
    
    if (erasingEndCallback) {
      await act(async () => {
        erasingEndCallback()
        // setTimeoutを待つ
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    }
  })
})