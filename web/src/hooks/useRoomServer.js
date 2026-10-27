export default function useRoomServer(roomId) {
  return {
    server: 'primary',
    ready: Boolean(roomId),
    error: null,
  };
}
