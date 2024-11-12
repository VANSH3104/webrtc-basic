export const createWebSocket = (url: string) => {
    const socket = new WebSocket(url);
    return socket;
  };
  
  export const createPeerConnection = () => {
    const config = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    };
    const peerConnection = new RTCPeerConnection(config);
    return peerConnection;
  };
  