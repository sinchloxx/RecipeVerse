// client/src/components/RecipeCard.jsx
import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import { FiHeart, FiBookmark, FiClock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function RecipeCard({ recipe, detailed = false }) {
  const { user } = useContext(AuthContext);
  const [saved, setSaved] = useState(false);
  const [variationIndex, setVariationIndex] = useState(0);
  const [variations] = useState([
    { name: 'Classic', ingredients: recipe.ingredients, instructions: recipe.instructions },
    { name: 'Spicy', ingredients: [...recipe.ingredients, '1 tsp chili flakes'], instructions: [...recipe.instructions, 'Add chili flakes'] },
    { name: 'Vegan', ingredients: recipe.tags?.includes('vegan') ? recipe.ingredients : recipe.ingredients.map(i => i.replace('chicken', 'tofu')), instructions: recipe.instructions },
  ]);

  const handleSave = async () => {
    if (saved) await axios.delete(`/saved/${recipe.id}`);
    else await axios.post('/saved', { recipeId: recipe.id });
    setSaved(!saved);
    toast.success(saved ? 'Removed from saved' : 'Saved to collection');
  };

  if (detailed) {
    const currentVariation = variations[variationIndex];
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <img src={recipe.image} alt={recipe.title} className="w-full h-64 object-cover" />
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold dark:text-white">{recipe.title}</h1>
            <button onClick={handleSave} className="text-2xl"><FiBookmark className={saved ? 'fill-orange-500 text-orange-500' : ''} /></button>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1"><FiClock /> {recipe.cookTime}</span>
            <span className="capitalize">{recipe.difficulty}</span>
            <span className="capitalize">{recipe.category}</span>
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {variations.map((v, idx) => (
              <button key={idx} onClick={() => setVariationIndex(idx)} className={`px-3 py-1 rounded-full text-sm ${variationIndex === idx ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {v.name}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Ingredients</h3>
            <ul className="list-disc list-inside space-y-1">
              {currentVariation.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
            </ul>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <ol className="list-decimal list-inside space-y-2">
              {currentVariation.instructions.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link to={`/recipe/${recipe.id}`} className="block group">
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow hover:shadow-xl transition-all duration-300">
        <div className="relative h-48 overflow-hidden">
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
          <button onClick={(e) => { e.preventDefault(); handleSave(); }} className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full">
            <FiBookmark className={saved ? 'fill-orange-500 text-orange-500' : ''} />
          </button>
        </div>
        <div className="p-3">
          <h3 className="font-semibold dark:text-white truncate">{recipe.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            <FiClock /> {recipe.cookTime}
            <span className="capitalize">{recipe.difficulty}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}