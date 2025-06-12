"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { EraserBrush } from "@erase2d/fabric";

const DEFULT_COLOR = "#000000";
const DEFULT_WIDTH = 10;
const MAX_HISTORY_SIZE = 50; // 履歴の最大保存数

export const App = () => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

  const [color, setColor] = useState<string>(DEFULT_COLOR);
  const [width, setWidth] = useState<number>(DEFULT_WIDTH);

  // アンドゥ・リドゥ用の状態管理
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isUpdatingHistory, setIsUpdatingHistory] = useState<boolean>(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (canvasEl.current === null) {
      return;
    }
    
    try {
      const canvas = new fabric.Canvas(canvasEl.current);
      setCanvas(canvas);

    // 手書き機能
    const pen = new fabric.PencilBrush(canvas);
    pen.color = color;
    pen.width = width;
    canvas.freeDrawingBrush = pen;
    canvas.isDrawingMode = true;

    // 消しゴムで消せるようにする
    canvas.on("object:added", (event) => {
      event.target.erasable = true;
    });

    // 初期状態を履歴に保存
    const initialState = JSON.stringify(canvas.toJSON());
    const initialHistory = [initialState];
    setHistory(initialHistory);
    setHistoryIndex(0);
    historyRef.current = initialHistory;
    historyIndexRef.current = 0;

    // 履歴に状態を保存する関数
    const saveState = () => {
      if (isUpdatingHistory) return; // 履歴更新中は保存しない
      
      const canvasState = JSON.stringify(canvas.toJSON());
      const currentIndex = historyIndexRef.current;
      const currentHistory = historyRef.current;
      
      // 現在のインデックス以降を削除して新しい状態を追加
      const newHistory = currentHistory.slice(0, currentIndex + 1);
      newHistory.push(canvasState);
      
      // 履歴サイズ制限
      let finalHistory = newHistory;
      let newIndex = newHistory.length - 1;
      
      if (newHistory.length > MAX_HISTORY_SIZE) {
        finalHistory = newHistory.slice(1); // 最初の要素を削除
        newIndex = finalHistory.length - 1;
      }
      
      // インデックスが配列の範囲内であることを確認
      if (newIndex >= finalHistory.length) {
        newIndex = finalHistory.length - 1;
      }
      if (newIndex < 0) {
        newIndex = 0;
      }
      
      // デバッグ情報
      const debugInfo = {
        beforeIndex: currentIndex,
        afterIndex: newIndex,
        historyLength: finalHistory.length,
        newHistoryLength: newHistory.length
      };
      console.log('SaveState debug:', debugInfo);
      
      // 状態を同期的に更新
      historyRef.current = finalHistory;
      historyIndexRef.current = newIndex;
      setHistory(finalHistory);
      setHistoryIndex(newIndex);
      
      console.log('State saved:', {
        historyLength: finalHistory.length,
        currentIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: newIndex < finalHistory.length - 1,
        beforeIndex: currentIndex,
        afterIndex: newIndex
      });
      
      alert(`State saved: length=${finalHistory.length}, index=${newIndex}`);
    };

    // 描画完了時に履歴を保存
    canvas.on("path:created", () => {
      setTimeout(saveState, 10); // 少し遅延させてオブジェクトが確実に追加されてから保存
    });

    // 消しゴム使用完了時に履歴を保存
    // 重複保存を防ぐためのフラグ
    let eraserSaveTimeout: NodeJS.Timeout | null = null;
    
    const saveStateAfterErasing = () => {
      console.log('saveStateAfterErasing called');
      // 既存のタイムアウトをクリア
      if (eraserSaveTimeout) {
        console.log('Clearing existing timeout');
        clearTimeout(eraserSaveTimeout);
      }
      // 新しいタイムアウトを設定
      eraserSaveTimeout = setTimeout(() => {
        console.log('Executing delayed saveState for eraser');
        saveState();
        eraserSaveTimeout = null;
        console.log('Eraser state saved');
      }, 50); // 少し長めの遅延で重複を防ぐ
    };

    // 消しゴムの主要イベントのみ監視
    canvas.on("erasing:end", () => {
      console.log('Erasing end event fired');
      saveStateAfterErasing();
    });

    // オブジェクトが変更された時（消しゴムで部分的に消された時）
    canvas.on("object:modified", () => {
      if (canvas.freeDrawingBrush instanceof EraserBrush) {
        console.log('Object modified by eraser');
        saveStateAfterErasing();
      }
    });

    // 消しゴムの詳細なイベント監視
    canvas.on("erasing:start", () => {
      console.log('Erasing start event fired');
    });

    // オブジェクトが削除された時
    canvas.on("object:removed", () => {
      console.log('Object removed event fired');
      if (canvas.freeDrawingBrush instanceof EraserBrush) {
        console.log('Object removed by eraser');
        saveStateAfterErasing();
      }
    });

    // パスが削除された時
    canvas.on("path:removed", () => {
      console.log('Path removed event fired');
      if (canvas.freeDrawingBrush instanceof EraserBrush) {
        console.log('Path removed by eraser');
        saveStateAfterErasing();
      }
    });

    // マウスイベントでの消しゴム監視
    let eraserMouseDown = false;
    canvas.on("mouse:down", (e) => {
      if (canvas.freeDrawingBrush instanceof EraserBrush) {
        console.log('Mouse down with eraser', e);
        eraserMouseDown = true;
      }
    });

    canvas.on("mouse:up", (e) => {
      if (canvas.freeDrawingBrush instanceof EraserBrush && eraserMouseDown) {
        console.log('Mouse up with eraser', e);
        eraserMouseDown = false;
        // マウスアップ時に強制的に履歴を保存
        setTimeout(() => {
          console.log('Force saving state after eraser mouse up');
          saveState();
        }, 100);
      }
    });

      return () => {
        try {
          canvas.dispose();
        } catch (error) {
          console.error('Error disposing canvas:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ブラシの色と太さを更新する useEffect
  useEffect(() => {
    if (canvas && canvas.freeDrawingBrush && canvas.freeDrawingBrush instanceof fabric.PencilBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = width;
    }
  }, [canvas, color, width]);

  // refの値を同期
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // アンドゥ機能
  const undo = useCallback(() => {
    console.log('=== UNDO FUNCTION START ===');
    const debugInfo = {
      hasCanvas: !!canvas,
      currentIndex: historyIndexRef.current,
      stateIndex: historyIndex,
      historyLength: historyRef.current.length,
      condition: historyIndexRef.current <= 0
    };
    console.log('Undo function called', debugInfo);
    
    if (!canvas) {
      console.log('Undo early return - no canvas');
      return;
    }
    console.log('Canvas check passed');
    
    if (historyIndexRef.current <= 0) {
      console.log('Undo early return - at beginning');
      return;
    }
    console.log('Beginning check passed');
    
    if (historyIndexRef.current >= historyRef.current.length) {
      alert(`Index out of bounds: ${historyIndexRef.current} >= ${historyRef.current.length}`);
      console.log('Undo early return - index out of bounds, fixing...');
      // インデックスを修正
      const correctedIndex = historyRef.current.length - 1;
      historyIndexRef.current = correctedIndex;
      setHistoryIndex(correctedIndex);
      alert(`Index corrected to: ${correctedIndex}`);
      console.log(`Index corrected to: ${correctedIndex}`);
      // 修正後、アンドゥを続行
    }
    console.log('Bounds check passed or corrected');
    
    // 修正後、再度条件をチェック
    if (historyIndexRef.current <= 0) {
      console.log('Undo early return - at beginning after correction');
      return;
    }
    console.log('Final beginning check passed');
    
    const currentHistory = historyRef.current;
    const newIndex = historyIndexRef.current - 1;
    const prevState = currentHistory[newIndex];
    
    console.log('Undo processing:', {
      currentIndex: historyIndexRef.current,
      newIndex,
      historyLength: currentHistory.length,
      hasState: !!prevState
    });
    
    console.log('Setting isUpdatingHistory to true');
    setIsUpdatingHistory(true);
    
    try {
      if (!prevState) {
        console.error('Error: prevState is null or undefined');
        setIsUpdatingHistory(false);
        return;
      }
      console.log('prevState exists, calling loadFromJSON');
      
      canvas.loadFromJSON(prevState, () => {
        alert(`UNDO CALLBACK EXECUTED! Setting index to ${newIndex}`);
        console.log('=== UNDO CALLBACK START ===');
        console.log('Undo loadFromJSON callback executed');
        canvas.renderAll();
        console.log('Canvas rendered');
        // 描画モードを確実に有効にする
        canvas.isDrawingMode = true;
        console.log('Drawing mode enabled');
        setHistoryIndex(newIndex);
        console.log('setHistoryIndex called with:', newIndex);
        historyIndexRef.current = newIndex;
        console.log('historyIndexRef updated to:', newIndex);
        setIsUpdatingHistory(false);
        console.log('isUpdatingHistory set to false');
        console.log('=== UNDO CALLBACK END ===');
      });
      console.log('loadFromJSON called, waiting for callback');
    } catch (error) {
      console.error('Undo error:', error);
      setIsUpdatingHistory(false);
    }
    console.log('=== UNDO FUNCTION END ===');
  }, [canvas, historyIndex]);

  // リドゥ機能
  const redo = useCallback(() => {
    const currentHistory = historyRef.current;
    if (!canvas || historyIndexRef.current >= currentHistory.length - 1) return;
    
    const newIndex = historyIndexRef.current + 1;
    const nextState = currentHistory[newIndex];
    
    console.log('Redo:', {
      currentIndex: historyIndexRef.current,
      newIndex,
      historyLength: currentHistory.length,
      hasState: !!nextState
    });
    
    setIsUpdatingHistory(true);
    
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      // 描画モードを確実に有効にする
      canvas.isDrawingMode = true;
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      setIsUpdatingHistory(false);
    });
  }, [canvas]);

  // キーボードショートカットの設定
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          undo();
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  const changeToRed = () => {
   if (!canvas) {
     return;
   }
   // 消しゴムから切り替える場合は新しいPencilBrushを作成
   if (!(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
     canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
     canvas.freeDrawingBrush.width = width;
   }
   canvas.isDrawingMode = true;
   setColor("#ff0000");
 };

 const changeToBlack = () => {
   if (!canvas) {
    return;
   }
   // 消しゴムから切り替える場合は新しいPencilBrushを作成
   if (!(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
     canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
     canvas.freeDrawingBrush.width = width;
   }
   canvas.isDrawingMode = true;
   setColor("#000000");
 };

 const changeToThick = () => {
   if (!canvas) {
     return;
   }
   // 消しゴムから切り替える場合は新しいPencilBrushを作成
   if (!(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
     canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
     canvas.freeDrawingBrush.color = color;
   }
   canvas.isDrawingMode = true;
   setWidth(20);
 };

 const changeToThin = () => {
   if (!canvas) {
     return;
   }
   // 消しゴムから切り替える場合は新しいPencilBrushを作成
   if (!(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
     canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
     canvas.freeDrawingBrush.color = color;
   }
   canvas.isDrawingMode = true;
   setWidth(10);
 };

 const changeToEraser = () => {
  if (!canvas) {
    return;
  }
  const eraser = new EraserBrush(canvas);
  canvas.freeDrawingBrush = eraser;
  canvas.freeDrawingBrush.width = 20;
  canvas.isDrawingMode = true;
 };

 return (
   <div>
     <div style={{ marginBottom: '10px' }}>
       <button onClick={undo} disabled={historyIndex <= 0}>
         アンドゥ (Ctrl+Z)
       </button>
       <button onClick={redo} disabled={historyIndex >= history.length - 1}>
         リドゥ (Ctrl+Y)
       </button>
       <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
         履歴: {historyIndex + 1}/{history.length}
       </span>
     </div>
     <div style={{ marginBottom: '10px' }}>
       <button onClick={changeToRed}>赤色に変更</button>
       <button onClick={changeToBlack}>黒色に変更</button>
       <button onClick={changeToThick}>太くする</button>
       <button onClick={changeToThin}>細くする</button>
       <button onClick={changeToEraser}>消しゴムに変更</button>
     </div>
     <canvas ref={canvasEl} width="1000" height="1000" />
   </div>
 );
};

export default App;
