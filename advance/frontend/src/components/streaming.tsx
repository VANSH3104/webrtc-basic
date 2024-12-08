import { Socket } from "dgram"
import { useEffect, useRef } from "react"
import { createWebSocket } from "./utils/rtcutils"

export const Stream = ()=>{
    const socket = useRef<WebSocket | null>(null);
    useEffect(()=>{
        socket.current = createWebSocket('ws://localhost:3000');
        socket.current.onopen = ()=>{
            socket.current?.send(JSON.stringify({
                type:"receiver"
            }))
        }
    }, [])
    return (
        <div>
            
        </div>
    )
}