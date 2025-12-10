
import React, { useState } from "react";
import { Sparkles, PenTool, RefreshCw, Copy, Check, FileText, BrainCircuit } from "lucide-react";
import { generateCloneContent } from "./services/geminiService";
import { AnalysisResult } from "./types";
import { Button } from "./components/Button";
import { TextArea } from "./components/TextArea";
import { Input } from "./components/Input";

const App: React.FC = () => {
  const [sampleText, setSampleText] = useState("");
  const [topic, setTopic] = useState("");
  const [contextInfo, setContextInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editableContent, setEditableContent] = useState(""); 
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleText.trim() || !topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setEditableContent("");

    try {
      const data = await generateCloneContent(sampleText, topic, contextInfo);
      setResult(data);
      setEditableContent(data.generatedContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResult(null);
    setEditableContent("");
    setTopic("");
    setContextInfo("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <PenTool className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              AI Writer Clone
            </h1>
          </div>
          {result && (
            <Button variant="ghost" onClick={handleReset} className="text-sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tạo bài mới
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {!result ? (
          /* INPUT VIEW */
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                Sao chép phong cách viết của bất kỳ ai
              </h2>
              <p className="text-lg text-slate-600">
                Phân tích DNA văn phong và tạo nội dung mới với phong cách tương tự chỉ trong vài giây.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <TextArea
                label="1. Bài viết mẫu (Style Source)"
                placeholder="Dán bài viết mẫu có phong cách bạn muốn sao chép vào đây..."
                rows={6}
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                helperText="Càng nhiều bài mẫu chất lượng, AI càng phân tích chính xác."
                required
              />

              <Input
                label="2. Chủ đề bài mới"
                placeholder="Ví dụ: Lợi ích của việc dậy sớm, Tương lai của AI..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />

              <TextArea
                label="3. Thông tin bổ sung / Dàn ý (Context - Tùy chọn)"
                placeholder="- Ý chính 1: ... &#10;- Ý chính 2: ... &#10;- Số liệu cụ thể: ... &#10;- Kết luận mong muốn: ..."
                rows={4}
                value={contextInfo}
                onChange={(e) => setContextInfo(e.target.value)}
                helperText="Cung cấp các gạch đầu dòng, sự kiện, hoặc dữ liệu bạn muốn AI đưa vào bài viết."
              />

              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full text-lg py-4"
                isLoading={isLoading}
                disabled={!sampleText.trim() || !topic.trim()}
                icon={<Sparkles className="w-5 h-5" />}
              >
                {isLoading ? "Đang phân tích & Viết..." : "Phân tích & Viết bài"}
              </Button>
            </form>
          </div>
        ) : (
          /* RESULT VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Sidebar / Analysis Summary */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-600"/>
                    <h3 className="font-semibold text-slate-900">DNA Phong Cách</h3>
                </div>
                <div className="p-5 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {result.analysis || "Không có dữ liệu phân tích."}
                </div>
               </div>

               <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                  <h4 className="font-semibold text-indigo-900 mb-2">Chủ đề bài viết</h4>
                  <p className="text-indigo-800 font-medium">{topic}</p>
                  {contextInfo && (
                    <div className="mt-4 pt-4 border-t border-indigo-200/50">
                        <h4 className="font-semibold text-indigo-900 mb-2 text-sm">Thông tin đầu vào</h4>
                        <p className="text-indigo-700 text-sm line-clamp-4">{contextInfo}</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden flex flex-col h-[85vh] min-h-[700px] relative">
                
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-100 text-green-700 p-1.5 rounded-md">
                        <FileText className="w-4 h-4"/>
                    </div>
                    <span className="font-semibold text-slate-700">Kết quả bài viết</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        className="!px-3 !py-1.5 text-sm h-9"
                        onClick={() => handleCopy(editableContent)}
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        <span className="ml-2 hidden sm:inline">{copied ? "Đã sao chép" : "Sao chép"}</span>
                    </Button>
                  </div>
                </div>

                {/* Content - Editable TextArea */}
                <div className="flex-1 p-0 relative group">
                  <textarea
                    className="w-full h-full p-8 resize-none outline-none font-serif text-slate-800 leading-relaxed bg-transparent border-0 focus:ring-0 custom-scrollbar text-lg selection:bg-yellow-200 selection:text-black"
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    placeholder="Nội dung sẽ hiển thị ở đây..."
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

       {/* Footer */}
       <footer className="py-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} AI Writer Clone. Powered by Google Gemini 2.5 Flash.</p>
      </footer>
    </div>
  );
};

export default App;
