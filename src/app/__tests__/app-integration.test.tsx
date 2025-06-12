import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../page'
import * as fabric from 'fabric'
import { EraserBrush } from '@erase2d/fabric'

// より詳細な統合テスト
describe('App Integration Tests', () => {
  let mockCanvas: fabric.Canvas
  let mockEraserBrush: typeof EraserBrush

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockCanvas = {
      dispose: jest.fn(),
      freeDrawingBrush: null,
      isDrawingMode: false,
      on: jest.fn(),
      renderAll: jest.fn(),
      toJSON: jest.fn(() => ({ objects: [] })),
      loadFromJSON: jest.fn((data, callback) => {
        if (callback) callback()
      }),
    }

    mockEraserBrush = {
      width: 20,
    }

    ;(fabric.Canvas as jest.Mock).mockReturnValue(mockCanvas)
    // PencilBrushのモックは、instanceofチェックが正しく動作するように設定
    ;(fabric.PencilBrush as jest.Mock).mockImplementation(function(canvas) {
      const instance = {
        canvas,
        color: '#000000',
        width: 10,
      }
      Object.setPrototypeOf(instance, fabric.PencilBrush.prototype)
      return instance
    })
  })

  test('complete workflow: change color, draw, undo, redo', async () => {
    render(<App />)
    
    // 赤色に変更
    const redButton = screen.getByText('赤色に変更')
    await userEvent.click(redButton)
    
    expect(fabric.PencilBrush).toHaveBeenCalledWith(mockCanvas)
    
    // 描画をシミュレート（path:createdイベント）
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    if (pathCreatedCallback) {
      pathCreatedCallback()
    }
    
    // 少し待ってから状態を確認
    await waitFor(() => {
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    }, { timeout: 100 })
    
    // アンドゥボタンがクリック可能になることを確認
    await waitFor(() => {
      const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
      expect(undoButton).not.toBeDisabled()
    })
  })

  test('brush properties are correctly set for different tools', async () => {
    render(<App />)
    
    // 初期化で1回PencilBrushが作成される
    const pencilBrushCall = (fabric.PencilBrush as jest.Mock).mock.calls[0]
    expect(pencilBrushCall[0]).toBe(mockCanvas)
    
    // 赤色ブラシ
    const redButton = screen.getByText('赤色に変更')
    await userEvent.click(redButton)
    
    // 太いブラシ
    const thickButton = screen.getByText('太くする')
    await userEvent.click(thickButton)
    
    // PencilBrushは初期化＋2回作成される
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(3)
    
    // 消しゴム
    ;(EraserBrush as jest.MockedFunction<typeof EraserBrush>).mockReturnValue(mockEraserBrush as ReturnType<typeof EraserBrush>)
    
    const eraserButton = screen.getByText('消しゴムに変更')
    await userEvent.click(eraserButton)
    
    expect(EraserBrush).toHaveBeenCalledWith(mockCanvas)
    
    // 消しゴムから戻る時は新しいPencilBrushが作成される
    await userEvent.click(redButton)
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(4)
  })

  test('keyboard shortcuts work correctly', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // clearとloadFromJSONのモックを設定
    mockCanvas.clear = jest.fn()
    
    // 描画をシミュレートして履歴を複数作成
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    if (pathCreatedCallback) {
      // 複数の履歴を作成
      pathCreatedCallback()
      await new Promise(resolve => setTimeout(resolve, 20))
      pathCreatedCallback()
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    
    await waitFor(() => {
      const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
      expect(undoButton).not.toBeDisabled()
    })
    
    // Ctrl+Zでアンドゥ
    await user.keyboard('{Control>}z{/Control}')
    
    await waitFor(() => {
      expect(mockCanvas.clear).toHaveBeenCalled()
      expect(mockCanvas.loadFromJSON).toHaveBeenCalled()
    })
    
    // Ctrl+Yでリドゥ
    await user.keyboard('{Control>}y{/Control}')
    
    await waitFor(() => {
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(2)
    })
  })

  test('eraser functionality works correctly', async () => {
    ;(EraserBrush as jest.MockedFunction<typeof EraserBrush>).mockReturnValue(mockEraserBrush as ReturnType<typeof EraserBrush>)
    
    render(<App />)
    
    const eraserButton = screen.getByText('消しゴムに変更')
    await userEvent.click(eraserButton)
    
    expect(EraserBrush).toHaveBeenCalledWith(mockCanvas)
    
    // 消しゴム使用をシミュレート（erasing:endイベント）
    const erasingEndCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'erasing:end'
    )?.[1]
    
    if (erasingEndCallback) {
      erasingEndCallback()
    }
    
    await waitFor(() => {
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    }, { timeout: 100 })
  })

  test('eraser mouse events save history correctly', async () => {
    ;(EraserBrush as jest.MockedFunction<typeof EraserBrush>).mockReturnValue(mockEraserBrush as ReturnType<typeof EraserBrush>)
    
    render(<App />)
    
    // 消しゴムに切り替え
    const eraserButton = screen.getByText('消しゴムに変更')
    await userEvent.click(eraserButton)
    
    // マウスダウンイベントをシミュレート
    const mouseDownCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'mouse:down'
    )?.[1]
    
    // マウスアップイベントをシミュレート
    const mouseUpCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'mouse:up'
    )?.[1]
    
    expect(mouseDownCallback).toBeDefined()
    expect(mouseUpCallback).toBeDefined()
    
    // 消しゴムでマウスダウン
    if (mouseDownCallback) {
      mouseDownCallback()
    }
    
    // 消しゴムでマウスアップ（履歴保存がトリガーされる）
    if (mouseUpCallback) {
      mouseUpCallback()
    }
    
    await waitFor(() => {
      expect(mockCanvas.toJSON).toHaveBeenCalled()
    }, { timeout: 100 })
  })

  test('object:added event sets erasable property', async () => {
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

  test('canvas cleanup on unmount', () => {
    const { unmount } = render(<App />)
    
    expect(fabric.Canvas).toHaveBeenCalledTimes(1)
    expect(mockCanvas.dispose).not.toHaveBeenCalled()
    
    unmount()
    
    expect(mockCanvas.dispose).toHaveBeenCalledTimes(1)
  })

  test('handles multiple rapid tool changes', async () => {
    render(<App />)
    
    // 初期化で1回呼ばれているので、それを考慮
    const initialCallCount = (fabric.PencilBrush as jest.Mock).mock.calls.length
    
    // 複数のツール変更を素早く実行
    const redButton = screen.getByText('赤色に変更')
    const blackButton = screen.getByText('黒色に変更')
    const thickButton = screen.getByText('太くする')
    const thinButton = screen.getByText('細くする')
    
    await userEvent.click(redButton)
    await userEvent.click(thickButton)
    await userEvent.click(blackButton)
    await userEvent.click(thinButton)
    
    // 実装では各ツール変更時に新しいPencilBrushが作成される
    // 初期化で1回 + 各ボタンクリックで4回 = 合計5回
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(initialCallCount + 4)
  })

  test('prevents default behavior for keyboard shortcuts', async () => {
    render(<App />)
    
    // Ctrl+Zイベントをシミュレート
    const ctrlZEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    })
    const preventDefaultSpy = jest.spyOn(ctrlZEvent, 'preventDefault')
    
    window.dispatchEvent(ctrlZEvent)
    
    expect(preventDefaultSpy).toHaveBeenCalled()
    
    // Ctrl+Yイベントをシミュレート
    const ctrlYEvent = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      bubbles: true,
    })
    const preventDefaultSpy2 = jest.spyOn(ctrlYEvent, 'preventDefault')
    
    window.dispatchEvent(ctrlYEvent)
    
    expect(preventDefaultSpy2).toHaveBeenCalled()
  })
})