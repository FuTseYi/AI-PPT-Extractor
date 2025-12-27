import React, { useState, useEffect, useCallback } from 'react';
import PptxGenJS from 'pptxgenjs';
import { 
  SlideAnalysisResult, ProcessingState, ElementType, SlideTextElement, 
  SlideVisualElement, BoundingBox, AISettings, DEFAULT_AI_SETTINGS, 
  ReconstructedSlideResult, PPTShapeElement, SlideWorkspace, LayerVisibility 
} from './types';
import { 
  analyzeLayout, processConfirmedLayout, refineElement, 
  regenerateVisualElement, updateSettings, analyzeVisualToVector, 
  eraseAreasFromImage 
} from './services/geminiService';
import { processUploadedFiles } from './services/fileService';

import UploadSection from './components/UploadSection';
import EditorCanvas from './components/EditorCanvas';
import CorrectionCanvas from './components/CorrectionCanvas';
import LayerList from './components/LayerList';
import SettingsModal from './components/SettingsModal';
import ReconstructionCanvas from './components/ReconstructionCanvas';
import VectorLayerList from './components/VectorLayerList';
import SlideSidebar from './components/SlideSidebar';

const DEFAULT_LAYERS: LayerVisibility = { text: true, visual: true, background: true };

const App: React.FC = () => {
  // --- Workspace State ---
  const [slides, setSlides] = useState<SlideWorkspace[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);

  // Computed Active Slide
  const activeSlide = slides.find(s => s.id === activeSlideId) || null;

  // Global UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Load Settings on Mount
  useEffect(() => {
      const saved = localStorage.getItem('ai_settings');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setAiSettings({ ...DEFAULT_AI_SETTINGS, ...parsed });
              updateSettings({ ...DEFAULT_AI_SETTINGS, ...parsed });
          } catch (e) { console.error("Failed to load settings", e); }
      } else {
          updateSettings(DEFAULT_AI_SETTINGS);
      }
  }, []);

  const handleSaveSettings = (newSettings: AISettings) => {
      setAiSettings(newSettings);
      updateSettings(newSettings);
      localStorage.setItem('ai_settings', JSON.stringify(newSettings));
  };

  // Theme Toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // --- Slide State Helpers ---

  const updateActiveSlide = (updates: Partial<SlideWorkspace>) => {
      if (!activeSlideId) return;
      setSlides(prev => prev.map(s => s.id === activeSlideId ? { ...s, ...updates } : s));
  };

  const updateSlideById = (id: string, updates: Partial<SlideWorkspace>) => {
      setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // --- Handlers: Upload & Pipeline ---

  const handleFilesSelected = async (files: FileList) => {
      setIsProcessing(true);
      try {
          const processedFiles = await processUploadedFiles(files);
          
          const newSlides: SlideWorkspace[] = [];
          
          processedFiles.forEach(fileResult => {
              fileResult.images.forEach((base64, idx) => {
                  const id = `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  newSlides.push({
                      id,
                      name: `${fileResult.name} - Page ${idx + 1}`,
                      originalImage: base64,
                      thumbnail: base64, // Reuse full image for thumbnail for simplicity, could resize if needed
                      status: 'idle',
                      slideData: null,
                      vectorData: null,
                      viewMode: 'image',
                      visibleLayers: { ...DEFAULT_LAYERS },
                      selectedElementId: null,
                      isErasureMode: false,
                      erasureBoxes: []
                  });
              });
          });

          if (newSlides.length > 0) {
              setSlides(prev => [...prev, ...newSlides]);
              // If no slide is active, select the first new one
              if (!activeSlideId) {
                  setActiveSlideId(newSlides[0].id);
                  // Auto-start analysis removed. User must click "Analyze Layout" manually.
              }
          }
      } catch (e: any) {
          alert(e.message || "文件加载失败");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleStartAnalysis = async (slideId: string, imageBase64: string) => {
      updateSlideById(slideId, { status: 'analyzing', errorDetails: null });
      try {
          const result = await analyzeLayout(imageBase64);
          updateSlideById(slideId, { 
              slideData: result, 
              status: 'correcting' 
          });
      } catch (e: any) {
          updateSlideById(slideId, { 
              status: 'error', 
              errorDetails: { message: e.message || "无法识别布局", raw: e.rawResponse } 
          });
      }
  };

  // Step 2: User Corrects Layout -> Update LOCAL Slide Data
  const handleCorrectionUpdate = (updatedElements: any[]) => {
      if (!activeSlide?.slideData) return;
      updateActiveSlide({
          slideData: { ...activeSlide.slideData, elements: updatedElements }
      });
  };

  // Step 3: Confirm Layout
  const handleConfirmCorrection = async () => {
      if (!activeSlide?.slideData || !activeSlide.originalImage) return;
      
      updateActiveSlide({ status: 'processing_final' });
      try {
          const result = await processConfirmedLayout(
              activeSlide.originalImage, 
              activeSlide.slideData.elements, 
              activeSlide.slideData.backgroundColor
          );
          updateActiveSlide({
              slideData: result,
              status: 'complete'
          });
      } catch (e: any) {
          updateActiveSlide({ status: 'error', errorDetails: { message: "最终生成失败", raw: e.message } });
      }
  };

  // --- Handlers: Editing ---

  const handleToggleLayer = (type: keyof LayerVisibility) => {
      if (!activeSlide) return;
      updateActiveSlide({
          visibleLayers: { ...activeSlide.visibleLayers, [type]: !activeSlide.visibleLayers[type] }
      });
  };

  const handleToggleElementVisibility = (elementId: string) => {
      if (!activeSlide) return;
      if (activeSlide.viewMode === 'image' && activeSlide.slideData) {
          updateActiveSlide({
              slideData: {
                  ...activeSlide.slideData,
                  elements: activeSlide.slideData.elements.map(el => 
                      el.id === elementId ? { ...el, isHidden: !el.isHidden } : el
                  )
              }
          });
      } else if (activeSlide.viewMode === 'vector' && activeSlide.vectorData) {
          const prev = activeSlide.vectorData;
          updateActiveSlide({
              vectorData: {
                  ...prev,
                  shapes: prev.shapes.map(s => s.id === elementId ? { ...s, isHidden: !s.isHidden } : s),
                  texts: prev.texts.map(t => t.id === elementId ? { ...t, isHidden: !t.isHidden } : t),
                  images: prev.images.map(i => i.id === elementId ? { ...i, isHidden: !i.isHidden } : i),
              }
          });
      }
  };

  const handleUpdateElementBox = (elementId: string, newBox: BoundingBox) => {
      if (!activeSlide) return;
      if (activeSlide.viewMode === 'image' && activeSlide.slideData) {
          updateActiveSlide({
              slideData: {
                  ...activeSlide.slideData,
                  elements: activeSlide.slideData.elements.map(el => el.id === elementId ? { ...el, box: newBox } : el)
              }
          });
      } else if (activeSlide.viewMode === 'vector' && activeSlide.vectorData) {
          const prev = activeSlide.vectorData;
          updateActiveSlide({
              vectorData: {
                  ...prev,
                  shapes: prev.shapes.map(s => s.id === elementId ? { ...s, box: newBox } : s),
                  texts: prev.texts.map(t => t.id === elementId ? { ...t, box: newBox } : t),
                  images: prev.images.map(i => i.id === elementId ? { ...i, box: newBox } : i),
              }
          });
      }
  };

  const handleDeleteElement = (elementId: string) => {
      if (!activeSlide?.slideData) return;
      updateActiveSlide({
          slideData: {
              ...activeSlide.slideData,
              elements: activeSlide.slideData.elements.filter(el => el.id !== elementId)
          },
          selectedElementId: null
      });
  };

  // Helper for cropping (copied for closure access if needed, but we can reuse same logic)
  const isOverlapping = (box1: BoundingBox, box2: BoundingBox) => {
    const b1Right = box1.left + box1.width;
    const b1Bottom = box1.top + box1.height;
    const b2Right = box2.left + box2.width;
    const b2Bottom = box2.top + box2.height;
    return !(box1.left >= b2Right || b1Right <= box2.left || box1.top >= b2Bottom || b1Bottom <= box2.top);
  };

  const cropImage = async (sourceImage: string, box: { left: number, top: number, width: number, height: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Important if loading from external URLs
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Calculate exact pixel dimensions based on percentages
        const x = (box.left / 100) * img.naturalWidth;
        const y = (box.top / 100) * img.naturalHeight;
        const w = (box.width / 100) * img.naturalWidth;
        const h = (box.height / 100) * img.naturalHeight;
        
        // Prevent 0 dimension error
        if (w <= 0 || h <= 0) {
            console.warn("Invalid crop dimensions, falling back to 1x1");
            canvas.width = 1;
            canvas.height = 1;
        } else {
            // Use Math.max to ensure at least 1px
            canvas.width = Math.max(1, w);
            canvas.height = Math.max(1, h);
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error("Canvas context failed")); return; }
        
        // High quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = sourceImage;
    });
  };

  const getVisualSourceImage = (visualEl: SlideVisualElement, allElements: any[], cleanedImage: string | null | undefined, originalImage: string): string => {
      if (!cleanedImage) return originalImage;
      const cropBox = visualEl.originalBox || visualEl.box;
      const hasTextOverlap = allElements.some((el: any) => 
          el.type === ElementType.TEXT && isOverlapping(cropBox, el.box)
      );
      return hasTextOverlap ? cleanedImage : originalImage;
  };

  const getCroppedBase64 = async (elementId: string): Promise<string | null> => {
      if (!activeSlide?.slideData) return null;
      const element = activeSlide.slideData.elements.find(el => el.id === elementId);
      if (!element || element.type !== ElementType.VISUAL) return null;
      if ((element as SlideVisualElement).customImage) return (element as SlideVisualElement).customImage!;
      
      const visualEl = element as SlideVisualElement;
      const source = getVisualSourceImage(visualEl, activeSlide.slideData.elements, activeSlide.slideData.cleanedImage, activeSlide.originalImage);
      return await cropImage(source, visualEl.originalBox || visualEl.box);
  };

  // --- AI Operations (Refine, Modify, Vectorize, Erase) ---

  const handleRefineElement = async (id: string, prompt?: string) => {
      if (isProcessing || !activeSlide?.slideData) return;
      setIsProcessing(true);
      try {
          const cropped = await getCroppedBase64(id);
          if (!cropped) throw new Error("Crop failed");
          const newSubs = await refineElement(cropped, prompt);
          const parent = activeSlide.slideData.elements.find(el => el.id === id);
          if (!parent) return;

          const mapped = newSubs.map((sub: any, idx: number) => {
              // Precise mapping back to global coordinates using floats
              const globalW = (sub.box.width / 100) * parent.box.width;
              const globalH = (sub.box.height / 100) * parent.box.height;
              const globalL = parent.box.left + ((sub.box.left / 100) * parent.box.width);
              const globalT = parent.box.top + ((sub.box.top / 100) * parent.box.height);
              
              // Ensure we don't exceed 100% or go below 0%
              const nb = { 
                  top: Math.max(0, Math.min(100, globalT)), 
                  left: Math.max(0, Math.min(100, globalL)), 
                  width: Math.min(100 - globalL, globalW), 
                  height: Math.min(100 - globalT, globalH) 
              };
              
              return { ...sub, id: `${parent.id}-s-${Date.now()}-${idx}`, box: nb, originalBox: nb };
          });

          updateActiveSlide({
              slideData: {
                  ...activeSlide.slideData,
                  elements: [...activeSlide.slideData.elements.filter(el => el.id !== id), ...mapped]
              },
              selectedElementId: mapped.length > 0 ? mapped[0].id : null
          });
      } catch (e) { console.error(e); alert("操作失败"); } finally { setIsProcessing(false); }
  };

  const handleModifyElement = async (id: string, instruction: string) => {
      if (isProcessing || !activeSlide?.slideData) return;
      setIsProcessing(true);
      try {
          const element = activeSlide.slideData.elements.find(el => el.id === id) as SlideVisualElement;
          if (!element || element.type !== ElementType.VISUAL) return;

          // Before generating, if history is empty, capture the "original" state
          let currentHistory = element.history || [];
          if (currentHistory.length === 0) {
             const originalCrop = await getCroppedBase64(id); // This gets custom or original
             // Since history is empty, getCroppedBase64 would return original or current custom.
             // We want to ensure we have the base state.
             // Force get crop from source
             const source = getVisualSourceImage(element, activeSlide.slideData.elements, activeSlide.slideData.cleanedImage, activeSlide.originalImage);
             const rawCrop = await cropImage(source, element.originalBox || element.box);
             currentHistory = [rawCrop];
          }

          const cropped = await getCroppedBase64(id);
          if (!cropped) throw new Error("Crop failed");
          
          const newImgRaw = await regenerateVisualElement(cropped, instruction);
          if (!newImgRaw) throw new Error("Gen failed");
          const newImg = `data:image/png;base64,${newImgRaw}`;

          // Update History
          const newHistory = [...currentHistory, newImg];
          const newIndex = newHistory.length - 1;

          updateActiveSlide({
              slideData: {
                  ...activeSlide.slideData,
                  elements: activeSlide.slideData.elements.map(el => 
                      el.id === id 
                      ? { ...el, customImage: newImg, history: newHistory, historyIndex: newIndex } 
                      : el
                  )
              }
          });
      } catch (e) { console.error(e); alert("生成失败"); } finally { setIsProcessing(false); }
  };

  const handleSelectVisualHistory = (elementId: string, historyIndex: number) => {
      if (!activeSlide?.slideData) return;
      const element = activeSlide.slideData.elements.find(el => el.id === elementId) as SlideVisualElement;
      if (!element || !element.history || !element.history[historyIndex]) return;

      updateActiveSlide({
          slideData: {
              ...activeSlide.slideData,
              elements: activeSlide.slideData.elements.map(el => 
                  el.id === elementId 
                  ? { ...el, customImage: element.history![historyIndex], historyIndex: historyIndex } 
                  : el
              )
          }
      });
  };

  const handleGenerateVectors = async () => {
      if (!activeSlide?.slideData || !activeSlide.originalImage) return;
      if (activeSlide.vectorData) {
          updateActiveSlide({ viewMode: 'vector' });
          return;
      }
      
      setIsProcessing(true);
      try {
          const visualElements = activeSlide.slideData.elements.filter(el => el.type === ElementType.VISUAL) as SlideVisualElement[];
          const textElements = activeSlide.slideData.elements.filter(el => el.type === ElementType.TEXT) as SlideTextElement[];
          
          const generatedShapes: PPTShapeElement[] = [];
          const nonVectorImages: SlideVisualElement[] = [];
          
          const chunkSize = 3;
          for (let i = 0; i < visualElements.length; i += chunkSize) {
              const chunk = visualElements.slice(i, i + chunkSize);
              const promises = chunk.map(async (visualEl) => {
                 try {
                     let cropped: string;
                     
                     // CHECK 1: Use Current Visual State (History/Custom) if available
                     if (visualEl.customImage) {
                        cropped = visualEl.customImage;
                     } else {
                         // Fallback to cropping from source
                         const source = getVisualSourceImage(visualEl, activeSlide.slideData!.elements, activeSlide.slideData!.cleanedImage, activeSlide.originalImage);
                         cropped = await cropImage(source, visualEl.originalBox || visualEl.box);
                     }

                     const info = await analyzeVisualToVector(cropped);
                     
                     if (info.isVector) {
                         return {
                             kind: 'shape',
                             data: {
                                 id: `shape-${visualEl.id}`, originalId: visualEl.id, type: 'SHAPE',
                                 shapeType: info.shapeType, box: visualEl.box,
                                 style: {
                                     fillColor: info.style?.fillColor || '#cccccc',
                                     strokeColor: info.style?.strokeColor || 'transparent',
                                     strokeWidth: info.style?.strokeWidth || 0,
                                     opacity: info.style?.opacity ?? 1
                                 }
                             } as PPTShapeElement
                         };
                     } else {
                         return { kind: 'image', data: { ...visualEl, id: `img-fb-${visualEl.id}`, originalId: visualEl.id, customImage: cropped } as SlideVisualElement };
                     }
                 } catch (e) { return { kind: 'image', data: { ...visualEl, id: `img-err-${visualEl.id}`, originalId: visualEl.id } as SlideVisualElement }; }
              });
              const results = await Promise.all(promises);
              results.forEach(res => {
                  if (res.kind === 'shape') generatedShapes.push(res.data as PPTShapeElement);
                  else nonVectorImages.push(res.data as SlideVisualElement);
              });
          }

          updateActiveSlide({
              vectorData: {
                  backgroundColor: activeSlide.slideData.backgroundColor,
                  shapes: generatedShapes,
                  texts: textElements,
                  images: nonVectorImages
              },
              viewMode: 'vector'
          });
      } catch (e) { console.error(e); alert("矢量转换失败"); } finally { setIsProcessing(false); }
  };

  const handleRegenerateSingleVector = async (elementId: string) => {
    if (!activeSlide?.vectorData || !activeSlide.slideData || isProcessing) return;
    setIsProcessing(true);
    
    try {
        // Find the element in Vector Data to get originalId
        const shapeMatch = activeSlide.vectorData.shapes.find(s => s.id === elementId);
        const imageMatch = activeSlide.vectorData.images.find(i => i.id === elementId);
        
        const originalId = shapeMatch?.originalId || imageMatch?.originalId;
        if (!originalId) throw new Error("Could not find original element link");

        const visualEl = activeSlide.slideData.elements.find(el => el.id === originalId) as SlideVisualElement;
        if (!visualEl) throw new Error("Original visual element missing");

        // Get Latest Image
        let cropped: string;
        if (visualEl.customImage) {
            cropped = visualEl.customImage;
        } else {
            const source = getVisualSourceImage(visualEl, activeSlide.slideData.elements, activeSlide.slideData.cleanedImage, activeSlide.originalImage);
            cropped = await cropImage(source, visualEl.originalBox || visualEl.box);
        }

        const info = await analyzeVisualToVector(cropped);
        
        let newShapes = [...activeSlide.vectorData.shapes];
        let newImages = [...activeSlide.vectorData.images];

        // Remove old entry
        newShapes = newShapes.filter(s => s.id !== elementId);
        newImages = newImages.filter(i => i.id !== elementId);

        // Add new entry
        if (info.isVector) {
             const newShape: PPTShapeElement = {
                 id: `shape-${visualEl.id}-${Date.now()}`, 
                 originalId: visualEl.id, 
                 type: 'SHAPE',
                 shapeType: info.shapeType, 
                 box: visualEl.box,
                 style: {
                     fillColor: info.style?.fillColor || '#cccccc',
                     strokeColor: info.style?.strokeColor || 'transparent',
                     strokeWidth: info.style?.strokeWidth || 0,
                     opacity: info.style?.opacity ?? 1
                 }
             };
             newShapes.push(newShape);
             updateActiveSlide({ selectedElementId: newShape.id });
        } else {
             const newImage: SlideVisualElement = { 
                 ...visualEl, 
                 id: `img-fb-${visualEl.id}-${Date.now()}`, 
                 originalId: visualEl.id, 
                 customImage: cropped 
             };
             newImages.push(newImage);
             updateActiveSlide({ selectedElementId: newImage.id });
        }

        updateActiveSlide({
            vectorData: {
                ...activeSlide.vectorData,
                shapes: newShapes,
                images: newImages
            }
        });

    } catch (e) {
        console.error(e);
        alert("重新生成失败");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConfirmErasure = async () => {
      if (!activeSlide?.slideData || activeSlide.erasureBoxes.length === 0 || isProcessing) return;
      
      setIsProcessing(true);
      try {
          // 1. Snapshot Visual Elements State BEFORE modifying the background
          // This ensures that visuals which are currently just "windows" to the background
          // get "frozen" as static images in their history, so the background erasure doesn't change them.
          const currentElements = activeSlide.slideData.elements;
          
          const elementsWithHistory = await Promise.all(currentElements.map(async (el) => {
              if (el.type !== ElementType.VISUAL) return el;
              
              const vis = el as SlideVisualElement;
              // Capture the exact current appearance
              const snapshot = await getCroppedBase64(vis.id);
              if (!snapshot) return vis;

              let newHistory = vis.history ? [...vis.history] : [];
              
              // If this is the first time we are saving history (history is empty),
              // the current snapshot represents the "Before" state.
              // We add it.
              // Note: If the user has already done modifications (history exists), 
              // we also add this current state as a checkpoint before the background changes underneath.
              newHistory.push(snapshot);

              return {
                  ...vis,
                  // IMPORTANT: Set customImage to the snapshot. 
                  // This decouples the element from the background layer we are about to erase.
                  customImage: snapshot, 
                  history: newHistory,
                  historyIndex: newHistory.length - 1
              };
          }));

          // 2. Perform Background Erasure
          const bg = activeSlide.slideData.cleanedImage || activeSlide.originalImage;
          const newBg = await eraseAreasFromImage(bg, activeSlide.erasureBoxes);
          
          if (newBg) {
              updateActiveSlide({
                  slideData: { 
                      ...activeSlide.slideData, 
                      cleanedImage: `data:image/png;base64,${newBg}`,
                      elements: elementsWithHistory // Use the snapshot-updated elements
                  },
                  isErasureMode: false,
                  erasureBoxes: []
              });
          }
      } catch (e) { 
          console.error(e); 
          alert("擦除失败"); 
      } finally { 
          setIsProcessing(false); 
      }
  };

  // --- Paste Handler ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
          handleFilesSelected(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []); // Global paste

  // --- Export Handler ---
  const handleExportPPT = async (onlyCurrent: boolean = false) => {
    // Determine slides to process
    let slidesToProcess: SlideWorkspace[] = [];
    if (onlyCurrent) {
        if (!activeSlide) return;
        slidesToProcess = [activeSlide];
    } else {
        slidesToProcess = slides;
    }

    // Filter valid slides (must be complete and have data)
    const validSlides = slidesToProcess.filter(s => s.status === 'complete' && s.slideData);
    
    if (validSlides.length === 0) {
        if (onlyCurrent) alert("当前页面尚未完成处理，无法导出。");
        return;
    }

    if (isExporting) return;
    setIsExporting(true);
    
    try {
      const pptx = new PptxGenJS();
      
      for (const slide of validSlides) {
          const pptSlide = pptx.addSlide();
          const { slideData, vectorData, viewMode, visibleLayers, originalImage } = slide;

          // Helper to add image to slide
          const addImg = (data: string, box: BoundingBox) => {
               pptSlide.addImage({ data, x: `${box.left}%`, y: `${box.top}%`, w: `${box.width}%`, h: `${box.height}%` });
          };
          const addTxt = (el: SlideTextElement) => {
              let fontSize = 16;
              if (el.style.fontSize === 'small') fontSize = 12;
              if (el.style.fontSize === 'large') fontSize = 24;
              if (el.style.fontSize === 'title') fontSize = 36;
              pptSlide.addText(el.content, {
                  x: `${el.box.left}%`, y: `${el.box.top}%`, w: `${el.box.width}%`, h: `${el.box.height}%`,
                  fontSize, bold: el.style.fontWeight === 'bold', align: el.style.alignment,
                  color: el.style.color.replace('#', '')
              });
          };

          if (viewMode === 'image' && slideData) {
              // Background
              if (visibleLayers.background) {
                  if (slideData.cleanedImage) pptSlide.background = { data: slideData.cleanedImage };
                  else if (slideData.backgroundColor) pptSlide.background = { color: slideData.backgroundColor.replace('#', '') };
              }
              // Visuals
              if (visibleLayers.visual) {
                  for (const el of slideData.elements) {
                      if (el.type === ElementType.VISUAL && !el.isHidden) {
                          const vis = el as SlideVisualElement;
                          let imgData = vis.customImage;
                          if (!imgData) {
                              const src = getVisualSourceImage(vis, slideData.elements, slideData.cleanedImage, originalImage);
                              imgData = await cropImage(src, vis.originalBox || vis.box);
                          }
                          addImg(imgData, vis.box);
                      }
                  }
              }
              // Text
              if (visibleLayers.text) {
                  slideData.elements.filter(e => e.type === ElementType.TEXT && !e.isHidden).forEach(e => addTxt(e as SlideTextElement));
              }
          } else if (viewMode === 'vector' && vectorData) {
              // Vector Mode Export
               if (vectorData.backgroundColor) pptSlide.background = { color: vectorData.backgroundColor.replace('#', '') };
               
               vectorData.shapes.forEach(shape => {
                   if (shape.isHidden) return;
                   let type = pptx.ShapeType.rect;
                   // Mapping...
                   if (shape.shapeType === 'rect') type = pptx.ShapeType.rect;
                   if (shape.shapeType === 'roundRect') type = pptx.ShapeType.roundRect;
                   if (shape.shapeType === 'ellipse') type = pptx.ShapeType.ellipse;
                   if (shape.shapeType === 'triangle') type = pptx.ShapeType.triangle;
                   if (shape.shapeType === 'arrowRight') type = pptx.ShapeType.rightArrow;
                   if (shape.shapeType === 'arrowLeft') type = pptx.ShapeType.leftArrow;
                   if (shape.shapeType === 'line') type = pptx.ShapeType.line;
                   if (shape.shapeType === 'star') type = pptx.ShapeType.star5;
                   if (shape.shapeType === 'pentagon') type = pptx.ShapeType.pentagon;
                   if (shape.shapeType === 'hexagon') type = pptx.ShapeType.hexagon;
                   if (shape.shapeType === 'diamond') type = pptx.ShapeType.diamond;
                   if (shape.shapeType === 'callout') type = pptx.ShapeType.callout1;

                   pptSlide.addShape(type, {
                       x: `${shape.box.left}%`, y: `${shape.box.top}%`, w: `${shape.box.width}%`, h: `${shape.box.height}%`,
                       fill: shape.style.fillColor === 'transparent' ? undefined : { color: shape.style.fillColor.replace('#', ''), transparency: (1 - shape.style.opacity) * 100 },
                       line: { color: shape.style.strokeColor.replace('#', ''), width: shape.style.strokeWidth }
                   });
               });

               // Images
               for (const img of vectorData.images) {
                   if (!img.isHidden) {
                       let d = img.customImage;
                       if (!d) d = await cropImage(originalImage, img.originalBox || img.box);
                       addImg(d, img.box);
                   }
               }

               // Text
               vectorData.texts.filter(t => !t.isHidden).forEach(t => addTxt(t));
          }
      }
      
      const safeName = onlyCurrent && activeSlide ? activeSlide.name.replace(/[^a-z0-9]/gi, '_').substring(0, 20) : 'All';
      const fileName = `PPT-Export-${safeName}-${Date.now()}.pptx`;

      await pptx.writeFile({ fileName });

    } catch (e) { console.error(e); alert("导出失败"); } finally { setIsExporting(false); }
  };

  const handleReset = () => {
      // Clear current active slide? Or all? 
      // User likely wants to upload new files or clear workspace.
      // Let's just clear active selection to show upload if empty, or allow add more.
      if (window.confirm("确定要清空所有页面吗？")) {
        setSlides([]);
        setActiveSlideId(null);
      }
  };

  const handleRemoveSlide = (id: string) => {
      const newSlides = slides.filter(s => s.id !== id);
      setSlides(newSlides);
      if (activeSlideId === id) {
          setActiveSlideId(newSlides.length > 0 ? newSlides[0].id : null);
      }
  };


  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-900 transition-colors duration-200">
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialSettings={aiSettings}
      />

      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">P</div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">
            PPT 拆解大师
          </h1>
        </div>

        {activeSlide && activeSlide.status === 'complete' && (
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 mx-4">
                <button
                    onClick={() => updateActiveSlide({ viewMode: 'image' })}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSlide.viewMode === 'image' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                >
                    图片拆解
                </button>
                <button
                    onClick={handleGenerateVectors}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeSlide.viewMode === 'vector' ? 'bg-indigo-600 shadow text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                >
                    {isProcessing && activeSlide.viewMode !== 'vector' && <div className="w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin"></div>}
                    矢量编辑 (Beta)
                </button>
            </div>
        )}

        <div className="flex items-center gap-4">
           {/* Export Current Button */}
           {activeSlide?.status === 'complete' && (
             <button 
                  onClick={() => handleExportPPT(true)}
                  disabled={isExporting || isProcessing}
                  className={`px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
                  title={activeSlide.viewMode === 'vector' ? "导出当前页 (矢量模式)" : "导出当前页 (图片模式)"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  导出当前页
             </button>
           )}

           {slides.some(s => s.status === 'complete') && (
             <button 
                  onClick={() => handleExportPPT(false)}
                  disabled={isExporting || isProcessing}
                  className={`px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isExporting ? '打包中...' : '导出全部 PPT'}
             </button>
           )}
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
           </button>
           <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
              {isDarkMode ? '🌞' : '🌙'}
           </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar */}
          {slides.length > 0 && (
             <SlideSidebar 
                slides={slides}
                activeSlideId={activeSlideId}
                onSelectSlide={setActiveSlideId}
                onAddFiles={handleFilesSelected}
                onRemoveSlide={handleRemoveSlide}
                isProcessing={isProcessing}
             />
          )}

          {/* Main Content Area */}
          <main className="flex-1 relative flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
            
            {!activeSlide ? (
               // Empty State / Upload
               <div className="absolute inset-0 flex items-center justify-center p-10">
                  <UploadSection onFilesSelected={handleFilesSelected} />
               </div>
            ) : (
                // Active Slide Editor
                <div className="flex-1 flex overflow-hidden relative">
                    
                    {/* NEW: Idle State - Preview & Start Action */}
                    {activeSlide.status === 'idle' && (
                        <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900 relative p-8">
                             {/* Static Preview */}
                             <div className="relative shadow-2xl border-2 border-slate-200 dark:border-slate-700 bg-white" style={{ width: '1024px', height: '576px' }}>
                                 <img src={activeSlide.originalImage} className="w-full h-full object-contain" alt="Preview" />
                                 
                                 {/* Overlay Action */}
                                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                                     <button
                                        onClick={() => handleStartAnalysis(activeSlide.id, activeSlide.originalImage)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-4 rounded-full shadow-xl transition-transform hover:scale-105 flex items-center gap-3"
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                         </svg>
                                         开始分析布局 (Analyze Layout)
                                     </button>
                                 </div>
                             </div>
                        </div>
                    )}
                    
                    {/* Status Overlays for Active Slide */}
                    {activeSlide.status === 'analyzing' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-50">
                           <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                           <p className="text-slate-600 dark:text-slate-300">分析布局中...</p>
                        </div>
                    )}
                    
                    {activeSlide.status === 'processing_final' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-50">
                           <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-3"></div>
                           <p className="text-slate-600 dark:text-slate-300">生成图层中...</p>
                        </div>
                    )}

                    {activeSlide.status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 z-50">
                           <p className="text-red-500 text-lg mb-2">处理失败</p>
                           <p className="text-slate-500 mb-4 text-sm">{activeSlide.errorDetails?.message}</p>
                           <button onClick={() => handleStartAnalysis(activeSlide.id, activeSlide.originalImage)} className="px-4 py-2 bg-blue-600 text-white rounded">重试</button>
                        </div>
                    )}

                    {/* Correction Mode */}
                    {activeSlide.status === 'correcting' && activeSlide.slideData && (
                        <CorrectionCanvas 
                           imageSrc={activeSlide.originalImage}
                           elements={activeSlide.slideData.elements}
                           onElementsChange={handleCorrectionUpdate}
                           onConfirm={handleConfirmCorrection}
                           onCancel={() => handleRemoveSlide(activeSlide.id)}
                        />
                    )}

                    {/* Editor / Vector Mode */}
                    {activeSlide.status === 'complete' && activeSlide.slideData && (
                        <>
                           {activeSlide.viewMode === 'image' ? (
                                <>
                                    <EditorCanvas 
                                        imageSrc={activeSlide.originalImage}
                                        data={activeSlide.slideData}
                                        selectedId={activeSlide.selectedElementId}
                                        visibleLayers={activeSlide.visibleLayers}
                                        onSelect={(id) => updateActiveSlide({ selectedElementId: id })}
                                        onUpdateElement={handleUpdateElementBox}
                                        isErasureMode={activeSlide.isErasureMode}
                                        erasureBoxes={activeSlide.erasureBoxes}
                                        onAddErasureBox={(box) => updateActiveSlide({ erasureBoxes: [...activeSlide.erasureBoxes, box] })}
                                    />
                                    <LayerList 
                                        data={activeSlide.slideData}
                                        selectedId={activeSlide.selectedElementId}
                                        onSelect={(id) => updateActiveSlide({ selectedElementId: id })}
                                        visibleLayers={activeSlide.visibleLayers}
                                        onToggleLayerType={handleToggleLayer}
                                        onToggleElementVisibility={handleToggleElementVisibility}
                                        onRefineElement={handleRefineElement}
                                        onModifyElement={handleModifyElement}
                                        onDeleteElement={handleDeleteElement}
                                        isProcessing={isProcessing}
                                        isErasureMode={activeSlide.isErasureMode}
                                        onToggleErasureMode={() => updateActiveSlide({ isErasureMode: !activeSlide.isErasureMode, erasureBoxes: [], selectedElementId: null })}
                                        onConfirmErasure={handleConfirmErasure}
                                        onSelectVisualHistory={handleSelectVisualHistory}
                                    />
                                </>
                           ) : (
                                activeSlide.vectorData && (
                                    <>
                                        <ReconstructionCanvas 
                                            shapes={activeSlide.vectorData.shapes}
                                            texts={activeSlide.vectorData.texts}
                                            images={activeSlide.vectorData.images}
                                            backgroundColor={activeSlide.vectorData.backgroundColor}
                                            selectedId={activeSlide.selectedElementId}
                                            onSelect={(id) => updateActiveSlide({ selectedElementId: id })}
                                            onUpdateElement={handleUpdateElementBox}
                                        />
                                        <VectorLayerList
                                            data={activeSlide.vectorData}
                                            selectedId={activeSlide.selectedElementId}
                                            onSelect={(id) => updateActiveSlide({ selectedElementId: id })}
                                            onToggleVisibility={handleToggleElementVisibility}
                                            onRegenerateVector={handleRegenerateSingleVector}
                                        />
                                    </>
                                )
                           )}
                        </>
                    )}
                </div>
            )}
          </main>
      </div>
    </div>
  );
};

export default App;