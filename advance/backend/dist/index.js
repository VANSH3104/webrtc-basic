"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const server = new ws_1.WebSocketServer({ port: 3000 });
const clients = new Map();
const meetings = new Map();
server.on("connection", (socket) => {
    console.log("WebSocket server running on ws://localhost:3000");
    const clientId = generateUniqueId();
    clients.set(clientId, socket);
    socket.on("message", (data) => {
        const message = JSON.parse(data);
        const { type } = message;
        switch (type) {
            case "create-meeting":
                createMeeting(message.code, clientId);
                break;
            case "join-meeting":
                joinMeeting(message.code, clientId);
                break;
            case "signal":
                handleSignal(message, clientId);
                break;
            case "ice-candidate":
                handleIce(message, clientId);
                break;
            case "leave-meeting":
                leaveMeeting(clientId);
                break;
            default:
                console.error(`Unknown message type: ${type}`);
        }
    });
    socket.on("close", () => {
        leaveMeeting(clientId);
        clients.delete(clientId);
    });
});
function createMeeting(code, clientId) {
    if (!meetings.has(code)) {
        meetings.set(code, new Set());
        console.log(`Meeting ${code} created by ${clientId}.`);
    }
    joinMeeting(code, clientId);
}
function joinMeeting(code, clientId) {
    const meeting = meetings.get(code);
    if (meeting) {
        meeting.add(clientId);
        broadcastToMeeting(code, { type: "new-participant", clientId }, clientId);
        console.log(`Client ${clientId} joined meeting ${code}.`);
    }
    else {
        console.error(`Meeting ${code} does not exist.`);
    }
}
function handleSignal(message, senderId) {
    const { code, data } = message;
    broadcastToMeeting(code, { type: "signal", senderId, data }, senderId);
}
function handleIce(message, senderId) {
    const { code, candidate } = message;
    broadcastToMeeting(code, { type: "ice-candidate", senderId, candidate }, senderId);
}
function leaveMeeting(clientId) {
    for (const [code, meeting] of meetings) {
        if (meeting.has(clientId)) {
            meeting.delete(clientId);
            broadcastToMeeting(code, { type: "participant-left", clientId });
            console.log(`Client ${clientId} has left.`);
            if (meeting.size === 0) {
                meetings.delete(code);
                console.log(`Meeting ${code} closed.`);
            }
            break;
        }
    }
}
function broadcastToMeeting(code, message, senderId) {
    const meeting = meetings.get(code);
    if (meeting) {
        for (const clientId of meeting) {
            if (clientId !== senderId) {
                const clientSocket = clients.get(clientId);
                if (clientSocket) {
                    clientSocket.send(JSON.stringify(message));
                }
            }
        }
    }
}
function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}
