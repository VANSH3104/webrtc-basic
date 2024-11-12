// Receiver.tsx
import React, { useState, useRef } from 'react';
import { createWebSocket, createPeerConnection } from './utils/rtcutils';

export const Receiver: React.FC = () => {
  const [meetingId, setMeetingId] = useState<string>('');
  const [passcode] = useState<string>('12345'); // Static passcode for simplicity
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<WebSocket | null>(null);

  const joinMeeting = () => {
    socket.current = createWebSocket('ws://localhost:8080');
    peerConnection.current = createPeerConnection();

    socket.current.onopen = () => {
      socket.current?.send(JSON.stringify({
        type: 'joinMeeting',
        meetingId,
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
        case 'offer':
          { await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(message.sdp));
          const answer = await peerConnection.current?.createAnswer();
          if (answer) {
            await peerConnection.current?.setLocalDescription(answer);
            socket.current?.send(JSON.stringify({ type: 'answer', meetingId, sdp: answer }));
          }
          break; }
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
  };

  return (
    <div>
      <h1>Receiver</h1>
      <input
        type="text"
        placeholder="Enter Meeting ID"
        onChange={(e) => setMeetingId(e.target.value)}
      />
      <button onClick={joinMeeting}>Join Meeting</button>
      <video ref={videoRef} autoPlay playsInline muted />
    </div>
  );
};
