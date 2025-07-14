// js/signaling.js - Updated for Socket.IO
const socket = io(window.CONFIG.SERVER_URL);
const peers = {}; // { peerName: RTCPeerConnection }

// Define roomCode and userName locally with unique names
const roomCodeSignaling = new URLSearchParams(window.location.search).get("code");
const userNameSignaling = sessionStorage.getItem("userName") || "Anonymous";
const isHostSignaling = sessionStorage.getItem("isHost") === "true";
const isPolite = !isHostSignaling; // Host is impolite, joiners are polite
let makingOffer = false;
let ignoreOffer = false;

socket.on('connect', () => {
  console.log('Socket.IO connected to signaling server');
  console.log('Joining room:', roomCodeSignaling, 'as user:', userNameSignaling);
  socket.emit('join', {
    roomId: roomCodeSignaling,
    name: userNameSignaling,
    isHost: isHostSignaling,
  });
});

socket.on('connect_error', (error) => {
  console.error('Socket.IO connection error:', error);
  alert('Failed to connect to signaling server. Make sure the server is running on port 8080.');
});

socket.on('disconnect', () => {
  console.log('Socket.IO connection closed');
});

socket.on('existing-peer', (data) => {
  console.log('Found existing peer:', data.name);
  addParticipant(data.name);
  // Only polite peer (joiner) creates offer
  if (isPolite) {
    setTimeout(() => createOffer(data.name), 100);
  }
});

socket.on('new-peer', (data) => {
  console.log('New peer joined:', data.name);
  addParticipant(data.name);
  // Only polite peer (joiner) creates offer
  if (isPolite) {
    createOffer(data.name);
  }
});

socket.on('refresh-peer', (data) => {
  console.log('Refreshing connection to peer:', data.name);
  // Check if we already have a connection, if not create one
  if (!peers[data.name]) {
    addParticipant(data.name);
    setTimeout(() => createOffer(data.name), 200);
  } else if (peers[data.name].connectionState === 'failed' || peers[data.name].connectionState === 'disconnected') {
    console.log('Recreating failed connection to:', data.name);
    peers[data.name].close();
    delete peers[data.name];
    setTimeout(() => createOffer(data.name), 300);
  }
});

socket.on('signal', async (data) => {
  console.log('Received WebRTC signal from:', data.from);
  await handleSignal(data.from, data.signal);
});

socket.on('emoji', (data) => {
  showEmojiOverlay(data.emoji);
});

socket.on('mic-status', (data) => {
  const el = document.querySelector(`.participant[data-name="${data.name}"] .mic-status`);
  if (el) el.textContent = data.muted ? "🔇" : "🎤";
});

socket.on('peer-left', (data) => {
  const peerName = data.name;
  console.log('Peer left:', peerName);
  const el = document.querySelector(`.participant[data-name="${peerName}"]`);
  if (el) el.remove();

  if (peers[peerName]) {
    peers[peerName].close();
    delete peers[peerName];
  }
});

// CRITICAL: Handle movie audio state changes for all participants
socket.on('movie-audio-state', (data) => {
  console.log('🎬 Movie audio state change:', data);
  
  if (data.host !== userNameSignaling) { // Don't apply to host
    if (data.isPlaying) {
      console.log('🔉 Movie started - enabling enhanced echo cancellation for participant');
      // Enable enhanced microphone mode for participants when movie plays
      if (window.enhanceMicrophoneForMovie) {
        window.enhanceMicrophoneForMovie(true);
      }
    } else {
      console.log('🔊 Movie stopped - returning to normal microphone mode');
      // Return to normal microphone mode when movie stops
      if (window.enhanceMicrophoneForMovie) {
        window.enhanceMicrophoneForMovie(false);
      }
    }
  }
});

function sendEmoji(emoji) {
  socket.emit('emoji', { roomId: roomCodeSignaling, emoji });
}
window.sendEmoji = sendEmoji; // expose to meeting.js

