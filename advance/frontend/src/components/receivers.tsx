"use client"

import { useEffect, useState } from "react"

export const Receiver = ()=>{
    const [input , setinput] = useState("");
    const [result , setresult] = useState("")
    const [socket, setSocket] = useState<WebSocket | null>(null);
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            console.log("Sender connected to server");
            socket.send(JSON.stringify({ type: "receiver" , meetId:result }));
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        setSocket(socket);

        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [result]);

    function ChangeResult(){
        setresult(input);
    }
    return(
        <div>
            <h2>name</h2>
            <input placeholder="name" onChange={(e)=>{
                setinput(e.target.value)
            }}></input>
            <div>
                <button onClick={ChangeResult}>join a Meeting</button>
                <span>{result}</span>
            </div>
        </div>
    )
}