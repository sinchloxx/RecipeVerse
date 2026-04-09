// client/src/pages/AIKitchen.jsx
import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { FiSend, FiCpu } from 'react-icons/fi';

export default function AIKitchen() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(0);

  const sendMessage = async () => {
    if (!query.trim()) return;
    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);
    try {
      const res = await axios.post('/ai/assistant', { query });
      const aiMsg = { role: 'assistant', content: res.data.recipe, variations: res.data.variations, type: res.data.type };
      setMessages(prev => [...prev, aiMsg]);
      setSelectedVariation(0);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: { title: 'Sorry', instructions: ['Something went wrong. Please try again.'] } }]);
    }
    setLoading(false);
  };

  const RecipeDisplay = ({ recipe, variations, onVariationChange }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mt-2 shadow">
      <h3 className="text-xl font-bold text-orange-600">{recipe.title}</h3>
      {variations && (
        <div className="flex gap-2 mt-2 mb-3 overflow-x-auto">
          {variations.map((v, idx) => (
            <button key={idx} onClick={() => onVariationChange(idx)} className={`px-3 py-1 rounded-full text-sm ${selectedVariation === idx ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              {v.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3">
        <p className="font-semibold">Ingredients:</p>
        <ul className="list-disc list-inside text-sm">
          {(variations?.[selectedVariation]?.ingredients || recipe.ingredients).map((ing, i) => <li key={i}>{ing}</li>)}
        </ul>
      </div>
      <div className="mt-3">
        <p className="font-semibold">Instructions:</p>
        <ol className="list-decimal list-inside text-sm">
          {(variations?.[selectedVariation]?.instructions || recipe.instructions).map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </div>
      <img src={recipe.image} alt={recipe.title} className="mt-3 w-full h-48 object-cover rounded-lg" />
    </div>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FiCpu className="text-3xl text-orange-500" />
          <h1 className="text-3xl font-bold dark:text-white">AI Kitchen Assistant</h1>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-[600px] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <p>Ask me anything about cooking!</p>
                <p className="text-sm">Example: "What can I cook with eggs and rice?" or "Give me a high-protein breakfast"</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700'}`}>
                  {msg.role === 'user' ? msg.content : <RecipeDisplay recipe={msg.content} variations={msg.variations} onVariationChange={(v) => setSelectedVariation(v)} />}
                </div>
              </div>
            ))}
            {loading && <div className="text-center text-gray-500">AI is thinking...</div>}
          </div>
          <div className="p-4 border-t dark:border-gray-700">
            <div className="flex gap-2">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask the AI chef..." className="flex-1 px-4 py-2 rounded-full border dark:bg-gray-700 dark:border-gray-600" />
              <button onClick={sendMessage} className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600"><FiSend /></button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}