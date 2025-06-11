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
      
      // 状態を同期的に更新
      historyRef.current = finalHistory;
      historyIndexRef.current = newIndex;
      setHistory(finalHistory);
      setHistoryIndex(newIndex);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('State saved:', {
          historyLength: finalHistory.length,
          currentIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: newIndex < finalHistory.length - 1
        });
      }
    };

    // 描画完了時に履歴を保存
    canvas.on("path:created", () => {
      setTimeout(saveState, 10); // 少し遅延させてオブジェクトが確実に追加されてから保存
    });

    // 消しゴム使用完了時に履歴を保存
    canvas.on("erasing:end", () => {
      setTimeout(saveState, 10);
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
    if (!canvas || historyIndexRef.current <= 0) return;
    
    const currentHistory = historyRef.current;
    const newIndex = historyIndexRef.current - 1;
    const prevState = currentHistory[newIndex];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Undo:', {
        currentIndex: historyIndexRef.current,
        newIndex,
        historyLength: currentHistory.length,
        hasState: !!prevState
      });
    }
    
    setIsUpdatingHistory(true);
    
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      setIsUpdatingHistory(false);
    });
  }, [canvas]);

  // リドゥ機能
  const redo = useCallback(() => {
    const currentHistory = historyRef.current;
    if (!canvas || historyIndexRef.current >= currentHistory.length - 1) return;
    
    const newIndex = historyIndexRef.current + 1;
    const nextState = currentHistory[newIndex];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Redo:', {
        currentIndex: historyIndexRef.current,
        newIndex,
        historyLength: currentHistory.length,
        hasState: !!nextState
      });
    }
    
    setIsUpdatingHistory(true);
    
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
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
   setWidth(10);
 };

 const changeToEraser = () => {
  if (!canvas) {
    return;
  }
  const eraser = new EraserBrush(canvas);
  canvas.freeDrawingBrush = eraser;
  canvas.freeDrawingBrush.width = 20;
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
