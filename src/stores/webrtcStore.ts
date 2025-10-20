import { create } from 'zustand'
import { io } from 'socket.io-client'

interface WebRTCState {
    peerConn: RTCPeerConnection | null
    socket: any
    room: string
    hasJoinedRoom: boolean
    mediaStream: MediaStream | null
    remoteStream: MediaStream | null
    isVideoSwitch: boolean
    streamOutput: { audio: boolean; video: boolean }
    audioOptions: MediaDeviceInfo[]
    videoOptions: MediaDeviceInfo[]
    selectedAudio: MediaDeviceInfo | undefined
    selectedVideo: MediaDeviceInfo | undefined
    connectionState: string
    iceConnectionState: string
    bigVideoStream: MediaStream | null
    smallVideoStream: MediaStream | null
    hasRemoteVideo: boolean
    isLoading: boolean
    error: string | null
    initializeLocalDevices: () => Promise<void>
    initMediaStream: (constraints: MediaStreamConstraints) => Promise<void>
    getDevices: () => Promise<void>
    toggleAudio: () => void
    toggleVideo: () => void
    switchDevice: (kind: 'audioinput' | 'videoinput', deviceId: string) => Promise<void>
    initPeerConnection: () => Promise<void>
    join: () => Promise<void>
    leave: () => Promise<void>
    setupSocketListeners: () => void
    reset: () => void
    sendSDP: (isOffer: boolean) => Promise<void>
    updateVideoStreams: () => void
    set: (state: Partial<WebRTCState>) => void
}

