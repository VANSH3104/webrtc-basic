import { useEffect, useRef, useState } from "react";

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [pc, setPC] = useState<RTCPeerConnection | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const userVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        setSocket(socket);

        socket.onopen = () => {
            console.log("Connection of sender successful");
            socket.send(JSON.stringify({ type: 'sender' }));
        };

        socket.onmessage = async (event) => {
            console.log("Message received from server:", event.data);
            const message = JSON.parse(event.data);
            if (message.type === 'createAnswer') {
                console.log("Creating answer with received SDP:", message.sdp);
                await pc?.setRemoteDescription(new RTCSessionDescription(message.sdp));
            } else if (message.type === 'iceCandidate') {
                console.log("Received ICE candidate from server:", message.candidate);
                await pc?.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed.");
        };

        return () => {
            socket.close();
        };
    }, []);

    const initializeConnection = async () => {
        console.log("Initializing connection...");
        await getCameraState();
        if (!pc) {
            await createPeerConnection();
        } else {
            console.log("Peer connection already exists.");
        }
    };

    const createPeerConnection = async (remoteSdp?: RTCSessionDescriptionInit) => {
        console.log("Creating peer connection...");
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' } // Google STUN server
            ]
        });

        if (localStream) {
            localStream.getTracks().forEach(track => {
                console.log("Adding local track:", track);
                peerConnection.addTrack(track, localStream);
            });
        } else {
            console.warn("No local stream available to add tracks.");
        }

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("New ICE candidate generated:", event.candidate);
                socket?.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }));
            } else {
                console.log("All ICE candidates have been sent.");
            }
        };

        peerConnection.ontrack = (event) => {
            console.log("Track received from remote:", event);
            const remoteVideo = document.createElement('video');
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.play();
            document.body.appendChild(remoteVideo);
        };

        if (remoteSdp) {
            console.log("Setting remote SDP:", remoteSdp);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteSdp));
        } else {
            const offer = await peerConnection.createOffer();
            console.log("Creating offer:", offer);
            await peerConnection.setLocalDescription(offer);
            socket?.send(JSON.stringify({ type: 'createOffer', sdp: offer }));
        }

        setPC(peerConnection);
    };

    const getCameraState = async () => {
        console.log("Attempting to access media devices...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log("Media stream obtained:", stream);
            setLocalStream(stream);
            if (userVideoRef.current) {
                userVideoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    };

    return (
        <div>
            <h2>Sender</h2>
            <button onClick={initializeConnection}>Start Connection</button>
            <video ref={userVideoRef} autoPlay style={{ width: '300px', height: '300px' }} />
        </div>
    );
};
