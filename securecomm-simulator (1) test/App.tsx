
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Send, 
  Radio, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Terminal, 
  AlertTriangle,
  History,
  Zap,
  Info,
  ChevronRight,
  Loader2,
  Cpu,
  Fingerprint,
  Activity,
  Key,
  LayoutDashboard,
  Binary,
  ArrowRightLeft,
  Search,
  ZapOff,
  RefreshCw,
  Skull,
  Server,
  Network,
  Database,
  Globe,
  Monitor,
  Code,
  Workflow,
  Clock,
  Play,
  Square,
  Settings,
  ChevronDown,
  UnlockKeyhole,
  Braces,
  UserPlus,
  MessageSquare,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSearch,
  AlertOctagon,
  KeyRound,
  Edit3
} from 'lucide-react';
import { CertStatus, PacketStage, Packet } from './types';
import { encrypt, decrypt, SECRET_KEY } from './services/cryptoService';
// import { io } from 'socket.io-client';
import { ref, onChildAdded, update } from "firebase/database";
import { db } from "./firebase";

interface HackerLog {
  id: string;
  timestamp: string;
  source: string;
  destination: string;
  incomingPayload: string;
  tamperedMessage: string; // Plaintext of what the hacker typed
  decryptionKey: string;
  outgoingPayload?: string; // Final (potentially encrypted) result
  status: 'intercepted' | 'modified' | 'forwarded';
  isEncrypted: boolean;
}

