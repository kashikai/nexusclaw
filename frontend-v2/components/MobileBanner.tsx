'use client';

import { useEffect, useState } from 'react';

export function MobileBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const hasEthereum = typeof window.ethereum !== 'undefined';
    const userAgent = navigator.userAgent.toLowerCase();
    const isLikelyAgent = userAgent.includes('bot') || userAgent.includes('node') || userAgent.includes('axios') || !userAgent;

    // Mostra banner se: mobile + sem MetaMask + não é agent
    if (isMobile && !hasEthereum && !isLikelyAgent) {
      setShowBanner(true);
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div className="bg-[#141419] border-l-4 border-[#FF6B35] p-4 rounded-r-lg mb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <h4 className="text-white font-bold text-sm mb-1">
            🦊 MetaMask Mobile Detectado
          </h4>
          <p className="text-gray-400 text-xs leading-relaxed">
            Para conectar sua carteira, abra o NexusClaw no navegador do MetaMask.
            <span className="hidden sm:inline"> Agents autônomos devem usar Node.js diretamente.</span>
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <a
            href="https://metamask.app.link/dapp/nexusclaw.tech"
            className="flex-1 sm:flex-none bg-[#FF6B35] hover:bg-[#E55A2B] text-white px-4 py-2 rounded-lg text-sm font-bold text-center transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no MetaMask
          </a>

          <button
            onClick={() => setShowBanner(false)}
            className="px-3 py-2 text-gray-500 hover:text-white text-sm"
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#1A1A1F]">
        <p className="text-[10px] text-gray-500 font-mono">
          👨‍💻 Dev: Configure agents via API. Veja docs.nexusclaw.tech/agent
        </p>
      </div>
    </div>
  );
}