async function createPeerConnection(peerName) {
  console.log('Creating ultra-optimized peer connection for:', peerName);
  
  // Check if peer connection already exists
  if (peers[peerName]) {
    console.log('Peer connection already exists for:', peerName);
    return peers[peerName];
  }
  
  // Ultra-optimized WebRTC configuration for voice
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Public demo TURN servers (replace with your own for production)
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: 'openai',
        credential: 'openai'
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: 'openai',
        credential: 'openai'
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  });
  pc.peerName = peerName;

  // Add local stream tracks with ultra-high quality settings
  if (localStream) {
    localStream.getTracks().forEach(track => {
      console.log('Adding ultra-optimized track to peer connection for', peerName, ':', track.kind);
      
      // Optimize audio track settings with enhanced echo cancellation
      if (track.kind === 'audio') {
        track.applyConstraints({
          echoCancellation: { exact: true },
          noiseSuppression: { exact: true },
          autoGainControl: { exact: true },
          sampleRate: { ideal: 48000, exact: 48000 },
          sampleSize: { ideal: 16, exact: 16 },
          channelCount: { exact: 1 },
          latency: { ideal: 0.01, max: 0.02 },
          volume: { ideal: 0.3, max: 0.5 },
          suppressLocalAudioPlayback: { exact: true },
          googEchoCancellation: { exact: true },
          googAutoGainControl: { exact: true },
          googNoiseSuppression: { exact: true },
          googHighpassFilter: { exact: true },
          googTypingNoiseDetection: { exact: true },
          googAudioMirroring: { exact: false }
        }).then(() => {
          console.log('Enhanced audio constraints applied to track for', peerName);
        }).catch(err => {
          console.log('Some audio constraints not supported for track:', err);
        });
      }
      
      const sender = pc.addTrack(track, localStream);
      
      // Ultra-high quality encoding parameters with echo prevention
      if (track.kind === 'audio') {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        
        params.encodings[0] = {
          maxBitrate: 128000,     // 128 kbps for crystal clear audio
          priority: 'high',
          networkPriority: 'high',
          // CRITICAL: Add echo cancellation parameters
          dtx: true,              // Discontinuous transmission to reduce echo
          maxFramerate: 30        // Limit frame rate for audio stability
        };
        
        sender.setParameters(params).catch(e => console.log('Failed to set encoding params:', e));
      }
    });
  }

  pc.onicecandidate = event => {
    if (event.candidate) {
      console.log('Sending ICE candidate to:', peerName);
      socket.emit('signal', {
        roomId: roomCodeSignaling,
        to: peerName,
        signal: { candidate: event.candidate },
      });
    }
  };

  pc.ontrack = event => {
    console.log('Received ultra-optimized remote track from:', peerName);
    const [stream] = event.streams;

    // Create optimized audio element for ultra-low latency playback
    const remoteAudio = new Audio();
    remoteAudio.id = `remoteAudio_${peerName}`; // CRITICAL: Add ID for volume control
    remoteAudio.className = 'remote-audio'; // Add class for easy selection
    remoteAudio.srcObject = stream;
    remoteAudio.autoplay = true;
    
    // ENHANCED SAME-DEVICE TESTING DETECTION: More accurate detection
    const isSameDeviceTesting = (
      Object.keys(peers).length === 1 ||  // Only 2 people total
      window.location.href.includes('localhost') || 
      window.location.href.includes('127.0.0.1') ||
      peerName.toLowerCase().includes('test') ||
      userNameSignaling.toLowerCase().includes('test') ||
      peerName === userNameSignaling  // Same name indicates same device
    );
    
    // CRITICAL: Much lower volume for same-device testing to prevent feedback
    remoteAudio.volume = isSameDeviceTesting ? 0.2 : 0.6;  // Much lower volume
    remoteAudio.muted = false;
    
    console.log(`Enhanced audio setup for ${peerName}: volume=${remoteAudio.volume}, same-device=${isSameDeviceTesting}`);
    
    // CRITICAL: Enhanced feedback prevention
    remoteAudio.setAttribute('playsinline', true);
    remoteAudio.setAttribute('webkit-playsinline', true);
    remoteAudio.preload = 'none';
    
    // CRITICAL: Disable audio processing that can cause feedback
    remoteAudio.mozAudioChannelType = 'content';
    
    // Advanced echo cancellation settings
    if (remoteAudio.setSinkId) {
      // Use default audio output to prevent feedback
      remoteAudio.setSinkId('default').catch(e => 
        console.log('setSinkId not supported or failed:', e)
      );
    }
    
    // Add to DOM for playback (hidden)
    remoteAudio.style.display = 'none';
    document.body.appendChild(remoteAudio);
    
    // Enhanced audio processing for received audio with feedback prevention
    let audioContext;
    remoteAudio.onloadedmetadata = () => {
      console.log('Enhanced remote audio loaded for:', peerName);
      
      // Create audio context for enhanced processing
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
          latencyHint: 'interactive',
          sampleRate: 48000
        });
        
        const source = audioContext.createMediaElementSource(remoteAudio);
        const compressor = audioContext.createDynamicsCompressor();
        const filter = audioContext.createBiquadFilter();
        const gainNode = audioContext.createGain();
        const feedbackDetector = audioContext.createGain(); // New: feedback detector
        
        // Enhanced compressor for received audio - more aggressive for echo reduction
        compressor.threshold.setValueAtTime(-35, audioContext.currentTime);  // Lower threshold
        compressor.knee.setValueAtTime(25, audioContext.currentTime);        // Tighter knee
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);       // Higher ratio
        compressor.attack.setValueAtTime(0.002, audioContext.currentTime);   // Faster attack
        compressor.release.setValueAtTime(0.05, audioContext.currentTime);   // Faster release
        
        // Enhanced high-pass filter to remove low frequency noise and echo
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(150, audioContext.currentTime);      // Higher cutoff
        filter.Q.setValueAtTime(1.2, audioContext.currentTime);              // Sharper filter
        
        // CRITICAL: Much more conservative gain control to prevent feedback
        const gainValue = isSameDeviceTesting ? 0.3 : 0.6;  // Much lower for same device
        gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);
        
        // CRITICAL: Feedback detector - monitors for feedback and reduces gain
        feedbackDetector.gain.setValueAtTime(1.0, audioContext.currentTime);
        
        // Connect enhanced processing chain
        source.connect(filter);
        filter.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(feedbackDetector);
        feedbackDetector.connect(audioContext.destination);
        
        // CRITICAL: Feedback detection system
        const analyser = audioContext.createAnalyser();
        feedbackDetector.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let feedbackDetected = false;
        
        function monitorForFeedback() {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          
          // CRITICAL: Detect feedback and reduce gain
          if (average > 180) {  // High levels indicate feedback
            if (!feedbackDetected) {
              feedbackDetected = true;
              console.log('⚠️ Remote audio feedback detected! Reducing gain...');
              feedbackDetector.gain.setValueAtTime(0.2, audioContext.currentTime);
              gainNode.gain.setValueAtTime(gainValue * 0.3, audioContext.currentTime);
            }
          } else if (feedbackDetected && average < 40) {
            feedbackDetected = false;
            console.log('✅ Remote audio feedback cleared, restoring normal gain');
            feedbackDetector.gain.setValueAtTime(1.0, audioContext.currentTime);
            gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);
          }
          
          requestAnimationFrame(monitorForFeedback);
        }
        monitorForFeedback();
        
      } catch (e) {
        console.log('Enhanced audio processing not available, using direct playback:', e);
      }
      
      // Force immediate playback
      const playPromise = remoteAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Enhanced audio playback started for:', peerName);
          })
          .catch(e => {
            console.error('Error playing enhanced audio:', e);
            // Retry once with user interaction
            document.addEventListener('click', () => {
              remoteAudio.play().catch(console.error);
            }, { once: true });
          });
      }
    };

    remoteAudio.onplay = () => {
      console.log('Enhanced remote audio playing for:', peerName);
      const el = document.querySelector(`.participant[data-name="${pc.peerName}"] .status`);
      if (el) {
        // Enhanced same-device testing detection
        const isSameDeviceTesting = (
          Object.keys(peers).length === 1 ||
          window.location.href.includes('localhost') || 
          window.location.href.includes('127.0.0.1') ||
          peerName.toLowerCase().includes('test') ||
          userNameSignaling.toLowerCase().includes('test') ||
          peerName === userNameSignaling
        );
        
        if (isSameDeviceTesting) {
          el.textContent = "🔊 Test Mode (Low Volume)";
          el.style.color = "#ffa500"; // Orange for test mode
          console.log("🎧 TESTING TIP: Use headphones to prevent feedback when testing on same device!");
          console.log("🎧 TESTING TIP: Volume reduced to 20% to prevent feedback!");
        } else {
          el.textContent = "🔊 Ultra-HD Connected";
          el.style.color = "#00ff88"; // Green for high quality
        }
      }
    };

    remoteAudio.onerror = (e) => {
      console.error('Remote audio error:', e);
    };

    // Store audio element and context for cleanup
    pc.remoteAudio = remoteAudio;
    pc.audioContext = audioContext;
  };

  pc.onconnectionstatechange = () => {
    console.log(`Ultra-optimized peer connection state for ${peerName}:`, pc.connectionState);
    const el = document.querySelector(`.participant[data-name="${peerName}"] .status`);
    if (el) {
      switch (pc.connectionState) {
        case 'connected':
          el.textContent = "🔊 Ultra-HD Connected";
          el.style.color = "#00ff88";
          break;
        case 'connecting':
          el.textContent = "⚡ Optimizing...";
          el.style.color = "#ffaa00";
          break;
        case 'disconnected':
          el.textContent = "🔄 Reconnecting...";
          el.style.color = "#ff6b6b";
          // Try to reconnect with optimizations
          setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              console.log('Attempting ultra-optimized reconnect to:', peerName);
              createOffer(peerName);
            }
          }, 1000); // Faster reconnect
          break;
        case 'failed':
          el.textContent = "❌ Connection Failed";
          el.style.color = "#ff4757";
          break;
      }
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`Ultra-optimized ICE connection state for ${peerName}:`, pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      console.log('ICE connection failed for:', peerName, 'attempting ultra-fast restart');
      pc.restartIce();
    }
  };

  peers[peerName] = pc;
  return pc;
}

