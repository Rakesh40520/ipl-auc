import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { TEAMS } from '../data/teams';
import { IPL_PLAYERS } from '../data/players';

const AuctionContext = createContext();

export const useAuction = () => {
  const context = useContext(AuctionContext);
  return context || {};
};

export const AuctionProvider = ({ children }) => {
  const [currentAuction, setCurrentAuction] = useState(null);
  const [team, setTeam] = useState(null);
  const [roomTeams, setRoomTeams] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const socketRef = useRef(null);
  const activeRoomIdRef = useRef(null);
  const userTokenRef = useRef(null);
  const hostTokenRef = useRef(null);

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
        console.log('[Socket] Connected to server, ID:', socketRef.current.id);
        if (activeRoomIdRef.current) {
          socketRef.current.emit('join_room', {
            roomCode: activeRoomIdRef.current,
            userToken: userTokenRef.current,
            userName: localStorage.getItem('ipl_user_name') || 'Manager'
          });
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
      });

      socketRef.current.on('state_sync', (state) => {
        handleStateSync(state);
      });

      socketRef.current.on('chat_message', (msg) => {
        setMessages((prev) => [...prev.slice(-49), msg]);
      });
    }
    return socketRef.current;
  }, []);

  // Map backend AuctionEngine state snapshot to Shaurya's UI state shape
  const handleStateSync = useCallback((state) => {
    if (!state) return;
    const roomCode = state.roomCode;
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
        image: state.currentPlayer.image || foundInDb?.image || `https://documents.iplt20.com/ipl/IPLHeadshot2024/${(state.currentPlayer.name || '').replace(/\s+/g, '')}.png`,
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

    // Set current user's team
    const myUid = userTokenRef.current;
    if (myUid) {
      const myTeam = mappedRoomTeams.find((t) => t.userToken === myUid);
      if (myTeam) {
        setTeam(myTeam);
      }
    }
  }, []);

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
      const code = data.roomCode;
      hostTokenRef.current = data.hostToken;
      try {
        localStorage.setItem(`host_${code}`, data.hostToken);
      } catch { /* ok */ }

      activeRoomIdRef.current = code;
      const socket = getSocket();

      socket.emit('join_room', {
        roomCode: code,
        userToken: userId,
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
    userTokenRef.current = userId;
    activeRoomIdRef.current = roomId;

    const socket = getSocket();
    const storedHostToken = localStorage.getItem(`host_${roomId}`);
    if (storedHostToken) {
      hostTokenRef.current = storedHostToken;
    }

    // Fetch initial state via REST immediately
    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((state) => {
        if (state) handleStateSync(state);
      })
      .catch((e) => console.warn('[joinAuction] Initial fetch:', e));

    socket.emit('join_room', {
      roomCode: roomId,
      userToken: userId,
      userName: localStorage.getItem('ipl_user_name') || 'Manager'
    });

    return () => {
      // Keep socket open, just clean references
    };
  }, [getSocket, handleStateSync]);

  // Join room DB wrapper (used by LandingPage and Lobby)
  const joinRoomDb = useCallback(async (roomId, userId, details) => {
    activeRoomIdRef.current = roomId;
    userTokenRef.current = userId;
    const socket = getSocket();

    socket.emit('join_room', {
      roomCode: roomId,
      userToken: userId,
      userName: details?.name || 'Manager',
      teamCode: details?.team || ''
    });

    if (details?.team) {
      socket.emit('claim_team', {
        roomCode: roomId,
        teamCode: details.team,
        userToken: userId,
        userName: details.name || 'Manager'
      });
    }

    return 'primary';
  }, [getSocket]);

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
    const code = roomId || activeRoomIdRef.current;
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'start',
      hostToken
    });
  }, [getSocket]);

  const pauseAuction = useCallback((roomId) => {
    const code = roomId || activeRoomIdRef.current;
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'pause',
      hostToken
    });
  }, [getSocket]);

  const resumeAuction = useCallback((roomId) => {
    const code = roomId || activeRoomIdRef.current;
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'resume',
      hostToken
    });
  }, [getSocket]);

  const endPlayerAuction = useCallback((roomId) => {
    const code = roomId || activeRoomIdRef.current;
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'sell_now',
      hostToken
    });
  }, [getSocket]);

  const endAuction = useCallback((roomId) => {
    const code = roomId || activeRoomIdRef.current;
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'end_auction',
      hostToken
    });
  }, [getSocket]);

  const fillEmptyTeamsWithBots = useCallback((roomId) => {
    const code = roomId || activeRoomIdRef.current;
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'fill_bots',
      hostToken
    });
  }, [getSocket]);

  const removeBotTeam = useCallback((roomId) => {
    const code = roomId || activeRoomIdRef.current;
    const hostToken = hostTokenRef.current || localStorage.getItem(`host_${code}`);
    getSocket().emit('host_control', {
      roomCode: code,
      action: 'clear_bots',
      hostToken
    });
  }, [getSocket]);

  const updatePlayerTeam = useCallback((roomId, playerId, teamId) => {
    const code = roomId || activeRoomIdRef.current;
    const userName = localStorage.getItem('ipl_user_name') || 'Manager';
    getSocket().emit('claim_team', {
      roomCode: code,
      teamCode: teamId,
      userToken: playerId,
      userName
    });
  }, [getSocket]);

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
    loading: false,
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
