import React, { useRef, useState, useEffect } from 'react';
import { SlideAnalysisResult, ElementType, BoundingBox } from '../types';

interface CorrectionCanvasProps {
  imageSrc: string;
  elements: any[];
  onElementsChange: (elements: any[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const CorrectionCanvas: React.FC<CorrectionCanvasProps> = ({ 
  imageSrc, 
  elements, 
  onElementsChange, 
  onConfirm,
  onCancel 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Statistics
  const textCount = elements.filter(e => e.type === ElementType.TEXT).length;
  const visualCount = elements.filter(e => e.type === ElementType.VISUAL).length;
  
  // Dragging State
  const [dragState, setDragState] = useState<{
    id: string;
    action: 'move' | 'resize' | 'draw';
    handle?: 'tl' | 'tr' | 'bl' | 'br'; // Added handle direction
    startX: number;
    startY: number;
    initialBox: BoundingBox;
  } | null>(null);

  // Drawing State
  const [drawingBox, setDrawingBox] = useState<BoundingBox | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleMouseDown = (e: React.MouseEvent, id: string | null = null) => {
    if (e.button !== 0) return; // Only Left Click
    if (!containerRef.current) return;
    
    e.stopPropagation();
    setContextMenu(null);

    const containerRect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    if (id) {
        // Existing Element -> Move
        setSelectedId(id);
        const el = elements.find(e => e.id === id);
        if (el) {
            setDragState({
                id,
                action: 'move',
                startX,
                startY,
                initialBox: { ...el.box }
            });
        }
    } else {
        // Background -> Draw New Box
        setSelectedId(null);
        setDragState({
            id: 'drawing',
            action: 'draw',
            startX,
            startY,
            initialBox: { top: 0, left: 0, width: 0, height: 0 } // Dummy
        });
        
        // Calculate initial start point in % relative to container
        const relX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        const relY = ((e.clientY - containerRect.top) / containerRect.height) * 100;
        setDrawingBox({ top: relY, left: relX, width: 0, height: 0 });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, handle: 'tl' | 'tr' | 'bl' | 'br') => {
      e.stopPropagation();
      e.preventDefault();
      const el = elements.find(e => e.id === id);
      if (el) {
        setDragState({
            id,
            action: 'resize',
            handle,
            startX: e.clientX,
            startY: e.clientY,
            initialBox: { ...el.box }
        });
      }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    // Pixel delta to Percent delta
    const dPctX = (deltaX / containerRect.width) * 100;
    const dPctY = (deltaY / containerRect.height) * 100;

    if (dragState.action === 'move') {
        const newBox = {
            ...dragState.initialBox,
            left: dragState.initialBox.left + dPctX,
            top: dragState.initialBox.top + dPctY,
        };
        const updated = elements.map(el => el.id === dragState.id ? { ...el, box: newBox, originalBox: newBox } : el);
        onElementsChange(updated);
    } else if (dragState.action === 'resize' && dragState.handle) {
        let { top, left, width, height } = dragState.initialBox;

        // Apply resizing logic based on handle
        if (dragState.handle.includes('t')) { // Top handles
            top += dPctY;
            height -= dPctY;
        } else { // Bottom handles
            height += dPctY;
        }

        if (dragState.handle.includes('l')) { // Left handles
            left += dPctX;
            width -= dPctX;
        } else { // Right handles
            width += dPctX;
        }

        // Constraints: Min 1% width/height to prevent inversion
        if (width < 1) {
             if (dragState.handle.includes('l')) left = dragState.initialBox.left + dragState.initialBox.width - 1;
             width = 1;
        }
        if (height < 1) {
             if (dragState.handle.includes('t')) top = dragState.initialBox.top + dragState.initialBox.height - 1;
             height = 1;
        }

        const newBox = { top, left, width, height };
        const updated = elements.map(el => el.id === dragState.id ? { ...el, box: newBox, originalBox: newBox } : el);
        onElementsChange(updated);
    } else if (dragState.action === 'draw' && drawingBox) {
        // Update drawing box
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
    if (dragState?.action === 'draw' && drawingBox) {
        // Finalize drawing
        let finalBox = { ...drawingBox };
        // Normalize negatives
        if (finalBox.width < 0) {
            finalBox.left += finalBox.width;
            finalBox.width = Math.abs(finalBox.width);
        }
        if (finalBox.height < 0) {
            finalBox.top += finalBox.height;
            finalBox.height = Math.abs(finalBox.height);
        }

        if (finalBox.width > 1 && finalBox.height > 1) {
            const newId = `manual-${Date.now()}`;
            const newEl = {
                id: newId,
                type: ElementType.TEXT, // Default to Text
                content: "New Area",
                box: finalBox,
                originalBox: finalBox,
                style: { fontSize: 'medium', fontWeight: 'normal', color: '#000000', alignment: 'left' }
            };
            onElementsChange([...elements, newEl]);
            setSelectedId(newId);
        }
        setDrawingBox(null);
    }
    setDragState(null);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
    setSelectedId(id);
  };

  const changeType = (id: string, newType: ElementType) => {
      const updated = elements.map(el => el.id === id ? { ...el, type: newType } : el);
      onElementsChange(updated);
      setContextMenu(null);
  };

  const deleteElement = (id: string) => {
      const updated = elements.filter(el => el.id !== id);
      onElementsChange(updated);
      setContextMenu(null);
      setSelectedId(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900">
        {/* Toolbar */}
        <div className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-sm z-30">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-200">人工校正</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Step 2/3</span>
                </div>
                {/* Legend & Stats */}
                <div className="flex items-center gap-4 text-sm bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-1.5" title="文字区域">
                        <div className="w-3 h-3 bg-blue-500/20 border-2 border-blue-500 rounded-sm"></div>
                        <span className="text-slate-600 dark:text-slate-300">文字</span>
                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-1.5 rounded-full min-w-[20px] text-center">{textCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="视觉区域">
                        <div className="w-3 h-3 bg-orange-500/20 border-2 border-orange-500 rounded-sm"></div>
                        <span className="text-slate-600 dark:text-slate-300">视觉</span>
                        <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-1.5 rounded-full min-w-[20px] text-center">{visualCount}</span>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-xs ml-2 border-l pl-2 border-slate-300 hidden md:inline">
                        提示: 右键点击方框可切换类型
                    </span>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded"
                >
                    取消
                </button>
                <button 
                    onClick={onConfirm}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                >
                    确认并处理
                </button>
            </div>
        </div>

        {/* Canvas Area */}
        <div 
            className="flex-1 overflow-auto flex items-center justify-center p-10 relative select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div 
                ref={containerRef}
                className="relative bg-white shadow-2xl ring-1 ring-slate-900/5"
                style={{ 
                  width: '1024px', 
                  height: '576px',
                  minWidth: '1024px',
                  minHeight: '576px',
                  cursor: dragState?.action === 'draw' ? 'crosshair' : 'default'
                }}
                onMouseDown={(e) => handleMouseDown(e)}
            >
                {/* Background Image */}
                <img 
                    src={imageSrc} 
                    alt="Original" 
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-50" 
                />
                
                {/* Elements */}
                {elements.map(el => {
                    const isSelected = selectedId === el.id;
                    const isText = el.type === ElementType.TEXT;
                    const borderColor = isText ? 'border-blue-500' : 'border-orange-500';
                    const bgColor = isText ? 'bg-blue-500/10' : 'bg-orange-500/10';

                    return (
                        <div
                            key={el.id}
                            className={`absolute border-2 ${borderColor} ${bgColor} group hover:opacity-100 opacity-80 ${isSelected ? 'z-20' : 'z-10'}`}
                            style={{
                                top: `${el.box.top}%`,
                                left: `${el.box.left}%`,
                                width: `${el.box.width}%`,
                                height: `${el.box.height}%`,
                            }}
                            onMouseDown={(e) => handleMouseDown(e, el.id)}
                            onContextMenu={(e) => handleContextMenu(e, el.id)}
                        >
                            {/* Resize Handles (4 Corners) - Only when selected */}
                            {isSelected && (
                                <>
                                    {/* Top Left */}
                                    <div 
                                        className={`absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 ${borderColor} cursor-nwse-resize z-30`}
                                        onMouseDown={(e) => handleResizeStart(e, el.id, 'tl')}
                                    />
                                    {/* Top Right */}
                                    <div 
                                        className={`absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 ${borderColor} cursor-nesw-resize z-30`}
                                        onMouseDown={(e) => handleResizeStart(e, el.id, 'tr')}
                                    />
                                    {/* Bottom Left */}
                                    <div 
                                        className={`absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 ${borderColor} cursor-nesw-resize z-30`}
                                        onMouseDown={(e) => handleResizeStart(e, el.id, 'bl')}
                                    />
                                    {/* Bottom Right */}
                                    <div 
                                        className={`absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 ${borderColor} cursor-nwse-resize z-30`}
                                        onMouseDown={(e) => handleResizeStart(e, el.id, 'br')}
                                    />
                                </>
                            )}
                        </div>
                    );
                })}

                {/* Drawing Box */}
                {drawingBox && (
                     <div
                        className="absolute border-2 border-green-500 bg-green-500/20 z-30"
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

        {/* Context Menu */}
        {contextMenu && (
            <div 
                className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-md py-1 z-50 w-32"
                style={{ top: contextMenu.y, left: contextMenu.x }}
            >
                <button 
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                    onClick={() => changeType(contextMenu.id, ElementType.TEXT)}
                >
                    设为: 文字
                </button>
                <button 
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                    onClick={() => changeType(contextMenu.id, ElementType.VISUAL)}
                >
                    设为: 视觉
                </button>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                <button 
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                    onClick={() => deleteElement(contextMenu.id)}
                >
                    删除
                </button>
            </div>
        )}
    </div>
  );
};

export default CorrectionCanvas;