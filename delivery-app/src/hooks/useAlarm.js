import { useState, useEffect, useCallback } from 'react';
import { startAlarmSound, stopAlarmSound, isAlarmActive, isAlarmMuted, toggleMuteAlarm } from '../utils/alarmSound';

export function useAlarm() {
  const [active, setActive] = useState(isAlarmActive());
  const [muted, setMuted] = useState(isAlarmMuted());

  const triggerAlarm = useCallback((type = 'DEALER') => {
    startAlarmSound(type);
    setActive(true);
  }, []);

  const clearAlarm = useCallback(() => {
    stopAlarmSound();
    setActive(false);
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = toggleMuteAlarm();
    setMuted(newMuted);
    if (newMuted) {
      setActive(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAlarmSound();
    };
  }, []);

  return {
    isAlarming: active,
    isMuted: muted,
    triggerAlarm,
    clearAlarm,
    toggleMute
  };
}

