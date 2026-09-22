import { createContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

import { useChannelMessages } from '@/hooks/context/useChannelMessages';

const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {

    const [currentChannel, setCurrentChannel] = useState(null);
    const { setMessageList } = useChannelMessages();

    const socket = useMemo(() => io(import.meta.env.VITE_BACKEND_SOCKET_URL), []);

    useEffect(() => {
        const handleNewMessage = (data) => {
            console.log('New message received', data);
            setMessageList((prevMessages) => [...prevMessages, data]);
        };

        socket.on('NewMessageReceived', handleNewMessage);

        return () => {
            socket.off('NewMessageReceived', handleNewMessage);
        };
    }, [socket, setMessageList]);

    async function joinChannel(channelId) {
        socket.emit('JoinChannel', { channelId }, (data) => {
            console.log('Successfully joined the channel', data);
            setCurrentChannel(data?.data);
        });
    }

    return (
        <SocketContext.Provider value={{ socket, joinChannel, currentChannel }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;