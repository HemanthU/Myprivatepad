"use client";

import { useWebRTC } from "@/hooks/useWebRTC";
import { PhoneOff, MicOff, VideoOff, Mic, Video } from "lucide-react";
import { useState, useEffect } from "react";

export default function CallOverlay({ slug, isEnabled, onClose }: { slug: string, isEnabled: boolean, onClose: () => void }) {
  const { localStream, remoteStreams, localVideoRef } = useWebRTC(slug, isEnabled);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = micOn);
    }
  }, [micOn, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = videoOn);
    }
  }, [videoOn, localStream]);

  if (!isEnabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
      <div className="flex flex-wrap gap-2 justify-end pointer-events-auto">
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div key={peerId} className="w-48 h-32 bg-black rounded-xl overflow-hidden shadow-xl border-2 border-gray-700 relative">
            <video 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
              ref={el => { if (el) el.srcObject = stream }}
            />
            <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-2 py-0.5 rounded">Peer</div>
          </div>
        ))}
      </div>
      
      <div className="w-48 h-32 bg-black rounded-xl overflow-hidden shadow-xl border-2 border-indigo-500 relative pointer-events-auto group">
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-2 py-0.5 rounded">You</div>
        
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={() => setMicOn(!micOn)} className={`p-2 rounded-full ${micOn ? 'bg-gray-700' : 'bg-red-500'} text-white`}>
            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
          <button onClick={() => setVideoOn(!videoOn)} className={`p-2 rounded-full ${videoOn ? 'bg-gray-700' : 'bg-red-500'} text-white`}>
            {videoOn ? <Video size={16} /> : <VideoOff size={16} />}
          </button>
          <button onClick={onClose} className="p-2 rounded-full bg-red-600 text-white">
            <PhoneOff size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
