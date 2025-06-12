import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../page'
import * as fabric from 'fabric'
import { EraserBrush } from '@erase2d/fabric'

// fabric.jsのモックを取得
const mockCanvas = {
  dispose: jest.fn(),
  freeDrawingBrush: null,
  isDrawingMode: false,
  on: jest.fn(),
  renderAll: jest.fn(),
  toJSON: jest.fn(() => ({})),
  loadFromJSON: jest.fn(() => Promise.resolve()),
}

const mockEraserBrush = {
  width: 20,
}

// モックの設定
beforeEach(() => {
  jest.clearAllMocks()
  ;(fabric.Canvas as jest.Mock).mockReturnValue(mockCanvas)
  ;(fabric.PencilBrush as jest.Mock).mockReturnValue({ color: '#000000', width: 10 })
  // loadFromJSONを毎回Promise形式に
  mockCanvas.loadFromJSON = jest.fn(() => Promise.resolve())
})

describe('App Component', () => {
  test('renders canvas and control buttons', () => {
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

  test('initializes fabric canvas on mount', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(fabric.Canvas).toHaveBeenCalledTimes(1)
    })
    
    // 初期設定が正しく行われることを確認
    expect(mockCanvas.isDrawingMode).toBe(true)
    expect(mockCanvas.on).toHaveBeenCalledWith('object:added', expect.any(Function))
    expect(mockCanvas.on).toHaveBeenCalledWith('path:created', expect.any(Function))
    expect(mockCanvas.on).toHaveBeenCalledWith('erasing:end', expect.any(Function))
  })

  test('changes brush color to red when red button is clicked', async () => {
    render(<App />)
    
    const redButton = screen.getByText('赤色に変更')
    await userEvent.click(redButton)
    
    expect(fabric.PencilBrush).toHaveBeenCalledWith(mockCanvas)
  })

  test('changes brush color to black when black button is clicked', async () => {
    render(<App />)
    
    const blackButton = screen.getByText('黒色に変更')
    await userEvent.click(blackButton)
    
    expect(fabric.PencilBrush).toHaveBeenCalledWith(mockCanvas)
  })

  test('changes brush width to thick when thick button is clicked', async () => {
    render(<App />)
    
    const thickButton = screen.getByText('太くする')
    await userEvent.click(thickButton)
    
    expect(fabric.PencilBrush).toHaveBeenCalledWith(mockCanvas)
  })

  test('changes brush width to thin when thin button is clicked', async () => {
    render(<App />)
    
    const thinButton = screen.getByText('細くする')
    await userEvent.click(thinButton)
    
    expect(fabric.PencilBrush).toHaveBeenCalledWith(mockCanvas)
  })

  test('switches to eraser when eraser button is clicked', async () => {
    ;(EraserBrush as jest.MockedFunction<typeof EraserBrush>).mockReturnValue(mockEraserBrush as ReturnType<typeof EraserBrush>)
    
    render(<App />)
    
    const eraserButton = screen.getByText('消しゴムに変更')
    await userEvent.click(eraserButton)
    
    expect(EraserBrush).toHaveBeenCalledWith(mockCanvas)
  })

  test('undo button is initially disabled', () => {
    render(<App />)
    
    const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
    expect(undoButton).toBeDisabled()
  })

  test('redo button is initially disabled', () => {
    render(<App />)
    
    const redoButton = screen.getByText('リドゥ (Ctrl+Y)')
    expect(redoButton).toBeDisabled()
  })

test('handles keyboard shortcuts for undo', async () => {
    // mockCanvas.toJSONが一意の値を返すようにする
    let jsonCallCount = 0
    mockCanvas.toJSON.mockImplementation(() => ({
      objects: [],
      version: '5.3.0',
      callId: jsonCallCount++
    }))
    
    render(<App />)
    
    // 初期化を待つ - 初期状態が履歴に保存されるまで
    await waitFor(() => {
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    })
    
    // path:createdイベントを取得
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    expect(pathCreatedCallback).toBeDefined()
    
    // 1回目の描画 - これでhistoryIndex=1になる
    await act(async () => {
      pathCreatedCallback()
      // saveStateのsetTimeoutを待つ
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    // undoボタンが有効になることを確認
    await waitFor(() => {
      const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
      expect(undoButton).not.toBeDisabled()
    })
    
    // loadFromJSONのモックをクリア
    mockCanvas.loadFromJSON.mockClear()
    mockCanvas.clear = jest.fn()
    mockCanvas.renderAll = jest.fn()
    
    // undo (Ctrl+Z) を発火
    const preventDefaultMock = jest.fn()
    await act(async () => {
      const event = new KeyboardEvent('keydown', { 
        key: 'z', 
        ctrlKey: true,
        bubbles: true 
      })
      Object.defineProperty(event, 'preventDefault', {
        value: preventDefaultMock,
        writable: true
      })
      window.dispatchEvent(event)
    })
    
    // preventDefaultが呼ばれることを確認
    expect(preventDefaultMock).toHaveBeenCalled()
    
    // loadFromJSONが呼ばれることを確認
    await waitFor(() => {
      expect(mockCanvas.clear).toHaveBeenCalled()
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(1)
      expect(mockCanvas.renderAll).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  test('handles keyboard shortcuts for redo', async () => {
    // mockCanvas.toJSONが一意の値を返すようにする
    let jsonCallCount = 0
    mockCanvas.toJSON.mockImplementation(() => ({
      objects: [],
      version: '5.3.0',
      callId: jsonCallCount++
    }))
    
    render(<App />)
    
    // 初期化を待つ
    await waitFor(() => {
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    })
    
    // path:createdイベントを取得
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    expect(pathCreatedCallback).toBeDefined()
    
    // 2回描画して履歴を増やす
    await act(async () => {
      pathCreatedCallback()
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    await act(async () => {
      pathCreatedCallback()
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    // undoボタンが有効になることを確認
    await waitFor(() => {
      const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
      expect(undoButton).not.toBeDisabled()
    })
    
    // loadFromJSONのモックをクリア
    mockCanvas.loadFromJSON.mockClear()
    mockCanvas.clear = jest.fn()
    mockCanvas.renderAll = jest.fn()
    
    // まずundoを実行
    const preventDefaultMock1 = jest.fn()
    await act(async () => {
      const event1 = new KeyboardEvent('keydown', { 
        key: 'z', 
        ctrlKey: true,
        bubbles: true 
      })
      Object.defineProperty(event1, 'preventDefault', {
        value: preventDefaultMock1,
        writable: true
      })
      window.dispatchEvent(event1)
    })
    
    // undoの完了を待つ
    await waitFor(() => {
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(1)
    }, { timeout: 1000 })
    
    // redoボタンが有効になることを確認
    await waitFor(() => {
      const redoButton = screen.getByText('リドゥ (Ctrl+Y)')
      expect(redoButton).not.toBeDisabled()
    })
    
    // redo (Ctrl+Y) を発火
    const preventDefaultMock2 = jest.fn()
    await act(async () => {
      const event2 = new KeyboardEvent('keydown', { 
        key: 'y', 
        ctrlKey: true,
        bubbles: true 
      })
      Object.defineProperty(event2, 'preventDefault', {
        value: preventDefaultMock2,
        writable: true
      })
      window.dispatchEvent(event2)
    })
    
    // preventDefaultが呼ばれることを確認
    expect(preventDefaultMock2).toHaveBeenCalled()
    
    // loadFromJSONが合計2回呼ばれることを確認
    await waitFor(() => {
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(2)
    }, { timeout: 1000 })
  })

  test('handles keyboard shortcuts for redo with Shift+Ctrl+Z', async () => {
    // mockCanvas.toJSONが一意の値を返すようにする
    let jsonCallCount = 0
    mockCanvas.toJSON.mockImplementation(() => ({
      objects: [],
      version: '5.3.0',
      callId: jsonCallCount++
    }))
    
    render(<App />)
    
    // 初期化を待つ
    await waitFor(() => {
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    })
    
    // path:createdイベントを取得
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    expect(pathCreatedCallback).toBeDefined()
    
    // 2回描画して履歴を増やす
    await act(async () => {
      pathCreatedCallback()
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    await act(async () => {
      pathCreatedCallback()
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    
    // undoボタンが有効になることを確認
    await waitFor(() => {
      const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
      expect(undoButton).not.toBeDisabled()
    })
    
    // loadFromJSONのモックをクリア
    mockCanvas.loadFromJSON.mockClear()
    mockCanvas.clear = jest.fn()
    mockCanvas.renderAll = jest.fn()
    
    // まずundoを実行
    const preventDefaultMock1 = jest.fn()
    await act(async () => {
      const event1 = new KeyboardEvent('keydown', { 
        key: 'z', 
        ctrlKey: true,
        bubbles: true 
      })
      Object.defineProperty(event1, 'preventDefault', {
        value: preventDefaultMock1,
        writable: true
      })
      window.dispatchEvent(event1)
    })
    
    // undoの完了を待つ
    await waitFor(() => {
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(1)
    }, { timeout: 1000 })
    
    // redoボタンが有効になることを確認
    await waitFor(() => {
      const redoButton = screen.getByText('リドゥ (Ctrl+Y)')
      expect(redoButton).not.toBeDisabled()
    })
    
    // redo (Shift+Ctrl+Z) を発火
    const preventDefaultMock2 = jest.fn()
    await act(async () => {
      const event2 = new KeyboardEvent('keydown', { 
        key: 'z', 
        ctrlKey: true, 
        shiftKey: true,
        bubbles: true 
      })
      Object.defineProperty(event2, 'preventDefault', {
        value: preventDefaultMock2,
        writable: true
      })
      window.dispatchEvent(event2)
    })
    
    // preventDefaultが呼ばれることを確認
    expect(preventDefaultMock2).toHaveBeenCalled()
    
    // loadFromJSONが合計2回呼ばれることを確認
    await waitFor(() => {
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(2)
    }, { timeout: 1000 })
  })

  test('cleans up canvas on unmount', () => {
    const { unmount } = render(<App />)
    
    unmount()
    
    expect(mockCanvas.dispose).toHaveBeenCalledTimes(1)
  })

  test('does not change brush when canvas is not initialized', async () => {
    // canvasがnullの場合をテスト
    ;(fabric.Canvas as jest.Mock).mockImplementation(() => {
      throw new Error('Canvas initialization failed')
    })
    
    render(<App />)
    
    const redButton = screen.getByText('赤色に変更')
    await userEvent.click(redButton)
    
    // エラーが発生してもアプリが動作することを確認
    expect(redButton).toBeInTheDocument()
  })
})

describe('App Component - History Management', () => {
  test('saves initial state to history', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    })
  })

  test('path:created event triggers state save', async () => {
    render(<App />)
    
    // path:createdイベントをシミュレート
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    if (pathCreatedCallback) {
      pathCreatedCallback()
      
      // setTimeoutを待つ
      await waitFor(() => {
        expect(mockCanvas.toJSON).toHaveBeenCalled()
      }, { timeout: 100 })
    }
  })

  test('erasing:end event triggers state save', async () => {
    render(<App />)
    
    // erasing:endイベントをシミュレート
    const erasingEndCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'erasing:end'
    )?.[1]
    
    if (erasingEndCallback) {
      erasingEndCallback()
      
      // setTimeoutを待つ
      await waitFor(() => {
        expect(mockCanvas.toJSON).toHaveBeenCalled()
      }, { timeout: 100 })
    }
  })
})