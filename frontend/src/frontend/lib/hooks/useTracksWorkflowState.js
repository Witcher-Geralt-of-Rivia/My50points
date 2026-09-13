"use client";

import { useCallback, useEffect, useState } from "react";

export function useTracksWorkflowState(initialTrackSlug = null, initialTicketNum = null) {
  const [expandedSlug, setExpandedSlug] = useState(initialTrackSlug);
  const [activeTicketNum, setActiveTicketNum] = useState(
    initialTicketNum >= 1 && initialTicketNum <= 3 ? initialTicketNum : null,
  );
  const [racesOpen, setRacesOpen] = useState(
    Boolean(initialTrackSlug && initialTicketNum >= 1 && initialTicketNum <= 3),
  );
  const [usageVersion, setUsageVersion] = useState(0);

  useEffect(() => {
    if (initialTrackSlug) setExpandedSlug(initialTrackSlug);
    if (initialTicketNum >= 1 && initialTicketNum <= 3) {
      setActiveTicketNum(initialTicketNum);
      setRacesOpen(true);
    }
  }, [initialTrackSlug, initialTicketNum]);

  const scrollToTrack = useCallback((slug) => {
    if (typeof window === "undefined" || !slug) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`track-panel-${slug}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, []);

  const selectTrack = useCallback(
    (track) => {
      if (!track?.slug) return;
      setExpandedSlug(track.slug);
      setActiveTicketNum(null);
      setRacesOpen(false);
      scrollToTrack(track.slug);
    },
    [scrollToTrack],
  );

  const selectTrackTicket = useCallback(
    (track, num) => {
      if (!track?.slug || num < 1 || num > 3) return;
      setExpandedSlug(track.slug);
      setActiveTicketNum(num);
      setRacesOpen(true);
      scrollToTrack(track.slug);
    },
    [scrollToTrack],
  );

  const selectTrackTab = useCallback((slug) => {
    if (!slug) return;
    setExpandedSlug((prev) => {
      if (prev !== slug) {
        setActiveTicketNum(1);
        setRacesOpen(true);
        scrollToTrack(slug);
      }
      return slug;
    });
  }, [scrollToTrack]);

  const toggleTrack = useCallback((slug) => {
    setExpandedSlug((prev) => {
      const opening = prev !== slug;
      if (opening) {
        setActiveTicketNum(1);
        setRacesOpen(true);
      } else {
        setActiveTicketNum(null);
        setRacesOpen(false);
      }
      return opening ? slug : null;
    });
  }, []);

  const handleTicketSelect = useCallback((num) => {
    setActiveTicketNum((prev) => {
      if (prev === num) {
        setRacesOpen((open) => !open);
        return prev;
      }
      setRacesOpen(true);
      return num;
    });
  }, []);

  const openRaces = useCallback(() => {
    setActiveTicketNum((prev) => prev || 1);
    setRacesOpen(true);
  }, []);

  const bumpUsage = useCallback(() => setUsageVersion((v) => v + 1), []);

  return {
    expandedSlug,
    activeTicketNum,
    racesOpen,
    usageVersion,
    selectTrack,
    selectTrackTicket,
    toggleTrack,
    selectTrackTab,
    handleTicketSelect,
    openRaces,
    bumpUsage,
  };
}
