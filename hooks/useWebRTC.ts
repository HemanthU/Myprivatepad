"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { collection, doc, onSnapshot, setDoc, deleteDoc, addDoc, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC(slug: string, isEnabled: boolean) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [id: string]: MediaStream }>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const clientId = useRef(Math.random().toString(36).substring(2, 10)).current;
  const pcs = useRef<{ [id: string]: RTCPeerConnection }>({});

  const cleanup = useCallback(async () => {
    Object.values(pcs.current).forEach(pc => pc.close());
    pcs.current = {};
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStreams({});
    await deleteDoc(doc(db, "padCalls", slug, "participants", clientId)).catch(() => {});
  }, [clientId, localStream, slug]);

  useEffect(() => {
    if (!isEnabled) {
      cleanup();
      return;
    }

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const participantsRef = collection(db, "padCalls", slug, "participants");
        
        await setDoc(doc(participantsRef, clientId), { joinedAt: new Date().toISOString() });

        const unsubscribe = onSnapshot(participantsRef, async (snap) => {
          snap.docChanges().forEach(async (change) => {
            const peerId = change.doc.id;
            if (peerId === clientId) return;

            if (change.type === "added") {
              const pc = new RTCPeerConnection(ICE_SERVERS);
              pcs.current[peerId] = pc;

              stream.getTracks().forEach(track => pc.addTrack(track, stream));

              pc.ontrack = (event) => {
                setRemoteStreams(prev => ({ ...prev, [peerId]: event.streams[0] }));
              };

              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  addDoc(collection(db, "padCalls", slug, "participants", peerId, "candidates"), event.candidate.toJSON());
                }
              };

              // If I am older in the room, I create the offer
              const myDoc = await getDocs(query(participantsRef));
              const amIOlder = myDoc.docs.find(d => d.id === clientId)?.data().joinedAt < change.doc.data().joinedAt;
              
              if (amIOlder) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await setDoc(doc(participantsRef, clientId, "offers", peerId), {
                  type: offer.type,
                  sdp: offer.sdp
                });
              }

              // Listen for offers
              onSnapshot(collection(db, "padCalls", slug, "participants", clientId, "offers"), async (offerSnap) => {
                offerSnap.docChanges().forEach(async (offerChange) => {
                  if (offerChange.type === "added" && offerChange.doc.id === peerId) {
                    const offerData = offerChange.doc.data();
                    await pc.setRemoteDescription(new RTCSessionDescription(offerData as any));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await setDoc(doc(participantsRef, clientId, "answers", peerId), {
                      type: answer.type,
                      sdp: answer.sdp
                    });
                  }
                });
              });

              // Listen for answers
              onSnapshot(collection(db, "padCalls", slug, "participants", peerId, "answers"), async (answerSnap) => {
                answerSnap.docChanges().forEach(async (answerChange) => {
                  if (answerChange.type === "added" && answerChange.doc.id === clientId) {
                    const answerData = answerChange.doc.data();
                    if (!pc.currentRemoteDescription) {
                      await pc.setRemoteDescription(new RTCSessionDescription(answerData as any));
                    }
                  }
                });
              });

              // Listen for ICE candidates
              onSnapshot(collection(db, "padCalls", slug, "participants", clientId, "candidates"), (candidateSnap) => {
                candidateSnap.docChanges().forEach((candidateChange) => {
                  if (candidateChange.type === "added") {
                    const candidate = new RTCIceCandidate(candidateChange.doc.data());
                    pc.addIceCandidate(candidate);
                  }
                });
              });
            }

            if (change.type === "removed") {
              if (pcs.current[peerId]) {
                pcs.current[peerId].close();
                delete pcs.current[peerId];
              }
              setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[peerId];
                return newStreams;
              });
            }
          });
        });

        window.addEventListener("beforeunload", cleanup);
        return () => {
          unsubscribe();
          cleanup();
          window.removeEventListener("beforeunload", cleanup);
        };
      } catch (err) {
        console.error("WebRTC Error:", err);
      }
    };

    startCall();
  }, [isEnabled, slug, clientId, cleanup]);

  return { localStream, remoteStreams, localVideoRef };
}
