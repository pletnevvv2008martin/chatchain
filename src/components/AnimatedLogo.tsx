'use client';

export default function AnimatedLogo() {
  return (
    <div className="logo-animated">
      {/* Текст логотипа */}
      <h1 className="logo-text">
        <span className="logo-chat">Chat</span>
        <span className="logo-chain">Chain</span>
      </h1>
      
      {/* Серебряная цепь, обхватывающая логотип */}
      <svg 
        className="chain-wrapper" 
        viewBox="0 0 220 60" 
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Градиенты - должны быть первыми */}
        <defs>
          <linearGradient id="silverChain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c0c0c0">
              <animate 
                attributeName="stop-color" 
                values="#c0c0c0;#ffffff;#e8e8e8;#c0c0c0" 
                dur="3s" 
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="#ffffff">
              <animate 
                attributeName="stop-color" 
                values="#ffffff;#e8e8e8;#c0c0c0;#ffffff" 
                dur="3s" 
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#a8a8a8">
              <animate 
                attributeName="stop-color" 
                values="#a8a8a8;#c0c0c0;#ffffff;#a8a8a8" 
                dur="3s" 
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>
        
        {/* Левое звено цепи */}
        <ellipse 
          cx="25" cy="30" rx="15" ry="22" 
          fill="none" 
          stroke="url(#silverChain)" 
          strokeWidth="3"
          className="chain-ring chain-left-ring"
        />
        
        {/* Правое звено цепи */}
        <ellipse 
          cx="195" cy="30" rx="15" ry="22" 
          fill="none" 
          stroke="url(#silverChain)" 
          strokeWidth="3"
          className="chain-ring chain-right-ring"
        />
        
        {/* Верхняя часть цепи */}
        <path 
          d="M 40 15 Q 110 5 180 15" 
          fill="none" 
          stroke="url(#silverChain)" 
          strokeWidth="3"
          strokeLinecap="round"
          className="chain-line chain-top-line"
        />
        
        {/* Нижняя часть цепи */}
        <path 
          d="M 40 45 Q 110 55 180 45" 
          fill="none" 
          stroke="url(#silverChain)" 
          strokeWidth="3"
          strokeLinecap="round"
          className="chain-line chain-bottom-line"
        />
      </svg>
    </div>
  );
}
