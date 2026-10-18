import { z } from 'zod';

export const RoomConfigSchema = z.object({
  defaultPurse: z.number().min(1000).max(25000).default(12000), // in Lakhs
  minSquad: z.number().min(10).max(25).default(18),
  maxSquad: z.number().min(15).max(30).default(25),
  maxOverseas: z.number().min(4).max(10).default(8),
  minPlayerBasePrice: z.number().min(10).max(100).default(30),
  timerDuration: z.number().min(5).max(30).default(10),
  botsEnabled: z.boolean().default(false),
  rtmEnabled: z.boolean().default(false)
});

export const CreateRoomSchema = z.object({
  hostName: z.string().trim().min(1).max(50),
  userToken: z.string().optional().nullable(),
  config: RoomConfigSchema.partial().optional().nullable()
});

export const JoinRoomSchema = z.object({
  roomCode: z.string().trim().toUpperCase().min(1).max(20),
  userName: z.string().trim().min(1).max(50),
  userToken: z.string().optional().nullable(),
  hostToken: z.string().optional().nullable()
});

export const ClaimTeamSchema = z.object({
  roomCode: z.string().trim().toUpperCase(),
  teamCode: z.string().trim().toUpperCase(),
  userToken: z.string().min(1),
  userName: z.string().trim().min(1).max(50)
});

export const LeaveTeamSchema = z.object({
  roomCode: z.string().trim().toUpperCase(),
  teamCode: z.string().trim().toUpperCase(),
  userToken: z.string().min(1)
});

export const PlaceBidSchema = z.object({
  roomCode: z.string().trim().toUpperCase(),
  teamCode: z.string().trim().toUpperCase(),
  userToken: z.string().min(1)
});

export const HostControlSchema = z.object({
  roomCode: z.string().trim().toUpperCase(),
  hostToken: z.string().optional().nullable(),
  userToken: z.string().optional().nullable(),
  teamCode: z.string().optional().nullable(),
  action: z.enum(['start', 'pause', 'resume', 'skip', 'unsold', 'undo', 'sell_now', 'next_player', 'update_config', 'fill_bots', 'clear_bots', 'toggle_bots', 'close_room', 'release_team']),
  configUpdate: RoomConfigSchema.partial().optional().nullable()
});
