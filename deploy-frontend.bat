@echo off
echo ========================================
echo Deploying Elite Tena Frontend to Vercel
echo ========================================

cd frontend

echo Installing Vercel CLI...
npm install -g vercel

echo Building frontend...
npm run build

echo Deploying to Vercel...
vercel --prod

echo ========================================
echo Frontend deployed successfully!
echo Check your Vercel dashboard for the URL
echo ========================================
pause