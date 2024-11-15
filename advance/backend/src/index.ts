import WebSocket, { WebSocketServer } from "ws";

interface Meeting {
  passcode: string;
  participants: WebSocket[];
}

// Store meetings with their IDs, passcodes, and participants
const meetings = new Map<string, Meeting>();

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");

  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case "createMeeting":
        handleCreateMeeting(ws, message);
        break;
      case "joinMeeting":
        handleJoinMeeting(ws, message);
        break;
      case "offer":
      case "answer":
      case "iceCandidate":
        handleSignaling(ws, message);
        break;
      case "receiver":
        handleReceiver(ws, message); // Handle receiver message
        break;
      default:
        console.error("Unknown message type:", message.type);
    }
  });

  ws.on("close", () => {
    console.log("A participant disconnected");
    for (const [meetingId, meeting] of meetings.entries()) {
      meeting.participants = meeting.participants.filter((p) => p !== ws);
      if (meeting.participants.length === 0) {
        meetings.delete(meetingId);
        console.log(`Meeting ${meetingId} deleted`);
      }
    }
  });
});

function handleCreateMeeting(ws: WebSocket, message: any) {
  const { meetingId, passcode } = message;
  if (meetings.has(meetingId)) {
    ws.send(JSON.stringify({ type: "error", message: "Meeting ID already exists" }));
  } else {
    meetings.set(meetingId, { passcode, participants: [ws] });
    ws.send(JSON.stringify({ type: "meetingCreated", meetingId }));
    console.log(`Meeting created with ID: ${meetingId}`);
  }
}

function handleJoinMeeting(ws: WebSocket, message: any) {
  const { meetingId, passcode } = message;
  const meeting = meetings.get(meetingId);
  if (!meeting) {
    ws.send(JSON.stringify({ type: "error", message: "Invalid meeting ID" }));
  } else if (meeting.passcode !== passcode) {
    ws.send(JSON.stringify({ type: "error", message: "Incorrect passcode" }));
  } else {
    meeting.participants.push(ws);
    ws.send(JSON.stringify({ type: "meetingJoined", meetingId }));
    notifyParticipants(meetingId, { type: "newParticipant", meetingId });
  }
}

function handleSignaling(ws: WebSocket, message: any) {
  const { meetingId } = message;
  const meeting = meetings.get(meetingId);
  if (meeting) {
    meeting.participants.forEach((participant) => {
      if (participant !== ws) {
        participant.send(JSON.stringify(message));
      }
    });
  }
}
function handleReceiver(ws: WebSocket, message: any) {
  console.log("Receiver message received:", message);

  ws.send(JSON.stringify({ type: "receiverAcknowledged" }));

  const meetingId = message.meetingId;
  notifyParticipants(meetingId, { type: "newReceiver", meetingId });
}

function notifyParticipants(meetingId: string, message: object) {
  const meeting = meetings.get(meetingId);
  if (meeting) {
    meeting.participants.forEach((participant) => {
      participant.send(JSON.stringify(message));
    });
  }
}
