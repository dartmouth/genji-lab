import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuthContext";

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireAuth?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
}

/**
 * ProtectedRoute component that handles authentication and authorization
 *
 * @param children - The component to render if authorized
 * @param requireAuth - Whether authentication is required (default: true)
 * @param requiredRoles - Array of roles that are allowed (e.g., ['admin', 'instructor'])
 * @param redirectTo - Where to redirect if not authorized (default: '/')
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredRoles = [],
  redirectTo = "/",
}) => {
  const { isAuthenticated, user } = useAuth();

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role-based authorization
  if (requiredRoles.length > 0) {
    const userRoles = user?.roles || [];
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      // User is authenticated but doesn't have required role
      return <Navigate to={redirectTo} replace />;
    }
  }

  // User is authorized - render the protected component
  return children;
};

export default ProtectedRoute;
