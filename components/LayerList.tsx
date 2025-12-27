import React, { useState } from 'react';
import { SlideAnalysisResult, ElementType, SlideVisualElement } from '../types';

interface LayerListProps {
  data: SlideAnalysisResult;
  selectedId: string | null;
  onSelect: (id: string) => void;
  visibleLayers: { text: boolean; visual: boolean; background: boolean };
  onToggleLayerType: (type: 'text' | 'visual' | 'background') => void;
  onToggleElementVisibility: (id: string) => void;
  onRefineElement: (id: string, prompt?: string) => void;
  onModifyElement: (id: string, instruction: string) => void;
  onDeleteElement: (id: string) => void;
  isProcessing: boolean;
  
  // Erasure props
  isErasureMode?: boolean;
  onToggleErasureMode?: () => void;
  onConfirmErasure?: () => void;
  
  // History Props
  onSelectVisualHistory?: (elementId: string, historyIndex: number) => void;
}

const LayerList: React.FC<LayerListProps> = ({ 
  data, 
  selectedId, 
  onSelect, 
  visibleLayers, 
  onToggleLayerType,
  onToggleElementVisibility,
  onRefineElement,
  onModifyElement,
  onDeleteElement,
  isProcessing,
  isErasureMode,
  onToggleErasureMode,
  onConfirmErasure,
  onSelectVisualHistory
}) => {
  const [instruction, setInstruction] = useState("");
  
  const textCount = data.elements.filter(e => e.type === ElementType.TEXT).length;
  const visualCount = data.elements.filter(e => e.type === ElementType.VISUAL).length;

  const selectedElement = data.elements.find(e => e.id === selectedId);

  return (
    <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 h-full flex flex-col transition-colors duration-200 shrink-0 z-40 shadow-xl">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">图层管理</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">已拆解的元素</p>
      </div>

      {/* Global Toggles */}
      <div className="p-4 space-y-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        
        {/* Background Toggle & Eraser */}
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">背景层</span>
              <div className="flex gap-2">
                  {/* Erasure Button */}
                  {onToggleErasureMode && (
                      <button
                        onClick={onToggleErasureMode}
                        disabled={isProcessing}
                        className={`p-1 rounded transition-colors ${isErasureMode ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        title="背景局部擦除 (Partial Erase)"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z" />
                         </svg>
                      </button>
                  )}
                  <button 
                    onClick={() => onToggleLayerType('background')}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${visibleLayers.background ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${visibleLayers.background ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
              </div>
            </div>
            
            {/* Erasure Mode Controls */}
            {isErasureMode && onConfirmErasure && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-2 rounded text-xs space-y-2 animate-in fade-in slide-in-from-top-1">
                    <p className="text-red-800 dark:text-red-300">
                        请在画布上框选需要擦除的背景区域（可多选）。
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onConfirmErasure}
                            disabled={isProcessing}
                            className={`flex-1 py-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium ${isProcessing ? 'opacity-50' : ''}`}
                        >
                            {isProcessing ? '处理中...' : '确认擦除'}
                        </button>
                        <button
                            onClick={onToggleErasureMode} // Clicking again cancels
                            disabled={isProcessing}
                            className="flex-1 py-1 px-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-50"
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">文字图层 ({textCount})</span>
          <button 
             onClick={() => onToggleLayerType('text')}
             className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${visibleLayers.text ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${visibleLayers.text ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">视觉元素 ({visualCount})</span>
          <button 
             onClick={() => onToggleLayerType('visual')}
             className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${visibleLayers.visual ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${visibleLayers.visual ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Action Panel for Selected Item */}
      {selectedElement && !isErasureMode && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-200">
               选中: {selectedElement.type === 'VISUAL' ? '视觉元素' : '文字'}
            </span>
            <button 
               onClick={() => onDeleteElement(selectedElement.id)}
               className="text-red-500 hover:text-red-700 text-xs font-medium"
            >
                删除
            </button>
          </div>

          {selectedElement.type === ElementType.VISUAL && (
              <>
                 <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="输入指令 (例: 去除文字, 拆分元素, 变为红色...)"
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={2}
                 />
                 
                 <div className="flex gap-2">
                    <button
                        onClick={() => onRefineElement(selectedElement.id, instruction)}
                        disabled={isProcessing}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border border-blue-200 dark:border-slate-600 text-blue-600 dark:text-blue-300 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 ${isProcessing ? 'opacity-50' : ''}`}
                    >
                        {isProcessing ? '处理中...' : '拆分/识别'}
                    </button>
                    <button
                        onClick={() => onModifyElement(selectedElement.id, instruction || "去除文字")}
                        disabled={isProcessing}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white ${isProcessing ? 'opacity-50' : ''}`}
                    >
                        {isProcessing ? '生成中...' : '修改/生成'}
                    </button>
                 </div>

                 {/* NEW: History Version Selector */}
                 {(selectedElement as SlideVisualElement).history && (selectedElement as SlideVisualElement).history!.length > 0 && (
                     <div className="pt-2 border-t border-blue-100 dark:border-blue-800/50">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 block">历史版本</span>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {(selectedElement as SlideVisualElement).history!.map((historyImg, index) => {
                                const isActive = (selectedElement as SlideVisualElement).historyIndex === index;
                                return (
                                    <div 
                                        key={index}
                                        onClick={() => onSelectVisualHistory && onSelectVisualHistory(selectedElement.id, index)}
                                        className={`shrink-0 w-12 h-12 rounded border-2 cursor-pointer relative overflow-hidden transition-all ${isActive ? 'border-blue-500 ring-1 ring-blue-300' : 'border-slate-200 dark:border-slate-600 hover:border-slate-400'}`}
                                        title={index === 0 ? "原始截图" : `生成版本 ${index}`}
                                    >
                                        <img src={historyImg} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 leading-tight">
                                            {index === 0 ? "原" : `v${index}`}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                 )}
              </>
          )}
        </div>
      )}

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {data.elements.map((el) => (
          <div
            key={el.id}
            className={`flex items-center gap-2 p-2 rounded-md text-sm transition-all group ${
              selectedId === el.id && !isErasureMode
                ? 'bg-slate-100 dark:bg-slate-700 border-l-4 border-blue-500' 
                : 'bg-white dark:bg-slate-800 border-l-4 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            onClick={() => !isErasureMode && onSelect(el.id)}
            style={{ opacity: isErasureMode ? 0.5 : 1, pointerEvents: isErasureMode ? 'none' : 'auto' }}
          >
            <div className="flex-1 min-w-0 cursor-pointer">
              <div className="flex items-center gap-2 mb-0.5">
                {el.type === ElementType.TEXT ? (
                  <svg className="w-3.5 h-3.5 opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="font-medium uppercase text-[10px] tracking-wider opacity-60 flex-shrink-0">
                   {el.type === 'TEXT' ? '文字' : '视觉'}
                </span>
                {el.type === ElementType.VISUAL && (el as any).customImage && (
                    <span className="text-[10px] bg-purple-100 text-purple-600 px-1 rounded flex-shrink-0">已修改</span>
                )}
              </div>
              <div className="text-xs opacity-80 break-words leading-relaxed">
                {el.type === ElementType.TEXT ? (
                    <span className="truncate block">{el.content}</span>
                ) : (
                    el.description || "视觉元素"
                )}
              </div>
            </div>

            {/* Visibility Toggle */}
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 onToggleElementVisibility(el.id);
               }}
               className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 flex-shrink-0 ${el.isHidden ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}
               title={el.isHidden ? "显示" : "隐藏"}
            >
              {el.isHidden ? (
                // Eye Slash
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                // Eye
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerList;