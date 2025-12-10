
import React, { useState, useEffect, useRef } from "react";
import { Sparkles, PenTool, RefreshCw, Copy, Check, FileText, BrainCircuit, Key, Lock, LogOut, Plus, Trash2, AlertCircle, X, ShieldCheck, Activity, ExternalLink } from "lucide-react";
import { generateCloneContent } from "./services/geminiService";
import { AnalysisResult, ApiKeyData } from "./types";
import { Button } from "./components/Button";
import { TextArea } from "./components/TextArea";
import { Input } from "./components/Input";

const App: React.FC = () => {
  // --- STATE ---
  // Key Management
  const [keyPool, setKeyPool] = useState<ApiKeyData[]>([]);
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [isKeysLoaded, setIsKeysLoaded] = useState(false); // Trạng thái: Đã load xong key chưa?
  
  // Content Generation
  const [sampleText, setSampleText] = useState("");
  const [topic, setTopic] = useState("");
  const [contextInfo, setContextInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Đang phân tích & Viết...");
  
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editableContent, setEditableContent] = useState(""); 
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- EFFECT: LOAD KEYS ---
  useEffect(() => {
    try {
      // 1. Load User Keys from LocalStorage
      const storedPoolJSON = localStorage.getItem("gemini_key_pool");
      let initialPool: ApiKeyData[] = [];

      if (storedPoolJSON) {
        initialPool = JSON.parse(storedPoolJSON);
      } else {
        // Migration: Check for old single key
        const oldKey = localStorage.getItem("gemini_api_key");
        if (oldKey) {
          initialPool.push({ key: oldKey, status: 'active', label: 'Key cũ' });
          localStorage.removeItem("gemini_api_key"); // Cleanup old
        }
      }
      
      setKeyPool(initialPool);
    } catch (error) {
      console.error("Error loading keys from localStorage:", error);
      // Fallback to empty if corrupted
      setKeyPool([]);
    } finally {
      setIsKeysLoaded(true); // Đánh dấu là đã load xong
    }
  }, []);

  // --- EFFECT: SAVE KEYS ---
  useEffect(() => {
    // Chỉ lưu khi đã load xong dữ liệu cũ để tránh ghi đè dữ liệu rỗng lúc khởi động
    if (isKeysLoaded) {
      localStorage.setItem("gemini_key_pool", JSON.stringify(keyPool));
    }
    
    // Tự động xóa lỗi nếu người dùng đã thêm key
    if (keyPool.length > 0 && error === "Vui lòng nhập API Key để bắt đầu phân tích.") {
      setError(null);
    }
  }, [keyPool, isKeysLoaded, error]);

  // --- EFFECT: KEYBOARD SHORTCUT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K or Cmd + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowKeyManager(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- KEY MANAGEMENT LOGIC ---
  const handleAddKey = () => {
    if (!newKeyInput.trim()) return;
    const newKey: ApiKeyData = {
      key: newKeyInput.trim(),
      label: `Key ${keyPool.length + 1}`,
      status: 'active',
      lastUsed: Date.now()
    };
    setKeyPool([...keyPool, newKey]);
    setNewKeyInput("");
  };

  const handleRemoveKey = (index: number) => {
    const newPool = [...keyPool];
    newPool.splice(index, 1);
    setKeyPool(newPool);
    // useEffect will handle saving the updated (or empty) array
  };

  const updateKeyStatus = (index: number, status: 'active' | 'quota_exceeded' | 'error') => {
    setKeyPool(prev => {
      const newPool = [...prev];
      newPool[index] = { ...newPool[index], status };
      return newPool;
    });
  };

  // --- SUBMIT LOGIC WITH SMART RETRY ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleText.trim() || !topic.trim()) return;

    // Check if we have any keys
    if (keyPool.length === 0) {
      setError("Vui lòng nhập API Key để bắt đầu phân tích.");
      setShowKeyManager(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setEditableContent("");
    setLoadingMessage("Đang khởi động AI...");

    let success = false;
    
    // Create a list of candidates: Pool keys first
    const candidates = keyPool.map((k, index) => ({ ...k, index }));
    
    // Algorithm: Try candidates one by one.
    for (const candidate of candidates) {
      if (candidate.status === 'quota_exceeded') {
        continue; // Skip known bad keys
      }

      try {
        setLoadingMessage(`Đang dùng ${candidate.label || 'API Key'}...`);
        
        const data = await generateCloneContent(candidate.key, sampleText, topic, contextInfo);
        
        setResult(data);
        setEditableContent(data.generatedContent);
        
        // Update status to active (success)
        updateKeyStatus(candidate.index, 'active');
        success = true;
        break; // Exit loop on success

      } catch (err: any) {
        console.warn(`Key ${candidate.label} failed:`, err);
        
        const errorMessage = err.message || "";
        // Check for Quota limits (429) or other errors
        if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("limit")) {
           updateKeyStatus(candidate.index, 'quota_exceeded');
           setLoadingMessage(`Key ${candidate.label} hết hạn mức! Đang đổi key...`);
        } else {
           updateKeyStatus(candidate.index, 'error');
           setLoadingMessage(`Key ${candidate.label} lỗi! Đang thử key khác...`);
        }
        // Continue loop to next key
        await new Promise(r => setTimeout(r, 1000)); // Small delay before switching
      }
    }

    if (!success) {
      setError("Tất cả API Key đều thất bại hoặc hết hạn mức. Vui lòng thêm Key mới (Ctrl+K).");
    }

    setIsLoading(false);
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

  // --- LOCK SCREEN (If no keys at all) ---
  const hasAnyKeys = keyPool.length > 0;
  
  // Only show lock screen if keys are loaded and still no keys found
  if (isKeysLoaded && !hasAnyKeys && !showKeyManager) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in-up">
          <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Yêu cầu API Key</h1>
          <p className="text-slate-600 mb-8">
            Ứng dụng cần ít nhất 1 API Key để hoạt động. Nhấn nút bên dưới để thêm Key.
          </p>
          <Button onClick={() => setShowKeyManager(true)} className="w-full">
            Quản lý API Key
          </Button>
        </div>
        {/* Key Manager Modal needs to be rendered here too if toggled */}
        {showKeyManager && (
            <KeyManagerModal 
                keyPool={keyPool} 
                onClose={() => hasAnyKeys ? setShowKeyManager(false) : {}} // Prevent closing if no keys
                onAdd={handleAddKey}
                onRemove={handleRemoveKey}
                newKeyInput={newKeyInput}
                setNewKeyInput={setNewKeyInput}
                forceOpen={true}
            />
        )}
      </div>
    );
  }

  // Calculate active pool keys for UI
  const activePoolCount = keyPool.filter(k => k.status === 'active').length;
  const buttonLabel = `Keys (${activePoolCount > 0 ? activePoolCount : keyPool.length})`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <PenTool className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hidden sm:block">
              AI Writer Clone
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {result && (
                <Button variant="ghost" onClick={handleReset} className="text-sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tạo bài mới
                </Button>
            )}
            
            <button 
                onClick={() => setShowKeyManager(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                   keyPool.length === 0
                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 animate-pulse"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title="Quản lý API Key (Ctrl+K)"
            >
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">{buttonLabel}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {!result ? (
          /* INPUT VIEW */
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                Sao chép phong cách viết
              </h2>
              <p className="text-lg text-slate-600">
                Phân tích DNA văn phong và tạo nội dung mới. Hỗ trợ tự động đổi Key khi hết token.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <TextArea
                label="1. Bài viết mẫu (Style Source)"
                placeholder="Dán bài viết mẫu có phong cách bạn muốn sao chép vào đây..."
                rows={6}
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                required
              />

              <Input
                label="2. Chủ đề bài mới"
                placeholder="Ví dụ: Lợi ích của việc dậy sớm..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />

              <TextArea
                label="3. Thông tin bổ sung / Dàn ý (Context)"
                placeholder="- Ý chính 1... &#10;- Số liệu cụ thể..."
                rows={4}
                value={contextInfo}
                onChange={(e) => setContextInfo(e.target.value)}
              />

              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full text-lg py-4"
                isLoading={isLoading}
                disabled={!sampleText.trim() || !topic.trim()}
                icon={<Sparkles className="w-5 h-5" />}
              >
                {isLoading ? loadingMessage : "Phân tích & Viết bài"}
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
                  <Button
                        variant="secondary"
                        className="!px-3 !py-1.5 text-sm h-9"
                        onClick={() => handleCopy(editableContent)}
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        <span className="ml-2 hidden sm:inline">{copied ? "Đã sao chép" : "Sao chép"}</span>
                    </Button>
                </div>
                {/* Content */}
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

      {/* KEY MANAGER MODAL */}
      {showKeyManager && (
         <KeyManagerModal 
            keyPool={keyPool} 
            onClose={() => setShowKeyManager(false)}
            onAdd={handleAddKey}
            onRemove={handleRemoveKey}
            newKeyInput={newKeyInput}
            setNewKeyInput={setNewKeyInput}
            hasEnvKey={false}
         />
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} AI Writer Clone. Smart Key Rotation Enabled.</p>
      </footer>
    </div>
  );
};

// --- SUB-COMPONENT: KEY MANAGER MODAL ---
interface KeyManagerModalProps {
  keyPool: ApiKeyData[];
  onClose: () => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  newKeyInput: string;
  setNewKeyInput: (val: string) => void;
  forceOpen?: boolean;
  hasEnvKey?: boolean;
}

const KeyManagerModal: React.FC<KeyManagerModalProps> = ({ 
  keyPool, onClose, onAdd, onRemove, newKeyInput, setNewKeyInput, forceOpen, hasEnvKey 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
             <ShieldCheck className="w-5 h-5 text-indigo-600" />
             <h3 className="font-bold text-gray-900">Quản lý API Key</h3>
          </div>
          {!forceOpen && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
            <div className="text-sm text-gray-600 mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="font-medium text-blue-800 mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4"/> Cơ chế Smart Rotation
                </p>
                Hệ thống sẽ tự động chuyển sang Key tiếp theo nếu Key hiện tại bị hết hạn mức (Quota Exceeded).
            </div>

            {/* List */}
            <div className="space-y-3 mb-6 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {keyPool.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        Chưa có API Key nào. Hãy thêm Key để bắt đầu.
                    </div>
                ) : (
                    keyPool.map((k, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${
                            k.status === 'quota_exceeded' ? 'bg-red-50 border-red-100' : 
                            k.status === 'error' ? 'bg-orange-50 border-orange-100' : 'bg-white border-gray-200'
                        }`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    k.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                                <div className="flex flex-col min-w-0">
                                    <span className="font-medium text-gray-900 truncate text-sm">{k.label}</span>
                                    <span className="text-xs text-gray-400 truncate font-mono">
                                        {k.key.substring(0, 8)}...{k.key.substring(k.key.length - 4)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {k.status === 'quota_exceeded' && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md font-medium">Hết quota</span>
                                )}
                                <button 
                                    onClick={() => onRemove(idx)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add New */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                     <span className="text-sm font-semibold text-gray-700">Thêm Key mới</span>
                     <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline transition-all"
                     >
                        Lấy API Key tại đây <ExternalLink className="w-3 h-3" />
                     </a>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input 
                            label=""
                            placeholder="Dán API Key mới (AIza...)" 
                            value={newKeyInput}
                            onChange={e => setNewKeyInput(e.target.value)}
                            className="!p-3 text-sm"
                        />
                    </div>
                    <Button onClick={onAdd} disabled={!newKeyInput.trim()} className="h-[50px] mt-2">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
