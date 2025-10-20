import React, { useEffect, useRef, useState } from 'react'
import { useWebRTCStore } from '../../stores/webrtcStore';
import styled from 'styled-components'

const VideoContainerWrapper = styled.div`
    position: relative;
    width: 600px;
    height: 400px;
    background: #000;
    overflow: hidden;
    border-radius: 8px;
`

const VideoElement = styled.video`
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #000;
    
    &.small-video {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 200px;
        height: 150px;
        border: 2px solid #fff;
        border-radius: 8px;
        object-fit: cover;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        z-index: 10;
        background: #333;
    }
`

const StatusIndicator = styled.div<{ $connected: boolean }>`
    position: absolute;
    top: 10px;
    right: 10px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${props => props.$connected ? '#4CAF50' : '#f44336'};
    z-index: 100;
`

const LoadingOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    z-index: 200;
`

const ErrorMessage = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 0, 0, 0.8);
    color: white;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    z-index: 200;
`

const useVideoStream = (stream: MediaStream | null) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isReady, setIsReady] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const videoElement = videoRef.current
        if (!videoElement) return

        console.log('Video stream updated:', {
            stream: stream,
            videoTracks: stream?.getVideoTracks() || [],
            audioTracks: stream?.getAudioTracks() || []
        })

        if (stream) {
            console.log('Setting video source to video element')

            const videoTracks = stream.getVideoTracks()
            console.log('Video track status:', videoTracks.map(track => ({
                id: track.id,
                enabled: track.enabled,
                readyState: track.readyState,
                kind: track.kind,
                label: track.label
            })))

            videoElement.srcObject = stream
            setIsReady(false)
            setError(null)

            const handleLoadedMetadata = () => {
                console.log('Video metadata loaded')
                setIsReady(true)
            }

            const handleCanPlay = () => {
                console.log('Video can play')
                videoElement.play().then(() => {
                    console.log('Video playback successful')
                }).catch(playbackError => {
                    console.warn('Video playback failed:', playbackError)
                    setError(playbackError.message)
                })
            }

            const handlePlay = () => {
                console.log('Video started playing')
            }

            const handleVideoError = (event: Event) => {
                console.error('Video element error:', event)
                setError('Video element error')
            }

            const handleStalled = () => {
                console.warn('Video data stalled')
            }

            const handleWaiting = () => {
                console.log('Video waiting for data')
            }

            videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)
            videoElement.addEventListener('canplay', handleCanPlay)
            videoElement.addEventListener('play', handlePlay)
            videoElement.addEventListener('error', handleVideoError)
            videoElement.addEventListener('stalled', handleStalled)
            videoElement.addEventListener('waiting', handleWaiting)

            if (videoElement.readyState >= 3) {
                videoElement.play().catch(playbackError => {
                    console.warn('Video immediate playback failed:', playbackError)
                })
            }

            return () => {
                videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
                videoElement.removeEventListener('canplay', handleCanPlay)
                videoElement.removeEventListener('play', handlePlay)
                videoElement.removeEventListener('error', handleVideoError)
                videoElement.removeEventListener('stalled', handleStalled)
                videoElement.removeEventListener('waiting', handleWaiting)
            }
        } else {
            console.log('Clearing video source')
            videoElement.srcObject = null
            setIsReady(false)
        }
    }, [stream])

    return { videoRef, isReady, error }
}

const VideoContainer: React.FC = () => {
    const {
        bigVideoStream,
        smallVideoStream,
        connectionState,
        iceConnectionState,
        isLoading,
        error,
        initializeLocalDevices
    } = useWebRTCStore()

    const { videoRef: bigVideoRef, isReady: bigVideoReady, error: bigVideoError } = useVideoStream(bigVideoStream)
    const { videoRef: smallVideoRef, isReady: smallVideoReady, error: smallVideoError } = useVideoStream(smallVideoStream)

    useEffect(() => {
        console.log('VideoContainer loaded, starting local device initialization')
        initializeLocalDevices().catch(err => {
            console.error('Failed to initialize local devices:', err)
        })
    }, [initializeLocalDevices])

    const isConnected = connectionState === 'connected' && iceConnectionState === 'connected'

    return (
        <VideoContainerWrapper>
            <StatusIndicator $connected={isConnected} title={isConnected ? 'Connected' : 'Disconnected'} />

            {isLoading && (
                <LoadingOverlay>
                    <div>Initializing camera and microphone...</div>
                </LoadingOverlay>
            )}

            {error && (
                <ErrorMessage>
                    <div>Error: {error}</div>
                    <button
                        onClick={() => initializeLocalDevices()}
                        style={{ marginTop: '10px', padding: '5px 10px' }}
                    >
                        Retry
                    </button>
                </ErrorMessage>
            )}

            <VideoElement
                ref={bigVideoRef}
                autoPlay
                muted={false}
                playsInline
                controls={false}
                style={{
                    display: bigVideoStream && bigVideoReady ? 'block' : 'none'
                }}
            />

            {smallVideoStream && (
                <VideoElement
                    ref={smallVideoRef}
                    autoPlay
                    muted={true}
                    playsInline
                    controls={false}
                    className="small-video"
                    style={{
                        display: smallVideoReady ? 'block' : 'none'
                    }}
                />
            )}

            {!smallVideoReady && smallVideoStream && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '200px',
                    height: '150px',
                    background: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '8px',
                    border: '2px solid #fff'
                }}>
                    {smallVideoError ? `Error: ${smallVideoError}` : 'Video loading...'}
                </div>
            )}

            {!bigVideoReady && bigVideoStream && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '18px',
                    textAlign: 'center'
                }}>
                    {bigVideoError ? `Big video error: ${bigVideoError}` : 'Big video loading...'}
                </div>
            )}

            {!isConnected && !isLoading && !error && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '18px',
                    textAlign: 'center'
                }}>
                    {connectionState === 'new' ? 'Waiting for connection...' : `Connection state: ${connectionState}`}
                </div>
            )}

            {isConnected && !bigVideoStream && !isLoading && !error && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '18px',
                    textAlign: 'center'
                }}>
                    Waiting for video stream...
                </div>
            )}
        </VideoContainerWrapper>
    )
}

export default VideoContainer
