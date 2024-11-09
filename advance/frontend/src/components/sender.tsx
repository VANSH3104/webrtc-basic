"use client"

import { useEffect, useState } from "react"

export const Sender = ()=>{
    const [input , setinput] = useState("");
    const [result , setresult] = useState("")
    const [socket, setSocket] = useState<WebSocket | null>(null);
    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8080');

        socket.onopen = () => {
            console.log("Sender connected to server");
            socket.send(JSON.stringify({ type: "sender" , meetId:result }));
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

    const GenerateRandomString = ()=>{
        const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = ""
        const charactersLength = characters.length;
    for ( let i = 0; i < 12; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    setresult(result)
    }
    return(
        <div>
            <h2>name</h2>
            <input placeholder="name" onChange={(e)=>{
                setinput(e.target.value)
            }}></input>
            <div>
                <button onClick={GenerateRandomString}>Create a Meeting</button>
                <span>{result}</span>
            </div>
        </div>
    )
}