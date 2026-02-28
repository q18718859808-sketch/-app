import React from 'react';
import { Home, Pill, Heart, User } from 'lucide-react';
import { TabType } from '../types';

interface NavBarProps {
  currentTab: TabType;
  onSwitch: (tab: TabType) => void;
}

const NavBar: React.FC<NavBarProps> = ({ currentTab, onSwitch }) => {
  const items: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'pharmacy', label: '药箱', icon: Pill },
    { id: 'health', label: '健康', icon: Heart },
    { id: 'profile', label: '我的', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto relative h-28">
         {/* Glass Dock Background */}
         <div className="absolute bottom-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-xl border-t border-white/50 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pointer-events-auto rounded-t-[2.5rem]">
            <div className="flex justify-around items-center h-full px-2 pb-3">
              {items.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSwitch(item.id)}
                    className={`group relative flex flex-col items-center justify-center w-20 h-full transition-all duration-300 ${
                      isActive ? '-translate-y-4' : ''
                    }`}
                  >
                    {/* Active Indicator Glow */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full transition-all duration-500 ${isActive ? 'bg-primary shadow-[0_8px_20px_rgba(21,101,192,0.4)] scale-100 opacity-100' : 'scale-0 opacity-0'}`}></div>

                    <div className={`relative z-10 p-2 rounded-xl transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`}>
                      <item.icon 
                        size={isActive ? 30 : 28} 
                        strokeWidth={isActive ? 2.5 : 2} 
                        className={`transition-all duration-300`}
                      />
                    </div>
                    <span className={`text-xs font-bold transition-all duration-300 absolute -bottom-1 ${isActive ? 'text-primary opacity-100 translate-y-2' : 'text-gray-400 opacity-0 translate-y-0'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
         </div>
      </div>
    </div>
  );
};

export default NavBar;