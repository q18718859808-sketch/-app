import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Loader2, Volume2, FileText } from 'lucide-react';
import { analyzeVoiceIntent } from '../services/geminiService';
import ElderlyButton from './ElderlyButton';

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: any) => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isOpen, onClose, onAction }) => {
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('请点击麦克风说话');
  const [pendingSymptom, setPendingSymptom] = useState<string | null>(null);

  // Simple Speech Recognition polyfill/setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-CN';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleProcess(text);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error(event.error);
        setStatus('idle');
        setFeedback("没听清，请再说一遍");
      };

      recognitionRef.current.onend = () => {
        if (status === 'listening') setStatus('processing');
      };
    }
  }, []);

  // Reset state when opened/closed
  useEffect(() => {
    if (isOpen) {
        setStatus('idle');
        setFeedback('请点击麦克风说话');
        setTranscript('');
        setPendingSymptom(null);
    }
  }, [isOpen]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setTranscript('');
        setStatus('listening');
        setFeedback("正在听...");
        setPendingSymptom(null);
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    } else {
      setFeedback("您的浏览器不支持语音功能");
    }
  };

  const handleProcess = async (text: string) => {
    setStatus('processing');
    setFeedback("正在思考...");
    
    try {
      const result = await analyzeVoiceIntent(text);
      
      let reply = "我没太听懂，能再说一遍吗？";

      if (result.intent === "CONFIRM_TAKEN") {
        onAction({ type: 'TAKE_MEDICATION', entity: result.entity });
        reply = `好的，已帮您记录${result.entity || "服药"}。`;
      } else if (result.intent === "FEELING_BAD") {
        reply = "听到您身体不适，建议您立即联系家人或医生。您可以点击下方按钮记录症状。";
        setPendingSymptom(result.symptom || text); // Save symptom for recording
      } else if (result.intent === "QUERY_TIME") {
        const now = new Date();
        reply = `现在是${now.getHours()}点${now.getMinutes()}分。`;
      }

      setFeedback(reply);
      setStatus('speaking');
      speak(reply);

    } catch (e) {
      setFeedback("处理出错了，请稍后再试");
      setStatus('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white w-full rounded-t-[2.5rem] p-6 pb-12 animate-slide-up relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-gray-100 rounded-full text-gray-500 active:bg-gray-200 transition-colors"
        >
          <X size={28} />
        </button>

        <div className="flex flex-col items-center text-center mt-4">
          <h2 className="text-3xl font-black mb-8 text-textPrimary tracking-tight">语音助手</h2>
          
          <div className="min-h-[100px] flex items-center justify-center mb-8 px-4 w-full">
             <p className="text-2xl font-bold text-primary leading-relaxed">
               {transcript || feedback}
             </p>
          </div>

          {/* Action Button for Symptoms */}
          {pendingSymptom && status === 'speaking' && (
             <div className="w-full mb-8 animate-fade-in">
                <ElderlyButton 
                    text="记录不适症状" 
                    variant="danger" 
                    icon={FileText} 
                    onClick={() => {
                        onAction({ type: 'OPEN_SYMPTOM_MODAL', symptom: pendingSymptom });
                    }}
                    shadow={true}
                />
             </div>
          )}

          <button
            onClick={status === 'listening' ? () => {} : startListening}
            className={`
              w-24 h-24 rounded-full flex items-center justify-center shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] transition-all transform active:scale-95
              ${status === 'listening' ? 'bg-red-500 animate-pulse ring-4 ring-red-200' : 'bg-gradient-to-br from-primary to-blue-600 ring-4 ring-blue-100'}
              ${status === 'processing' ? 'bg-secondary ring-orange-100' : ''}
            `}
          >
            {status === 'processing' ? (
              <Loader2 size={48} className="text-white animate-spin" strokeWidth={2.5} />
            ) : status === 'speaking' ? (
              <Volume2 size={48} className="text-white" strokeWidth={2.5} />
            ) : (
              <Mic size={48} className="text-white" strokeWidth={2.5} />
            )}
          </button>
          
          <p className="mt-8 text-gray-500 text-lg font-medium">
            {status === 'listening' ? "点击红色按钮停止" : "点击麦克风开始说话"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;