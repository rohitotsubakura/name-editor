"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { EraserBrush } from "@erase2d/fabric";

const DEFULT_COLOR = "#000000";
const DEFULT_WIDTH = 10;

export const App = () => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);

  const [color, setColor] = useState<string>(DEFULT_COLOR);
  const [width, setWidth] = useState<number>(DEFULT_WIDTH);

  useEffect(() => {
    if (canvasEl.current === null) {
      return;
    }
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

    return () => {
      canvas.dispose();
    };
  }, []);

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
     <button onClick={changeToRed}>赤色に変更</button>
     <button onClick={changeToBlack}>黒色に変更</button>
     <button onClick={changeToThick}>太くする</button>
     <button onClick={changeToThin}>細くする</button>
     <button onClick={changeToEraser}>消しゴムに変更</button>
     <canvas ref={canvasEl} width="1000" height="1000" />
   </div>
 );
};

export default App;
