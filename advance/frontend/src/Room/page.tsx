import { useEffect, useRef, useState } from "react";

export const Room = ({ meetingId }: { meetingId: string }) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
    const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080");

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "joinMeeting", meetId: meetingId }));
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "newParticipant") {
                createPeerConnection(message.participantId);
            } else if (["offer", "answer", "iceCandidate"].includes(message.type)) {
                handleSignaling(message);
            }
        };

        setSocket(ws);
        return () => ws.close();
    }, [meetingId]);

    useEffect(() => {
        const startLocalVideo = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        };

        startLocalVideo();
    }, []);

    const createPeerConnection = async (participantId: string) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate, participantId }));
            }
        };

        pc.ontrack = (event) => {
            const [stream] = event.streams;
            if (remoteVideosRef.current.has(participantId)) {
                const videoElement = remoteVideosRef.current.get(participantId);
                if (videoElement) videoElement.srcObject = stream;
            }
        };

        setPeerConnections((prev) => new Map(prev.set(participantId, pc)));
        return pc;
    };

    const handleSignaling = async (message: any) => {
        const { type, participantId, ...data } = message;
        const pc = peerConnections.get(participantId) || (await createPeerConnection(participantId));

        if (type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket?.send(JSON.stringify({ type: "answer", answer, participantId }));
        } else if (type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (type === "iceCandidate") {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    };

    return (
        <div>
            <h2>Room: {meetingId}</h2>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "300px" }} />

            {Array.from(remoteVideosRef.current.entries()).map(([id, videoRef]) => (
                <video key={id} ref={(el) => el && remoteVideosRef.current.set(id, el)} autoPlay playsInline style={{ width: "300px" }} />
            ))}
        </div>
    );
};
