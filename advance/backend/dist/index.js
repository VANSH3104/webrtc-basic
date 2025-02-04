"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const io = new socket_io_1.Server(3000);
const room = new Map();
io.on('connection', (socket) => {
    console.log("user connected", socket.id);
    socket.on('join-meeting', (code, userid) => {
        var _a, _b;
        if (!room.has(code)) {
            room.set(code, new Set());
        }
        (_a = room.get(code)) === null || _a === void 0 ? void 0 : _a.add(socket.id);
        socket.join(code);
        (_b = socket.to(code)) === null || _b === void 0 ? void 0 : _b.emit('user-joined', { userid });
    });
});
