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
  const [isRedoing, setIsRedoing] = useState<boolean>(false);
  const historyIndexRef = useRef<number>(-1);
  const isRedoingRef = useRef<boolean>(false);

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
    setHistory([initialState]);
    setHistoryIndex(0);
    historyIndexRef.current = 0;

    // 履歴に状態を保存する関数
    const saveState = () => {
      if (isRedoingRef.current) return; // リドゥ中は履歴を保存しない
      
      const canvasState = JSON.stringify(canvas.toJSON());
      setHistory(prev => {
        const currentIndex = historyIndexRef.current;
        const newHistory = prev.slice(0, currentIndex + 1); // 現在のインデックス以降を削除
        newHistory.push(canvasState);
        
        // 履歴サイズ制限
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
          return newHistory;
        }
        
        return newHistory;
      });
      
      const newIndex = Math.min(historyIndexRef.current + 1, MAX_HISTORY_SIZE - 1);
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
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
  }, [color, width]);

  // refの値を同期
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    isRedoingRef.current = isRedoing;
  }, [isRedoing]);

  // アンドゥ機能
  const undo = useCallback(() => {
    if (!canvas || historyIndex <= 0) return;
    
    const prevState = history[historyIndex - 1];
    setIsRedoing(true);
    
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      setIsRedoing(false);
    });
  }, [canvas, historyIndex, history]);

  // リドゥ機能
  const redo = useCallback(() => {
    if (!canvas || historyIndex >= history.length - 1) return;
    
    const nextState = history[historyIndex + 1];
    setIsRedoing(true);
    
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      setIsRedoing(false);
    });
  }, [canvas, historyIndex, history]);

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
  }, [canvas, historyIndex, history, undo, redo]);

  const changeToRed = () => {
   if (canvas?.freeDrawingBrush === undefined) {
     return;
   }
   canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
   canvas.freeDrawingBrush.color = "#ff0000";
   canvas.freeDrawingBrush.width = width;
   setColor("#ff0000");
 };

 const changeToBlack = () => {
   if (canvas?.freeDrawingBrush === undefined) {
    return;
   }
   canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
   canvas.freeDrawingBrush.color = "#000000";
   canvas.freeDrawingBrush.width = width;
   setColor("#000000");
 };

 const changeToThick = () => {
   if (canvas?.freeDrawingBrush === undefined) {
     return;
   }
   canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
   canvas.freeDrawingBrush.width = 20;
   canvas.freeDrawingBrush.color = color;
   setWidth(20);
 };

 const changeToThin = () => {
   if (canvas?.freeDrawingBrush === undefined) {
     return;
   }
   canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
   canvas.freeDrawingBrush.width = 10;
   canvas.freeDrawingBrush.color = color;
   setWidth(10);
 };

 const changeToEraser = () => {
  if (canvas?.freeDrawingBrush === undefined) {
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
