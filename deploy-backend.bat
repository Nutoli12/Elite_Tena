@echo off
echo ========================================
echo Deploying Elite Tena Backend to Railway
echo ========================================

echo Installing Railway CLI...
npm install -g @railway/cli

echo Logging into Railway...
railway login

echo Creating new Railway project...
railway init

echo Adding PostgreSQL database...
railway add postgresql

echo Deploying backend...
railway up

echo ========================================
echo Backend deployed successfully!
echo Check your Railway dashboard for the URL
echo ========================================
pause