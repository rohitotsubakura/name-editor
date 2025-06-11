import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../page'
import * as fabric from 'fabric'

// より詳細な統合テスト
describe('App Integration Tests', () => {
  let mockCanvas: any
  let mockPencilBrush: any
  let mockEraserBrush: any

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

    mockPencilBrush = {
      color: '#000000',
      width: 10,
    }

    mockEraserBrush = {
      width: 20,
    }

    ;(fabric.Canvas as jest.Mock).mockReturnValue(mockCanvas)
    ;(fabric.PencilBrush as jest.Mock).mockReturnValue(mockPencilBrush)
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
    
    // 赤色ブラシ
    const redButton = screen.getByText('赤色に変更')
    await userEvent.click(redButton)
    
    let pencilBrushCall = (fabric.PencilBrush as jest.Mock).mock.calls[0]
    expect(pencilBrushCall[0]).toBe(mockCanvas)
    
    // 太いブラシ
    const thickButton = screen.getByText('太くする')
    await userEvent.click(thickButton)
    
    pencilBrushCall = (fabric.PencilBrush as jest.Mock).mock.calls[1]
    expect(pencilBrushCall[0]).toBe(mockCanvas)
    
    // 消しゴム
    const { EraserBrush } = require('@erase2d/fabric')
    EraserBrush.mockReturnValue(mockEraserBrush)
    
    const eraserButton = screen.getByText('消しゴムに変更')
    await userEvent.click(eraserButton)
    
    expect(EraserBrush).toHaveBeenCalledWith(mockCanvas)
  })

  test('keyboard shortcuts work correctly', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // 描画をシミュレートして履歴を作成
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    if (pathCreatedCallback) {
      pathCreatedCallback()
    }
    
    await waitFor(() => {
      const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
      expect(undoButton).not.toBeDisabled()
    })
    
    // Ctrl+Zでアンドゥ
    await user.keyboard('{Control>}z{/Control}')
    
    await waitFor(() => {
      expect(mockCanvas.loadFromJSON).toHaveBeenCalled()
    })
    
    // Ctrl+Yでリドゥ
    await user.keyboard('{Control>}y{/Control}')
    
    await waitFor(() => {
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(2)
    })
  })

  test('eraser functionality works correctly', async () => {
    const { EraserBrush } = require('@erase2d/fabric')
    EraserBrush.mockReturnValue(mockEraserBrush)
    
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
    
    // 複数のツール変更を素早く実行
    const redButton = screen.getByText('赤色に変更')
    const blackButton = screen.getByText('黒色に変更')
    const thickButton = screen.getByText('太くする')
    const thinButton = screen.getByText('細くする')
    
    await userEvent.click(redButton)
    await userEvent.click(thickButton)
    await userEvent.click(blackButton)
    await userEvent.click(thinButton)
    
    // PencilBrushが適切に呼ばれることを確認
    expect(fabric.PencilBrush).toHaveBeenCalledTimes(4)
  })

  test('prevents default behavior for keyboard shortcuts', async () => {
    render(<App />)
    
    const preventDefaultSpy = jest.fn()
    
    // Ctrl+Zイベント
    fireEvent.keyDown(window, {
      key: 'z',
      ctrlKey: true,
      preventDefault: preventDefaultSpy,
    })
    
    expect(preventDefaultSpy).toHaveBeenCalled()
    
    preventDefaultSpy.mockClear()
    
    // Ctrl+Yイベント
    fireEvent.keyDown(window, {
      key: 'y',
      ctrlKey: true,
      preventDefault: preventDefaultSpy,
    })
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})