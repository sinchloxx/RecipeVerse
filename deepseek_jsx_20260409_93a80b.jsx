// client/src/App.jsx - Main React Application
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Toaster, toast } from 'react-hot-toast';
import './index.css';

// Context
const AuthContext = createContext();
const SocketContext = createContext();

// API setup
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Explore from './pages/Explore';
import CreatePost from './pages/CreatePost';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import AIKitchen from './pages/AIKitchen';
import RecipeDetail from './pages/RecipeDetail';
import VideoFeed from './pages/VideoFeed';

function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/users/profile').then(res => setUser(res.data)).catch(() => localStorage.removeItem('token'));
    }
  }, []);

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', { auth: { token: localStorage.getItem('token') } });
      newSocket.on('receive_message', (msg) => toast.success(`New message from ${msg.fromId}`));
      newSocket.on('new_notification', (notif) => toast.success(`New ${notif.type} notification`));
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [user]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <SocketContext.Provider value={socket}>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={user ? <Navigate to="/home" /> : <Landing />} />
              <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
              <Route path="/register" element={user ? <Navigate to="/home" /> : <Register />} />
              <Route path="/home" element={user ? <Home darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/" />} />
              <Route path="/explore" element={user ? <Explore /> : <Navigate to="/" />} />
              <Route path="/post" element={user ? <CreatePost /> : <Navigate to="/" />} />
              <Route path="/messages" element={user ? <Messages /> : <Navigate to="/" />} />
              <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/" />} />
              <Route path="/profile/:id?" element={user ? <Profile /> : <Navigate to="/" />} />
              <Route path="/ai-kitchen" element={user ? <AIKitchen /> : <Navigate to="/" />} />
              <Route path="/recipe/:id" element={user ? <RecipeDetail /> : <Navigate to="/" />} />
              <Route path="/videos" element={user ? <VideoFeed /> : <Navigate to="/" />} />
            </Routes>
          </div>
        </BrowserRouter>
      </SocketContext.Provider>
    </AuthContext.Provider>
  );
}

export { AuthContext, SocketContext };
export default App;