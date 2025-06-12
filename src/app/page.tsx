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
      
      
      // 状態を同期的に更新
      historyRef.current = finalHistory;
      historyIndexRef.current = newIndex;
      setHistory(finalHistory);
      setHistoryIndex(newIndex);
      
    };

    // 描画完了時に履歴を保存
    canvas.on("path:created", () => {
      setTimeout(saveState, 10); // 少し遅延させてオブジェクトが確実に追加されてから保存
    });

    // 消しゴム使用完了時に履歴を保存
    // 重複保存を防ぐためのフラグ
    let eraserSaveTimeout: NodeJS.Timeout | null = null;
    
    const saveStateAfterErasing = () => {
      // 既存のタイムアウトをクリア
      if (eraserSaveTimeout) {
        clearTimeout(eraserSaveTimeout);
      }
      // 新しいタイムアウトを設定
      eraserSaveTimeout = setTimeout(() => {
        saveState();
        eraserSaveTimeout = null;
      }, 50); // 少し長めの遅延で重複を防ぐ
    };

    // 消しゴムの主要イベントのみ監視
    canvas.on("erasing:end", () => {
      saveStateAfterErasing();
    });

    // オブジェクトが変更された時（消しゴムで部分的に消された時）
    canvas.on("object:modified", () => {
      if (isUpdatingHistory) return;
      if (canvas.freeDrawingBrush instanceof EraserBrush) {
        saveStateAfterErasing();
      }
    });

    // 消しゴムの詳細なイベント監視
    canvas.on("erasing:start", () => {
    });

    // オブジェクトが削除された時
    canvas.on("object:removed", () => {
      if (isUpdatingHistory) return;
      if (canvas.freeDrawingBrush instanceof EraserBrush) {
        saveStateAfterErasing();
      }
    });

    // マウスイベントでの消しゴム監視
    let eraserMouseDown = false;
    canvas.on("mouse:down", () => {
      if (canvas.freeDrawingBrush instanceof EraserBrush) {
        eraserMouseDown = true;
      }
    });

    canvas.on("mouse:up", () => {
      if (canvas.freeDrawingBrush instanceof EraserBrush && eraserMouseDown) {
        setTimeout(() => {
          saveState();
        }, 100);
      }
    });

      return () => {
        try {
          canvas.dispose();
        } catch {
        }
      };
    } catch {
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
  const undo = useCallback(async () => {
    if (!canvas) {
      return;
    }
    
    if (historyIndexRef.current <= 0) {
      return;
    }
    
    if (historyIndexRef.current >= historyRef.current.length) {
      historyIndexRef.current = historyRef.current.length - 1;
      setHistoryIndex(historyRef.current.length - 1);
    }
    
    if (historyIndexRef.current <= 0) {
      return;
    }
    
    const currentHistory = historyRef.current;
    const newIndex = historyIndexRef.current - 1;
    const prevState = currentHistory[newIndex];
    
    setIsUpdatingHistory(true);
    
    try {
      if (!prevState) {
        setIsUpdatingHistory(false);
        return;
      }
      canvas.clear();
      await canvas.loadFromJSON(prevState);
      canvas.renderAll();
      canvas.isDrawingMode = true;
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      setIsUpdatingHistory(false);
    } catch {
      setIsUpdatingHistory(false);
    }
  }, [canvas]);

  // リドゥ機能
  const redo = useCallback(async () => {
    const currentHistory = historyRef.current;
    if (!canvas || historyIndexRef.current >= currentHistory.length - 1) return;

    const newIndex = historyIndexRef.current + 1;
    const nextState = currentHistory[newIndex];

    setIsUpdatingHistory(true);

    try {
      if (!nextState) {
        setIsUpdatingHistory(false);
        return;
      }
      canvas.clear();
      await canvas.loadFromJSON(nextState);
      canvas.renderAll();
      canvas.isDrawingMode = true;
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      setIsUpdatingHistory(false);
    } catch {
      setIsUpdatingHistory(false);
    }
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
    if (!canvas || isUpdatingHistory) return;
    const pen = new fabric.PencilBrush(canvas);
    pen.color = "#ff0000";
    pen.width = width;
    canvas.freeDrawingBrush = pen;
    canvas.isDrawingMode = true;
    setColor("#ff0000");
  };

  const changeToBlack = () => {
    if (!canvas || isUpdatingHistory) return;
    const pen = new fabric.PencilBrush(canvas);
    pen.color = "#000000";
    pen.width = width;
    canvas.freeDrawingBrush = pen;
    canvas.isDrawingMode = true;
    setColor("#000000");
  };

  const changeToThick = () => {
    if (!canvas || isUpdatingHistory) return;
    const pen = new fabric.PencilBrush(canvas);
    pen.color = color;
    pen.width = 20;
    canvas.freeDrawingBrush = pen;
    canvas.isDrawingMode = true;
    setWidth(20);
  };

  const changeToThin = () => {
    if (!canvas || isUpdatingHistory) return;
    const pen = new fabric.PencilBrush(canvas);
    pen.color = color;
    pen.width = 10;
    canvas.freeDrawingBrush = pen;
    canvas.isDrawingMode = true;
    setWidth(10);
  };

  const changeToEraser = () => {
    if (!canvas || isUpdatingHistory) return;
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
