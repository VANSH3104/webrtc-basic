import { useEffect, useRef, useState } from "react"

export const Sender = ()=>{
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [pc, setPC] = useState<RTCPeerConnection | null>(null);
    const [localStream , setLocalstream] = useState<MediaStream | null>(null);
    const userVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(()=>{
        const socket = new WebSocket('ws://localhost:8080');
        setSocket(socket);
        socket.onopen = ()=>{
            console.log("connection of sender sucess");
            socket.send(JSON.stringify({
                type: 'sender',
            }))
        }
        socket.onmessage = (event)=>{
            const message = JSON.parse(event.data);
            if (message.type === 'createOffer') {
              createPeerConnection(message.sdp);
            } else if (message.type === 'createAnswer') {
              pc?.setRemoteDescription(new RTCSessionDescription(message.sdp));
            } else if (message.type === 'iceCandidate') {
              pc?.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        }
        return ()=>{
            socket.close();
        }
    },[])
    const initilizeConnection= async()=>{
        if(!localStream){
            await getCameraState();
        }
        if (!pc){
            createPeerConnection();
        }
    }
    const createPeerConnection = async(remoteSdp?: RTCSessionDescriptionInit)=>{
        const peerConnection = new RTCPeerConnection();
        if(localStream){
            localStream.getTracks().forEach(track =>{
                peerConnection.addTrack(track , localStream)
            });
        }
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket?.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }));
            }
          };
        peerConnection.ontrack = (event) => {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.play();
        document.body.appendChild(remoteVideo);
        };
        if (remoteSdp) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteSdp));
          } else {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket?.send(JSON.stringify({ type: 'createuser', sdp: offer }));
          }
      
        setPC(peerConnection);

    }
    const getCameraState = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setLocalstream(stream);
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error("Error accessing media devices.", error);
        }
      };
    return (
        <div>
      <h2>Sender</h2>
      <button onClick={initilizeConnection}>Start Connection</button>
      <video
        ref={userVideoRef}
        autoPlay
        style={{ width: '300px', height: '300px' }}
      />
    </div>
    )
}