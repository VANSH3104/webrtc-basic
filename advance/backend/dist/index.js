"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const meetings = new Map();
const wss = new ws_1.WebSocketServer({ port: 8080 });
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
            case "disconnectSender":
                handleDisconnectSender(message.meetingId);
                break;
            default:
                console.error("Unknown message type:", message.type);
        }
    });
    ws.on("close", () => {
        console.log("A participant disconnected");
        cleanupConnections(ws);
    });
});
function handleCreateMeeting(ws, message) {
    const { meetingId, passcode } = message;
    if (meetings.has(meetingId)) {
        ws.send(JSON.stringify({ type: "error", message: "Meeting ID already exists" }));
    }
    else {
        meetings.set(meetingId, { passcode, sender: null, receivers: [] });
        ws.send(JSON.stringify({ type: "meetingCreated", meetingId }));
        console.log(`Meeting created with ID: ${meetingId}`);
    }
}
function handleJoinMeeting(ws, message) {
    const { meetingId, passcode, senderName } = message;
    const meeting = meetings.get(meetingId);
    if (!meeting) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid meeting ID" }));
        return;
    }
    if (meeting.passcode !== passcode) {
        ws.send(JSON.stringify({ type: "error", message: "Incorrect passcode" }));
        return;
    }
    if (!meeting.sender) {
        meeting.sender = ws;
        notifyParticipants(meetingId, {
            type: "participantList",
            participants: getParticipants(meeting),
        });
        ws.send(JSON.stringify({
            type: "meetingJoined",
            message: "You joined as the sender",
        }));
    }
    else {
        meeting.receivers.push(ws);
        notifyParticipants(meetingId, {
            type: "participantList",
            participants: getParticipants(meeting),
        });
        ws.send(JSON.stringify({
            type: "meetingJoined",
            message: "You joined as a receiver",
        }));
    }
}
function handleSignaling(ws, message) {
    const { meetingId } = message;
    const meeting = meetings.get(meetingId);
    if (meeting) {
        const participants = [meeting.sender, ...meeting.receivers].filter(Boolean);
        participants.forEach((participant) => {
            if (participant !== ws) {
                participant.send(JSON.stringify(message));
            }
        });
    }
}
function handleDisconnectSender(meetingId) {
    const meeting = meetings.get(meetingId);
    if (meeting) {
        meeting.sender = null;
        notifyParticipants(meetingId, {
            type: "participantList",
            participants: getParticipants(meeting),
        });
    }
}
function notifyParticipants(meetingId, message) {
    const meeting = meetings.get(meetingId);
    if (meeting) {
        const participants = [meeting.sender, ...meeting.receivers].filter(Boolean);
        participants.forEach((participant) => {
            participant.send(JSON.stringify(message));
        });
    }
}
function cleanupConnections(ws) {
    for (const [meetingId, meeting] of meetings.entries()) {
        if (meeting.sender === ws) {
            meeting.sender = null;
        }
        meeting.receivers = meeting.receivers.filter((receiver) => receiver !== ws);
        if (!meeting.sender && meeting.receivers.length === 0) {
            meetings.delete(meetingId);
        }
        else {
            notifyParticipants(meetingId, {
                type: "participantList",
                participants: getParticipants(meeting),
            });
        }
    }
}
function getParticipants(meeting) {
    const senderParticipant = meeting.sender
        ? { id: "sender", name: "Sender", role: "sender" }
        : null;
    const receiverParticipants = meeting.receivers.map((receiver, index) => ({
        id: `receiver-${index}`,
        name: `Receiver ${index + 1}`,
        role: "receiver",
    }));
    return senderParticipant
        ? [senderParticipant, ...receiverParticipants]
        : receiverParticipants;
}
console.log("WebSocket server started on ws://localhost:8080");
