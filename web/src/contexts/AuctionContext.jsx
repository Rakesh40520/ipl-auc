import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { TEAMS } from '../data/teams';
import { IPL_PLAYERS } from '../data/players';
import { useAuth } from './AuthContext';

const AuctionContext = createContext();

export const useAuction = () => {
  const context = useContext(AuctionContext);
  return context || {};
};

export const AuctionProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentAuction, setCurrentAuction] = useState(null);
  const [team, setTeam] = useState(null);
  const [roomTeams, setRoomTeams] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomError, setRoomError] = useState(null);

  const socketRef = useRef(null);
  const activeRoomIdRef = useRef(null);
  const userTokenRef = useRef(user?.uid || null);
  const hostTokenRef = useRef(null);

  // Keep userTokenRef synced with user
  useEffect(() => {
    if (user?.uid) {
      userTokenRef.current = user.uid;
    }
  }, [user?.uid]);

  // Map backend AuctionEngine state snapshot to Shaurya's UI state shape
  const handleStateSync = useCallback((state) => {
    if (!state) return;
    const roomCode = (state.roomCode || '').toUpperCase();
    const defaultPurseCr = (state.config?.defaultPurse || 10000) / 100;
    const savedHostToken = hostTokenRef.current || localStorage.getItem(`host_${roomCode}`);

    // Map teams
    const mappedRoomTeams = (state.teams || []).map((t) => {
      const purseCr = (t.purse || 0) / 100;
      const spentCr = Math.max(0, +(defaultPurseCr - purseCr).toFixed(2));
      return {
        id: `${roomCode}_${t.code}`,
        teamId: t.code,
        teamName: t.name,
        color: t.primaryColor || '#ff5500',
        budgetRemaining: purseCr,
        spent: spentCr,
        isBot: !!t.isBot,
        userToken: t.userToken,
        userName: t.userName,
        squad: (t.squad || []).map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role || 'Player',
          soldPrice: p.price ? +(p.price / 100).toFixed(2) : (p.soldPrice ? +(p.soldPrice / 100).toFixed(2) : 2.0),
          image: p.image || `https://documents.iplt20.com/ipl/IPLHeadshot2024/${(p.name || '').replace(/\s+/g, '')}.png`,
          isOverseas: !!p.isOverseas,
          rating: p.rating || 85
        }))
      };
    });
    setRoomTeams(mappedRoomTeams);

    // Current player details
    let currPlayer = null;
    if (state.currentPlayer) {
      const foundInDb = IPL_PLAYERS.find((p) => p.id === state.currentPlayer.id || p.name === state.currentPlayer.name);
      currPlayer = {
        ...state.currentPlayer,
        basePrice: state.currentPlayer.basePrice ? +(state.currentPlayer.basePrice / 100).toFixed(2) : 2.0,
        image: state.currentPlayer.image || foundInDb?.image || `https://documents.iplt20.com/ipl/IPLHeadshot2025/9.png`,
        isOverseas: !!state.currentPlayer.isOverseas,
        rating: state.currentPlayer.rating || foundInDb?.rating || 85,
        stats: state.currentPlayer.stats || foundInDb?.stats
      };
    }

    // Bid details
    const currentBidCr = state.currentBid ? +(state.currentBid / 100).toFixed(2) : (currPlayer?.basePrice || 0);
    const leadTeamObj = mappedRoomTeams.find((t) => t.teamId === state.leadTeam);

    // UI Auction state
    const uiStatus = state.status === 'lobby' ? 'waiting' : state.status;
    const auctionState = {
      id: roomCode,
      hostId: savedHostToken || state.hostToken,
      hostName: state.hostName || 'Host',
      status: uiStatus,
      auctionType: 'mega',
      squadLimit: 25,
      overseasLimit: 8,
      players: (state.teams || [])
        .filter((t) => t.userName || t.userToken)
        .map((t) => ({
          id: t.userToken || t.code,
          name: t.userName || t.name,
          team: t.code,
          teamName: t.name,
          isHost: t.userToken === (savedHostToken || state.hostToken)
        })),
      currentPlayerIndex: state.currentPlayerIndex || 0,
      totalPlayers: state.totalPlayers || 179,
      currentPlayer: currPlayer,
      currentAuction: {
        playerId: currPlayer?.id,
        currentBid: currentBidCr,
        highBidderTeamId: state.leadTeam || null,
        highBidderName: leadTeamObj?.teamName || state.leadTeam || null,
        highBidderId: leadTeamObj?.userToken || null,
        status: state.status === 'completed' ? 'completed' : (currPlayer ? 'in_progress' : 'waiting'),
        timerEndsAt: state.timerEndsAt || (Date.now() + (state.timer || 10) * 1000),
        round: state.round || 1
      },
      settings: {
        bidTimer: state.config?.timerDuration || 10,
        budget: defaultPurseCr
      },
      results: state.results || [],
      fixtures: state.fixtures || [],
      verdicts: state.verdicts || null,
      simulationRankings: state.simulationRankings || null
    };

    setCurrentAuction(auctionState);
    setRoomError(null);

    // Set current user's team
    const myUid = userTokenRef.current;
    if (myUid) {
      const myTeam = mappedRoomTeams.find((t) => t.userToken === myUid);
      if (myTeam) {
        setTeam(myTeam);
      }
    }
  }, []);

  // Initialize or get persistent socket
  const getSocket = useCallback(() => {
    if (!socketRef.current) {
      const socketUrl = window.location.origin;
      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      socketRef.current.on('connect', () => {
        console.log('[Socket] Connected, ID:', socketRef.current.id);
        if (activeRoomIdRef.current) {
          socketRef.current.emit('join_room', {
            roomCode: activeRoomIdRef.current,
            userToken: userTokenRef.current,
            hostToken: hostTokenRef.current || localStorage.getItem(`host_${activeRoomIdRef.current}`) || null,
            userName: localStorage.getItem('ipl_user_name') || 'Manager'
          });
        }
      });

      socketRef.current.on('state_sync', (state) => {
        handleStateSync(state);
      });

      socketRef.current.on('auction_status_changed', (payload) => {
        if (payload?.status) {
          setCurrentAuction((prev) => prev ? {
            ...prev,
            status: payload.status === 'lobby' ? 'waiting' : payload.status
          } : null);
        }
        if (activeRoomIdRef.current) {
          fetch(`/api/rooms/${activeRoomIdRef.current}`)
            .then(r => r.ok ? r.json() : null)
            .then(s => { if (s) handleStateSync(s); });
        }
      });

      socketRef.current.on('player_presented', () => {
        if (activeRoomIdRef.current) {
          fetch(`/api/rooms/${activeRoomIdRef.current}`)
            .then(r => r.ok ? r.json() : null)
            .then(s => { if (s) handleStateSync(s); });
        }
      });

      socketRef.current.on('bid_placed', () => {
        if (activeRoomIdRef.current) {
          fetch(`/api/rooms/${activeRoomIdRef.current}`)
            .then(r => r.ok ? r.json() : null)
            .then(s => { if (s) handleStateSync(s); });
        }
      });

      socketRef.current.on('player_sold', () => {
        if (activeRoomIdRef.current) {
          fetch(`/api/rooms/${activeRoomIdRef.current}`)
            .then(r => r.ok ? r.json() : null)
            .then(s => { if (s) handleStateSync(s); });
        }
      });

      socketRef.current.on('player_unsold', () => {
        if (activeRoomIdRef.current) {
          fetch(`/api/rooms/${activeRoomIdRef.current}`)
            .then(r => r.ok ? r.json() : null)
            .then(s => { if (s) handleStateSync(s); });
        }
      });

      socketRef.current.on('chat_message', (msg) => {
        setMessages((prev) => [...prev.slice(-49), msg]);
      });
    }
    return socketRef.current;
  }, [handleStateSync]);

  const getSyncedTime = useCallback(() => Date.now(), []);

  // Create room via backend REST API, then join socket
  const createRoom = useCallback(async (
    roomId,
    userId,
    playerDetails,
    auctionType = 'mega',
    isPublic = true
  ) => {
    setLoading(true);
    setRoomError(null);
    try {
      userTokenRef.current = userId;
      localStorage.setItem('ipl_user_name', playerDetails.name || 'Manager');

      const budget = auctionType === 'sprint5' ? 60 : auctionType === 'sprint11' ? 90 : 120;
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: playerDetails.name || 'Manager',
          userToken: userId,
          config: {
            defaultPurse: budget * 100,
            timerDuration: 10,
            botsEnabled: true
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create room');
      }

      const data = await res.json();
      const code = (data.roomCode || '').toUpperCase();
      hostTokenRef.current = data.hostToken;
      try {
        localStorage.setItem(`host_${code}`, data.hostToken);
      } catch { /* ok */ }

      activeRoomIdRef.current = code;
      const socket = getSocket();

      socket.emit('join_room', {
        roomCode: code,
        userToken: userId,
        hostToken: data.hostToken,
        userName: playerDetails.name,
        teamCode: playerDetails.team
      });

      if (playerDetails.team) {
        socket.emit('claim_team', {
          roomCode: code,
          teamCode: playerDetails.team,
          userToken: userId,
          userName: playerDetails.name
        });
      }

      if (data.state) {
        handleStateSync(data.state);
      }

      return {
        id: code,
        server: 'primary',
        hostToken: data.hostToken
      };
    } finally {
      setLoading(false);
    }
  }, [getSocket, handleStateSync]);

  // Join existing room
  const joinAuction = useCallback((roomId, userId) => {
    if (!roomId) return () => {};
    const cleanId = roomId.trim().toUpperCase();
    userTokenRef.current = userId;
    activeRoomIdRef.current = cleanId;
    setLoading(true);
    setRoomError(null);

    const socket = getSocket();
    const storedHostToken = localStorage.getItem(`host_${cleanId}`);
    if (storedHostToken) {
      hostTokenRef.current = storedHostToken;
    }

    // Fetch initial state via REST immediately
    fetch(`/api/rooms/${cleanId}`)
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) {
            setRoomError('Room not found');
            setCurrentAuction(null);
          }
          return null;
        }
        return r.json();
      })
      .then((state) => {
        if (state) {
          handleStateSync(state);
          setRoomError(null);
        }
      })
      .catch((e) => console.warn('[joinAuction] Initial fetch:', e))
      .finally(() => {
        setLoading(false);
      });

    socket.emit('join_room', {
      roomCode: cleanId,
      userToken: userId,
      hostToken: storedHostToken || null,
      userName: localStorage.getItem('ipl_user_name') || 'Manager'
    }, (response) => {
      if (response && !response.success && response.error === 'Room not found') {
        setRoomError('Room not found');
        setCurrentAuction(null);
      } else if (response?.state) {
        handleStateSync(response.state);
        setRoomError(null);
      }
      setLoading(false);
    });

    return () => {};
  }, [getSocket, handleStateSync]);

  // Join room DB wrapper (used by LandingPage and Lobby)
  const joinRoomDb = useCallback(async (roomId, userId, details) => {
    const cleanId = (roomId || '').trim().toUpperCase();
    activeRoomIdRef.current = cleanId;
    userTokenRef.current = userId;
    setLoading(true);
    setRoomError(null);

    const checkRes = await fetch(`/api/rooms/${cleanId}`);
    if (!checkRes.ok) {
      setLoading(false);
      setRoomError('Room not found');
      throw new Error('Room not found. Please check your room code.');
    }
    const state = await checkRes.json();
    handleStateSync(state);
    setLoading(false);

    const socket = getSocket();
    const storedHost = localStorage.getItem(`host_${cleanId}`);

    socket.emit('join_room', {
      roomCode: cleanId,
      userToken: userId,
      hostToken: storedHost || null,
      userName: details?.name || 'Manager',
      teamCode: details?.team || ''
    });

    if (details?.team) {
      socket.emit('claim_team', {
        roomCode: cleanId,
        teamCode: details.team,
        userToken: userId,
        userName: details.name || 'Manager'
      });
    }

    return 'primary';
  }, [getSocket, handleStateSync]);

  // Actions
  const placeBid = useCallback((amount, teamId) => {
    if (!activeRoomIdRef.current) return;
    const socket = getSocket();
    socket.emit('place_bid', {
      roomCode: activeRoomIdRef.current,
      teamCode: teamId || team?.teamId,
      amount: Math.round((amount || 0) * 100)
    });
  }, [getSocket, team]);

  const startAuction = useCallback((roomId) => {
    const code = (roomId || activeRoomIdRef.current || '').toUpperCase();
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    const socket = getSocket();

    socket.emit('host_control', {
      roomCode: code,
      action: 'start',
      hostToken,
      userToken: userTokenRef.current
    }, (res) => {
      if (res?.state) {
        handleStateSync(res.state);
      }
    });

    // Also trigger immediate local poll for snappy response
    setTimeout(() => {
      fetch(`/api/rooms/${code}`)
        .then(r => r.ok ? r.json() : null)
        .then(s => { if (s) handleStateSync(s); });
    }, 200);
  }, [getSocket, handleStateSync]);

  const pauseAuction = useCallback((roomId) => {
    const code = (roomId || activeRoomIdRef.current || '').toUpperCase();
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'pause',
      hostToken,
      userToken: userTokenRef.current
    });
  }, [getSocket]);

  const resumeAuction = useCallback((roomId) => {
    const code = (roomId || activeRoomIdRef.current || '').toUpperCase();
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'resume',
      hostToken,
      userToken: userTokenRef.current
    });
  }, [getSocket]);

  const endPlayerAuction = useCallback((roomId) => {
    const code = (roomId || activeRoomIdRef.current || '').toUpperCase();
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'sell_now',
      hostToken,
      userToken: userTokenRef.current
    });
  }, [getSocket]);

  const endAuction = useCallback((roomId) => {
    const code = (roomId || activeRoomIdRef.current || '').toUpperCase();
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'end_auction',
      hostToken,
      userToken: userTokenRef.current
    });
  }, [getSocket]);

  const fillEmptyTeamsWithBots = useCallback((roomId) => {
    const code = (roomId || activeRoomIdRef.current || '').toUpperCase();
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'fill_bots',
      hostToken,
      userToken: userTokenRef.current
    });
    setTimeout(() => {
      fetch(`/api/rooms/${code}`)
        .then(r => r.ok ? r.json() : null)
        .then(s => { if (s) handleStateSync(s); });
    }, 200);
  }, [getSocket, handleStateSync]);

  const removeBotTeam = useCallback((roomId) => {
    const code = (roomId || activeRoomIdRef.current || '').toUpperCase();
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'clear_bots',
      hostToken,
      userToken: userTokenRef.current
    });
    setTimeout(() => {
      fetch(`/api/rooms/${code}`)
        .then(r => r.ok ? r.json() : null)
        .then(s => { if (s) handleStateSync(s); });
    }, 200);
  }, [getSocket, handleStateSync]);

  const updatePlayerTeam = useCallback((roomId, playerId, teamId) => {
    const code = (roomId || activeRoomIdRef.current || '').toUpperCase();
    const userName = localStorage.getItem('ipl_user_name') || 'Manager';
    getSocket().emit('claim_team', {
      roomCode: code,
      teamCode: teamId,
      userToken: playerId,
      userName
    });
    setTimeout(() => {
      fetch(`/api/rooms/${code}`)
        .then(r => r.ok ? r.json() : null)
        .then(s => { if (s) handleStateSync(s); });
    }, 200);
  }, [getSocket, handleStateSync]);

  const kickPlayer = useCallback((roomId, playerId) => {
    console.log('[kickPlayer] Player removed:', playerId);
  }, []);

  const updateRoomSettings = useCallback((roomId, settings) => {
    console.log('[updateRoomSettings]', settings);
  }, []);

  const value = {
    currentAuction,
    team,
    roomTeams,
    messages,
    loading,
    roomError,
    createRoom,
    joinAuction,
    joinRoomDb,
    placeBid,
    startAuction,
    pauseAuction,
    resumeAuction,
    endPlayerAuction,
    endAuction,
    fillEmptyTeamsWithBots,
    removeBotTeam,
    updatePlayerTeam,
    kickPlayer,
    updateRoomSettings,
    getSyncedTime
  };

  return (
    <AuctionContext.Provider value={value}>
      {children}
    </AuctionContext.Provider>
  );
};