async function createOffer(peerName) {
  makingOffer = true;
  try {
    console.log('Creating offer for:', peerName);
    // Get or create peer connection
    let pc = peers[peerName];
    if (!pc) {
      pc = await createPeerConnection(peerName);
    }
    // Check signaling state and handle accordingly
    console.log(`Signaling state for ${peerName}:`, pc.signalingState);
    if (pc.signalingState === 'have-remote-offer') {
      console.log('Peer connection has remote offer, creating answer instead for:', peerName);
      // If we have a remote offer, we should create an answer, not an offer
      return;
    }
    if (pc.signalingState === 'have-local-offer') {
      console.log('Already have local offer for:', peerName);
      return;
    }
    if (pc.signalingState === 'closed') {
      console.log('Peer connection closed for:', peerName, 'recreating...');
      if (peers[peerName]) {
        peers[peerName].close();
        delete peers[peerName];
      }
      pc = await createPeerConnection(peerName);
    }
    if (pc.signalingState !== 'stable') {
      console.log('Signaling state not stable for:', peerName, '- state:', pc.signalingState);
      // Wait a bit and retry if not stable
      setTimeout(() => createOffer(peerName), 500);
      return;
    }
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Sending offer to:', peerName);
      socket.emit('signal', {
        roomId: roomCodeSignaling,
        to: peerName,
        signal: { sdp: pc.localDescription },
      });
    } catch (error) {
      console.error('Error creating offer for', peerName, ':', error);
      // If we get any error, try to recover
      if (error.name === 'InvalidStateError' || error.name === 'OperationError') {
        console.log('State/Operation error, recreating connection to:', peerName);
        if (peers[peerName]) {
          peers[peerName].close();
          delete peers[peerName];
        }
        // Retry after recreating connection
        setTimeout(() => createOffer(peerName), 1000);
      }
    }
  } finally {
    makingOffer = false;
  }
}

