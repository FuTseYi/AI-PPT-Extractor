import React from 'react';
import { ReconstructedSlideResult, PPTShapeElement, ElementType, SlideVisualElement } from '../types';

interface VectorLayerListProps {
  data: ReconstructedSlideResult;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRegenerateVector: (id: string) => void;
}

const VectorLayerList: React.FC<VectorLayerListProps> = ({ 
  data, 
  selectedId, 
  onSelect, 
  onToggleVisibility,
  onRegenerateVector
}) => {
  const allElements = [
      ...data.shapes.map(s => ({ ...s, listType: 'SHAPE' })),
      ...data.images.map(i => ({ ...i, listType: 'IMAGE' })),
      ...data.texts.map(t => ({ ...t, listType: 'TEXT' }))
  ];

  return (
    <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 h-full flex flex-col shrink-0 z-40 shadow-xl">
       <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20">
        <h2 className="font-semibold text-indigo-900 dark:text-indigo-100">矢量图层管理</h2>
        <p className="text-xs text-indigo-500 dark:text-indigo-300">可编辑元素 ({allElements.length})</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {allElements.map((el) => (
             <div
             key={el.id}
             className={`flex items-center gap-2 p-2 rounded-md text-sm transition-all cursor-pointer ${
               selectedId === el.id 
                 ? 'bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500' 
                 : 'bg-white dark:bg-slate-800 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700'
             }`}
             onClick={() => onSelect(el.id)}
           >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                         {el.listType === 'SHAPE' ? (
                            <svg className="w-3.5 h-3.5 opacity-70 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                            </svg>
                         ) : el.listType === 'IMAGE' ? (
                            <svg className="w-3.5 h-3.5 opacity-70 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                         ) : (
                            <svg className="w-3.5 h-3.5 opacity-70 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                         )}
                         <span className="font-medium text-[10px] uppercase tracking-wider opacity-60">
                             {el.listType === 'SHAPE' ? (el as PPTShapeElement).shapeType : el.listType === 'IMAGE' ? 'VISUAL' : 'TEXT'}
                         </span>
                    </div>
                     <div className="text-xs opacity-80 truncate">
                        {el.listType === 'SHAPE' ? `Vector Shape` : el.listType === 'IMAGE' ? (el as SlideVisualElement).description || 'Visual Image' : (el as any).content}
                     </div>
                </div>

                <div className="flex gap-1 items-center">
                    {/* Regenerate Button for Visual Elements (Shapes or Images) */}
                    {(el.listType === 'SHAPE' || el.listType === 'IMAGE') && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRegenerateVector(el.id);
                            }}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400"
                            title="重新生成矢量 (Retry Vectorize)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(el.id);
                        }}
                        className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${el.isHidden ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                         <div className={`w-2 h-2 rounded-full ${el.isHidden ? 'bg-red-400' : 'bg-green-400'}`} />
                    </button>
                </div>
           </div>
        ))}
      </div>
    </div>
  );
};

export default VectorLayerList;