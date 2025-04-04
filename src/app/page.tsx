'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useMemo } from 'react';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';
import React from 'react';

// 定義 Code 組件的類型
type CodeComponentProps = React.ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
};

// 定義標題組件的類型
type HeadingComponentProps = React.ComponentPropsWithoutRef<'h1'> & {
  children?: React.ReactNode;
};

// 定義段落組件的類型
type ParagraphComponentProps = React.ComponentPropsWithoutRef<'p'> & {
  children?: React.ReactNode;
};

// 定義列表組件的類型
type ListComponentProps = React.ComponentPropsWithoutRef<'ul'> & {
  children?: React.ReactNode;
};

type OrderedListComponentProps = React.ComponentPropsWithoutRef<'ol'> & {
  children?: React.ReactNode;
};

type ListItemComponentProps = React.ComponentPropsWithoutRef<'li'> & {
  children?: React.ReactNode;
};

// 動態導入 MDEditor 以避免 SSR 問題
const MDEditorComponent = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

const MermaidComponent = ({ content }: { content: string }) => {
  const [svg, setSvg] = useState<string>('');
  const elementId = useMemo(() => `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        // 清理內容
        let processedContent = content.trim();

        // 初始化 Mermaid 配置
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
          class: {
            useMaxWidth: true,
            defaultRenderer: 'dagre-d3',
            titleTopMargin: 25,
            diagramPadding: 8
          }
        });

        // 處理類圖中的關係語法
        if (processedContent.includes('class ')) {
          // 將 "1" -- "*" 格式轉換為標準的 Mermaid 類圖語法
          processedContent = processedContent.replace(/(\w+)\s+"([^"]+)"\s+-->\s+"([^"]+)"\s+(\w+)/g, '$1 "$2" --> "$3" $4');
          processedContent = processedContent.replace(/(\w+)\s+"([^"]+)"\s+--\s+"([^"]+)"\s+(\w+)/g, '$1 "$2" -- "$3" $4');
        }

        console.log('Rendering diagram with content:', processedContent); // 調試用
        const { svg } = await mermaid.render(elementId, processedContent);
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        console.error('Content causing error:', content);
      }
    };

    // 確保在組件掛載後再渲染圖表
    const timer = setTimeout(renderDiagram, 100);
    return () => clearTimeout(timer);
  }, [content, elementId]);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      className="w-full overflow-x-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 my-4"
      style={{
        minHeight: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    />
  );
};

// 添加模態框組件
const MarkdownModal = ({ isOpen, onClose, content, renderContent }: {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  renderContent: (content: string) => React.ReactNode;
}) => {
  useEffect(() => {
    if (isOpen && content) {
      // 當模態框打開時重新初始化 Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
        class: {
          useMaxWidth: true,
          defaultRenderer: 'dagre-d3'
        }
      });

      // 強制重新渲染所有 Mermaid 圖表
      const renderMermaidDiagrams = async () => {
        const elements = document.querySelectorAll('.mermaid');
        await Promise.all(Array.from(elements).map(async (element) => {
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          element.id = id;
          try {
            const content = element.textContent || '';
            let processedContent = content.trim();

            // 檢測圖表類型並確保正確的語法
            if (processedContent.includes('class ') && !processedContent.startsWith('classDiagram')) {
              processedContent = `classDiagram\n${processedContent}`;
            } else if ((processedContent.includes('-->') || processedContent.includes('---')) && !processedContent.startsWith('flowchart')) {
              processedContent = `flowchart TD\n${processedContent}`;
            }

            const { svg } = await mermaid.render(id, processedContent);
            element.innerHTML = svg;
          } catch (error) {
            console.error('Mermaid rendering error:', error);
            console.error('Content causing error:', element.textContent);
          }
        }));
      };

      // 等待 DOM 更新後再渲染圖表
      setTimeout(renderMermaidDiagrams, 100);
    }
  }, [isOpen, content]);

  const handleDownloadPDF = async () => {
    const contentElement = document.getElementById('modal-preview-content');
    if (!contentElement) return;

    try {
      // 動態導入 html2pdf
      const { default: html2pdf } = await import('html2pdf.js');

      // 等待所有 Mermaid 圖表渲染完成
      const mermaidElements = contentElement.querySelectorAll('.mermaid');
      await Promise.all(Array.from(mermaidElements).map(async (element) => {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        element.id = id;
        try {
          const content = element.textContent || '';
          let processedContent = content.trim();

          if (processedContent.includes('class ') && !processedContent.startsWith('classDiagram')) {
            processedContent = `classDiagram\n${processedContent}`;
          } else if ((processedContent.includes('-->') || processedContent.includes('---')) && !processedContent.startsWith('flowchart')) {
            processedContent = `flowchart TD\n${processedContent}`;
          }

          const { svg } = await mermaid.render(id, processedContent);
          element.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid rendering error:', error);
        }
      }));

      // 創建臨時容器用於 PDF 生成
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '210mm'; // A4 寬度
      tempContainer.style.padding = '10mm'; // 頁面邊距減半
      tempContainer.innerHTML = contentElement.innerHTML;
      document.body.appendChild(tempContainer);

      // 調整 Mermaid 圖表大小
      const svgElements = tempContainer.querySelectorAll('svg');
      svgElements.forEach(svg => {
        svg.style.maxWidth = '190mm'; // 考慮頁面邊距後的最大寬度
        svg.style.height = 'auto';
        svg.style.display = 'block';
        svg.style.marginBottom = '5mm'; // 減少圖表間距
        svg.style.pageBreakInside = 'avoid'; // 避免圖表被分頁切割
      });

      // PDF 配置
      const opt = {
        margin: 7.5, // 邊距減半（從 15mm 減至 7.5mm）
        filename: 'markdown-content.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: true,
          allowTaint: true,
          scrollY: 0,
          windowWidth: 794, // A4 寬度（點）
          letterRendering: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
          precision: 16
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['svg', 'table', 'img']
        }
      };

      // 生成 PDF
      await html2pdf().set(opt).from(tempContainer).save();

      // 清理臨時容器
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('生成 PDF 時發生錯誤，請稍後再試');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white w-[90vw] h-[90vh] rounded-lg shadow-xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">Markdown 預覽</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPDF}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
              title="下載 PDF"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-auto rounded-md bg-white p-4 shadow-inner">
            <div className="relative">
              <button
                onClick={() => {
                  const modalContent = document.getElementById('modal-preview-content');
                  if (modalContent) {
                    modalContent.classList.toggle('h-auto');
                    modalContent.classList.toggle('h-full');
                    // 切換高度後重新渲染 Mermaid 圖表
                    setTimeout(() => {
                      const elements = document.querySelectorAll('.mermaid');
                      elements.forEach((element, index) => {
                        const id = `mermaid-${Date.now()}-${index}`;
                        element.id = id;
                        try {
                          mermaid.init(undefined, `#${id}`);
                        } catch (error) {
                          console.error('Mermaid rendering error:', error);
                        }
                      });
                    }, 100);
                  }
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div id="modal-preview-content" className="h-full overflow-auto prose max-w-none">
                <div className="text-black">
                  {renderContent(content)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [value, setValue] = useState<string | undefined>(`# 歡迎使用 Markdown & Mermaid 編輯器

這是一個示例資料表關係圖：

\`\`\`mermaid
classDiagram
    class gift3 {
        +int gift3_id
        +datetime gift3_dt1
        +datetime gift3_dt2
        +int gift3_type
        +int gift3_count
        +int gift3_point
        +int gift3_stock
        +int gift3_selected
        +int level_id
        +int gift3_a_count
        +int gift3_b_count
    }

    class gift3p {
        +int gift3_id
        +int p_id
        +string gift3p_memo
        +int gift3p_type
    }

    class p {
        +int p_id
        +string p_name
        +string p_spec
        +string p_img
    }

    class member_level2025 {
        +int level_id
        +string level_name
    }

    class monthly_gift {
        +int p_id
        +datetime monthly_gift_startdt
        +datetime monthly_gift_enddt
        +string member_level
    }

    class gift3page {
        +int gift3page_year
    }

    class member {
        +int member_id
        +datetime member_birthday
        +int member_nowtier2025
        +int member_birthday2
    }

    gift3 "1" -- "*" gift3p : has
    gift3 "1" -- "1" member_level2025 : belongs to
    gift3p "*" -- "1" p : references
    monthly_gift "*" -- "1" p : contains
    monthly_gift "*" -- "*" member_level2025 : available for
    member "1" -- "1" member_level2025 : belongs to
\`\`\``);

  const [fileName, setFileName] = useState<string>('未選擇文件');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 初始化 Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: true,
        showSequenceNumbers: true,
      },
      class: {
        useMaxWidth: true,
      },
      er: {
        useMaxWidth: true,
      },
      gantt: {
        useMaxWidth: true,
      },
      pie: {
        useMaxWidth: true,
      }
    });
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setValue(content);
      };
      reader.readAsText(file);
    }
  };

  const handleUrlSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = formData.get('url') as string;

    try {
      const response = await fetch(url);
      const content = await response.text();
      setValue(content);
    } catch (error) {
      console.error('Error fetching markdown content:', error);
      alert('無法載入URL內容，請確認URL是否正確');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setValue(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const renderContent = (content: string) => {
    if (!content) return null;

    // 使用正則表達式分割內容，保留 Mermaid 代碼塊
    const parts = content.split(/(```mermaid[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```mermaid')) {
        // 提取 Mermaid 內容
        const mermaidContent = part
          .replace(/```mermaid\n?/, '')
          .replace(/```$/, '')
          .trim();

        // 使用 MermaidComponent 渲染圖表
        return (
          <div key={`mermaid-${index}`} className="my-4">
            <MermaidComponent content={mermaidContent} />
          </div>
        );
      }

      // 渲染普通 Markdown 內容
      return part.trim() ? (
        <div key={`markdown-${index}`} className="my-4">
          <ReactMarkdown
            components={{
              code({inline, children, ...props}: CodeComponentProps) {
                if (inline) {
                  return (
                    <code className="px-1 py-0.5 rounded bg-gray-100 text-black" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <pre className="p-4 rounded-md bg-gray-100 overflow-auto">
                    <code className="text-black" {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
              h1: ({children}: HeadingComponentProps) => <h1 className="text-2xl font-bold mt-6 mb-4 text-black">{children}</h1>,
              h2: ({children}: HeadingComponentProps) => <h2 className="text-xl font-bold mt-5 mb-3 text-black">{children}</h2>,
              h3: ({children}: HeadingComponentProps) => <h3 className="text-lg font-bold mt-4 mb-2 text-black">{children}</h3>,
              h4: ({children}: HeadingComponentProps) => <h4 className="text-base font-bold mt-4 mb-2 text-black">{children}</h4>,
              h5: ({children}: HeadingComponentProps) => <h5 className="text-sm font-bold mt-4 mb-2 text-black">{children}</h5>,
              h6: ({children}: HeadingComponentProps) => <h6 className="text-xs font-bold mt-4 mb-2 text-black">{children}</h6>,
              p: ({children}: ParagraphComponentProps) => <p className="mb-4 text-black">{children}</p>,
              ul: ({children}: ListComponentProps) => <ul className="list-disc pl-6 mb-4 text-black">{children}</ul>,
              ol: ({children}: OrderedListComponentProps) => <ol className="list-decimal pl-6 mb-4 text-black">{children}</ol>,
              li: ({children}: ListItemComponentProps) => <li className="mb-1 text-black">{children}</li>,
            }}
          >
            {part}
          </ReactMarkdown>
        </div>
      ) : null;
    }).filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 py-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <header className="flex justify-between items-center py-2 px-4 bg-white/90 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center shadow-sm mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">
                 PanPanMan Markdown & Mermaid 編輯器
                </h1>
                <p className="text-xs text-gray-600">
                  輕鬆編輯 Markdown 文件並創建流程圖
                </p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/90 rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-800 flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  編輯
                </h2>
                <button className="p-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
              </div>
              <div data-color-mode="light" className="wmde-markdown-var">
                <MDEditorComponent
                  value={value}
                  onChange={setValue}
                  preview="edit"
                  height={400}
                  className="!bg-transparent text-black"
                  textareaProps={{
                    className: 'text-black'
                  }}
                />
              </div>
            </div>

            <div className="bg-white/90 rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-800 flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  預覽
                </h2>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                  title="在新視窗中預覽"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              <div className="overflow-auto rounded-md bg-white/50 p-4 h-[400px] shadow-inner">
                {value && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        const previewDiv = document.getElementById('preview-content');
                        if (previewDiv) {
                          previewDiv.classList.toggle('h-[400px]');
                          previewDiv.classList.toggle('h-auto');
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div id="preview-content" className="h-[400px] overflow-auto prose max-w-none">
                      <div className="text-black">
                        {renderContent(value)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 bg-white/90 rounded-lg shadow-sm border border-dashed ${
                isDragging ? 'border-blue-500 bg-blue-50/30' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center">
                <div className="mr-3 w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-800">上傳文件</h2>
                  <p className="text-xs text-gray-500">支持 .md, .markdown, .txt 格式</p>

                  <div className="mt-2 flex items-center">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".md,.markdown,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className="text-xs cursor-pointer py-1 px-3 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 transition-all"
                    >
                      選擇檔案
                    </label>
                    <p className="ml-2 text-xs text-gray-500 truncate max-w-[150px]">{fileName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 rounded-lg shadow-sm p-4">
              <h2 className="text-sm font-medium text-gray-800 flex items-center mb-2">
                <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                從 URL 載入
              </h2>
              <form onSubmit={handleUrlSubmit} className="flex gap-2">
                <input
                  type="url"
                  name="url"
                  placeholder="輸入 Markdown 檔案的 URL"
                  className="flex-1 px-3 py-1 text-xs rounded-md border border-gray-200
                    focus:ring-1 focus:ring-blue-500 focus:border-transparent
                    bg-white text-black"
                />
                <button
                  type="submit"
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600
                    focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 transition-all
                    shadow-sm"
                >
                  載入
                </button>
              </form>
            </div>
          </div>

          <footer className="text-center text-gray-500 text-xs py-2">
            <p>© {new Date().getFullYear()} PanPanMan Markdown & Mermaid 編輯器</p>
          </footer>
        </div>
      </div>
      <MarkdownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        content={value || ''}
        renderContent={renderContent}
      />
    </div>
  );
}
