import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { createPeerConnection } from './utils/rtcutils';

interface PeerConnectionMap {
  [key: string]: RTCPeerConnection;
}

interface SocketMessage {
  type: string;
  clientId: string;
  data?: {
    sdp: RTCSessionDescriptionInit;
  };
  candidate?: RTCIceCandidateInit;
}

export const Room: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  console.log(meetingCode , "vansh meeting")
  const [participants, setParticipants] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const peerConnections = useRef<PeerConnectionMap>({});
  const socket = useRef<WebSocket | null>(null);

  const handleNewParticipant = useCallback(async (clientId: string) => {
    const pc = createPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current?.send(
          JSON.stringify({
            type: 'ice-candidate',
            code: meetingCode,
            candidate: event.candidate,
            clientId,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      setParticipants((prev) => ({
        ...prev,
        [clientId]: event.streams[0],
      }));
    };

    peerConnections.current[clientId] = pc;

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.current?.send(
      JSON.stringify({
        type: 'signal',
        code: meetingCode,
        clientId,
        data: { sdp: offer },
      })
    );
  }, [meetingCode, localStream]);

  const handleSignal = useCallback(async (clientId: string, data: { sdp: RTCSessionDescriptionInit }) => {
    const pc = peerConnections.current[clientId];
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

    if (data.sdp.type === 'offer') {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.current?.send(
        JSON.stringify({
          type: 'signal',
          code: meetingCode,
          clientId,
          data: { sdp: answer },
        })
      );
    }
  }, [meetingCode]);

  const setupLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      setParticipants((prev) => ({ ...prev, local: stream }));
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  useEffect(() => {
    const initWebSocket = () => {
      socket.current = new WebSocket('ws://localhost:3000');

      socket.current.onopen = () => {
        console.log('WebSocket connection established.');
        socket.current?.send(
          JSON.stringify({
            type: 'join-meeting',
            code: meetingCode,
          })
        );
      };

      socket.current.onmessage = async (event) => {
        const message: SocketMessage = JSON.parse(event.data);
        const { type, clientId, data, candidate } = message;

        switch (type) {
          case 'new-participant':
            await handleNewParticipant(clientId);
            break;
          case 'signal':
            await handleSignal(clientId, data as { sdp: RTCSessionDescriptionInit });
            break;
          case 'ice-candidate':
            await handleIceCandidate(clientId, candidate);
            break;
          case 'participant-left':
            handleParticipantLeft(clientId);
            break;
          default:
            console.error(`Unknown message type: ${type}`);
        }
      };
    };

    setupLocalStream();
    initWebSocket();

    return () => {
      // Copy peerConnections.current to a variable before cleanup
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentPeerConnections = { ...peerConnections.current };

      Object.values(currentPeerConnections).forEach((pc) => pc.close());
      socket.current?.close();
    };

  }, [meetingCode, localStream, handleNewParticipant, handleSignal]);

  const handleIceCandidate = async (clientId: string, candidate: RTCIceCandidateInit | undefined) => {
    const pc = peerConnections.current[clientId];
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const handleParticipantLeft = (clientId: string) => {
    if (peerConnections.current[clientId]) {
      peerConnections.current[clientId].close();
      delete peerConnections.current[clientId];
    }

    setParticipants((prev) => {
      const updated = { ...prev };
      delete updated[clientId];
      return updated;
    });
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !audioEnabled));
      setAudioEnabled((prev) => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = !videoEnabled));
      setVideoEnabled((prev) => !prev);
    }
  };

  return (
    <div className="p-4 bg-gray-100 h-screen">
      <h1 className="text-2xl font-bold mb-4">Room: {meetingCode}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(participants).map(([id, stream]) => (
          <div key={id} className="relative">
            <video
              ref={(video) => {
                if (video) video.srcObject = stream;
              }}
              autoPlay
              playsInline
              className="w-full h-auto rounded shadow"
            />
            <p className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 rounded">
              {id === 'local' ? 'You' : `Participant: ${id}`}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-x-4">
        <button
          onClick={toggleAudio}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {audioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button
          onClick={toggleVideo}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {videoEnabled ? 'Stop Video' : 'Start Video'}
        </button>
      </div>
    </div>
  );
};
