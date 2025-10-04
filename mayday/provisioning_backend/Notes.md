# Heroku Deployment Guide

## Initial Setup (One-time)

### 1. Prerequisites

- Heroku account created
- Heroku CLI installed
- Git repository initialized

### 2. Initial Deployment Steps

```bash
# Navigate to backend directory
cd backend

# Login to Heroku
heroku login

# Create Heroku app (use lowercase, dashes only)
heroku create mayday-website-backend

# Initialize git if not already done
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit"

# Set Heroku remote
heroku git:remote -a mayday-website-backend

# Push to Heroku
git push heroku master
OR
git push
```

### 3. Environment Variables Setup

Set production environment variables in Heroku:

```bash
# Set all required environment variables
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-netlify-site.netlify.app
heroku config:set MONGODB_URI=mongodb+srv://medhi:UXNtAtY6pEYxrAWh@lusukudb.wsigs.mongodb.net/Mayday_CRM?retryWrites=true&w=majority
heroku config:set JWT_SECRET=mayday-super-secret-jwt-key-2024-secure
heroku config:set JWT_EXPIRE=7d
heroku config:set COOKIE_SECRET=mayday-cookie-secret-2024
heroku config:set SUPER_ADMIN_EMAIL=maydayadmin@mayday.com
heroku config:set SUPER_ADMIN_PASSWORD=MaydayAdmin2024!
```

### 4. Required Files

- `Procfile` - Tells Heroku how to start the app
  ```
  web: node server.js
  ```

## Future Deployments (Code Updates)

### Workflow for Code Changes

1. **Make your code changes** in the backend directory

2. **Test locally** to ensure everything works

   ```bash
   npm start
   ```

3. **Commit your changes**

   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

4. **Push to Heroku**

   ```bash
   git push heroku master:main
   ```

   _(If using main branch: `git push heroku main`)_

5. **Verify deployment**
   ```bash
   heroku open
   ```

### Alternative: Deploy from GitHub

If you prefer to connect your GitHub repository:

1. **Push to GitHub first**

   ```bash
   git push origin master
   ```

2. **Connect GitHub to Heroku** (via Heroku Dashboard)

   - Go to Heroku Dashboard → Your App → Deploy
   - Connect to GitHub repository
   - Enable automatic deploys (optional)

3. **Deploy from GitHub** (manual or automatic)

## Useful Heroku Commands

### View Logs

```bash
# View recent logs
heroku logs

# Follow logs in real-time
heroku logs --tail

# View specific number of lines
heroku logs -n 200
```

### Check App Status

```bash
# Check app info
heroku info

# Check environment variables
heroku config

# Check running processes
heroku ps
```

### Restart App

```bash
# Restart the app
heroku restart
```

### Open App

```bash
# Open in browser
heroku open
```

## Environment Variables Management

### View All Variables

```bash
heroku config
```

### Set New Variable

```bash
heroku config:set VARIABLE_NAME=value
```

### Remove Variable

```bash
heroku config:unset VARIABLE_NAME
```

### Update Variable

```bash
heroku config:set VARIABLE_NAME=new_value
```

## Troubleshooting

### Common Issues

1. **App not starting**

   - Check logs: `heroku logs --tail`
   - Verify `Procfile` exists and is correct
   - Ensure `package.json` has correct start script

2. **Environment variables not working**

   - Check if variables are set: `heroku config`
   - Restart app after setting variables: `heroku restart`

3. **Database connection issues**

   - Verify `MONGODB_URI` is correct
   - Check if MongoDB Atlas allows connections from Heroku IPs

4. **CORS errors**
   - Verify `FRONTEND_URL` is set correctly
   - Check CORS configuration in `app.js`

### Performance Monitoring

```bash
# Check app performance
heroku ps:scale web=1

# View detailed metrics
heroku addons:open scout
```

## Production Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] Database is properly configured
- [ ] CORS settings allow frontend domain
- [ ] Error handling is in place
- [ ] Logging is configured
- [ ] Security headers are set (helmet)
- [ ] Rate limiting is configured (if needed)
- [ ] SSL/HTTPS is enabled (automatic on Heroku)

## Notes

- Heroku automatically assigns a `PORT` environment variable
- The free tier will sleep after 30 minutes of inactivity
- Consider upgrading to paid plan for always-on service
- Use `process.env.PORT` in your server.js (already configured)

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
**App Name:** mayday-website-backend
**Heroku URL:** https://mayday-website-backend-c2abb923fa80.herokuapp.com/
