import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDeviceStatus, refreshDeviceStatus, pingDevice } from '../api/device';

export const DEVICE_KEYS = {
  all: ['device'] as const,
  status: () => [...DEVICE_KEYS.all, 'status'] as const,
  ping: () => [...DEVICE_KEYS.all, 'ping'] as const,
};

export function useDeviceStatus() {
  return useQuery({
    queryKey: DEVICE_KEYS.status(),
    queryFn: getDeviceStatus,
    refetchInterval: 15000, // 15 seconds
    retry: 1,
  });
}

export function useDevicePing() {
  return useQuery({
    queryKey: DEVICE_KEYS.ping(),
    queryFn: pingDevice,
    refetchInterval: 30000,
  });
}

export function useRefreshDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshDeviceStatus,
    onSuccess: (data) => {
      queryClient.setQueryData(DEVICE_KEYS.status(), data);
    },
  });
}
