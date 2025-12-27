import React, { useCallback } from 'react';

interface UploadSectionProps {
  onFilesSelected: (files: FileList) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onFilesSelected }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
        onFilesSelected(event.target.files);
    }
  }, [onFilesSelected]);

  return (
    <div className="w-full max-w-2xl mx-auto p-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer relative shadow-sm group">
      <input
        type="file"
        multiple
        accept="image/*,.pdf,.ppt,.pptx"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">上传演示文档或图片</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
             支持 <span className="font-semibold text-slate-700 dark:text-slate-200">PDF, 图片 (PNG/JPG)</span>
             <br/>
             <span className="text-xs opacity-75">(PPT/PPTX 请先另存为 PDF 以获得最佳效果)</span>
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              支持批量上传 & Ctrl+V 粘贴
          </div>
        </div>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all transform group-hover:translate-y-[-2px]">
          选择文件
        </button>
      </div>
    </div>
  );
};

export default UploadSection;