import { useEffect, useRef, useState } from "react";

export const Receiver = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [pc, setPC] = useState<RTCPeerConnection | null>(null);
    const partnerVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');
        setSocket(socket);

        socket.onopen = () => {
            console.log('WebSocket connection established for receiver.');
            socket.send(JSON.stringify({ type: 'receiver' }));
        };

        // Start receiving messages after connection is opened
        startReceiving(socket);

        return () => {
            socket.close();
        };
    }, []);

    function startReceiving(socket: WebSocket) {
        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            console.log('Receiver received message:', message);

            if (message.type === 'createOffer') {
                await createPeerConnection(message.sdp);
            } else if (message.type === 'createAnswer') {
                console.log('Setting remote description with answer:', message.sdp);
                await pc?.setRemoteDescription(new RTCSessionDescription(message.sdp));
            } else if (message.type === 'iceCandidate') {
                console.log('Adding ICE candidate:', message.candidate);
                await pc?.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        };
    }

    const createPeerConnection = async (remoteSdp?: RTCSessionDescriptionInit) => {
        const peerConnection = new RTCPeerConnection();

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate);
                socket?.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }));
            }
        };

        peerConnection.ontrack = (event) => {
            if (partnerVideoRef.current) {
                partnerVideoRef.current.srcObject = event.streams[0];
                partnerVideoRef.current.play();
            }
        };

        if (remoteSdp) {
            console.log('Setting remote description with offer:', remoteSdp);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteSdp));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket?.send(JSON.stringify({ type: 'createAnswer', sdp: answer }));
        }

        setPC(peerConnection);
    };

    return (
        <div>
            <h2>Receiver</h2>
            <video ref={partnerVideoRef} autoPlay style={{ width: '300px', height: '300px' }} />
        </div>
    );
};
