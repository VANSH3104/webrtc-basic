import React, { useState, useRef } from 'react';
import { createWebSocket, createPeerConnection } from './utils/rtcutils';
import { useNavigate } from 'react-router-dom';

export const Sender: React.FC = () => {
  const navigate = useNavigate();
  const socket = useRef<WebSocket | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [meetingCode, setMeetingCode] = useState<string>('');

  const createMeeting = () => {
    socket.current = createWebSocket('ws://localhost:3000');
    peerConnection.current = createPeerConnection();

    socket.current.onopen = () => {
      console.log('WebSocket connection established.');
      socket.current?.send(
        JSON.stringify({
          type: 'create-meeting',
          code: meetingCode,
        })
      );
    };

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
      console.log('Track received:', event.streams);
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      createMeeting();
      navigate(`/room/${meetingCode}`);
    }
  };

  return (
    <div>
      <h1>Create a meeting</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Meeting Code:
          <input
            type="text"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            required
          />
        </label>
        <button type="submit">Join/Create Meeting</button>
      </form>
    </div>
  );
};
