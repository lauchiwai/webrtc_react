import React from 'react';
import { Input, Button } from 'antd';
import { useWebRTCStore } from '../../stores/webrtcStore';
import styled from 'styled-components';

const RoomContainerDiv = styled.div`
    margin-top: 0;
    display: flex;
    justify-content: center;
    padding: 10px;
`;

const StyledInput = styled(Input)`
    width: 110px;
    margin: 0 10px;
`;

const JoinButton = styled(Button)`
    margin: 0 5px;
`;

const LeaveButton = styled(Button)`
    margin: 0 5px;
`;

const RoomContainer: React.FC = () => {
    const store = useWebRTCStore();

    const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        store.set({ room: e.target.value });
    };

    return (
        <RoomContainerDiv>
            <StyledInput
                value={store.room}
                onChange={handleRoomChange}
                placeholder="room number"
                disabled={store.hasJoinedRoom}
            />
            <JoinButton
                onClick={store.join}
                disabled={store.hasJoinedRoom}
            >
                <span>Join</span>
            </JoinButton>
            <LeaveButton
                onClick={store.leave}
                danger
                disabled={!store.hasJoinedRoom}
            >
                <span>Leave</span>
            </LeaveButton>
        </RoomContainerDiv>
    );
};

export default RoomContainer;
