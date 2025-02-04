
import {Server} from "socket.io"
const io = new Server(3000);
const room = new Map();

io.on('connection',(socket)=>{
  console.log("user connected" , socket.id)
  socket.on('join-meeting',(code: string , userid)=>{
    if(!room.has(code)){
      room.set(code, new Set());
    }
    room.get(code)?.add(socket.id);
    socket.join(code);
    socket.to(code)?.emit('user-joined' , {userid})
  })
  
  
})