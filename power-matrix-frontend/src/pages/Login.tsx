import React, { useState, useEffect } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

const Login = () => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = "/dashboard";
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <div className="bg-[#10182A] min-h-screen flex flex-col items-center justify-center text-white font-inter">
      {!user ? (
        <div className="bg-[#181F36] p-8 rounded-2xl shadow-md flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4">Sign in with Google</h2>
          <GoogleLogin
            onSuccess={credentialResponse => {
              const decoded = jwtDecode(credentialResponse.credential);
              setUser(decoded);
            }}
            onError={() => {
              alert("Login Failed");
            }}
          />
        </div>
      ) : (
        <div className="bg-[#181F36] p-8 rounded-2xl shadow-md flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4">Welcome, {user.name}</h2>
          <p className="mb-4 text-[#B0B8D1]">{user.email}</p>
          <button
            className="bg-[#0DF6A9] text-[#10182A] px-6 py-2 rounded-lg font-semibold"
            onClick={() => {
              googleLogout();
              setUser(null);
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;