// Sender.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createWebSocket, createPeerConnection } from './utils/rtcutils';

export const Sender: React.FC = () => {
  const [meetingId, setMeetingId] = useState<string>('');
  const [passcode] = useState<string>('12345'); // Static passcode for simplicity
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Generate a unique meeting ID
    const id = Math.random().toString(36).substring(2, 10);
    setMeetingId(id);

    // Initialize WebSocket and PeerConnection
    socket.current = createWebSocket('ws://localhost:8080');
    peerConnection.current = createPeerConnection();

    socket.current.onopen = () => {
      socket.current?.send(JSON.stringify({
        type: 'createMeeting',
        meetingId: id,
        passcode,
      }));
    };

    const setupLocalStream = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => peerConnection.current?.addTrack(track, stream));
      if (videoRef.current) videoRef.current.srcObject = stream;
    };

    setupLocalStream();

    socket.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'joinMeeting':
          { const offer = await peerConnection.current?.createOffer();
          if (offer) {
            await peerConnection.current?.setLocalDescription(offer);
            socket.current?.send(JSON.stringify({ type: 'offer', meetingId, sdp: offer }));
          }
          break; }
        case 'answer':
          await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(message.sdp));
          break;
        case 'iceCandidate':
          { const candidate = new RTCIceCandidate(message.candidate);
          await peerConnection.current?.addIceCandidate(candidate);
          break; }
      }
    };

    peerConnection.current.onicecandidate = event => {
      if (event.candidate) {
        socket.current?.send(JSON.stringify({ type: 'iceCandidate', meetingId, candidate: event.candidate }));
      }
    };
  }, []);

  return (
    <div>
      <h1>Sender</h1>
      <p>Meeting ID: {meetingId}</p>
      <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
};