async function handleSignal(from, signal) {
  console.log('Handling signal from:', from, signal);
  let pc = peers[from];
  if (!pc) {
    pc = await createPeerConnection(from);
    pc.peerName = from;
  }

  try {
    if (signal.sdp) {
      console.log('Setting remote description from:', from, 'Type:', signal.sdp.type);
      // Handle signaling state properly
      if (pc.signalingState === 'closed') {
        console.log('Peer connection closed for:', from, 'recreating...');
        pc = await createPeerConnection(from);
      }
      if (signal.sdp.type === 'offer') {
        const offerCollision = makingOffer || pc.signalingState !== 'stable';
        ignoreOffer = !isPolite && offerCollision;
        if (ignoreOffer) {
          console.warn('Impolite peer ignoring offer due to collision');
          return;
        }
        if (offerCollision) {
          await pc.setLocalDescription({ type: 'rollback' });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        console.log('Creating answer for:', from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('Sending answer to:', from);
        socket.emit('signal', {
          roomId: roomCodeSignaling,
          to: from,
          signal: { sdp: pc.localDescription },
        });
      } else if (signal.sdp.type === 'answer') {
        if (pc.signalingState !== 'have-local-offer') {
          console.warn('Skipping answer: not in have-local-offer state', pc.signalingState);
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      }
    }
    if (signal.candidate) {
      console.log('Adding ICE candidate from:', from);
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } else {
        console.log('Remote description not set yet, queuing ICE candidate');
        if (!pc.queuedCandidates) pc.queuedCandidates = [];
        pc.queuedCandidates.push(signal.candidate);
      }
    }
  } catch (error) {
    console.error('Error handling signal from', from, ':', error);
    if (error.name === 'InvalidStateError') {
      console.log('Invalid state error, recreating connection to:', from);
      if (peers[from]) {
        peers[from].close();
        delete peers[from];
      }
      setTimeout(() => createOffer(from), 1000);
    }
  }
}
