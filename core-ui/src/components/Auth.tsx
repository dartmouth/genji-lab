import { useState, useEffect } from "react";

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

const Auth = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/users")
      .then((response) => response.json())
      .then((data) => setUsers(data))
      .catch((error) => console.error("Error fetching users:", error));
  }, []);

  // Generate a simple Base64-encoded JWT
  const generateJWT = (user: User) => {
    const payload = JSON.stringify({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days expiration
    });
    return btoa(payload); // Base64 encode user data
  };

  const handleLogin = (user: User) => {
    const jwt = generateJWT(user);

    // Store JWT in cookie
    document.cookie = `token=${jwt}; path=/; Secure; SameSite=Strict; expires=Fri, 31 Dec 2025 23:59:59 GMT`;

    // Decode manually
    const decodedUser: User = JSON.parse(atob(jwt));
    onLogin(decodedUser);

    setIsOpen(false);
  };

  return (
    isOpen && (
      <div className="auth-dialog">
        <div className="auth-content">
          <h2>Select Your Name</h2>
          <ul>
            {users.map((user) => (
              <li key={user.id} onClick={() => handleLogin(user)}>
                {user.first_name} {user.last_name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  );
};

export default Auth;
