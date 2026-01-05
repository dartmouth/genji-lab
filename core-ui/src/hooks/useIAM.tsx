import { useState, useEffect, ReactNode, useRef } from "react";
import { useApiClient } from "./useApi";

interface DecodedToken {
  exp?: number;
  id: number;
  first_name: string;
  last_name: string;
  [key: string]: unknown;
}

export const useIAM = () => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const userDialogRef = useRef<HTMLDialogElement | null>(null);

  // Use the API client hook for fetching users
  const users = useApiClient<DecodedToken[]>("/users/");

  // Run only once on component mount
  useEffect(() => {
    const storedToken = getCookie("jwtToken");
    if (storedToken) {
      validateToken(storedToken);
    } else {
      openUserDialog(); // Show user selection dialog if no JWT
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  const getCookie = (name: string): string | null => {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
      const [key, value] = cookie.split("=");
      if (key === name) {
        return decodeURIComponent(value);
      }
    }
    return null;
  };

  const generateJWT = (user: DecodedToken): string => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // Expire in 1 day
      })
    );
    const signature = btoa("mock-signature"); // Not secure! Replace with server-side signing
    return `${header}.${payload}.${signature}`;
  };

  const validateToken = (jwt: string) => {
    const decoded = decodeJWT(jwt);
    if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
      setToken(jwt);
      setUser(decoded);
      setIsAuthenticated(true);
      closeUserDialog(); // Close modal after authentication
    } else {
      openUserDialog();
    }
  };

  const decodeJWT = (jwt: string): DecodedToken | null => {
    try {
      const [, payload] = jwt.split(".");
      if (!payload) return null;
      return JSON.parse(atob(payload));
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  };

  const selectUser = (selectedUser: DecodedToken) => {
    const jwt = generateJWT(selectedUser);
    document.cookie = `jwtToken=${jwt}; path=/; max-age=86400`; // 1-day expiry
    validateToken(jwt);
  };

  const logout = () => {
    document.cookie =
      "jwtToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    openUserDialog();
  };

  // Open the modal dialog
  const openUserDialog = () => {
    if (userDialogRef.current) {
      userDialogRef.current.showModal();
    }
  };

  // Close the modal dialog
  const closeUserDialog = () => {
    if (userDialogRef.current) {
      userDialogRef.current.close();
    }
  };

  // Render the user selection dialog
  const renderUserSelection = (): ReactNode => (
    <dialog ref={userDialogRef} className="user-selection-modal">
      <h3>Select a User</h3>
      {users.loading ? (
        <p>Loading users...</p>
      ) : users.error ? (
        <p>Error loading users: {users.error.message}</p>
      ) : !users.data || !Array.isArray(users.data) ? (
        <p>Error: Invalid user data format</p>
      ) : users.data.length === 0 ? (
        <p>No users available</p>
      ) : (
        <ul>
          {users.data.map((u) => (
            <li key={u.id} onClick={() => selectUser(u)}>
              {u.first_name} {u.last_name}
            </li>
          ))}
        </ul>
      )}
      <button onClick={closeUserDialog}>Cancel</button>
    </dialog>
  );
  return {
    token,
    user,
    isAuthenticated,
    logout,
    renderUserSelection,
  };
};
