import { useEffect, useState } from "react";

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: "sender" }));
        };

        setSocket(socket);

        return () => {
            socket.close();
        };
    }, []);

    const startSendVideo = async () => {
        if (!socket) return;

        const pc = new RTCPeerConnection();

        pc.onnegotiationneeded = async () => {
            console.log("on negotiation");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.send(JSON.stringify({ type: 'createOffer', sdp: pc.localDescription }));
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
            }
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "createAnswer") {
                pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === "iceCandidate") {
                pc.addIceCandidate(new RTCIceCandidate(data.candidate))
                    .catch(err => console.error("Error adding ICE candidate:", err));
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
    };

    return (
        <div>
            <h2>Sender</h2>
            <button onClick={startSendVideo}>Send Video</button>
        </div>
    );
};