const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'simulation' | 'lab' | 'intel'>('simulation');
  
  // Persistent Global States
  const [hackerLogs, setHackerLogs] = useState<HackerLog[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  
  // Persistent Sandbox Interface States
  const [sandboxProxyOn, setSandboxProxyOn] = useState(true);
  const [sandboxTlsActive, setSandboxTlsActive] = useState(true);
  const [sandboxSelectedReqId, setSandboxSelectedReqId] = useState<string | null>(null);
  const [sandboxEditingPayload, setSandboxEditingPayload] = useState<string>("");
  const [sandboxDecryptedResult, setSandboxDecryptedResult] = useState<string | null>(null);

  // --- START: Real-Time Network Interception Logic ---
 // ADD THIS INSIDE THE App COMPONENT


// Define these FIRST so the useEffect can use them
  const addHackerLog = useCallback((log: Omit<HackerLog, 'timestamp'>) => {
    setHackerLogs(prev => {
      const existingIdx = prev.findIndex(l => l.id === log.id);
      if (existingIdx !== -1) {
        const newLogs = [...prev];
        newLogs[existingIdx] = { ...newLogs[existingIdx], ...log, timestamp: new Date().toLocaleTimeString() };
        return newLogs;
      }
      return [{ ...log, timestamp: new Date().toLocaleTimeString() }, ...prev];
    });
  }, []);

  const addServerLog = useCallback((msg: string) => {
    setServerLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  }, []);


 useEffect(() => {
  const packetsRef = ref(db, 'global_packets');

  // This is the "Cloud Sniffer" that replaces the local localhost connection
  const unsubscribe = onChildAdded(packetsRef, (snapshot) => {
    const latestMsg = snapshot.val();
    if (!latestMsg || typeof latestMsg !== 'object') return;

const normalizedMsg = {
  id:
    typeof latestMsg.id === 'string'
      ? latestMsg.id
      : 'PKT-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
  content: latestMsg.content ?? '',
  senderId: latestMsg.senderId ?? 'UNKNOWN',
  receiverId: latestMsg.receiverId ?? 'UNKNOWN',
  timestamp: latestMsg.timestamp ?? Date.now(),
};


    setTrafficHistory(prev => {
      // Prevent duplicates
      if (prev.some(p => p.id === latestMsg.id)) return prev;

      const capturedPacket = {
        id: latestMsg.id,
        timestamp: new Date(latestMsg.timestamp).toLocaleTimeString(),
        method: 'POST',
        endpoint: '/aura/api/v3/transmit',
        headers: { 'X-From': latestMsg.senderId, 'X-To': latestMsg.receiverId },
        port: sandboxTlsActive ? 443 : 80,
        protocol: sandboxTlsActive ? 'HTTPS' : 'HTTP',
        body: latestMsg.content,
        ciphertext: sandboxTlsActive ? encrypt(latestMsg.content) : null,
        status: 'CAPTURED'
      };

const safeId =
  typeof latestMsg?.id === 'string'
    ? latestMsg.id.substring(0, 8)
    : 'UNKNOWN';

addServerLog(`CLOUD INTERCEPT: Packet ${safeId} trapped.`);
      return [capturedPacket, ...prev];
    });
  });

  return () => unsubscribe();
 }, [sandboxTlsActive, addServerLog]);
  
  // --- START: Simulation Tab Logic ---
  const [isEncryptionOn, setIsEncryptionOn] = useState(true);
  const [isMITMActive, setIsMITMActive] = useState(false);
  const [certStatus, setCertStatus] = useState<CertStatus>(CertStatus.VALID);
  const [inputMessage, setInputMessage] = useState("Hello Friend!");
  const [packet, setPacket] = useState<Packet | null>(null);
  const [serverData, setServerData] = useState<string | null>(null);
  const [attackerIntercept, setAttackerIntercept] = useState<string | null>(null);
  const [attackerEditValue, setAttackerEditValue] = useState<string>("");
  const [isWaitingForAccess, setIsWaitingForAccess] = useState(false);
  const [isAccessing, setIsAccessing] = useState(false);
  const [isEditingData, setIsEditingData] = useState(false);
  const [decodedOutput, setDecodedOutput] = useState<{content: string; status: 'success' | 'fail' | 'idle'}>({ content: '', status: 'idle' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSimulation = () => {
    setPacket(null); 
    setServerData(null); 
    setAttackerIntercept(null); 
    setAttackerEditValue("");
    setIsWaitingForAccess(false); 
    setIsAccessing(false); 
    setIsEditingData(false);
    setDecodedOutput({ content: '', status: 'idle' }); 
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const proceedToServer = (finalContent: string) => {
    timerRef.current = setTimeout(() => {
      setPacket(prev => prev ? { ...prev, stage: PacketStage.SERVER, displayContent: finalContent } : null);
      
      if (certStatus === CertStatus.INVALID) {
        setServerData("ERROR: REJECTED");
        setDecodedOutput({ content: "Handshake Failed: Invalid Cert.", status: 'fail' });
      } else {
        setServerData(finalContent);
        timerRef.current = setTimeout(() => {
          if (isEncryptionOn) {
            const result = decrypt(finalContent);
            if (result === "[DECRYPTION_ERROR_INVALID_FORMAT]") {
              setDecodedOutput({ content: "Integrity Violation: Data Corrupted.", status: 'fail' });
            } else {
              setDecodedOutput({ content: result, status: 'success' });
            }
          } else {
            setDecodedOutput({ content: finalContent, status: 'success' });
          }
        }, 1200);
      }
    }, 1000);
  };
const handleAccessData = () => {
    setIsAccessing(true);
    timerRef.current = setTimeout(() => {
      setIsAccessing(false);

      // SECURITY BLOCK: If TLS is on, middleman sees Access Denied
      if (isEncryptionOn) {
        alert("ACCESS DENIED: TLS Encryption Active. Packet bypassed interception.");
        setIsWaitingForAccess(false);
        if (attackerIntercept) {
          proceedToServer(attackerIntercept); // Automatically send to Friend B
        }
        return;
      }

      // Plaintext flow remains unchanged
      setIsWaitingForAccess(false);
      setIsEditingData(true);
      const revealed = attackerIntercept || "";
      setAttackerEditValue(revealed);
      // ... original log logic below
    }, 2500);
  };

  const forwardFromAttacker = () => { 
    if (!packet) return; 
    setIsEditingData(false); 
    const dataToSend = isEncryptionOn ? encrypt(attackerEditValue) : attackerEditValue;
    
    addHackerLog({
      id: packet.id,
      source: 'Friend A (Simulation)',
      destination: 'Friend B (Simulation)',
      incomingPayload: attackerIntercept || "",
      tamperedMessage: attackerEditValue, // Show the edited plaintext
      decryptionKey: isEncryptionOn ? SECRET_KEY : "NONE",
      outgoingPayload: dataToSend,
      status: 'modified',
      isEncrypted: isEncryptionOn
    });
    
    proceedToServer(dataToSend); 
  };

  const runSimulation = () => {
    resetSimulation(); 
    if (!inputMessage.trim()) return;
    
    const contentToSend = isEncryptionOn ? encrypt(inputMessage) : inputMessage;
    const initialPacket: Packet = { 
      id: 'SIM-' + Math.random().toString(36).substring(7).toUpperCase(), 
      originalContent: inputMessage, 
      displayContent: contentToSend, 
      isEncrypted: isEncryptionOn, 
      stage: PacketStage.CLIENT 
    };
    
    setPacket(initialPacket);
    timerRef.current = setTimeout(() => {
      const nextStage = isMITMActive ? PacketStage.NETWORK_INTERCEPT : PacketStage.NETWORK_PASSTHROUGH;
      setPacket(prev => prev ? { ...prev, stage: nextStage } : null);
      if (isMITMActive) { 
        setAttackerIntercept(contentToSend); 
        setIsWaitingForAccess(true); 
      } else {
        proceedToServer(contentToSend); 
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-2xl">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-emerald-400 w-8 h-8" />
            SecureComm Simulator
          </h1>
          <p className="text-slate-400 mt-1">Network Interception & Security Lab</p>
        </div>
        
        <nav className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700 mt-4 md:mt-0">
          <button onClick={() => setActiveTab('simulation')} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-bold ${activeTab === 'simulation' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
            <LayoutDashboard className="w-4 h-4" /> Simulation
          </button>
          <button onClick={() => setActiveTab('lab')} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-bold ${activeTab === 'lab' ? 'bg-rose-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
            <Skull className="w-4 h-4" /> Hacker Sandbox
          </button>
          <button onClick={() => setActiveTab('intel')} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-bold ${activeTab === 'intel' ? 'bg-indigo-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
            <FileSearch className="w-4 h-4" /> Hacker Intel
          </button>
        </nav>
      </header>

      {activeTab === 'simulation' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ControlToggle label="TLS / Encryption" active={isEncryptionOn} onToggle={() => { setIsEncryptionOn(!isEncryptionOn); resetSimulation(); }} icon={isEncryptionOn ? <Lock className="text-emerald-400" /> : <Unlock className="text-rose-400" />} desc={isEncryptionOn ? "Messages are end-to-end encrypted" : "Messages sent in plain, readable text"} />
            <ControlToggle label="MITM Interception" active={isMITMActive} onToggle={() => { setIsMITMActive(!isMITMActive); resetSimulation(); }} icon={isMITMActive ? <Eye className="text-rose-400 animate-pulse" /> : <EyeOff className="text-slate-400" />} desc={isMITMActive ? "You are currently eavesdropping" : "You are watching from the sidelines"} variant="danger" />
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Cert Validation</span>
                {certStatus === CertStatus.VALID ? <ShieldCheck className="text-emerald-400 w-5 h-5" /> : <ShieldAlert className="text-rose-400 w-5 h-5" />}
              </div>
              <select className="bg-slate-900 text-white p-2 rounded border border-slate-600 text-sm" value={certStatus} onChange={(e) => { setCertStatus(e.target.value as CertStatus); resetSimulation(); }}>
                <option value={CertStatus.VALID}>Trusted Connection</option>
                <option value={CertStatus.INVALID}>Untrusted Connection</option>
              </select>
            </div>
          </div>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            <div className="lg:col-span-3">
              <Panel title="Friend A (Sender)" icon={<Terminal className="w-5 h-5" />}>
                <div className="space-y-4">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Message Box</div>
                  <textarea className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-3 text-emerald-400 mono text-sm focus:ring-1 focus:ring-emerald-500 disabled:opacity-50" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} disabled={!!packet} placeholder="Enter message to your friend..." />
                  <button onClick={runSimulation} disabled={!!packet} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                    <Send className="w-4 h-4" /> SEND SECURELY
                  </button>
                </div>
              </Panel>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-700 h-40 flex items-center justify-center relative overflow-hidden">
                <div className="w-4/5 h-[2px] bg-slate-800 absolute" />
                {isAccessing && <div className="animate-scan" />}
                {packet && <PacketGraphic stage={packet.stage} isEncrypted={packet.isEncrypted} isWaiting={isWaitingForAccess} isAccessing={isAccessing} />}
                {!packet && <div className="text-slate-600 text-sm animate-pulse flex items-center gap-2"><Network className="w-4 h-4" /> Network Channel Idle</div>}
              </div>

              <Panel title="MITM Console (You)" icon={<Skull className="w-5 h-5" />} variant={isMITMActive ? 'danger' : 'default'}>
                <div className="min-h-[180px] flex flex-col justify-center">
                  {!isMITMActive ? (
                    <div className="text-center text-slate-600 opacity-40">
                      <EyeOff className="w-10 h-10 mb-2 mx-auto" />
                      <p className="text-sm font-bold">INTERCEPTION DISABLED</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {isWaitingForAccess && !isAccessing && (
                        <div className="bg-rose-900/10 border border-rose-500/30 p-6 rounded-lg text-center animate-pulse-red">
                          <Fingerprint className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                          <p className="text-xs text-rose-400 font-bold uppercase mb-4">Packet Intercepted in Buffer</p>
                          <button onClick={handleAccessData} className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs flex items-center justify-center gap-2">
                            <UnlockKeyhole className="w-4 h-4" /> DECRYPT & INSPECT
                          </button>
                        </div>
                      )}

                      {isAccessing && (
                        <div className="text-center space-y-4 p-6">
                          <div className="relative inline-block">
                             <Lock className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
                             <Activity className="absolute inset-0 w-12 h-12 text-rose-400/30 animate-spin-slow" />
                          </div>
                          <p className="text-xs text-rose-400 font-mono tracking-widest">PERFORMING CRYPTANALYSIS...</p>
                        </div>
                      )}

                      {isEditingData && (
                        <div className="space-y-3 animate-in fade-in zoom-in-95">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1">
                              <Braces className="w-3 h-3" /> Recovered Payload
                            </label>
                            <span className="text-[9px] bg-rose-900/40 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 font-bold uppercase">Editable</span>
                          </div>
                          <textarea className="w-full h-24 bg-black p-3 rounded border border-rose-500 text-rose-400 mono text-sm focus:ring-1 focus:ring-rose-500 outline-none" value={attackerEditValue} onChange={(e) => setAttackerEditValue(e.target.value)} />
                          <button onClick={forwardFromAttacker} className="w-full py-2 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold text-xs transition-all shadow-lg shadow-rose-900/30">
                            RE-ENCRYPT & FORWARD TO FRIEND B
                          </button>
                        </div>
                      )}

                      {!isWaitingForAccess && !isAccessing && !isEditingData && (
                        <div className="text-center space-y-3">
                           <Activity className="w-8 h-8 text-slate-700 mx-auto" />
                           <p className="text-[10px] text-slate-600 font-bold uppercase">Scanning Network Stream...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <Panel title="Friend B (Receiver)" icon={<Radio className="w-5 h-5" />}>
                 <div className="space-y-4 h-full flex flex-col">
                   <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Network Buffer</div>
                      <div className="bg-slate-900 border border-slate-700 rounded p-3 text-blue-400 mono text-sm h-24 overflow-auto scrollbar-hide">
                        {serverData || <span className="opacity-30 italic">Awaiting data...</span>}
                      </div>
                   </div>

                   <div className="mt-auto space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Receiver Decryption</span>
                        {decodedOutput.status === 'success' ? <ShieldCheck className="text-emerald-500 w-3 h-3" /> : decodedOutput.status === 'fail' ? <ShieldAlert className="text-rose-500 w-3 h-3" /> : null}
                      </div>
                      <div className={`p-4 rounded-lg border-2 transition-all min-h-[80px] flex flex-col justify-center ${
                        decodedOutput.status === 'success' ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-900/10' :
                        decodedOutput.status === 'fail' ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-900/10' :
                        'bg-slate-900/50 border-slate-700 opacity-50'
                      }`}>
                         {decodedOutput.status === 'idle' ? (
                            <div className="text-center">
                               <Lock className="w-6 h-6 text-slate-700 mx-auto" />
                               <p className="text-[9px] text-slate-600 font-bold mt-1 uppercase">Awaiting Handshake</p>
                            </div>
                         ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                               <p className={`text-xs font-bold font-mono ${decodedOutput.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {decodedOutput.content}
                               </p>
                               {decodedOutput.status === 'success' && (
                                 <p className="text-[9px] text-emerald-600 font-bold mt-2 uppercase tracking-tighter">Verified & Decrypted</p>
                               )}
                            </div>
                         )}
                      </div>
                   </div>
                 </div>
              </Panel>
            </div>
          </main>
        </>
      ) : activeTab === 'lab' ? (
        <HackerSandbox 
          onActivityLog={addHackerLog}
          trafficHistory={trafficHistory}
          setTrafficHistory={setTrafficHistory}
          serverLogs={serverLogs}
          addServerLog={addServerLog}
          proxyOn={sandboxProxyOn}
          setProxyOn={setSandboxProxyOn}
          tlsActive={sandboxTlsActive}
          setTlsActive={setSandboxTlsActive}
          selectedReqId={sandboxSelectedReqId}
          setSelectedReqId={setSandboxSelectedReqId}
          editingPayload={sandboxEditingPayload}
          setEditingPayload={setSandboxEditingPayload}
          decryptedResult={sandboxDecryptedResult}
          setDecryptedResult={setSandboxDecryptedResult}
        />
      ) : (
        <ActivityIntel logHistory={hackerLogs} />
      )}
    </div>
  );
};


// --- HACKER INTEL TAB ---
const ActivityIntel: React.FC<{ logHistory: HackerLog[] }> = ({ logHistory }) => {
  return (
    <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-xl shadow-2xl flex flex-col md:flex-row gap-6 items-center">
        <div className="p-4 bg-indigo-600 rounded-full shadow-lg shadow-indigo-900/40">
           <FileSearch className="w-10 h-10 text-white" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Forensic Operations Ledger</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl font-medium leading-relaxed">
            Detailed tracking of all compromised communication streams. This console shows exactly what the hacker <span className="text-emerald-400">received</span> and how they <span className="text-rose-400">tampered</span> with the payload.
          </p>
        </div>
        <div className="flex flex-col gap-2 bg-slate-900 p-4 rounded-lg border border-slate-800 min-w-[200px]">
           <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-500 uppercase">Total Intercepts</span>
              <span className="text-rose-500">{logHistory.length}</span>
           </div>
           <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-slate-500 uppercase">Tampered Packets</span>
              <span className="text-emerald-500">{logHistory.filter(l => l.status === 'modified').length}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {logHistory.length === 0 ? (
          <div className="p-20 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-700">
             <AlertOctagon className="w-16 h-16 mb-4 opacity-10" />
             <p className="text-sm font-black uppercase tracking-widest opacity-20">Awaiting Network Traffic...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {logHistory.map((log) => (
              <div key={log.id} className="bg-slate-800/80 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl transition-all hover:border-indigo-500/50">
                <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-700 ${log.status === 'modified' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                   <div className="flex items-center gap-4">
                     <div className={`p-2 rounded-xl ${log.status === 'modified' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 shadow-lg shadow-rose-500/20'}`}>
                        {log.status === 'modified' ? <Zap className="w-5 h-5 text-white" /> : <Skull className="w-5 h-5 text-white" />}
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">ID: {log.id}</span>
                           <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${log.isEncrypted ? 'bg-indigo-900/30 border-indigo-500/50 text-indigo-300' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                              {log.isEncrypted ? 'ENCRYPTED' : 'PLAINTEXT'}
                           </span>
                        </div>
                        <div className="text-sm font-bold text-slate-200 flex items-center gap-2 mt-0.5">
                           <span className="text-indigo-400 font-mono text-xs">{log.source}</span>
                           <ChevronRight className="w-3 h-3 text-slate-600" />
                           <span className="text-indigo-400 font-mono text-xs">{log.destination}</span>
                        </div>
                     </div>
                   </div>
                   <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{log.timestamp}</div>
                      <div className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${log.status === 'modified' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/20 border-rose-500/50 text-rose-400'}`}>
                         {log.status}
                      </div>
                   </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-500 uppercase font-black text-[10px] tracking-tighter">
                         <KeyRound className="w-4 h-4 text-indigo-400" /> Master Key
                      </div>
                      <div className="bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/20 text-indigo-300 font-mono text-[11px] h-24 flex items-center justify-center text-center shadow-inner">
                        {log.decryptionKey}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-500 uppercase font-black text-[10px] tracking-tighter">
                         <Edit3 className="w-4 h-4 text-emerald-400" /> Tampered Message
                      </div>
                      <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/20 text-emerald-400 font-mono text-[11px] h-24 overflow-y-auto scrollbar-hide shadow-inner">
                        {log.status === 'modified' ? log.tamperedMessage : <span className="opacity-30 italic">Not Edited</span>}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-500 uppercase font-black text-[10px] tracking-tighter">
                         <ArrowDownCircle className="w-4 h-4 text-rose-400" /> Inbound Cipher
                      </div>
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-rose-800 break-all font-mono text-[11px] h-24 overflow-y-auto scrollbar-hide shadow-inner">
                        {log.incomingPayload}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-500 uppercase font-black text-[10px] tracking-tighter">
                         <ArrowUpCircle className="w-4 h-4 text-indigo-400" /> Outbound Result
                      </div>
                      <div className={`p-4 rounded-2xl border font-mono text-[11px] h-24 overflow-y-auto scrollbar-hide shadow-inner ${log.outgoingPayload ? 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-600 italic flex items-center justify-center text-center'}`}>
                        {log.outgoingPayload || 'PASSED CLEAN'}
                      </div>
                   </div>
                </div>

                {log.status === 'modified' && (
                  <div className="bg-slate-900/50 px-6 py-3 border-t border-slate-700/50 flex items-center gap-2">
                     <AlertTriangle className="w-3 h-3 text-rose-500" />
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Integrity Warning: The hacker manually changed the message content.
                     </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- PERSISTENT HACKER SANDBOX ---
interface SandboxProps {
  onActivityLog: (log: Omit<HackerLog, 'timestamp'>) => void;
  trafficHistory: any[];
  setTrafficHistory: React.Dispatch<React.SetStateAction<any[]>>;
  serverLogs: string[];
  addServerLog: (msg: string) => void;
  proxyOn: boolean;
  setProxyOn: (val: boolean) => void;
  tlsActive: boolean;
  setTlsActive: (val: boolean) => void;
  selectedReqId: string | null;
  setSelectedReqId: (val: string | null) => void;
  editingPayload: string;
  setEditingPayload: (val: string) => void;
  decryptedResult: string | null;
  setDecryptedResult: (val: string | null) => void;
}

const HackerSandbox: React.FC<SandboxProps> = ({
  onActivityLog, trafficHistory, setTrafficHistory, serverLogs, addServerLog,
  proxyOn, setProxyOn, tlsActive, setTlsActive, selectedReqId, setSelectedReqId,
  editingPayload, setEditingPayload, decryptedResult, setDecryptedResult
}) => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionProgress, setDecryptionProgress] = useState(0);

  const selectedReq = trafficHistory.find(r => r.id === selectedReqId);

  const simulateTraffic = (type: 'P2P' | 'API') => {
    const id = 'PKT-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    let payload = "";
    let endpoint = "";
    let headers: Record<string, string> = { 'Host': 'msg.gateway.local', 'X-Session': 'SESS-' + id };

    if (type === 'P2P') { 
      endpoint = "/v1/send_msg"; 
      payload = "Hey buddy, let's meet at 5 PM.";
      headers = { ...headers, 'X-From': '8200250915', 'X-To': '9723405732' };
    } else { 
      endpoint = "/v2/auth/verify"; 
      payload = JSON.stringify({ token: "AUTH_" + id }); 
    }

    const rawRequest = {
      id,
      timestamp: new Date().toLocaleTimeString(),
      method: 'POST',
      endpoint,
      port: tlsActive ? 443 : 80,
      protocol: tlsActive ? 'HTTPS' : 'HTTP',
      headers,
      body: payload,
      ciphertext: tlsActive ? encrypt(payload) : null,
      status: 'CAPTURED',
    };

    setTrafficHistory(prev => [rawRequest, ...prev]);
    setSelectedReqId(id);
    setEditingPayload(payload);
    setDecryptedResult(null);
    
    if (proxyOn) {
      addServerLog(`INTERCEPT: Request ${id} from ${headers['X-From'] || 'System'} trapped.`);
      onActivityLog({
        id,
        source: headers['X-From'] || 'LocalSystem',
        destination: headers['X-To'] || 'RemoteAPI',
        incomingPayload: rawRequest.ciphertext || rawRequest.body,
        tamperedMessage: payload,
        decryptionKey: tlsActive ? SECRET_KEY : "NONE",
        status: 'intercepted',
        isEncrypted: !!rawRequest.ciphertext
      });
    } else {
      processResponse(rawRequest);
    }
  };

  const processResponse = (req: any, modifiedPayload?: string) => {
    addServerLog(`ROUTING: Request ${req.id} forwarded to ${req.headers['X-To'] || 'Endpoint'}.`);
    
    setTimeout(() => {
      setTrafficHistory(prev => prev.map(r => r.id === req.id ? { ...r, status: 'COMPLETED', body: modifiedPayload || r.body } : r));
      addServerLog(`SERVER: Delivered to ${req.headers['X-To'] || 'Service'}.${modifiedPayload ? ' [MODIFIED]' : ''}`);
    }, 500);
  };

  const runDecryption = () => {
    if (!selectedReq || !selectedReq.ciphertext) return;
    setIsDecrypting(true);
    setDecryptionProgress(0);
    setDecryptedResult(null);

    const duration = 1200;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setDecryptionProgress((currentStep / steps) * 100);
      if (currentStep >= steps) {
        clearInterval(timer);
        setIsDecrypting(false);
        const result = decrypt(selectedReq.ciphertext);
        setDecryptedResult(result);
        setEditingPayload(result); 
        addServerLog(`DECRYPT: Packet ${selectedReq.id} recovered.`);
      }
    }, interval);
  };
const handleForwardModified = () => {
  if (!selectedReq) return;

  // 1. Log the Activity to Hacker Intel BEFORE clearing the selection
  onActivityLog({
    id: selectedReq.id,
    source: selectedReq.headers['X-From'] || 'Aura-User',
    destination: selectedReq.headers['X-To'] || 'Aura-Target',
    // Original message received by the hacker
    incomingPayload: selectedReq.ciphertext || selectedReq.body, 
    // New message typed by the hacker
    tamperedMessage: editingPayload, 
    decryptionKey: tlsActive ? SECRET_KEY : "NONE",
    outgoingPayload: tlsActive ? encrypt(editingPayload) : editingPayload,
    status: 'modified',
    isEncrypted: tlsActive
  });

  // 2. UPDATE CLOUD DATABASE (for Aura to see)
  update(ref(db, 'global_packets/' + selectedReq.id), {
    content: editingPayload,
    status: 'hacked' 
  });

  // 3. UI Feedback
  const payloadToForward = tlsActive ? encrypt(editingPayload) : editingPayload;
  processResponse(selectedReq, payloadToForward);
  
  setSelectedReqId(null);
  addServerLog(`SUCCESS: Intelligence log updated and packet forwarded.`);
};

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${proxyOn ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Interception Engine</span>
            <button onClick={() => setProxyOn(!proxyOn)} className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${proxyOn ? 'bg-rose-900/40 border-rose-500 text-rose-100' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
              {proxyOn ? 'TRAP ON' : 'PASSTHROUGH'}
            </button>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
            <Lock className={`w-3 h-3 ${tlsActive ? 'text-emerald-400' : 'text-rose-400'}`} />
            <button onClick={() => setTlsActive(!tlsActive)} className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${tlsActive ? 'bg-emerald-900/40 border-emerald-500 text-emerald-100' : 'bg-rose-900/40 border-rose-500 text-rose-100'}`}>
              {tlsActive ? 'HTTPS (443)' : 'HTTP (80)'}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => simulateTraffic('P2P')} className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-md shadow-rose-900/20"><MessageSquare className="w-3 h-3" /> P2P MSG</button>
           <button onClick={() => simulateTraffic('API')} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-md shadow-indigo-900/20"><Play className="w-3 h-3" /> API REQ</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px]">
        <div className="lg:col-span-4 flex flex-col">
           <Panel title="Captured Packets" icon={<History className="w-5 h-5" />}>
              <div className="flex flex-col h-full font-mono text-[9px] space-y-1">
                <div className="grid grid-cols-5 text-slate-600 font-bold border-b border-slate-700 pb-1 mb-1">
                  <span className="col-span-1">ID</span>
                  <span className="col-span-1">PROTOCOL</span>
                  <span className="col-span-2">SOURCE</span>
                  <span className="col-span-1 text-right">STATUS</span>
                </div>
                <div className="overflow-y-auto max-h-[450px] space-y-1 pr-2 scrollbar-hide">
                  {trafficHistory.length === 0 && <p className="text-center py-10 opacity-20 text-[10px]">LISTENING FOR TRAFFIC...</p>}
                  {trafficHistory.map(req => (
                    <button key={req.id} onClick={() => { setSelectedReqId(req.id); setDecryptedResult(null); setEditingPayload(req.body); }} className={`w-full grid grid-cols-5 p-2 rounded text-left transition-all ${selectedReqId === req.id ? 'bg-rose-600/30 text-white border-l-2 border-rose-500 shadow-lg' : 'hover:bg-slate-800/50 text-slate-400 border-l-2 border-transparent'}`}>
<span className="text-rose-400 font-bold">
  {req.id?.includes('-') ? req.id.split('-')[1] : req.id}
</span>
                      <span className={req.protocol === 'HTTPS' ? 'text-emerald-500' : 'text-rose-500'}>{req.protocol}</span>
                      <span className="truncate col-span-2 text-indigo-300">{req.headers['X-From'] || 'SYSTEM'}</span>
                      <span className="text-[8px] opacity-70 text-right uppercase">{req.status}</span>
                    </button>
                  ))}
                </div>
              </div>
           </Panel>
           <div className="mt-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
             <h4 className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2"><Activity className="w-3 h-3" /> Console Logs</h4>
             <div className="space-y-1 h-32 overflow-y-auto font-mono text-[9px] text-slate-400 scrollbar-hide">
               {serverLogs.map((log, i) => <div key={i} className="border-l border-slate-700 pl-2 py-0.5">{log}</div>)}
               {serverLogs.length === 0 && <div className="opacity-20 italic">Listening...</div>}
             </div>
           </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel title="Inspector / Tamper Tool" icon={<Search className="w-5 h-5" />} variant={selectedReq?.status === 'CAPTURED' ? 'danger' : 'default'}>
            {selectedReq ? (
              <div className="flex flex-col h-full gap-4 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Header View</label>
                  <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[10px] text-indigo-400 max-h-24 overflow-auto scrollbar-hide">
                    {Object.entries(selectedReq.headers).map(([k,v]) => <div key={k} className="truncate">{k}: {v as string}</div>)}
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Data Modification</label>
                  </div>
                  
                  {selectedReq.ciphertext && !decryptedResult ? (
                    <div className="flex-1 bg-black p-3 rounded border border-rose-900/50 font-mono text-[10px] text-rose-800 break-all overflow-y-auto scrollbar-hide">
                      [DATA ENCRYPTED: REQUIRES DECRYPTION]
                      <br/><br/>
                      {selectedReq.ciphertext}
                    </div>
                  ) : (
                    <textarea 
                      className="flex-1 bg-black p-3 rounded border border-emerald-900/30 font-mono text-[11px] text-emerald-400 focus:border-emerald-500 outline-none resize-none transition-colors scrollbar-hide"
                      value={editingPayload}
                      onChange={(e) => setEditingPayload(e.target.value)}
                    />
                  )}
                </div>

                {selectedReq.status === 'CAPTURED' && (
                  <button onClick={handleForwardModified} className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2">
                    <Send className="w-3 h-3" /> TAMPER & FORWARD
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20">
                <Search className="w-12 h-12 mb-2" />
                <p className="text-[10px] font-bold uppercase">Select Packet to Inspect</p>
              </div>
            )}
          </Panel>

          <Panel title="Cryptanalysis Module" icon={<UnlockKeyhole className="w-5 h-5" />} variant="success">
            {selectedReq?.ciphertext ? (
              <div className="flex flex-col h-full gap-4">
                <button 
                  onClick={runDecryption} 
                  disabled={isDecrypting || !!decryptedResult} 
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded font-bold text-xs shadow-lg transition-all"
                >
                  {isDecrypting ? 'CRACKING...' : decryptedResult ? 'KEY RECOVERED' : 'BRUTE FORCE ATTACK'}
                </button>
                
                <div className="flex-1 bg-black/40 rounded border border-slate-800 p-4 relative flex flex-col justify-center min-h-[150px]">
                  {isDecrypting ? (
                    <div className="space-y-4 text-center">
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${decryptionProgress}%` }} />
                      </div>
                      <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Searching Bits...</p>
                    </div>
                  ) : decryptedResult ? (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500">
                      <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded font-mono text-[11px] text-emerald-300 break-all h-24 overflow-y-auto scrollbar-hide">
                        {decryptedResult}
                      </div>
                      <p className="text-[8px] text-slate-500 italic">Plaintext exposed. You can now edit this in the Inspector.</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-3 opacity-10">
                      <Key className="w-10 h-10 mx-auto" />
                      <p className="text-[10px] font-bold uppercase">Ready for Payload Cracking</p>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedReq ? (
              <div className="h-full flex flex-col items-center justify-center text-emerald-500/30 gap-3">
                <ShieldCheck className="w-12 h-12" />
                <p className="text-[10px] font-black uppercase">Traffic is Plaintext</p>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
};

// Existing Helper Components
const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; variant?: 'default' | 'danger' | 'success' }> = ({ title, icon, children, variant = 'default' }) => {
  const borderClass = variant === 'danger' ? 'border-rose-500 shadow-rose-900/20' : variant === 'success' ? 'border-emerald-500 shadow-emerald-900/20' : 'border-slate-700';
  return (
    <div className={`bg-slate-800/80 rounded-xl border-2 ${borderClass} shadow-xl overflow-hidden h-full flex flex-col transition-all duration-300`}>
      <div className={`px-4 py-3 flex items-center gap-2 border-b border-slate-700 ${variant === 'danger' ? 'bg-rose-500/10' : variant === 'success' ? 'bg-emerald-500/10' : 'bg-slate-700/30'}`}>
        <div className={variant === 'danger' ? 'text-rose-400' : variant === 'success' ? 'text-emerald-400' : 'text-slate-400'}>{icon}</div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-200">{title}</h3>
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
};

const ControlToggle: React.FC<{ label: string; active: boolean; onToggle: () => void; icon: React.ReactNode; desc: string; variant?: 'default' | 'danger' }> = ({ label, active, onToggle, icon, desc, variant = 'default' }) => (
  <button onClick={onToggle} className={`p-4 rounded-xl border-2 transition-all text-left flex items-start gap-4 hover:scale-[1.01] ${active ? (variant === 'danger' ? 'bg-rose-900/20 border-rose-500 shadow-rose-900/20' : 'bg-emerald-900/20 border-emerald-500 shadow-emerald-900/20') : 'bg-slate-800/50 border-slate-700 opacity-60'}`}>
    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-700 ${active ? 'animate-pulse' : ''}`}>{icon}</div>
    <div>
      <div className="text-[10px] font-bold uppercase text-slate-400">{label}</div>
      <div className={`text-lg font-black ${active ? (variant === 'danger' ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-500'}`}>{active ? 'ON' : 'OFF'}</div>
      <div className="text-[10px] text-slate-500 leading-tight mt-1 max-w-[150px]">{desc}</div>
    </div>
  </button>
);

const PacketGraphic: React.FC<{ stage: PacketStage; isEncrypted: boolean; isWaiting: boolean; isAccessing: boolean }> = ({ stage, isEncrypted, isWaiting, isAccessing }) => {
  const getPosition = () => {
    switch (stage) {
      case PacketStage.CLIENT: return 'left-[10%]';
      case PacketStage.NETWORK_INTERCEPT: return 'left-[50%] -translate-y-4';
      case PacketStage.NETWORK_PASSTHROUGH: return 'left-[50%]';
      case PacketStage.SERVER: return 'left-[90%]';
      default: return 'left-[10%]';
    }
  };
  return (
    <div className={`absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out z-10 ${getPosition()}`}>
      <div className={`relative p-3 rounded-lg border-2 shadow-2xl flex flex-col items-center gap-1 transform ${isWaiting ? 'scale-125 shadow-rose-500/30' : 'scale-100'} ${isEncrypted ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-100 border-slate-300'}`}>
        {isEncrypted ? <Lock className="w-4 h-4 text-white" /> : <Unlock className="w-4 h-4 text-slate-800" />}
        {isWaiting && <div className="absolute inset-0 border-2 border-rose-500 rounded-lg animate-ping opacity-50" />}
        {isAccessing && <div className="absolute inset-[-4px] border border-rose-400 rounded-lg blur-[2px] opacity-75" />}
      </div>
    </div>
  );
};


export default App;
