"use client";

import { LidndUser } from "@/app/authentication";
import { createContext, useContext } from "react";

interface UserProps {
  children: React.ReactNode;
  value: LidndUser;
}

const UserContext = createContext<LidndUser | null>(null);
export const useUser = () => {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return user;
};

export function UserProvider(props: UserProps) {
  return (
    <UserContext.Provider value={props.value}>
      {props.children}
    </UserContext.Provider>
  );
}
