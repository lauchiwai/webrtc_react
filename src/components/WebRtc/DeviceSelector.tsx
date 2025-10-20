import React from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { useWebRTCStore } from '../../stores/webrtcStore';
import styled from 'styled-components';

const { Option } = Select;

const CenterDiv = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
`;

const StyledSelect = styled(Select)`
    width: 200px;
    margin: 0 10px;
`;

const DeviceSelector: React.FC = () => {
    const store = useWebRTCStore();

    const handleAudioChange: SelectProps['onChange'] = (value) => {
        store.switchDevice('audioinput', value as string);
    };

    const handleVideoChange: SelectProps['onChange'] = (value) => {
        store.switchDevice('videoinput', value as string);
    };

    return (
        <CenterDiv>
            <StyledSelect
                value={store.selectedAudio?.deviceId}
                onChange={handleAudioChange}
                placeholder="Select audio device"
            >
                {store.audioOptions.map((device) => (
                    <Option
                        key={device.deviceId}
                        value={device.deviceId}
                    >
                        {device.label || `Audio ${device.deviceId.slice(0, 5)}`}
                    </Option>
                ))}
            </StyledSelect>

            <StyledSelect
                value={store.selectedVideo?.deviceId}
                onChange={handleVideoChange}
                placeholder="Select video device"
            >
                {store.videoOptions.map((device) => (
                    <Option
                        key={device.deviceId}
                        value={device.deviceId}
                    >
                        {device.label || `Video ${device.deviceId.slice(0, 5)}`}
                    </Option>
                ))}
            </StyledSelect>
        </CenterDiv>
    );
};

export default DeviceSelector;
