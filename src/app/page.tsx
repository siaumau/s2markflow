'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';

// 動態導入 MDEditor 以避免 SSR 問題
const MDEditorComponent = dynamic(
  () => import('@uiw/react-md-editor'),
  { ssr: false }
);

const MermaidComponent = ({ content }: { content: string }) => {
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, content);
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
      }
    };
    renderDiagram();
  }, [content]);

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: svg }} 
      className="w-full overflow-x-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 my-4" 
    />
  );
};

export default function Home() {
  const [value, setValue] = useState<string | undefined>(`# 歡迎使用 Markdown & Mermaid 編輯器

這是一個示例流程圖：

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
  class gift3page {
    +int gift3page_year
  }
\`\`\``);

  const [fileName, setFileName] = useState<string>('未選擇文件');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // 檢測系統主題偏好
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      
      // 設置初始主題
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }

    // 初始化 Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: darkMode ? 'dark' : 'neutral',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    });
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    // 重新初始化 Mermaid 以適應新主題
    mermaid.initialize({
      startOnLoad: true,
      theme: !darkMode ? 'dark' : 'neutral',
      securityLevel: 'loose',
    });
  };

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
    
    // 移除所有 mermaid 代碼塊進行單獨處理
    const parts = content.split(/(```mermaid[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```mermaid')) {
        const mermaidContent = part.replace('```mermaid', '').replace('```', '').trim();
        return <MermaidComponent key={index} content={mermaidContent} />;
      }

      // 對於普通 Markdown 內容，使用 ReactMarkdown 進行解析渲染
      return (
        <div key={index} className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
          <ReactMarkdown 
            components={{
              code({node, inline, className, children, ...props}: any) {
                if (inline) {
                  return (
                    <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200" {...props}>
                      {children}
                    </code>
                  );
                }
                // 非 inline 代碼塊
                return (
                  <pre className="p-4 rounded-md bg-gray-100 dark:bg-gray-700 overflow-auto">
                    <code className="text-gray-800 dark:text-gray-200" {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
              // 自定義標題樣式
              h1: ({children}: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white">{children}</h1>,
              h2: ({children}: any) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-white">{children}</h2>,
              h3: ({children}: any) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h3>,
              h4: ({children}: any) => <h4 className="text-base font-bold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h4>,
              h5: ({children}: any) => <h5 className="text-sm font-bold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h5>,
              h6: ({children}: any) => <h6 className="text-xs font-bold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h6>,
              // 自定義段落樣式
              p: ({children}: any) => <p className="mb-4 text-gray-800 dark:text-gray-200">{children}</p>,
              // 自定義列表樣式
              ul: ({children}: any) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
              ol: ({children}: any) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
              li: ({children}: any) => <li className="mb-1">{children}</li>,
            }}
          >
            {part}
          </ReactMarkdown>
        </div>
      );
    });
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-2 py-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <header className="flex justify-between items-center py-2 px-4 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center shadow-sm mr-2">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Markdown & Mermaid 編輯器
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  輕鬆編輯 Markdown 文件並創建流程圖
                </p>
              </div>
            </div>
            <button 
              onClick={toggleDarkMode} 
              className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {darkMode ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-800 dark:text-white flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  編輯
                </h2>
                <button className="p-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
              </div>
              <div data-color-mode={darkMode ? "dark" : "light"} className="wmde-markdown-var">
                <MDEditorComponent
                  value={value}
                  onChange={setValue}
                  preview="edit"
                  height={400}
                  className="!bg-transparent"
                />
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-800 dark:text-white flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  預覽
                </h2>
              </div>
              <div className="overflow-auto rounded-md bg-white/50 dark:bg-gray-900/50 p-4 h-[400px] shadow-inner">
                {value && renderContent(value)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={`p-4 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm border border-dashed ${
                isDragging ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-600'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center">
                <div className="mr-3 w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-medium text-gray-800 dark:text-white">上傳文件</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">支持 .md, .markdown, .txt 格式</p>
                  
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
                    <p className="ml-2 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{fileName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-sm p-4">
              <h2 className="text-sm font-medium text-gray-800 dark:text-white flex items-center mb-2">
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
                  className="flex-1 px-3 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-600
                    focus:ring-1 focus:ring-blue-500 focus:border-transparent
                    dark:bg-gray-700 dark:text-white"
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

          <footer className="text-center text-gray-500 dark:text-gray-400 text-xs py-2">
            <p>© {new Date().getFullYear()} Markdown & Mermaid 編輯器</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
