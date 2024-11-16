import { useEffect, useState, useRef } from "react";

export const Room = () => {
  const [peerConnections, setPeerConnections] = useState<RTCPeerConnection[]>([]);
  const [streams, setStreams] = useState<MediaStream[]>([]); // Store streams for each sender

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]); // Ref array for all video elements

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
      console.log("Receiver connected to server");
      socket.send(JSON.stringify({ type: "receiver" }));
    };

    // Handle incoming messages
    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);

      if (message.type === 'createOffer') {
        const pc = new RTCPeerConnection();

        pc.ontrack = (event) => {
          console.log("Track received:", event);
          if (event.streams[0]) {
            // Add the stream for this sender
            setStreams((prevStreams) => [...prevStreams, event.streams[0]]);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        console.log("Set remote description from sender");

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("Created answer");

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Sending ICE candidate:", event.candidate);
            socket.send(JSON.stringify({ type: "iceCandidate", candidate: event.candidate }));
          }
        };

        socket.send(JSON.stringify({ type: "createAnswer", sdp: pc.localDescription }));
        setPeerConnections((prev) => [...prev, pc]);
      } else if (message.type === 'iceCandidate') {
        // Handle ICE candidate for a peer connection
        const pc = peerConnections.find((p) => p.remoteDescription?.type === 'offer');
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            console.log("Added ICE candidate from sender");
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        }
      }
    };

    return () => {
      socket.close();
      // Close all peer connections when the component is unmounted
      peerConnections.forEach((pc) => pc.close());
    };
  }, [peerConnections]);

  const handleStartVideo = () => {
    // Play all video streams using the ref array
    streams.forEach((stream, index) => {
      const videoElement = videoRefs.current[index];
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play().catch((err) => console.error("Error playing video:", err));
      }
    });
  };

  return (
    <div>
      <h2>Receiver</h2>
      {streams.length > 0 ? (
        streams.map((stream, index) => (
          <div key={index} style={{ marginBottom: "10px" }}>
            <video
              ref={(el) => (videoRefs.current[index] = el)} // Assigning refs dynamically to video elements
              autoPlay
              playsInline
              style={{ width: "300px", marginTop: "10px" }}
            />
          </div>
        ))
      ) : (
        <p>No video streams available</p>
      )}
      {streams.length === 0 && (
        <button onClick={handleStartVideo} style={{ marginTop: "10px" }}>
          Start Video
        </button>
      )}
    </div>
  );
};
