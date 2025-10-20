import React, { useEffect } from 'react';
import styled from 'styled-components';
import VideoContainer from '../components/WebRtc/VideoContainer';
import RoomControl from '../components/WebRtc/RoomControls';
import DeviceSelector from '../components/WebRtc/DeviceSelector';
import { useWebRTCStore } from '../stores/webrtcStore';

const Container = styled.div`
    height: 100vh;
    width: 100vw;
    background-color: #E8E8E8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
`;

const RoomControlContainer = styled.div`
    padding: 15px;
`;

const VideoContainerWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2%;
    background-color: #ffffff;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const DeviceSelectorContainer = styled.div`
    padding: 15px;
`;

const WebRTCContainer: React.FC = () => {
    useEffect(() => {
        const init = async () => {
            const { mediaStream, initMediaStream } = useWebRTCStore.getState()
            if (!mediaStream) {
                await initMediaStream({ audio: true, video: true })
            }
        }
        init()
    }, [])

    return (
        <Container>
            <RoomControlContainer>
                <RoomControl />
            </RoomControlContainer>
            <VideoContainerWrapper>
                <VideoContainer />
            </VideoContainerWrapper>
            <DeviceSelectorContainer>
                <DeviceSelector />
            </DeviceSelectorContainer>
        </Container>
    );
};

export default WebRTCContainer;
