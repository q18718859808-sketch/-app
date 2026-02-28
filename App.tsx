import React, { useState, useEffect, useRef } from 'react';
import { Camera, Phone, Plus, BarChart2, Clock, User, Mic, Calendar, ChevronRight, Heart, Search, MessageCircle, Smile, Activity, X, Save, LogIn, Pill, History, ArrowLeft, CheckCircle, AlertCircle, Send, Bell, UserPlus } from 'lucide-react';
import { INITIAL_USER, INITIAL_MEDICATIONS, INITIAL_HEALTH_RECORDS } from './constants';
import { Medication, TabType, HealthRecord, UserProfile, ChatMessage } from './types';
import NavBar from './components/NavBar';
import MedicationCard from './components/MedicationCard';
import ElderlyButton from './components/ElderlyButton';
import VoiceAssistant from './components/VoiceAssistant';
import { analyzeMedicineImage, getAIChatResponse } from './services/geminiService';
import * as api from './services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type AppState = 'loading' | 'login' | 'main';
type LoginProvider = 'wechat' | 'qq' | 'demo';


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(INITIAL_HEALTH_RECORDS);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State for adding new medication
  const [isAddingMedication, setIsAddingMedication] = useState(false);
  const [newMed, setNewMed] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    timeLabel: '早上',
    scheduledTime: '',
    instructions: '',
    stock: 30
  });

  // Medication History View
  const [viewingHistory, setViewingHistory] = useState(false);

  // Symptom Modal
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [currentSymptom, setCurrentSymptom] = useState('');

  // Guardian Modal
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [guardianForm, setGuardianForm] = useState({ name: '', phone: '' });

  // AI Chat
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `您好，${INITIAL_USER.name}爷爷！我是您的健康助手药小助，今天身体怎么样？有什么想跟我聊聊的吗？` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Alarm System
  const [alarmMedication, setAlarmMedication] = useState<Medication | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial Loading Simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppState('login');
    }, 2500);
    // Preload alarm sound (simulated with a simple beep URL or similar if available, here using a placeholder logic)
    // In a real app, use a local asset.
    return () => clearTimeout(timer);
  }, []);

  // Alarm Check Interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Find a medication that matches current time and is pending
      // Added a check to prevent constant re-triggering in the same minute if already triggered
      if (!alarmMedication) {
        const medToTake = medications.find(m =>
          m.status === 'pending' && m.scheduledTime === currentTime
        );

        if (medToTake) {
          triggerAlarm(medToTake);
        }
      }
    }, 1000 * 30); // Check every 30 seconds to be safe

    return () => clearInterval(interval);
  }, [medications, alarmMedication]);

  const triggerAlarm = (med: Medication) => {
    setAlarmMedication(med);
    // Play sound
    const u = new SpeechSynthesisUtterance(`该吃药了！请服用${med.name}`);
    u.lang = 'zh-CN';
    u.rate = 0.9;
    u.volume = 1;
    window.speechSynthesis.speak(u);

    // Loop reminder every 5 seconds until handled
    const loop = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.speak(u);
      }
    }, 5000);

    // Store loop id to clear it later (simplified here, in react we'd use a ref)
    (window as any).alarmInterval = loop;
  };

  const stopAlarm = () => {
    setAlarmMedication(null);
    window.speechSynthesis.cancel();
    if ((window as any).alarmInterval) clearInterval((window as any).alarmInterval);
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showAIChat]);

  // Reset states when tab changes
  useEffect(() => {
    setIsAddingMedication(false);
    setViewingHistory(false);
    setSearchTerm('');
  }, [activeTab]);

  // Handlers
  const handleLogin = async (provider: LoginProvider = 'demo') => {
    try {
      if (provider === 'demo') {
        // 演示登录
        const result = await api.demoLogin(INITIAL_USER.name);
        if (result.success) {
          setUser({
            ...INITIAL_USER,
            name: result.user.name,
          });
          setAppState('main');
        }
      } else if (provider === 'wechat') {
        // 微信登录 - 获取授权URL并跳转
        const { url } = await api.getWechatAuthUrl();
        window.location.href = url;
      } else if (provider === 'qq') {
        // QQ登录 - 获取授权URL并跳转
        const { url } = await api.getQQAuthUrl();
        window.location.href = url;
      }
    } catch (error) {
      console.error('登录失败:', error);
      // 降级到本地模式
      setAppState('main');
    }
  };

  // OAuth 回调处理
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const path = window.location.pathname;

      if (code && state) {
        try {
          let result;
          if (path.includes('wechat')) {
            result = await api.wechatLogin(code);
          } else if (path.includes('qq')) {
            result = await api.qqLogin(code);
          }

          if (result?.success) {
            setUser({
              name: result.user.name,
              age: result.user.age || 72,
              emergencyContact: result.user.emergencyContact || '',
            });
            setAppState('main');
            // 清除URL参数
            window.history.replaceState({}, document.title, '/');
          }
        } catch (error) {
          console.error('OAuth回调处理失败:', error);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const getFormattedTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  const handleTakeMedication = (id: string) => {
    setMedications(prev => prev.map(med =>
      med.id === id ? {
        ...med,
        status: 'taken',
        stock: med.stock - 1,
        takenTime: getFormattedTimestamp()
      } : med
    ));
    stopAlarm(); // Stop alarm if it was triggered by this med
    const utterance = new SpeechSynthesisUtterance("真棒！您按时吃药了。");
    utterance.lang = "zh-CN";
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceAction = (action: any) => {
    if (action.type === 'TAKE_MEDICATION') {
      const target = medications.find(m => m.status === 'pending');
      if (target) handleTakeMedication(target.id);
    } else if (action.type === 'OPEN_SYMPTOM_MODAL') {
      setCurrentSymptom(action.symptom || '');
      setShowSymptomModal(true);
      setIsVoiceOpen(false);
    }
  };

  const handleSaveSymptom = () => {
    if (!currentSymptom.trim()) return;
    const newRecord: HealthRecord = {
      id: Date.now().toString(),
      type: 'symptom',
      value: currentSymptom,
      unit: '',
      timestamp: getFormattedTimestamp(),
      status: 'info'
    };
    setHealthRecords(prev => [newRecord, ...prev]);
    setShowSymptomModal(false);
    setCurrentSymptom('');
    const u = new SpeechSynthesisUtterance("症状已记录。");
    u.lang = 'zh-CN';
    window.speechSynthesis.speak(u);
  };

  const handleSaveGuardian = () => {
    if (!guardianForm.name || !guardianForm.phone) {
      alert("请输入姓名和电话");
      return;
    }
    setUser(prev => ({
      ...prev,
      guardianName: guardianForm.name,
      guardianPhone: guardianForm.phone
    }));
    setShowGuardianModal(false);
    const u = new SpeechSynthesisUtterance("监护人添加成功。");
    u.lang = 'zh-CN';
    window.speechSynthesis.speak(u);
  };

  const handleEmergencyCall = () => {
    const number = user.guardianPhone || user.emergencyContact;
    window.location.href = `tel:${number}`;
  };

  const handleSaveMedication = () => {
    if (!newMed.name || !newMed.dosage || !newMed.scheduledTime) {
      alert("请把信息填写完整哦");
      return;
    }
    const med: Medication = {
      id: Date.now().toString(),
      name: newMed.name || '',
      dosage: newMed.dosage || '',
      timeLabel: newMed.timeLabel || '早上',
      scheduledTime: newMed.scheduledTime || '',
      status: 'pending',
      instructions: newMed.instructions || '遵医嘱',
      stock: Number(newMed.stock) || 30
    };
    setMedications(prev => [...prev, med]);
    setIsAddingMedication(false);
    setNewMed({ name: '', dosage: '', timeLabel: '早上', scheduledTime: '', instructions: '', stock: 30 });

    const utterance = new SpeechSynthesisUtterance(`已添加${med.name}的服药提醒`);
    utterance.lang = "zh-CN";
    window.speechSynthesis.speak(utterance);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        try {
          const result = await analyzeMedicineImage(base64Data);
          alert(`识别成功: \n药品: ${result.name}\n用量: ${result.dosage}\n注意: ${result.instructions}`);

          const newMed: Medication = {
            id: Date.now().toString(),
            name: result.name || "新药品",
            dosage: result.dosage || "遵医嘱",
            timeLabel: "新增",
            scheduledTime: "--:--",
            status: 'pending',
            instructions: result.instructions || "",
            stock: 30
          };
          setMedications(prev => [...prev, newMed]);
        } catch (err) {
          alert("识别失败，请重试");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    // Convert chat history to API format
    const history = chatMessages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const replyText = await getAIChatResponse(history, userMsg.text);

    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: replyText };
    setChatMessages(prev => [...prev, aiMsg]);
    setIsChatLoading(false);
  };

  // Render Functions
  const renderLoading = () => (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center z-50">
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-primary rounded-3xl flex items-center justify-center shadow-2xl animate-bounce">
          <Pill size={64} className="text-white" />
        </div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/10 rounded-full blur-xl animate-pulse"></div>
      </div>
      <h1 className="text-4xl font-black text-primary tracking-widest mb-2 animate-fade-in">药小助</h1>
      <p className="text-gray-400 text-lg font-medium animate-pulse">守护您的健康每一天</p>
    </div>
  );

  const renderLogin = () => (
    <div className="fixed inset-0 bg-white flex flex-col p-8 z-50 animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-[2rem] flex items-center justify-center shadow-lg mb-8">
          <Clock size={48} className="text-white" />
        </div>
        <h2 className="text-4xl font-black text-gray-800 mb-2">欢迎回来</h2>
        <p className="text-xl text-gray-500 mb-12">请选择登录方式</p>

        <div className="w-full space-y-6">
          <button onClick={() => handleLogin('wechat')} className="w-full bg-[#07C160] hover:bg-[#06ad56] text-white p-5 rounded-2xl flex items-center justify-center gap-4 text-2xl font-bold shadow-[0_10px_20px_rgba(7,193,96,0.3)] active:scale-[0.98] transition-all">
            <MessageCircle size={32} fill="currentColor" />
            微信一键登录
          </button>
          <button onClick={() => handleLogin('qq')} className="w-full bg-[#12B7F5] hover:bg-[#10a1d6] text-white p-5 rounded-2xl flex items-center justify-center gap-4 text-2xl font-bold shadow-[0_10px_20px_rgba(18,183,245,0.3)] active:scale-[0.98] transition-all">
            <Smile size={32} fill="currentColor" />
            QQ 登录
          </button>
          <button onClick={() => handleLogin('demo')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 p-5 rounded-2xl flex items-center justify-center gap-4 text-xl font-bold active:scale-[0.98] transition-all">
            <User size={28} />
            演示模式登录
          </button>
        </div>
      </div>
      <p className="text-center text-gray-400 text-sm py-4">
        登录即代表同意《用户服务协议》和《隐私政策》
      </p>
    </div>
  );

  const renderAlarmOverlay = () => {
    if (!alarmMedication) return null;
    return (
      <div className="fixed inset-0 z-[200] bg-red-600 flex flex-col items-center justify-center p-8 animate-fade-in text-white text-center">
        <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center mb-8 animate-bounce shadow-2xl">
          <Bell size={80} className="text-red-600" fill="currentColor" />
        </div>
        <h1 className="text-5xl font-black mb-4">服药提醒</h1>
        <p className="text-3xl font-medium opacity-90 mb-12">现在是 {alarmMedication.scheduledTime}，该吃药了！</p>

        <div className="bg-white/10 p-8 rounded-[2rem] border border-white/20 w-full max-w-sm mb-12 backdrop-blur-md">
          <p className="text-4xl font-black mb-2">{alarmMedication.name}</p>
          <div className="flex items-center justify-center gap-2 text-2xl opacity-90">
            <Pill size={28} />
            <span>用量：{alarmMedication.dosage}</span>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <button
            onClick={() => handleTakeMedication(alarmMedication.id)}
            className="w-full bg-white text-red-600 py-6 rounded-[2rem] text-3xl font-black shadow-lg active:scale-95 transition-transform"
          >
            我吃完了
          </button>
          <button
            onClick={stopAlarm}
            className="w-full bg-red-700 text-white/80 py-4 rounded-[2rem] text-xl font-bold border-2 border-red-500 active:bg-red-800 transition-colors"
          >
            稍后提醒
          </button>
        </div>
      </div>
    );
  };

  const renderSymptomModal = () => (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center">
      <div className="bg-white w-full sm:w-[90%] max-w-lg sm:rounded-[2.5rem] rounded-t-[2.5rem] p-8 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2">
            <Activity className="text-red-500" />
            记录不适症状
          </h2>
          <button onClick={() => setShowSymptomModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xl font-bold text-gray-600 mb-3">请描述您的感觉</label>
            <textarea
              className="w-full h-40 p-5 bg-gray-50 rounded-2xl border-2 border-gray-200 text-xl font-medium focus:border-red-400 focus:ring-4 focus:ring-red-100 outline-none transition-all resize-none"
              placeholder="例如：头晕，恶心，胸闷..."
              value={currentSymptom}
              onChange={(e) => setCurrentSymptom(e.target.value)}
            ></textarea>
          </div>

          <ElderlyButton
            text="保存记录"
            variant="danger"
            icon={Save}
            onClick={handleSaveSymptom}
            shadow={true}
          />
        </div>
      </div>
    </div>
  );

  const renderGuardianModal = () => (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 animate-slide-up shadow-2xl">
        <h2 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-2">
          <UserPlus className="text-primary" size={32} />
          添加监护人
        </h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-lg font-bold text-gray-600 ml-1">姓名</label>
            <input
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 text-xl font-bold outline-none focus:border-primary transition-all"
              placeholder="请输入姓名"
              value={guardianForm.name}
              onChange={(e) => setGuardianForm({ ...guardianForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-lg font-bold text-gray-600 ml-1">电话号码</label>
            <input
              type="tel"
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 text-xl font-bold outline-none focus:border-primary transition-all"
              placeholder="请输入电话"
              value={guardianForm.phone}
              onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
            />
          </div>
          <div className="pt-4 flex gap-4">
            <ElderlyButton text="取消" variant="ghost" onClick={() => setShowGuardianModal(false)} />
            <ElderlyButton text="保存" variant="primary" onClick={handleSaveGuardian} shadow={true} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAIChat = () => (
    <div className="fixed inset-0 z-[50] bg-slate-50 flex flex-col animate-slide-up">
      {/* Chat Header */}
      <div className="bg-white px-6 py-4 border-b border-gray-200 shadow-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowAIChat(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={28} className="text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-800">AI 陪聊</h2>
            <p className="text-sm text-green-500 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              在线
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-[2rem] text-xl font-medium leading-relaxed shadow-sm ${msg.role === 'user'
              ? 'bg-primary text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-5 rounded-[2rem] rounded-bl-none border border-gray-100 shadow-sm">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="bg-white p-4 pb-8 border-t border-gray-200">
        <div className="flex items-end gap-3 bg-gray-100 p-2 rounded-[2rem]">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="跟小助聊聊天..."
            className="flex-1 bg-transparent border-none outline-none p-4 text-xl max-h-32 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isChatLoading}
            className="p-4 bg-primary text-white rounded-full disabled:opacity-50 disabled:bg-gray-400 transition-all active:scale-95"
          >
            <Send size={24} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAddMedication = () => (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden min-h-[75vh] flex flex-col animate-slide-up">
      <div className="bg-gradient-to-r from-primary to-blue-600 p-8 text-white">
        <h2 className="text-3xl font-black mb-1">添加新药提醒</h2>
        <p className="opacity-80 text-lg">请填写药品信息</p>
      </div>

      <div className="p-8 space-y-8 flex-1">
        <div className="space-y-3">
          <label className="text-xl font-bold text-gray-700 ml-1">药品名称</label>
          <div className="bg-gray-50 p-1 rounded-2xl border-2 border-gray-100 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
            <input
              className="w-full text-2xl p-4 bg-transparent outline-none text-gray-900 placeholder-gray-400 font-bold"
              placeholder="例如：降压药"
              value={newMed.name}
              onChange={e => setNewMed({ ...newMed, name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xl font-bold text-gray-700 ml-1">每次吃多少 (用量)</label>
          <div className="bg-gray-50 p-1 rounded-2xl border-2 border-gray-100 focus-within:border-primary transition-all">
            <input
              className="w-full text-2xl p-4 bg-transparent outline-none text-gray-900 placeholder-gray-400 font-bold"
              placeholder="例如：1片"
              value={newMed.dosage}
              onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3">
            <label className="text-xl font-bold text-gray-700 ml-1">时间段</label>
            <div className="relative bg-gray-50 p-1 rounded-2xl border-2 border-gray-100">
              <select
                className="w-full text-2xl p-4 bg-transparent outline-none appearance-none font-bold text-gray-900"
                value={newMed.timeLabel}
                onChange={e => setNewMed({ ...newMed, timeLabel: e.target.value })}
              >
                <option value="早上">早上</option>
                <option value="中午">中午</option>
                <option value="晚上">晚上</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronRight size={24} className="rotate-90" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xl font-bold text-gray-700 ml-1">提醒时间</label>
            <div className="space-y-4">
              <div className="bg-gray-50 p-1 rounded-2xl border-2 border-gray-100 focus-within:border-primary transition-colors">
                <input
                  type="time"
                  className="w-full h-20 text-4xl p-4 bg-transparent outline-none font-black text-center text-gray-900"
                  value={newMed.scheduledTime}
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                  onChange={e => setNewMed({ ...newMed, scheduledTime: e.target.value })}
                />
              </div>
              {/* Quick select buttons */}
              <div className="flex gap-3 justify-center">
                <button onClick={() => setNewMed({ ...newMed, scheduledTime: '08:00' })} className="px-4 py-2 bg-blue-50 text-primary font-bold rounded-xl active:bg-blue-100">08:00</button>
                <button onClick={() => setNewMed({ ...newMed, scheduledTime: '12:00' })} className="px-4 py-2 bg-blue-50 text-primary font-bold rounded-xl active:bg-blue-100">12:00</button>
                <button onClick={() => setNewMed({ ...newMed, scheduledTime: '18:00' })} className="px-4 py-2 bg-blue-50 text-primary font-bold rounded-xl active:bg-blue-100">18:00</button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xl font-bold text-gray-700 ml-1">现有库存 (粒/片)</label>
          <div className="bg-gray-50 p-1 rounded-2xl border-2 border-gray-100 focus-within:border-primary transition-all">
            <input
              type="number"
              className="w-full text-2xl p-4 bg-transparent outline-none text-gray-900 placeholder-gray-400 font-bold"
              placeholder="例如：30"
              value={newMed.stock}
              onChange={e => setNewMed({ ...newMed, stock: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xl font-bold text-gray-700 ml-1">备注 (选填)</label>
          <div className="bg-gray-50 p-1 rounded-2xl border-2 border-gray-100 focus-within:border-primary transition-all">
            <input
              className="w-full text-2xl p-4 bg-transparent outline-none text-gray-900 placeholder-gray-400 font-bold"
              placeholder="例如：饭后服用"
              value={newMed.instructions}
              onChange={e => setNewMed({ ...newMed, instructions: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="p-8 pt-0 space-y-4">
        <ElderlyButton text="确认添加" variant="success" onClick={handleSaveMedication} shadow={true} />
        <ElderlyButton text="取消" variant="ghost" onClick={() => setIsAddingMedication(false)} />
      </div>
    </div>
  );

  const renderMedicationHistory = () => {
    const historyList = medications.filter(m => m.status !== 'pending');

    return (
      <div className="space-y-6 animate-fade-in min-h-[70vh]">
        <div className="flex items-center mb-6 px-2">
          <button
            onClick={() => setViewingHistory(false)}
            className="mr-4 p-3 bg-white rounded-full text-gray-600 shadow-sm active:bg-gray-100"
          >
            <ArrowLeft size={28} />
          </button>
          <h2 className="text-3xl font-black text-gray-800">用药记录</h2>
        </div>

        {historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-[2.5rem] border border-gray-100">
            <History size={64} className="mb-4 opacity-50" />
            <p className="text-xl font-bold">暂无用药记录</p>
            <p className="text-base mt-2">按时服药后会显示在这里</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyList.map(med => (
              <div key={med.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-gray-800 mb-1">{med.name}</span>
                  <span className="text-gray-500 font-bold flex items-center gap-2">
                    <Pill size={16} /> {med.dosage}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {med.status === 'taken' ? (
                    <span className="flex items-center text-success font-black bg-green-50 px-3 py-1 rounded-xl">
                      <CheckCircle size={18} className="mr-1" /> 已服用
                    </span>
                  ) : (
                    <span className="flex items-center text-gray-400 font-black bg-gray-100 px-3 py-1 rounded-xl">
                      <AlertCircle size={18} className="mr-1" /> 已跳过
                    </span>
                  )}
                  <span className="text-sm font-bold text-gray-400">
                    {med.takenTime || `${med.timeLabel} ${med.scheduledTime}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Content based on Tab
  const renderMainContent = () => {
    if (isAddingMedication) {
      return renderAddMedication();
    }

    switch (activeTab) {
      case 'home':
        if (viewingHistory) {
          return renderMedicationHistory();
        }

        return (
          <div className="space-y-8 animate-fade-in">
            {/* Header Greeting */}
            <div className="bg-gradient-to-br from-primary to-blue-600 p-8 rounded-[2.5rem] shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Clock size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center space-x-2 opacity-90 mb-2">
                  <Calendar size={20} />
                  <span className="text-lg font-medium">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
                </div>
                <h1 className="text-4xl font-black mb-3">
                  {new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好'}，
                  {INITIAL_USER.name}
                </h1>
                <p className="text-xl opacity-90 font-medium">今天也要按时吃药，保持好心情哦！</p>
              </div>
            </div>

            {/* Immediate Actions */}
            <div>
              <div className="flex justify-between items-end mb-6 px-4">
                <h2 className="text-3xl font-black text-gray-800 flex items-center">
                  <div className="w-2 h-8 bg-secondary rounded-full mr-3"></div>
                  待服药提醒
                </h2>
                <span className="text-gray-500 font-bold">{medications.filter(m => m.status === 'pending').length} 项待办</span>
              </div>

              {medications.filter(m => m.status === 'pending').length === 0 ? (
                <div className="p-10 bg-gradient-to-br from-green-50 to-emerald-50 rounded-[2.5rem] border border-green-100 text-center mb-8 shadow-sm">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-success">
                    <Plus size={40} className="rotate-45" /> {/* Use Plus rotated as checkmark alternative or just simple decor */}
                  </div>
                  <p className="text-3xl font-black text-gray-800 mb-2">太棒了！</p>
                  <p className="text-xl text-gray-600 font-medium">今天的药都已经吃完了</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {medications.filter(m => m.status === 'pending').map(med => (
                    <MedicationCard key={med.id} medication={med} onTake={handleTakeMedication} />
                  ))}
                </div>
              )}

              {/* View History Button */}
              <div className="mt-6 px-2">
                <ElderlyButton
                  text="查看用药记录"
                  variant="ghost"
                  icon={History}
                  onClick={() => setViewingHistory(true)}
                />
              </div>

              {/* AI Chat Entry */}
              <div className="mt-2 px-2">
                <ElderlyButton
                  text="找药小助聊天"
                  variant="secondary"
                  icon={MessageCircle}
                  onClick={() => setShowAIChat(true)}
                  shadow={true}
                />
              </div>

              {/* Add Medication Button */}
              <div className="mt-4 px-2">
                <ElderlyButton
                  text="添加服药提醒"
                  variant="outline"
                  icon={Plus}
                  onClick={() => {
                    setNewMed({ name: '', dosage: '', timeLabel: '早上', scheduledTime: '', instructions: '', stock: 30 });
                    setIsAddingMedication(true);
                  }}
                />
              </div>
            </div>

            {/* Emergency Button - Always visible on home */}
            <div className="pt-4 pb-8">
              <ElderlyButton
                text="紧急呼叫子女"
                variant="danger"
                size="xl"
                icon={Phone}
                shadow={true}
                onClick={handleEmergencyCall}
              />
            </div>
          </div>
        );

      case 'pharmacy':
        const filteredMedications = medications.filter(med =>
          med.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-4xl font-black text-gray-800">我的药箱</h2>
              <label className="bg-gradient-to-r from-primary to-blue-600 text-white p-4 rounded-2xl cursor-pointer shadow-[0_8px_20px_-5px_rgba(21,101,192,0.4)] active:scale-95 transition-transform flex items-center gap-2">
                <Camera size={24} strokeWidth={2.5} />
                <span className="text-lg font-bold">扫药盒</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-1 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus-within:ring-4 focus-within:ring-primary/10 transition-all flex items-center px-6 py-2 mb-6">
              <Search className="text-gray-400" size={28} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="搜索药品名称..."
                className="w-full p-4 text-2xl outline-none font-bold text-gray-800 placeholder-gray-300 bg-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid gap-4">
              {filteredMedications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-2xl font-bold text-gray-300">没有找到相关药品</p>
                </div>
              ) : (
                filteredMedications.map(med => (
                  <div key={med.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${med.stock < 10 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-primary'}`}>
                        <div className="text-2xl font-black">{med.name.charAt(0)}</div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-800 mb-1">{med.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-bold text-sm">剩余库存</span>
                          <span className={`text-xl font-black ${med.stock < 10 ? 'text-red-500' : 'text-primary'}`}>{med.stock}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3 rounded-xl border border-gray-100">
                      <span className="text-xl font-black text-gray-600">{med.dosage}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'health':
        return (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-4xl font-black text-gray-800 mb-6 px-2">健康数据</h2>

            {/* Simple Chart */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <h3 className="text-xl font-black mb-6 flex items-center text-primary bg-blue-50 w-fit px-4 py-2 rounded-xl">
                <BarChart2 className="mr-2" strokeWidth={2.5} />
                血压趋势 (本周)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: '周一', sys: 135 },
                      { name: '周二', sys: 132 },
                      { name: '周三', sys: 138 },
                      { name: '周四', sys: 129 },
                      { name: '周五', sys: 135 },
                    ]}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 14, fill: '#9CA3AF' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis
                      hide={false}
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        fontSize: '16px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        color: '#1f2937',
                        fontWeight: 'bold'
                      }}
                      itemStyle={{ color: '#1f2937' }}
                      cursor={{ fill: '#EFF6FF', radius: 8 }}
                    />
                    <Bar dataKey="sys" fill="url(#colorSys)" radius={[8, 8, 8, 8]} name="收缩压" barSize={32} />
                    <defs>
                      <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1565C0" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#1565C0" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {healthRecords.filter(r => r.type !== 'symptom').map(record => (
                <div key={record.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between h-48 relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110 ${record.type === 'bloodPressure' ? 'text-blue-500' : 'text-red-500'}`}>
                    <Heart size={64} fill="currentColor" />
                  </div>
                  <span className="text-lg text-gray-500 font-bold z-10">
                    {record.type === 'bloodPressure' ? '血压' : record.type === 'bloodSugar' ? '血糖' : '心率'}
                  </span>
                  <div className="flex items-baseline z-10">
                    <span className="text-4xl font-black text-gray-800">{record.value}</span>
                    <span className="text-sm text-gray-400 ml-1 font-bold">{record.unit}</span>
                  </div>
                  <div className="flex items-center text-success bg-green-50 w-fit px-3 py-1.5 rounded-xl z-10">
                    <span className="text-sm font-black">正常</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Symptom History */}
            {healthRecords.some(r => r.type === 'symptom') && (
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-gray-800 px-2">不适症状记录</h3>
                {healthRecords.filter(r => r.type === 'symptom').map(record => (
                  <div key={record.id} className="bg-red-50 p-6 rounded-[2rem] border border-red-100 flex justify-between items-center">
                    <div>
                      <p className="text-xl font-bold text-gray-800">{record.value}</p>
                      <p className="text-sm text-red-400 mt-1">{record.timestamp}</p>
                    </div>
                    <Activity className="text-red-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-primary to-blue-600 p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 bg-white/10 w-48 h-48 rounded-full blur-3xl"></div>
              <div className="flex items-center gap-6 mb-4 relative z-10">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-primary shadow-lg">
                  <User size={48} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-4xl font-black mb-1">{INITIAL_USER.name}</h2>
                  <p className="text-xl opacity-80 font-medium">年龄: {INITIAL_USER.age}岁</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-transform" onClick={handleEmergencyCall}>
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-red-50 rounded-2xl text-danger">
                    <Phone size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <span className="text-2xl font-black text-gray-800 block">紧急联系人</span>
                    <span className="text-lg text-gray-400 font-bold mt-1 block">点击立即呼叫</span>
                  </div>
                </div>
                <ChevronRight size={24} className="text-gray-300" />
              </div>

              <div
                className="bg-white p-8 rounded-[2rem] border border-gray-100 flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-transform"
                onClick={() => setShowGuardianModal(true)}
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-blue-50 rounded-2xl text-primary">
                    {user.guardianName ? <User size={32} strokeWidth={2.5} /> : <Plus size={32} strokeWidth={2.5} />}
                  </div>
                  <div>
                    <span className="text-2xl font-black text-gray-800 block">{user.guardianName || "添加监护人"}</span>
                    {user.guardianPhone && <span className="text-lg text-gray-400 font-bold mt-1 block">{user.guardianPhone}</span>}
                  </div>
                </div>
                <ChevronRight size={24} className="text-gray-300" />
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-transform" onClick={() => setAppState('login')}>
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-gray-50 rounded-2xl text-gray-500">
                    <LogIn size={32} strokeWidth={2.5} />
                  </div>
                  <span className="text-2xl font-black text-gray-800">退出登录</span>
                </div>
                <ChevronRight size={24} className="text-gray-300" />
              </div>
            </div>
          </div>
        );
    }
  };

  if (appState === 'loading') return renderLoading();
  if (appState === 'login') return renderLogin();
  if (showAIChat) return renderAIChat();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 mx-auto relative overflow-hidden selection:bg-primary/20">
      {/* Background Mesh Gradient */}
      <div className="fixed inset-0 z-[-1] opacity-50 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100/30 blur-[100px]"></div>
      </div>

      <div className="p-6 pt-8 max-w-lg mx-auto">
        {renderMainContent()}
      </div>

      <NavBar currentTab={activeTab} onSwitch={setActiveTab} />

      {/* Floating Voice Button */}
      {!isVoiceOpen && !showSymptomModal && !showGuardianModal && !showAIChat && (
        <button
          onClick={() => setIsVoiceOpen(true)}
          className="fixed bottom-32 right-6 w-20 h-20 bg-gradient-to-r from-secondary to-orange-400 rounded-full shadow-[0_10px_30px_rgba(255,143,0,0.4)] flex items-center justify-center text-white z-40 active:scale-90 transition-all hover:scale-105"
        >
          <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
          <span className="sr-only">语音助手</span>
          <Mic size={36} strokeWidth={2.5} />
        </button>
      )}

      <VoiceAssistant
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onAction={handleVoiceAction}
      />

      {showSymptomModal && renderSymptomModal()}
      {showGuardianModal && renderGuardianModal()}
      {renderAlarmOverlay()}
    </div>
  );
};

export default App;