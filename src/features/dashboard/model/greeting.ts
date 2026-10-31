"use client";

import { useEffect, useState } from "react";

import { fetchProfile } from "@/features/profile/api/profile";

export type GreetingKey = "dash.greeting.morning" | "dash.greeting.afternoon" | "dash.greeting.evening";

// The greeting for an hour: morning from 5, afternoon from 12, evening from 18
export const greetingKey = (hour: number): GreetingKey => {
  if (hour >= 5 && hour < 12) return "dash.greeting.morning";
  if (hour >= 12 && hour < 18) return "dash.greeting.afternoon";
  return "dash.greeting.evening";
};

// The first word of the account's name, once the profile has answered
export const useFirstName = (): string => {
  const [name, setName] = useState("");
  // Asks the profile once; a page left before the answer ignores it
  useEffect(() => {
    let live = true;
    void fetchProfile().then((profile) => {
      const first = profile?.name?.trim().split(/\s+/u)[0] ?? "";
      if (live) setName(first);
    });
    return () => {
      live = false;
    };
  }, []);
  return name;
};
