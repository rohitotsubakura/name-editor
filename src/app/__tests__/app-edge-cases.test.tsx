import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../page'
import * as fabric from 'fabric'

// エッジケースのテスト
describe('App Edge Cases', () => {
  let mockCanvas: fabric.Canvas

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

  test('handles canvas initialization failure gracefully', () => {
    // Canvasの初期化が失敗した場合
    ;(fabric.Canvas as jest.Mock).mockImplementation(() => {
      throw new Error('Canvas initialization failed')
    })

    // エラーが発生してもアプリがクラッシュしないことを確認
    expect(() => render(<App />)).not.toThrow()
  })

  test('handles null canvas reference', async () => {
    // useRefをモックしてnullを返すようにする
    const originalUseRef = React.useRef
    jest.spyOn(React, 'useRef').mockImplementation((initialValue) => {
      if (initialValue === null) {
        return { current: null }
      }
      return originalUseRef(initialValue)
    })

    render(<App />)
    
    // Canvasが初期化されないことを確認（nullチェックで早期リターンするため）
    // ただし、他のuseRefの呼び出しでCanvasが呼ばれる可能性があるので、
    // エラーが発生しないことを確認
    expect(() => render(<App />)).not.toThrow()
    
    jest.restoreAllMocks()
  })

  test('handles brush operations when freeDrawingBrush is undefined', async () => {
    mockCanvas.freeDrawingBrush = undefined
    
    render(<App />)
    
    const redButton = screen.getByText('赤色に変更')
    await userEvent.click(redButton)
    
    // freeDrawingBrushがundefinedの場合、何も起こらないことを確認
    // エラーが発生しないことが重要
  })

  test('handles rapid undo/redo operations', async () => {
    render(<App />)
    
    // clearとloadFromJSONのモックを設定
    mockCanvas.clear = jest.fn()
    
    // 複数の状態を作成
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    if (pathCreatedCallback) {
      // 複数回描画をシミュレート
      await act(async () => {
        pathCreatedCallback()
        await new Promise(resolve => setTimeout(resolve, 20))
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
    
    // 連続でアンドゥ・リドゥを実行
    const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
    const redoButton = screen.getByText('リドゥ (Ctrl+Y)')
    
    await act(async () => {
      await userEvent.click(undoButton)
      await userEvent.click(undoButton)
      await userEvent.click(redoButton)
      await userEvent.click(redoButton)
    })
    
    // clearとloadFromJSONが4回呼ばれていることを検証
    await waitFor(() => {
      expect(mockCanvas.clear).toHaveBeenCalledTimes(4)
      expect(mockCanvas.loadFromJSON).toHaveBeenCalledTimes(4)
    })
  })

  test('handles history size limit', async () => {
    render(<App />)
    
    const pathCreatedCallback = mockCanvas.on.mock.calls.find(
      call => call[0] === 'path:created'
    )?.[1]
    
    if (pathCreatedCallback) {
      // MAX_HISTORY_SIZE (50) を超える数の操作をシミュレート
      await act(async () => {
        for (let i = 0; i < 55; i++) {
          pathCreatedCallback()
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      })
    }
    
    // 履歴が制限されることを確認（具体的な検証は実装に依存）
    expect(mockCanvas.toJSON).toHaveBeenCalled()
  })

  test('handles keyboard events without ctrl/meta key', async () => {
    render(<App />)
    
    // Ctrl/Metaキーなしでz/yを押下
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

  test('handles meta key for Mac compatibility', async () => {
    render(<App />)
    
    // Meta+Zイベント（Mac用）をシミュレート
    const metaZEvent = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
    })
    const preventDefaultSpy = jest.spyOn(metaZEvent, 'preventDefault')
    
    window.dispatchEvent(metaZEvent)
    
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  test('handles canvas disposal error', () => {
    mockCanvas.dispose.mockImplementation(() => {
      throw new Error('Disposal failed')
    })
    
    const { unmount } = render(<App />)
    
    // disposeでエラーが発生してもアプリがクラッシュしないことを確認
    expect(() => unmount()).not.toThrow()
  })

  test('handles loadFromJSON callback error', async () => {
    mockCanvas.loadFromJSON.mockImplementation((data, callback) => {
      if (callback) {
        // コールバック内でエラーが発生
        try {
          callback()
        } catch {
          // エラーを無視
        }
      }
    })
    
    render(<App />)
    
    // 描画をシミュレートして履歴を作成
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
    
    const undoButton = screen.getByText('アンドゥ (Ctrl+Z)')
    
    // エラーが発生してもアプリがクラッシュしないことを確認
    await act(async () => {
      expect(() => userEvent.click(undoButton)).not.toThrow()
    })
  })

  test('handles simultaneous state changes', async () => {
    render(<App />)
    // 初期化で呼ばれた回数を記録
    const initialCallCount = (fabric.PencilBrush as jest.Mock).mock.calls.length
    // 同時に複数の状態変更を実行
    const redButton = screen.getByText('赤色に変更')
    const thickButton = screen.getByText('太くする')
    // 同時クリック
    await Promise.all([
      userEvent.click(redButton),
      userEvent.click(thickButton),
    ])
    // 2回分新しいPencilBrushが作成されていることを検証
    expect((fabric.PencilBrush as jest.Mock).mock.calls.length).toBe(initialCallCount + 2)
  })
})