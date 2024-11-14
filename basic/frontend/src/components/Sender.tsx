import { useEffect, useRef, useState } from "react";

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null); // Reference for the local video element

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            console.log("Sender connected to server");
            socket.send(JSON.stringify({ type: "createMeeting" }));
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        setSocket(socket);

        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, []);

    const startSendVideo = async () => {
        if (!socket) return;

        const pc = new RTCPeerConnection();

        pc.onnegotiationneeded = async () => {
            console.log("Negotiation needed");
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.send(JSON.stringify({ type: 'createOffer', sdp: pc.localDescription }));
            } catch (error) {
                console.error("Error during negotiation:", error);
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Sending ICE candidate");
                socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
            }
        };

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "createAnswer") {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                console.log("Received answer from receiver");
            } else if (data.type === "iceCandidate") {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log("Received ICE candidate from receiver");
            }
        };

        try {
            // Capture video and audio from webcam
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            // Display the local video stream in the video element
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // Add tracks to the peer connection
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            console.log("Tracks added to peer connection");
            console.log(stream)

        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    };

    return (
        <div>
            <h2>Sender</h2>
            <button onClick={startSendVideo}>Send Video</button>
            <video ref={videoRef} autoPlay playsInline style={{ width: "300px", marginTop: "10px" }} />
        </div>
    );
};