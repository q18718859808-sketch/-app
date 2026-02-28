import React, { useEffect, useRef } from 'react';
import { Check, AlertCircle, Pill } from 'lucide-react';
import { Medication } from '../types';
import ElderlyButton from './ElderlyButton';

interface MedicationCardProps {
  medication: Medication;
  onTake: (id: string) => void;
}

const MedicationCard: React.FC<MedicationCardProps> = ({ medication, onTake }) => {
  const isTaken = medication.status === 'taken';
  const isLowStock = medication.stock < 10;
  const hasAnnouncedRef = useRef(false);

  // Voice Announcement for Low Stock
  useEffect(() => {
    if (isLowStock && !isTaken && !hasAnnouncedRef.current) {
      // Add a small delay to avoid clashing with page load sounds
      const timer = setTimeout(() => {
        const u = new SpeechSynthesisUtterance(
          `提醒您，${medication.name}库存只剩${medication.stock}次了，请及时补充。`
        );
        u.lang = 'zh-CN';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
        hasAnnouncedRef.current = true;
      }, 1000 + Math.random() * 2000); // Random delay to prevent overlap if multiple cards
      return () => clearTimeout(timer);
    }
  }, [isLowStock, isTaken, medication.name, medication.stock]);

  return (
    <div className={`
      relative mb-6 rounded-[2rem] p-6 transition-all duration-500 transform overflow-hidden
      ${isTaken 
        ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 shadow-inner opacity-90' 
        : 'bg-white border-2 border-transparent shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] hover:-translate-y-1'
      }
    `}>
      {/* Top Decor Line / Progress hint */}
      {!isTaken && <div className="absolute top-0 left-8 right-8 h-1.5 bg-gradient-to-r from-primary/10 via-primary to-primary/10 rounded-b-full opacity-30"></div>}

      <div className="flex justify-between items-start mb-5">
          <div className="flex-1 pr-4">
             <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-black tracking-wide ${isTaken ? 'bg-green-200 text-green-800' : 'bg-blue-100 text-primary'}`}>
                    {medication.timeLabel} {medication.scheduledTime}
                </span>
                {isLowStock && !isTaken && (
                    <span className="animate-pulse px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-600 flex items-center shadow-sm border border-red-200">
                        <AlertCircle size={14} className="mr-1"/> 库存紧张
                    </span>
                )}
             </div>
             <h3 className="text-3xl font-black text-gray-800 tracking-tight leading-tight">{medication.name}</h3>
          </div>
          <div className={`p-4 rounded-2xl shadow-sm ${isTaken ? 'bg-green-200 text-green-700' : 'bg-blue-50 text-primary'}`}>
             <Pill size={32} strokeWidth={2.5} />
          </div>
      </div>

      <div className="bg-gray-50/80 rounded-2xl p-5 mb-6 backdrop-blur-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
            <span className="text-gray-500 font-bold text-lg">每次用量</span>
            <span className="text-2xl font-black text-gray-800">{medication.dosage}</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="text-gray-500 font-bold text-lg">注意事项</span>
            <span className="text-lg font-bold text-gray-700 flex items-center">
               {medication.instructions || "无"}
            </span>
        </div>
      </div>

      <div className="">
        {isTaken ? (
          <div className="flex items-center justify-center py-4 bg-white/60 rounded-2xl border border-green-200">
            <Check size={32} className="text-success mr-2" strokeWidth={3} />
            <span className="text-2xl font-black text-success">已按时服用</span>
          </div>
        ) : (
          <ElderlyButton 
            text="我吃完了" 
            variant="success" 
            icon={Check} 
            onClick={() => onTake(medication.id)}
            size="xl"
            shadow={true}
          />
        )}
      </div>
    </div>
  );
};

export default MedicationCard;