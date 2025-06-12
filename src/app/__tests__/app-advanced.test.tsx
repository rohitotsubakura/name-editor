import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../page'
import * as fabric from 'fabric'
import { EraserBrush } from '@erase2d/fabric'

// 高度なテストケース
describe('App Advanced Tests', () => {
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

  test('undo/redo functionality with history', async () => {
    render(<App />)
    
    // 最初にcanvas.clearとrenderAllのモックをリセット
    mockCanvas.clear = jest.fn()
    
    // 履歴を複数作成するため、path:createdイベントを複数回発火
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    if (pathCreatedCallback) {
      await act(async () => {
        pathCreatedCallback()
        await new Promise(resolve => setTimeout(resolve, 20))
        pathCreatedCallback()
        await new Promise(resolve => setTimeout(resolve, 20))
      })
    }
    
    // アンドゥボタンが有効になることを確認（履歴が2以上ある場合）
    await waitFor(() => {
      const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
      expect(undoButton).not.toBeDisabled()
    })
    
    // アンドゥを実行
    const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
    await act(async () => {
      await userEvent.click(undoButton)
    })
    
    // 少し待ってからアサーション
    await waitFor(() => {
      expect(mockCanvas.clear).toHaveBeenCalled()
      expect(mockCanvas.loadFromJSON).toHaveBeenCalled()
    })
    
    // リドゥボタンが有効になることを確認
    await waitFor(() => {
      const redoButton = screen.getByText('リドゥ (Ctrl+Y)')
      expect(redoButton).not.toBeDisabled()
    })
    
    // リドゥを実行
    const redoButton = screen.getByText('リドゥ (Ctrl+Y)')
    await act(async () => {
      await userEvent.click(redoButton)
    })
    
    await waitFor(() => {
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(2)
    })
  })

  test('keyboard shortcuts work correctly', async () => {
    render(<App />)
    
    // clearモックを追加
    mockCanvas.clear = jest.fn()
    
    // 描画をシミュレートして履歴を複数作成
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    if (pathCreatedCallback) {
      await act(async () => {
        pathCreatedCallback()
        await new Promise(resolve => setTimeout(resolve, 20))
        pathCreatedCallback()
        await new Promise(resolve => setTimeout(resolve, 20))
      })
    }
    
    await waitFor(() => {
      const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
      expect(undoButton).not.toBeDisabled()
    })
    
    const preventDefaultSpy = jest.fn()
    
    // Ctrl+Zでアンドゥ
    const keyDownEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    })
    Object.defineProperty(keyDownEvent, 'preventDefault', {
      value: preventDefaultSpy,
    })
    
    await act(async () => {
      window.dispatchEvent(keyDownEvent)
    })
    
    expect(preventDefaultSpy).toHaveBeenCalled()
    
    await waitFor(() => {
      expect(mockCanvas.clear).toHaveBeenCalled()
      expect(mockCanvas.loadFromJSON).toHaveBeenCalled()
    })
    
    preventDefaultSpy.mockClear()
    
    // Ctrl+Yでリドゥ
    const redoKeyDownEvent = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      bubbles: true,
    })
    Object.defineProperty(redoKeyDownEvent, 'preventDefault', {
      value: preventDefaultSpy,
    })
    
    await act(async () => {
      window.dispatchEvent(redoKeyDownEvent)
    })
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  test('Meta key shortcuts work (Mac compatibility)', async () => {
    render(<App />)
    
    const preventDefaultSpy = jest.fn()
    
    // Meta+Zでアンドゥ（Mac用）
    const metaKeyDownEvent = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
    })
    Object.defineProperty(metaKeyDownEvent, 'preventDefault', {
      value: preventDefaultSpy,
    })
    
    window.dispatchEvent(metaKeyDownEvent)
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  test('Shift+Ctrl+Z for redo', async () => {
    render(<App />)
    
    const preventDefaultSpy = jest.fn()
    
    // Shift+Ctrl+Zでリドゥ
    const shiftKeyDownEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    })
    Object.defineProperty(shiftKeyDownEvent, 'preventDefault', {
      value: preventDefaultSpy,
    })
    
    window.dispatchEvent(shiftKeyDownEvent)
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  test('brush properties are correctly set', async () => {
    render(<App />)
    // 初期化後のカウントをリセット
    jest.clearAllMocks()
    // 赤色に変更
    const redButton = screen.getByText('赤色に変更')
    await userEvent.click(redButton)
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(1)
    // 太いブラシに変更
    const thickButton = screen.getByText('太くする')
    await userEvent.click(thickButton)
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(2)
  })

  test('eraser functionality', async () => {
    const mockEraserBrush = { width: 20 }
    ;(EraserBrush as jest.MockedFunction<typeof EraserBrush>).mockReturnValue(mockEraserBrush as ReturnType<typeof EraserBrush>)
    
    render(<App />)
    
    const eraserButton = screen.getByText('消しゴムに変更')
    await userEvent.click(eraserButton)
    
    expect(EraserBrush).toHaveBeenCalledWith(mockCanvas)
    
    // 消しゴム使用をシミュレート
    const erasingEndCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'erasing:end'
    )?.[1]
    
    if (erasingEndCallback) {
      await act(async () => {
        erasingEndCallback()
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    }
  })

  test('object erasable property is set', async () => {
    render(<App />)
    
    const objectAddedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'object:added'
    )?.[1]
    
    expect(objectAddedCallback).toBeDefined()
    
    // オブジェクト追加をシミュレート
    const mockTarget = { erasable: undefined }
    objectAddedCallback({ target: mockTarget })
    
    expect(mockTarget.erasable).toBe(true)
  })

  test('handles rapid tool changes', async () => {
    render(<App />)
    // 初期化で1回呼ばれているので、それを考慮
    const initialCallCount = (fabric.PencilBrush as jest.Mock).mock.calls.length
    // 複数のツール変更を素早く実行
    const redButton = screen.getByText('赤色に変更')
    const blackButton = screen.getByText('黒色に変更')
    const thickButton = screen.getByText('太くする')
    await userEvent.click(redButton)
    await userEvent.click(thickButton)
    await userEvent.click(blackButton)
    // ボタンを押すたびに新しいインスタンスが作成される
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(initialCallCount + 3)
  })

  test('handles canvas events without errors', async () => {
    render(<App />)
    
    // 各種イベントをシミュレート
    const callbacks = {
      'object:added': mockCanvas.on.mock.calls.find(call => call[0] === 'object:added')?.[1],
      'path:created': mockCanvas.on.mock.calls.find(call => call[0] === 'path:created')?.[1],
      'erasing:end': mockCanvas.on.mock.calls.find(call => call[0] === 'erasing:end')?.[1],
    }
    
    // object:addedイベント
    if (callbacks['object:added']) {
      const mockTarget = { erasable: undefined }
      expect(() => callbacks['object:added']({ target: mockTarget })).not.toThrow()
      expect(mockTarget.erasable).toBe(true)
    }
    
    // path:createdイベント
    if (callbacks['path:created']) {
      await act(async () => {
        expect(() => callbacks['path:created']()).not.toThrow()
        await new Promise(resolve => setTimeout(resolve, 20))
      })
    }
    
    // erasing:endイベント
    if (callbacks['erasing:end']) {
      await act(async () => {
        expect(() => callbacks['erasing:end']()).not.toThrow()
        await new Promise(resolve => setTimeout(resolve, 20))
      })
    }
  })

  test('handles non-modifier key presses', async () => {
    render(<App />)
    
    // 修飾キーなしでz/yを押下
    fireEvent.keyDown(window, {
      key: 'z',
      ctrlKey: false,
      metaKey: false,
    })
    
    fireEvent.keyDown(window, {
      key: 'y',
      ctrlKey: false,
      metaKey: false,
    })
    
    // アンドゥ・リドゥが実行されないことを確認
    expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled()
  })
})