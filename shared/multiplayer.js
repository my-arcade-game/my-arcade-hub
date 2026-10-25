// /shared/multiplayer.js
import { supabase } from './supabase-config.js';

export const Multiplayer = {
    roomCode: null,
    isHost: false,
    myId: null,
    channel: null,
    players: [],
    onPlayersUpdate: null,
    onGameStart: null,

    async init() {
        // 1. Authenticate anonymously so we get a secure UUID
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!session) {
            const { data } = await supabase.auth.signInAnonymously();
            this.myId = data.user?.id;
        } else {
            this.myId = session.user.id;
        }
        
        // 2. Check if we are already in a room (via URL parameter)
        const urlParams = new URLSearchParams(window.location.search);
        const urlRoom = urlParams.get('room');
        if (urlRoom) {
            await this.joinRoom(urlRoom);
        }
    },

    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    },

    async createRoom() {
        this.roomCode = this.generateRoomCode();
        this.isHost = true;

        const { error } = await supabase.from('arcade_rooms').insert([
            { room_code: this.roomCode, host_id: this.myId }
        ]);

        if (error) {
            console.error("Error creating room:", error);
            alert("Failed to create room.");
            return false;
        }

        // Update URL bar for host
        const newUrl = window.location.pathname + '?room=' + this.roomCode;
        window.history.replaceState(null, '', newUrl);

        await this.subscribeToRoom();
        return true;
    },

    async joinRoom(code) {
        code = code.toUpperCase();
        const { data, error } = await supabase.from('arcade_rooms')
            .select('*').eq('room_code', code).single();

        if (error || !data) {
            alert("Room not found!");
            return false;
        }

        this.roomCode = code;
        this.isHost = data.host_id === this.myId;
        await this.subscribeToRoom();
        
        // Update URL so refreshing doesn't lose the room
        const newUrl = window.location.pathname + '?room=' + this.roomCode;
        window.history.replaceState(null, '', newUrl);
        return true;
    },

    async subscribeToRoom() {
        if (this.channel) supabase.removeChannel(this.channel);

        // Enable broadcast: { self: true } so host receives start signal as well
        this.channel = supabase.channel(`room:${this.roomCode}`, {
            config: { 
                presence: { key: this.myId },
                broadcast: { self: true }
            }
        });

        this.channel
            .on('presence', { event: 'sync' }, () => {
                const state = this.channel.presenceState();
                this.players = Object.keys(state);
                if (this.onPlayersUpdate) this.onPlayersUpdate(this.players);
            })
            .on('broadcast', { event: 'start_game' }, (payload) => {
                const gameUrl = payload.payload.gameUrl;
                if (this.onGameStart) {
                    this.onGameStart(gameUrl);
                } else {
                    window.location.href = gameUrl;
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await this.channel.track({ isHost: this.isHost });
                }
            });
    },

    async broadcastStartGame(gamePath) {
        if (!this.isHost || !this.channel) return;
        const gameUrl = `${gamePath}?room=${this.roomCode}`;
        
        // Await websocket broadcast transmission before proceeding
        await this.channel.send({
            type: 'broadcast',
            event: 'start_game',
            payload: { gameUrl }
        });
    }
};