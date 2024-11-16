import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createWebSocket, createPeerConnection } from './utils/rtcutils';

export const Sender: React.FC = () => {
  const [meetingId, setMeetingId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isVideoOn, setIsVideoOn] = useState<boolean>(false);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Ref to hold the media stream

  useEffect(() => {
    const id = Math.random().toString(36).substring(2, 10);
    setMeetingId(id);

    socket.current = createWebSocket('ws://localhost:8080');

    socket.current.onopen = () => {
      socket.current?.send(JSON.stringify({
        type: 'createMeeting',
        meetingId: id,
        passcode: id,
      }));
    };

    socket.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'joinMeeting':
          { 
            const offer = await peerConnection.current?.createOffer();
            if (offer) {
              await peerConnection.current?.setLocalDescription(offer);
              socket.current?.send(JSON.stringify({ type: 'offer', meetingId, sdp: offer }));
            }
          }
          break;
        case 'answer':
          await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(message.sdp));
          break;
        case 'iceCandidate':
          { 
            const candidate = new RTCIceCandidate(message.candidate);
            await peerConnection.current?.addIceCandidate(candidate);
          }
          break;
      }
    };

    return () => {
      socket.current?.close();
    };
  }, []);

  // Toggle Video
  // Toggle Video
const toggleVideo = useCallback(() => {
  setIsVideoOn((prev) => {
    const newVideoState = !prev;
    if (newVideoState) {
      // If video is being turned on
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((videoStream) => {
          const videoTrack = videoStream.getVideoTracks()[0];
          if (videoTrack) {
            streamRef.current?.addTrack(videoTrack);
            peerConnection.current?.addTrack(videoTrack, streamRef.current!);
            if (videoRef.current) {
              videoRef.current.srcObject = streamRef.current;
            }
          }
        })
        .catch((error) => console.error("Error accessing video:", error));
    } else {
      // If video is being turned off
      const videoTrack = streamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop(); // Stop video track
        streamRef.current?.removeTrack(videoTrack);
      }
    }
    return newVideoState;
  });
}, []);

// Toggle Audio
const toggleAudio = useCallback(() => {
  setIsAudioOn((prev) => {
    const newAudioState = !prev;
    if (newAudioState) {
      // If audio is being turned on
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((audioStream) => {
          const audioTrack = audioStream.getAudioTracks()[0];
          if (audioTrack) {
            streamRef.current?.addTrack(audioTrack);
            peerConnection.current?.addTrack(audioTrack, streamRef.current!);
          }
        })
        .catch((error) => console.error("Error accessing audio:", error));
    } else {
      // If audio is being turned off
      const audioTrack = streamRef.current?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.stop(); // Stop audio track
        streamRef.current?.removeTrack(audioTrack);
      }
    }
    return newAudioState;
  });
}, []);

  // Handle media stream setup
  useMemo(() => {
    const startStream = async () => {
      if (!peerConnection.current) return;

      try {
        // Get the stream with both video and audio enabled based on toggles
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoOn,
          audio: isAudioOn ? true : false 
        });

        streamRef.current = stream; // Store the media stream in ref

        // Add video and audio tracks to peer connection
        stream.getTracks().forEach(track => {
          peerConnection.current?.addTrack(track, stream);
        });

        // Set video element's source
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    if (isStreaming) {
      startStream();
    }
  }, [isVideoOn, isAudioOn, isStreaming]);

  // Start sending video (stream)
  const startSendVideo = async () => {
    if (!socket.current || !videoRef.current) return;

    peerConnection.current = createPeerConnection();
    const pc = peerConnection.current;

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.current?.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current?.send(JSON.stringify({ type: "iceCandidate", meetingId, candidate: event.candidate }));
      }
    };

    setIsStreaming(true);
  };

  return (
    <div>
      <h1>Sender</h1>
      <input onChange={(e) => setName(e.target.value)} placeholder='Enter your name' />
      <p>Meeting ID: {meetingId}</p>
      <button onClick={startSendVideo} disabled={isStreaming}>Start Streaming</button>
      {isVideoOn && (
        <video
          className={`${isVideoOn ? '' : 'hidden'}`}
          ref={videoRef}
          autoPlay
          playsInline
          typeof='video/webm'
          style={{ width: "300px", marginTop: "10px" }}
        />
      )}
      <button onClick={toggleVideo}>
        {isVideoOn ? "Disable Video" : "Enable Video"}
      </button>
      <button onClick={toggleAudio}>
        {isAudioOn ? "Disable Audio" : "Enable Audio"}
      </button>
    </div>
  );
};
