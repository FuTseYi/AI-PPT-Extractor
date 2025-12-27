import React from 'react';
import { SlideWorkspace } from '../types';

interface SlideSidebarProps {
  slides: SlideWorkspace[];
  activeSlideId: string | null;
  onSelectSlide: (id: string) => void;
  onAddFiles: (files: FileList) => void;
  onRemoveSlide: (id: string) => void;
  isProcessing: boolean;
}

const SlideSidebar: React.FC<SlideSidebarProps> = ({
  slides,
  activeSlideId,
  onSelectSlide,
  onAddFiles,
  onRemoveSlide,
  isProcessing
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onAddFiles(event.target.files);
      // Reset input
      event.target.value = ''; 
    }
  };

  return (
    <div className="w-56 flex flex-col bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-full shrink-0 z-40 select-none">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">页面列表 ({slides.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {slides.map((slide, index) => {
            const isActive = activeSlideId === slide.id;
            return (
                <div 
                    key={slide.id}
                    onClick={() => !isProcessing && onSelectSlide(slide.id)}
                    className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:shadow-md ${
                        isActive 
                            ? 'border-blue-500 ring-2 ring-blue-500/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                >
                    {/* Page Number Badge */}
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded-sm z-10 backdrop-blur-sm">
                        {index + 1}
                    </div>

                    {/* Status Indicator */}
                    <div className="absolute top-1 right-1 z-10">
                        {slide.status === 'complete' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm" title="Completed"></div>}
                        {slide.status === 'error' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" title="Error"></div>}
                        {(slide.status === 'analyzing' || slide.status === 'processing_final') && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-sm" title="Processing..."></div>
                        )}
                        {slide.status === 'correcting' && <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm" title="Waiting Confirmation"></div>}
                    </div>
                    
                    {/* Thumbnail */}
                    <div className="aspect-video w-full bg-white dark:bg-slate-800 relative">
                        <img 
                            src={slide.thumbnail} 
                            alt={`Slide ${index + 1}`} 
                            className={`w-full h-full object-cover transition-opacity ${isProcessing && isActive ? 'opacity-80' : ''}`}
                        />
                        {/* Overlay text for name if needed */}
                        {isActive && (
                            <div className="absolute inset-0 bg-blue-500/10 pointer-events-none"></div>
                        )}
                    </div>

                    {/* Remove Button (Hover) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSlide(slide.id);
                        }}
                        className="absolute bottom-1 right-1 bg-white/90 dark:bg-slate-800/90 text-slate-500 hover:text-red-500 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="删除页面"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )
        })}
      </div>

      {/* Add Button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <label className="flex items-center justify-center w-full py-2 px-3 gap-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                添加页面
                <input 
                    type="file" 
                    multiple 
                    accept="image/*,.pdf,.ppt,.pptx" 
                    onChange={handleFileChange}
                    className="hidden" 
                />
          </label>
      </div>
    </div>
  );
};

export default SlideSidebar;