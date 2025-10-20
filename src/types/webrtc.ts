export interface WebRTCConfig {
    iceServers: RTCIceServer[];
}

export interface CallState {
    isActive: boolean;
    status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
    error?: string;
}

export interface MediaStreams {
    local: MediaStream | null;
    remote: MediaStream | null;
}