export const useWebRTCStore = create<WebRTCState>((set, get) => {
    return {
        peerConn: null,
        socket: io(import.meta.env.VITE_SOCKET_URL),
        room: '',
        hasJoinedRoom: false,
        mediaStream: null,
        remoteStream: null,
        isVideoSwitch: false,
        streamOutput: { audio: true, video: true },
        audioOptions: [],
        videoOptions: [],
        selectedAudio: undefined,
        selectedVideo: undefined,
        connectionState: 'new',
        iceConnectionState: 'new',
        bigVideoStream: null,
        smallVideoStream: null,
        hasRemoteVideo: false,
        isLoading: false,
        error: null,

        initializeLocalDevices: async () => {
            try {
                set({ isLoading: true, error: null })
                await get().getDevices()
                await get().initMediaStream({
                    audio: true,
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 30 }
                    }
                })
                set({ isLoading: false })
            } catch (error) {
                set({
                    isLoading: false,
                    error: error instanceof Error ? error.message : 'Initialization failed'
                })
                throw error
            }
        },

        initMediaStream: async (constraints: MediaStreamConstraints) => {
            try {
                const currentMediaStream = get().mediaStream
                if (currentMediaStream) {
                    currentMediaStream.getTracks().forEach(track => track.stop())
                }
                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
                set({ mediaStream })
                get().updateVideoStreams()
                await get().getDevices()
            } catch (error) {
                throw error
            }
        },

        getDevices: async () => {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const audioOptions = devices.filter(d => d.kind === 'audioinput')
            const videoOptions = devices.filter(d => d.kind === 'videoinput')
            set({
                audioOptions,
                videoOptions,
                selectedAudio: audioOptions[0] || undefined,
                selectedVideo: videoOptions[0] || undefined
            })
        },

        toggleAudio: () => {
            const { mediaStream, streamOutput } = get()
            const newStreamOutput = { ...streamOutput, audio: !streamOutput.audio }
            mediaStream?.getAudioTracks().forEach(t => {
                t.enabled = newStreamOutput.audio
            })
            set({ streamOutput: newStreamOutput })
        },

        toggleVideo: () => {
            const { mediaStream, streamOutput } = get()
            const newStreamOutput = { ...streamOutput, video: !streamOutput.video }
            mediaStream?.getVideoTracks().forEach(t => {
                t.enabled = newStreamOutput.video
            })
            set({ streamOutput: newStreamOutput })
        },

        switchDevice: async (kind: 'audioinput' | 'videoinput', deviceId: string) => {
            const constraints: MediaStreamConstraints = {
                audio: kind === 'audioinput' ? { deviceId: { exact: deviceId } } : false,
                video: kind === 'videoinput' ? { deviceId: { exact: deviceId } } : false
            }
            try {
                const newStream = await navigator.mediaDevices.getUserMedia(constraints)
                const oldStream = get().mediaStream
                if (oldStream) {
                    oldStream.getTracks().forEach(t => t.stop())
                }
                set({ mediaStream: newStream })
                get().updateVideoStreams()
                if (get().hasJoinedRoom) {
                    await get().initPeerConnection()
                }
            } catch (error) {
            }
        },

        updateVideoStreams: () => {
            const { isVideoSwitch, mediaStream, remoteStream } = get()
            const bigVideoStream = isVideoSwitch ? mediaStream : remoteStream
            const smallVideoStream = isVideoSwitch ? remoteStream : mediaStream
            const hasRemoteVideo = !!(remoteStream && remoteStream.active)
            set({
                bigVideoStream,
                smallVideoStream,
                hasRemoteVideo
            })
        },

        initPeerConnection: async () => {
            const existingPeerConn = get().peerConn
            if (existingPeerConn) {
                existingPeerConn.close()
            }
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
            const peerConn = new RTCPeerConnection(configuration)
            const { mediaStream, socket, room } = get()
            if (mediaStream) {
                const videoTracks = mediaStream.getVideoTracks()
                const audioTracks = mediaStream.getAudioTracks()
                videoTracks.forEach((track) => {
                    peerConn.addTrack(track, mediaStream)
                })
                audioTracks.forEach((track) => {
                    peerConn.addTrack(track, mediaStream)
                })
            }
            peerConn.addTransceiver('video', { direction: 'recvonly' })
            peerConn.addTransceiver('audio', { direction: 'recvonly' })
            peerConn.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice_candidate', room, {
                        label: event.candidate.sdpMLineIndex,
                        id: event.candidate.sdpMid,
                        candidate: event.candidate.candidate,
                    })
                }
            }
            peerConn.oniceconnectionstatechange = () => {
                const iceState = peerConn.iceConnectionState
                set({ iceConnectionState: iceState })
                if (iceState === 'disconnected') {
                    set({ remoteStream: null })
                    get().updateVideoStreams()
                }
            }
            peerConn.onconnectionstatechange = () => {
                const connState = peerConn.connectionState
                set({ connectionState: connState })
            }
            peerConn.onsignalingstatechange = () => {
            }
            peerConn.ontrack = (event: RTCTrackEvent) => {
                const remoteStream = event.streams[0]
                if (remoteStream) {
                    set({ remoteStream })
                    get().updateVideoStreams()
                }
            }
            set({ peerConn })
        },

        setupSocketListeners: () => {
            const { socket } = get()
            socket.on('connect', () => {
            })
            socket.on('disconnect', () => {
            })
            socket.on('ready', async () => {
                await get().sendSDP(true)
            })
            socket.on('leaved', () => {
                get().reset()
            })
            socket.on('bye', () => {
                set({ hasJoinedRoom: false })
                get().reset()
            })
            socket.on('offer', async (desc: RTCSessionDescriptionInit) => {
                const peerConn = get().peerConn
                if (peerConn) {
                    try {
                        await peerConn.setRemoteDescription(desc)
                        await get().sendSDP(false)
                    } catch (error) {
                    }
                }
            })
            socket.on('answer', async (desc: RTCSessionDescriptionInit) => {
                const peerConn = get().peerConn
                if (peerConn) {
                    try {
                        await peerConn.setRemoteDescription(desc)
                    } catch (error) {
                    }
                }
            })
            socket.on('ice_candidate', async (data: {
                label: number | null
                id: string | null
                candidate: string
            }) => {
                try {
                    const candidate = new RTCIceCandidate({
                        sdpMLineIndex: data.label,
                        sdpMid: data.id,
                        candidate: data.candidate,
                    })
                    const peerConn = get().peerConn
                    if (peerConn) {
                        await peerConn.addIceCandidate(candidate)
                    }
                } catch (error) {
                }
            })
        },

        sendSDP: async (isOffer: boolean) => {
            const { peerConn, socket, room } = get()
            if (!peerConn) {
                return
            }
            try {
                const options = {
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                }
                const localSDP = await peerConn[isOffer ? 'createOffer' : 'createAnswer'](options)
                await peerConn.setLocalDescription(localSDP)
                const event = isOffer ? 'offer' : 'answer'
                socket.emit(event, room, peerConn.localDescription)
            } catch (err) {
                throw err
            }
        },

        join: async () => {
            const { room, socket, mediaStream } = get()
            if (room.trim() === '') {
                return
            }
            if (!mediaStream) {
                try {
                    await get().initializeLocalDevices()
                } catch (error) {
                    return
                }
            }
            await get().initPeerConnection()
            get().setupSocketListeners()
            try {
                socket.emit('join', room)
                set({ hasJoinedRoom: true })
            } catch (e) {
            }
        },

        leave: async () => {
            const { socket, room, mediaStream } = get()
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop())
            }
            socket.emit('leave', room)
            set({ hasJoinedRoom: false })
            get().reset()
        },

        reset: () => {
            const { peerConn } = get()
            if (peerConn) {
                peerConn.close()
            }
            set({
                peerConn: null,
                remoteStream: null,
                hasJoinedRoom: false,
                connectionState: 'new',
                iceConnectionState: 'new',
                bigVideoStream: null,
                smallVideoStream: null,
                hasRemoteVideo: false,
                isLoading: false,
                error: null
            })
        },

        set: (state: Partial<WebRTCState>) => set(state)
    }
})
