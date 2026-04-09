// client/src/pages/Home.jsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import RecipeCard from '../components/RecipeCard';
import { FiSun, FiMoon, FiTrendingUp, FiUser } from 'react-icons/fi';

export default function Home({ darkMode, setDarkMode }) {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [forYou, setForYou] = useState([]);

  useEffect(() => {
    axios.get('/posts').then(res => setPosts(res.data.slice(0, 10)));
    axios.get('/recipes').then(res => {
      const trendingRecipes = [...res.data].sort(() => 0.5 - Math.random()).slice(0, 6);
      setTrending(trendingRecipes);
      setForYou(trendingRecipes.slice(0, 4));
    });
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 mb-8 text-white">
              <h2 className="text-2xl font-bold">Welcome back, {user?.username}!</h2>
              <p className="opacity-90">Discover new recipes and share your cooking journey</p>
            </div>

            {/* Trending Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FiTrendingUp className="text-orange-500" />
                <h3 className="text-xl font-bold dark:text-white">Trending Now</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trending.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
              </div>
            </div>

            {/* For You Feed */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FiUser className="text-orange-500" />
                <h3 className="text-xl font-bold dark:text-white">For You</h3>
              </div>
              <div className="space-y-4">
                {posts.map(post => <PostCard key={post.id} post={post} />)}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}