import { useState, useEffect, useRef } from "react";
import { User } from "../types";
import { socket } from "../App";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface CallModalProps {
  currentUser: User;
  incomingCall?: { from: string; signal: any } | null;
  onClose: () => void;
}

export default function CallModal({ currentUser, incomingCall, onClose }: CallModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [receivingCall, setReceivingCall] = useState(!!incomingCall);
  const [caller, setCaller] = useState(incomingCall?.from || "");
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isVideo, setIsVideo] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const initCall = async (userToCall: User, video: boolean) => {
      setIsVideo(video);
      setCaller(userToCall.id);
      
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
        setStream(currentStream);
        if (myVideo.current) myVideo.current.srcObject = currentStream;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        peerConnection.current = pc;

        currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));

        pc.ontrack = (event) => {
          if (userVideo.current) {
            userVideo.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("call_user", {
              userToCall: userToCall.id,
              signalData: { type: "candidate", candidate: event.candidate },
              from: currentUser.id,
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call_user", {
          userToCall: userToCall.id,
          signalData: { type: "offer", offer },
          from: currentUser.id,
        });

      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };

    const handleStartCall = (e: any) => {
      const { userToCall, video } = e.detail;
      initCall(userToCall, video);
    };

    window.addEventListener("start_call", handleStartCall);

    return () => {
      window.removeEventListener("start_call", handleStartCall);
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (incomingCall) {
      setReceivingCall(true);
      setCaller(incomingCall.from);
      
      if (incomingCall.signal.type === "offer") {
        // We will handle the offer when the user answers
      }
    }
  }, [incomingCall]);

  useEffect(() => {
    const handleCallAccepted = async (signal: any) => {
      setCallAccepted(true);
      if (peerConnection.current) {
        if (signal.type === "answer") {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.answer));
        } else if (signal.type === "candidate") {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    };

    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_ended", endCall);

    // Also handle incoming signals during the call (like ICE candidates)
    socket.on("incoming_call", async (data) => {
      if (data.signal.type === "candidate" && peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
      }
    });

    return () => {
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_ended", endCall);
      socket.off("incoming_call");
    };
  }, []);

  const answerCall = async () => {
    setCallAccepted(true);
    
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      peerConnection.current = pc;

      currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));

      pc.ontrack = (event) => {
        if (userVideo.current) {
          userVideo.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("answer_call", { 
            to: caller, 
            signal: { type: "candidate", candidate: event.candidate } 
          });
        }
      };

      if (incomingCall?.signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit("answer_call", { 
          to: caller, 
          signal: { type: "answer", answer } 
        });
      }
    } catch (err) {
      console.error("Error answering call.", err);
    }
  };

  const endCall = () => {
    setCallEnded(true);
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    socket.emit("end_call", { to: caller });
    onClose();
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideo(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  if (callEnded) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl w-full max-w-4xl flex flex-col relative">
        
        {/* Video Area */}
        <div className="relative flex-1 bg-black min-h-[400px] md:min-h-[600px] flex items-center justify-center">
          {callAccepted && !callEnded ? (
            <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
          ) : receivingCall && !callAccepted ? (
            <div className="text-center text-white p-8">
              <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                <Phone className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Llamada entrante</h2>
              <p className="text-neutral-400">Usuario ID: {caller}</p>
            </div>
          ) : (
            <div className="text-center text-white p-8">
              <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone className="w-10 h-10 text-neutral-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Llamando...</h2>
              <p className="text-neutral-400">Esperando respuesta</p>
            </div>
          )}

          {/* Picture in Picture (My Video) */}
          {stream && (
            <div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-[3/4] md:aspect-video bg-neutral-800 rounded-2xl overflow-hidden border-2 border-neutral-700 shadow-lg z-10">
              <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-neutral-900 p-6 flex items-center justify-center space-x-6 border-t border-neutral-800">
          {receivingCall && !callAccepted ? (
            <>
              <button 
                onClick={answerCall}
                className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white hover:bg-emerald-600 transition-transform hover:scale-105 shadow-lg shadow-emerald-500/30"
              >
                <Phone className="w-8 h-8" />
              </button>
              <button 
                onClick={endCall}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-transform hover:scale-105 shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={toggleAudio}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${isMuted ? "bg-red-500/20 text-red-500" : "bg-neutral-800 hover:bg-neutral-700"}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={endCall}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-transform hover:scale-105 shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              
              <button 
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${!isVideo ? "bg-red-500/20 text-red-500" : "bg-neutral-800 hover:bg-neutral-700"}`}
              >
                {!isVideo ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
