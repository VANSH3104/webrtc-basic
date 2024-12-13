import React, { useState, useRef } from 'react';
import { createWebSocket, createPeerConnection } from './utils/rtcutils';
import { useNavigate } from 'react-router-dom';

export const Receiver: React.FC = () => {
  const navigate = useNavigate()
  const [meetingCode, setMeetingCode] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<WebSocket | null>(null);

  const joinMeeting = () => {
    socket.current = createWebSocket('ws://localhost:3000');
    peerConnection.current = createPeerConnection();

    socket.current.onopen = () => {
      console.log('WebSocket connection established.');
      socket.current?.send(
        JSON.stringify({
          type: 'join-meeting',
          code: meetingCode,
        })
      );
    };

    const setupLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        stream.getTracks().forEach((track) =>
          peerConnection.current?.addTrack(track, stream)
        );
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    setupLocalStream();

    socket.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      const { type, data, candidate } = message;

      switch (type) {
        case 'signal':
          if (data?.sdp) {
            await peerConnection.current?.setRemoteDescription(
              new RTCSessionDescription(data.sdp)
            );
            if (data.sdp.type === 'offer') {
              const answer = await peerConnection.current?.createAnswer();
              if (answer) {
                await peerConnection.current?.setLocalDescription(answer);
                socket.current?.send(
                  JSON.stringify({
                    type: 'signal',
                    code: meetingCode,
                    data: { sdp: answer },
                  })
                );
              }
            }
          }
          break;
        case 'ice-candidate':
          if (candidate) {
            const iceCandidate = new RTCIceCandidate(candidate);
            try {
              await peerConnection.current?.addIceCandidate(iceCandidate);
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          }
          break;
        default:
          console.error(`Unknown message type: ${type}`);
      }
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current?.send(
          JSON.stringify({
            type: 'ice-candidate',
            code: meetingCode,
            candidate: event.candidate,
          })
        );
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
      }
    };
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      joinMeeting();
      navigate(`/room/${meetingCode}`);
    }
  };
  return (
    <div>
      <h1>Receiver</h1>
      <input
        type="text"
        placeholder="Enter Meeting Code"
        value={meetingCode}
        onChange={(e) => setMeetingCode(e.target.value)}
      />
      <button onClick={handleSubmit}>Join Meeting</button>
      <video ref={videoRef} autoPlay playsInline />
    </div>
  );
};
