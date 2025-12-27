import React, { useRef, useState, useEffect } from 'react';
import { PPTShapeElement, BoundingBox, SlideTextElement, ElementType, SlideVisualElement } from '../types';

interface ReconstructionCanvasProps {
  shapes: PPTShapeElement[];
  texts: SlideTextElement[];
  images: SlideVisualElement[]; // New: Support for non-vector visuals
  backgroundColor: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, newBox: BoundingBox) => void;
}

const ReconstructionCanvas: React.FC<ReconstructionCanvasProps> = ({ 
  shapes, 
  texts,
  images,
  backgroundColor,
  selectedId,
  onSelect,
  onUpdateElement
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialBox: BoundingBox;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, id: string, box: BoundingBox) => {
    e.stopPropagation();
    onSelect(id);
    setDragState({
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...box }
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const deltaPercentX = (deltaX / containerRect.width) * 100;
    const deltaPercentY = (deltaY / containerRect.height) * 100;

    const newBox = {
      ...dragState.initialBox,
      left: dragState.initialBox.left + deltaPercentX,
      top: dragState.initialBox.top + deltaPercentY,
    };

    onUpdateElement(dragState.id, newBox);
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setDragState(null);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

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

  const renderShape = (shape: PPTShapeElement) => {
    const isSelected = selectedId === shape.id;
    const style = {
        fill: shape.style.fillColor === 'transparent' ? 'none' : shape.style.fillColor,
        stroke: shape.style.strokeColor,
        strokeWidth: shape.style.strokeWidth || 1,
        fillOpacity: shape.style.opacity,
    };

    const commonProps = {
        width: "100%",
        height: "100%",
        vectorEffect: "non-scaling-stroke",
        ...style
    };

    let svgContent = null;

    switch (shape.shapeType) {
        case 'rect':
            svgContent = <rect x="0" y="0" {...commonProps} />;
            break;
        case 'roundRect':
            svgContent = <rect x="0" y="0" rx="10" ry="10" {...commonProps} />;
            break;
        case 'ellipse':
            svgContent = <ellipse cx="50%" cy="50%" rx="50%" ry="50%" {...commonProps} />;
            break;
        case 'triangle':
            svgContent = <polygon points="50,0 100,100 0,100" transform="scale(0.01 0.01) scale(100 100)" {...commonProps} />;
            break;
        case 'line':
            svgContent = <line x1="0" y1="50%" x2="100%" y2="50%" {...style} strokeWidth={Math.max(2, style.strokeWidth)} />;
            break;
        case 'arrowRight':
            svgContent = (
                <path d="M0,40 L70,40 L70,10 L100,50 L70,90 L70,60 L0,60 Z" transform="scale(0.01 0.01) scale(100 100)" {...commonProps} />
            );
            break;
        case 'arrowLeft':
            svgContent = (
                <path d="M100,40 L30,40 L30,10 L0,50 L30,90 L30,60 L100,60 Z" transform="scale(0.01 0.01) scale(100 100)" {...commonProps} />
            );
            break;
        case 'star':
            svgContent = (
                <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" transform="scale(0.01 0.01) scale(100 100)" {...commonProps} />
            );
            break;
        case 'pentagon':
             svgContent = (
                <polygon points="50,0 100,38 82,100 18,100 0,38" transform="scale(0.01 0.01) scale(100 100)" {...commonProps} />
             );
             break;
        case 'hexagon':
             svgContent = (
                <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" transform="scale(0.01 0.01) scale(100 100)" {...commonProps} />
             );
             break;
        case 'diamond':
             svgContent = (
                <polygon points="50,0 100,50 50,100 0,50" transform="scale(0.01 0.01) scale(100 100)" {...commonProps} />
             );
             break;
        case 'callout':
              svgContent = <rect x="0" y="0" rx="5" ry="5" {...commonProps} />; // Simplified
              break;
        default:
            svgContent = <rect x="0" y="0" {...commonProps} />;
    }

    return (
        <div
            key={shape.id}
            onMouseDown={(e) => handleMouseDown(e, shape.id, shape.box)}
            className={`absolute z-10 cursor-move ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
            style={{
                top: `${shape.box.top}%`,
                left: `${shape.box.left}%`,
                width: `${shape.box.width}%`,
                height: `${shape.box.height}%`,
            }}
        >
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                {svgContent}
            </svg>
        </div>
    );
  };

  return (
    <div 
      className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-auto flex items-center justify-center p-20 relative cursor-grab active:cursor-grabbing"
      onMouseMove={handleMouseMove}
      onClick={() => onSelect(null)}
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
      >
         {/* Background Color */}
         <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundColor }} />

         <div className="absolute -top-8 left-0 flex items-center gap-2">
             <span className="text-sm font-bold text-white bg-indigo-500 px-2 py-1 rounded">可编辑模式 (Vector)</span>
        </div>

         {/* Images Layer (Non-vector fallbacks) */}
         {images.map(img => {
             if (img.isHidden) return null;
             const isSelected = selectedId === img.id;
             return (
                 <div
                    key={img.id}
                    onMouseDown={(e) => handleMouseDown(e, img.id, img.box)}
                    className={`absolute z-5 cursor-move ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
                    style={{
                        top: `${img.box.top}%`,
                        left: `${img.box.left}%`,
                        width: `${img.box.width}%`,
                        height: `${img.box.height}%`,
                    }}
                 >
                     <img 
                        src={img.customImage} // This is the cropped image
                        alt="Fallback"
                        className="w-full h-full object-fill pointer-events-none"
                     />
                 </div>
             )
         })}

         {/* Shapes Layer */}
         {shapes.map(shape => !shape.isHidden && renderShape(shape))}

         {/* Text Layer (Reused from analysis) */}
         {texts.map(el => {
            if (el.isHidden) return null;
            return (
                <div
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el.id, el.box)}
                    className={`absolute z-20 p-1 cursor-move transition-all ${getTextStyles(el.style)} ${selectedId === el.id ? 'outline outline-2 outline-blue-500 bg-blue-50/30' : 'hover:outline hover:outline-1 hover:outline-blue-300'}`}
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
         })}
      </div>
    </div>
  );
};

export default ReconstructionCanvas;