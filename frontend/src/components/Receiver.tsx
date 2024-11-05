import { useEffect, useRef, useState } from "react";

export const Receiver = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isVideoStarted, setIsVideoStarted] = useState(false);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            console.log("Receiver connected to server");
            socket.send(JSON.stringify({ type: "receiver" }));
        };

        let pc: RTCPeerConnection;

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message:", message);

            if (message.type === 'createOffer') {
                pc = new RTCPeerConnection();

                pc.ontrack = (event) => {
                    console.log("Track received:", event);

                    if (videoRef.current && event.streams[0]) {
                        videoRef.current.srcObject = event.streams[0];
                        console.log("Stream assigned to video element:", event.streams[0]);
                    }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
                console.log("Set remote description from sender");

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log("Created answer");

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log("Sending ICE candidate:", event.candidate);
                        socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
                    }
                };

                socket.send(JSON.stringify({ type: "createAnswer", sdp: pc.localDescription }));
            } else if (message.type === 'iceCandidate') {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                    console.log("Added ICE candidate from sender");
                } catch (err) {
                    console.error("Error adding ICE candidate:", err);
                }
            }
        };

        return () => {
            socket.close();
            pc?.close();
        };
    }, []);

    const handleStartVideo = () => {
        setIsVideoStarted(true);
        videoRef.current?.play().catch(err => {
            console.error("Error playing video:", err);
        });
    };

    return (
        <div>
            <h2>Receiver</h2>
            <video ref={videoRef} autoPlay playsInline muted={!isVideoStarted} style={{ width: "300px", marginTop: "10px" }} />
            {!isVideoStarted && (
                <button onClick={handleStartVideo} style={{ marginTop: "10px" }}>Start Video</button>
            )}
        </div>
    );
};
