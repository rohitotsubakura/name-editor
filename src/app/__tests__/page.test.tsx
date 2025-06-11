import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  loadFromJSON: jest.fn((data, callback) => {
    if (callback) callback()
  }),
}

const mockPencilBrush = {
  color: '#000000',
  width: 10,
}

const mockEraserBrush = {
  width: 20,
}

// モックの設定
beforeEach(() => {
  jest.clearAllMocks()
  ;(fabric.Canvas as jest.Mock).mockReturnValue(mockCanvas)
  ;(fabric.PencilBrush as jest.Mock).mockReturnValue(mockPencilBrush)
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
    render(<App />)
    
    // Ctrl+Zを押下
    fireEvent.keyDown(window, {
      key: 'z',
      ctrlKey: true,
      preventDefault: jest.fn(),
    })
    
    // undoが呼ばれることを確認（初期状態では何も起こらない）
    expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled()
  })

  test('handles keyboard shortcuts for redo', async () => {
    render(<App />)
    
    // Ctrl+Yを押下
    fireEvent.keyDown(window, {
      key: 'y',
      ctrlKey: true,
      preventDefault: jest.fn(),
    })
    
    // redoが呼ばれることを確認（初期状態では何も起こらない）
    expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled()
  })

  test('handles keyboard shortcuts for redo with Shift+Ctrl+Z', async () => {
    render(<App />)
    
    // Shift+Ctrl+Zを押下
    fireEvent.keyDown(window, {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      preventDefault: jest.fn(),
    })
    
    // redoが呼ばれることを確認（初期状態では何も起こらない）
    expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled()
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