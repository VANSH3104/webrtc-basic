import { useEffect, useRef, useState } from "react"
import { createWebSocket } from "./utils/rtcutils"

export const Stream = ()=>{
    const socket = useRef<WebSocket | null>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const [isVideoStarted, setIsVideoStarted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(()=>{
        socket.current = createWebSocket('ws://localhost:3000');
        socket.current.onopen = ()=>{
            socket.current?.send(JSON.stringify({
                type:"receiver"
            }))
        }
        socket.current.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
              case 'receiver':
                { 
                  const offer = await peerConnection.current?.createOffer();
                  if (offer) {
                    await peerConnection.current?.setLocalDescription(offer);
                    socket.current?.send(JSON.stringify({ type: 'offer',sdp: offer }));
                  }
                }
                break;
              case 'answer':
                await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(message.sdp));
                break;
              case 'iceCandidate':
                { 
                  const candidate = new RTCIceCandidate(message.candidate);
                  console.log(candidate , "item candidate")
                  await peerConnection.current?.addIceCandidate(candidate);
                }
                break;
            }
          };
    }, [])
    const handleStartVideo = () => {
        setIsVideoStarted(true);
        videoRef.current?.play().catch(err => {
            console.error("Error playing video:", err);
        });
    };

    
    return (
        <div>
            <video ref={videoRef} autoPlay playsInline muted={!isVideoStarted} style={{ width: "300px", marginTop: "10px" }} />
            {!isVideoStarted && (
                <button onClick={handleStartVideo} style={{ marginTop: "10px" }}>Start Video</button>
            )}
        </div>
    )
}