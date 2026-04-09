# RecipeVerse - Full Stack Social Recipe Platform
# Create project directory and install dependencies

mkdir recipeverse && cd recipeverse

# Initialize backend
npm init -y
npm install express cors bcryptjs jsonwebtoken multer socket.io uuid lowdb mongoose morgan helmet express-rate-limit dotenv
npm install --save-dev nodemon

# Initialize frontend with Vite
npm create vite@latest client -- --template react
cd client
npm install axios socket.io-client react-router-dom react-hot-toast framer-motion react-icons react-intersection-observer
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

cd ..