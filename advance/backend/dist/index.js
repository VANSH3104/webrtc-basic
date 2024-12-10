"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const server = new ws_1.WebSocketServer({ port: 3000 });
let clients = [];
let meetings = [];
server.on("connection", (socket) => {
    const clientId = generateUniqueId();
    clients.push({ id: clientId, socket });
    broadcast({ type: "new-connection", clientId });
    socket.on("message", (data) => {
        const message = JSON.parse(data);
        const { type } = message;
        switch (type) {
            case "create-meeting":
                createMeeting(message);
                break;
            case "join-meeting":
                joinMeeting(message, clientId);
                break;
            case "chat":
                broadcast({ type: "chat", message: message.content, clientId }, clientId);
                break;
            case "ice-candidate":
                broadcast(message, clientId);
                break;
            case "leave":
                handleClientLeave(clientId, socket);
                break;
        }
    });
    socket.on("close", () => {
        handleClientLeave(clientId, socket);
    });
});
function handleClientLeave(clientId, socket) {
    clients = clients.filter(client => client.id !== clientId);
    meetings.forEach(meeting => {
        meeting.clients = meeting.clients.filter(id => id !== clientId);
        if (meeting.clients.length === 0) {
            meetings = meetings.filter(m => m.code !== meeting.code);
        }
    });
    broadcast({ type: "client-left", clientId });
    if (socket.readyState === socket.OPEN) {
        socket.close(1000, "Client voluntarily left");
    }
    console.log(`Client ${clientId} has left.`);
}
function createMeeting(message) {
    if (!meetings.find(meeting => meeting.code === message.code)) {
        meetings.push({ code: message.code, clients: [] });
        console.log(`Meeting ${message.code} created.`);
    }
}
function joinMeeting(message, clientId) {
    const meeting = meetings.find(meeting => meeting.code === message.code);
    if (meeting) {
        meeting.clients.push(clientId);
        broadcast({ type: "meeting-joined", clientId }, clientId);
        console.log(`Client ${clientId} joined meeting ${message.code}.`);
    }
    else {
        console.log(`Meeting ${message.code} does not exist.`);
    }
}
function broadcast(message, senderId) {
    clients.forEach(client => {
        if (client.id !== senderId) {
            try {
                client.socket.send(JSON.stringify(message));
            }
            catch (error) {
                console.error(`Error sending message to client ${client.id}:`, error);
            }
        }
    });
}
function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}
