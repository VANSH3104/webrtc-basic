import { useEffect, useRef } from "react";

export const Receiver = () => {
    const videoRef = useRef<HTMLVideoElement>(null); 
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: "receiver" }));
        };

        let pc: RTCPeerConnection;

        socket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'createOffer') {
                pc = new RTCPeerConnection();

                await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                // Handler for incoming tracks
                pc.ontrack = async(event) => {
                    console.log(event , "event")
                    if (videoRef.current) {
                        videoRef.current.srcObject = new MediaStream([event.track]);
                        await videoRef.current.play();
                    }
                };
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
                    }
                };

                socket.send(JSON.stringify({ type: "createAnswer", sdp: pc.localDescription }));
            } else if (message.type === 'iceCandidate') {
                pc?.addIceCandidate(new RTCIceCandidate(message.candidate))
                    .catch(err => console.error("Error adding ICE candidate:", err));
            }
        };

        // Cleanup on unmount
        return () => {
            socket.close();
            pc?.close();
        };
    }, []);

    return (
        <div>
            <h2>Receiver</h2>
            <video ref={videoRef} autoPlay playsInline style={{ width: "300px", marginTop: "10px" }} />
        </div>
    );
};
