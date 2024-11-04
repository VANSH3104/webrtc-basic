import { useEffect } from "react";

export const Receiver = () => {
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
                pc.ontrack = (event) => {
                    console.log("Track received:", event.track);
                    
                    // Create a video element for the received track
                    const video = document.createElement('video');
                    video.autoplay = true; // Ensure the video plays automatically
                    video.style.width = '100%'; // Make the video responsive
                    video.style.height = 'auto';

                    // Create a MediaStream and attach the track
                    const mediaStream = new MediaStream([event.track]);
                    video.srcObject = mediaStream;

                    // Append the video to the body or a specific container
                    document.body.appendChild(video);
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
        </div>
    );
};
