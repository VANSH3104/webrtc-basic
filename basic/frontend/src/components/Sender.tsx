import { useEffect, useRef, useState } from "react";

export const Sender = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null); // Reference for the local video element
    const [stream, setStream] = useState<MediaStream | null>(null); // Local media stream

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            console.log("Sender connected to server");
            socket.send(JSON.stringify({ type: "sender" }));
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        setSocket(socket);

        return () => {
            if (socket) {
                socket.close();
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
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
            const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(userMediaStream);

            // Display the local video stream in the video element
            if (videoRef.current) {
                videoRef.current.srcObject = userMediaStream;
                await videoRef.current.play();
            }

            // Add tracks to the peer connection
            userMediaStream.getTracks().forEach(track => pc.addTrack(track, userMediaStream));
            console.log("Tracks added to peer connection");

        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    };

    const handleScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setStream(screenStream);

            // Replace video track with screen share track
            if (stream && videoRef.current) {
                const videoTrack = screenStream.getVideoTracks()[0];
                const sender = videoRef.current.srcObject?.getTracks().find(track => track.kind === 'video');
                if (sender) {
                    const senderTrack = sender as MediaStreamTrack;
                    senderTrack.stop();
                    videoRef.current.srcObject = screenStream;
                }
            }
        } catch (error) {
            console.error("Error starting screen share:", error);
        }
    };

    const toggleMuteAudio = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !isMuted;
                setIsMuted(!isMuted);
            }
        }
    };

    const toggleMuteVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !isVideoMuted;
                setIsVideoMuted(!isVideoMuted);
            }
        }
    };

    return (
        <div>
            <h2>Sender</h2>
            <button onClick={startSendVideo}>Send Video</button>
            <button onClick={handleScreenShare}>Start Screen Share</button>
            <button onClick={toggleMuteAudio}>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</button>
            <button onClick={toggleMuteVideo}>{isVideoMuted ? 'Unmute Video' : 'Mute Video'}</button>
            <video ref={videoRef} autoPlay playsInline style={{ width: "300px", marginTop: "10px" }} />
        </div>
    );
};
