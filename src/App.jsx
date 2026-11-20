import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PdaVisualizer from './components/pda/PdaVisualizer';
import FaStudio from './components/fa/FaStudio';
import TuringMachineStudio from './components/tm/TuringMachineStudio';
import CfgStudio from './components/cfg/CfgStudio';
import RegexStudio from './components/regex/RegexStudio';
import PumpingLemmaGame from './components/pumping/PumpingLemmaGame';
import Footer from './components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = useState('pda');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'hero' && <Hero onStart={(tab) => setActiveTab(tab)} />}
        {activeTab === 'pda' && <PdaVisualizer />}
        {activeTab === 'fa' && <FaStudio />}
        {activeTab === 'tm' && <TuringMachineStudio />}
        {activeTab === 'cfg' && <CfgStudio />}
        {activeTab === 'regex' && <RegexStudio />}
        {activeTab === 'pumping' && <PumpingLemmaGame />}
      </main>

      <Footer />
    </div>
  );
}
