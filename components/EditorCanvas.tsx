import React, { useRef, useState, useEffect } from 'react';
import { SlideAnalysisResult, ElementType, SlideTextElement, SlideVisualElement, BoundingBox } from '../types';

interface EditorCanvasProps {
  imageSrc: string;
  data: SlideAnalysisResult;
  selectedId: string | null;
  visibleLayers: { text: boolean; visual: boolean; background: boolean };
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, newBox: BoundingBox) => void;
  // Erasure Props
  isErasureMode?: boolean;
  erasureBoxes?: BoundingBox[];
  onAddErasureBox?: (box: BoundingBox) => void;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({ 
  imageSrc, 
  data, 
  selectedId,
  visibleLayers,
  onSelect,
  onUpdateElement,
  isErasureMode,
  erasureBoxes,
  onAddErasureBox
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    action: 'move' | 'draw_erasure';
    startX: number;
    startY: number;
    initialBox: BoundingBox;
  } | null>(null);

  // Drawing state for erasure
  const [drawingBox, setDrawingBox] = useState<BoundingBox | null>(null);

  // Helper to check intersection
  const isOverlapping = (box1: BoundingBox, box2: BoundingBox) => {
    const b1Right = box1.left + box1.width;
    const b1Bottom = box1.top + box1.height;
    const b2Right = box2.left + box2.width;
    const b2Bottom = box2.top + box2.height;
    
    return !(box1.left >= b2Right || 
             b1Right <= box2.left || 
             box1.top >= b2Bottom || 
             b1Bottom <= box2.top);
  };

  const getTextStyles = (style: SlideTextElement['style']) => {
    let classes = "";
    if (style.fontSize === 'title') classes += " text-4xl md:text-5xl leading-tight";
    else if (style.fontSize === 'large') classes += " text-2xl md:text-3xl leading-snug";
    else if (style.fontSize === 'medium') classes += " text-lg md:text-xl leading-normal";
    else if (style.fontSize === 'small') classes += " text-xs md:text-sm leading-normal";
    else classes += " text-base";

    if (style.fontWeight === 'bold') classes += " font-bold";
    else classes += " font-normal";

    if (style.alignment === 'center') classes += " text-center";
    else if (style.alignment === 'right') classes += " text-right";
    else classes += " text-left";

    return classes;
  };

  const handleMouseDown = (e: React.MouseEvent, id: string | null, box?: BoundingBox) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    if (isErasureMode) {
        // Start Drawing Erasure Box
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        
        setDragState({
            id: 'erasure_drawing',
            action: 'draw_erasure',
            startX,
            startY,
            initialBox: { top: 0, left: 0, width: 0, height: 0 }
        });

        const relX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        const relY = ((e.clientY - containerRect.top) / containerRect.height) * 100;
        setDrawingBox({ top: relY, left: relX, width: 0, height: 0 });

    } else if (id && box) {
        // Normal Move Mode
        e.stopPropagation();
        onSelect(id);
        setDragState({
            id,
            action: 'move',
            startX: e.clientX,
            startY: e.clientY,
            initialBox: { ...box }
        });
    } else {
        // Click on background in normal mode -> Deselect
        onSelect(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const deltaPercentX = (deltaX / containerRect.width) * 100;
    const deltaPercentY = (deltaY / containerRect.height) * 100;

    if (dragState.action === 'move') {
        const newBox = {
            ...dragState.initialBox,
            left: dragState.initialBox.left + deltaPercentX,
            top: dragState.initialBox.top + deltaPercentY,
        };
        onUpdateElement(dragState.id, newBox);
    } else if (dragState.action === 'draw_erasure' && drawingBox) {
         // Update drawing box for erasure
         const rawWidth = ((e.clientX - dragState.startX) / containerRect.width) * 100;
         const rawHeight = ((e.clientY - dragState.startY) / containerRect.height) * 100;

         setDrawingBox({
             ...drawingBox,
             width: rawWidth,
             height: rawHeight
         });
    }
  };

  const handleMouseUp = () => {
    if (dragState?.action === 'draw_erasure' && drawingBox && onAddErasureBox) {
         // Finalize erasure box
         let finalBox = { ...drawingBox };
         if (finalBox.width < 0) {
             finalBox.left += finalBox.width;
             finalBox.width = Math.abs(finalBox.width);
         }
         if (finalBox.height < 0) {
             finalBox.top += finalBox.height;
             finalBox.height = Math.abs(finalBox.height);
         }
         
         if (finalBox.width > 0.5 && finalBox.height > 0.5) {
             onAddErasureBox(finalBox);
         }
         setDrawingBox(null);
    }
    setDragState(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setDragState(null);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div 
      className={`flex-1 bg-white dark:bg-slate-950 overflow-auto flex items-center justify-center p-20 relative transition-colors duration-200 ${isErasureMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp} // Added for drawing
      onClick={() => !isErasureMode && onSelect(null)}
    >
      <div 
        ref={containerRef}
        className="relative bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 select-none border-2 border-slate-300 dark:border-slate-700"
        style={{ 
          width: '1024px', 
          height: '576px', 
          minWidth: '1024px',
          minHeight: '576px'
        }}
        onClick={(e) => e.stopPropagation()} 
        onMouseDown={(e) => handleMouseDown(e, null)} // Background click/draw
      >
        <div className="absolute -top-8 left-0 flex items-center gap-2">
             <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">PPT 导出区域 (16:9)</span>
             {isErasureMode && <span className="text-sm font-bold text-red-500 bg-red-100 px-2 py-1 rounded animate-pulse">擦除模式: 框选背景区域</span>}
        </div>

        {/* Background Layer - Uses cleaned image (no text) */}
        {visibleLayers.background && (
           <div 
             className="absolute inset-0 z-0 pointer-events-none"
             style={{ 
               backgroundColor: data.backgroundColor,
               backgroundImage: data.cleanedImage ? `url(${data.cleanedImage})` : undefined,
               backgroundSize: '100% 100%' 
             }}
           />
        )}

        {/* Elements (Visual & Text) - Only interactive if NOT erasing */}
        {data.elements.map(el => {
          if (el.isHidden) return null;
          const interactive = !isErasureMode;

          if (el.type === ElementType.VISUAL && visibleLayers.visual) {
            const visualEl = el as SlideVisualElement;
            const isCustom = !!visualEl.customImage;
            const boxForBg = visualEl.originalBox || visualEl.box;

            const hasTextOverlap = data.elements.some(otherEl => 
                otherEl.type === ElementType.TEXT && isOverlapping(boxForBg, otherEl.box)
            );
            const sourceImage = (hasTextOverlap && data.cleanedImage) ? data.cleanedImage : imageSrc;

            return (
              <div
                key={el.id}
                onMouseDown={(e) => interactive && handleMouseDown(e, el.id, el.box)}
                className={`absolute overflow-hidden z-10 transition-shadow group
                    ${interactive ? 'cursor-move hover:outline hover:outline-2 hover:outline-blue-400' : 'pointer-events-none opacity-50'} 
                    ${selectedId === el.id ? 'outline outline-2 outline-black shadow-lg z-30' : ''}`}
                style={{
                  top: `${el.box.top}%`,
                  left: `${el.box.left}%`,
                  width: `${el.box.width}%`,
                  height: `${el.box.height}%`,
                }}
                title={interactive ? (hasTextOverlap ? "Visual (Cleaned Source)" : "Visual (Original Source)") : ""}
              >
                <div 
                  className="w-full h-full pointer-events-none"
                  style={{
                    backgroundImage: isCustom ? `url(${visualEl.customImage})` : `url(${sourceImage})`,
                    backgroundSize: isCustom ? '100% 100%' : `${10000 / boxForBg.width}% ${10000 / boxForBg.height}%`,
                    backgroundPosition: isCustom ? 'center' : `${boxForBg.left * (100 / (100 - boxForBg.width))}% ${boxForBg.top * (100 / (100 - boxForBg.height))}%`, 
                  }}
                />
              </div>
            );
          } 
          
          if (el.type === ElementType.TEXT && visibleLayers.text) {
             return (
                <div
                key={el.id}
                onMouseDown={(e) => interactive && handleMouseDown(e, el.id, el.box)}
                className={`absolute z-20 p-1 transition-all ${getTextStyles(el.style)}
                    ${interactive ? 'cursor-move hover:outline hover:outline-1 hover:outline-blue-300' : 'pointer-events-none opacity-50'} 
                    ${selectedId === el.id ? 'outline outline-2 outline-black bg-blue-50/30 z-30' : ''}`}
                style={{
                    top: `${el.box.top}%`,
                    left: `${el.box.left}%`,
                    width: `${el.box.width}%`,
                    height: `${el.box.height}%`,
                    color: el.style.color || '#000000',
                }}
                >
                {el.content}
                </div>
             );
          }
          return null;
        })}

        {/* Erasure Overlays */}
        {erasureBoxes?.map((box, idx) => (
             <div
                key={`erase-${idx}`}
                className="absolute border-2 border-red-500 bg-red-500/30 z-40 pointer-events-none"
                style={{
                    top: `${box.top}%`,
                    left: `${box.left}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                }}
             />
        ))}

        {/* Current Drawing Box */}
        {drawingBox && (
             <div
                className="absolute border-2 border-red-600 bg-red-600/20 z-50 pointer-events-none"
                style={{
                    top: `${Math.min(drawingBox.top, drawingBox.top + drawingBox.height)}%`,
                    left: `${Math.min(drawingBox.left, drawingBox.left + drawingBox.width)}%`,
                    width: `${Math.abs(drawingBox.width)}%`,
                    height: `${Math.abs(drawingBox.height)}%`,
                }}
             />
        )}

      </div>
    </div>
  );
};

export default EditorCanvas;