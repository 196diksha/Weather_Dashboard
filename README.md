# Weather Dashboard (React + Open-Meteo)

A responsive two-page weather dashboard using Open-Meteo APIs with browser GPS auto-detection.

## Tech Stack
- React (Vite)
- Open-Meteo Forecast + Air Quality + Archive APIs
- ECharts (zoom + scroll capable charts)

## Run
```bash
npm install
npm run dev
```

Build + lint:
```bash
npm run lint
npm run build
```

## Deploy Live

### Option 1 (Recommended): Vercel
1. Push this folder to GitHub.
2. Go to Vercel dashboard and click **Add New Project**.
3. Import your GitHub repo.
4. Keep defaults:
   - Framework: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click **Deploy**.

`vercel.json` is included so React routes like `/historical` work after refresh.

### Option 2: Netlify
1. Run:
   ```bash
   npm run build
   ```
2. In Netlify, choose **Add new site** -> **Deploy manually**.
3. Drag and drop the `dist` folder.

`public/_redirects` is included, so SPA routes also work on Netlify.

## Implemented Requirements

### Global
- ReactJS app
- Open-Meteo integration
- GPS location detection on first load with fallback handling
- Mobile responsive layout/cards/charts
- Parallel API calls and response caching for faster loads

### Page 1: Current Weather & Hourly Forecast
- Date picker (defaults to today)
- Individual weather variable cards:
  - Temperature: min, max, current
  - Atmospheric: precipitation, relative humidity, UV index
  - Sun cycle: sunrise/sunset
  - Wind & rain chance: max wind speed, precipitation probability max
  - Air quality: US AQI, PM10, PM2.5, CO, CO2, NO2, SO2
- Hourly charts for selected date:
  - Temperature (C/F toggle)
  - Relative humidity
  - Precipitation
  - Visibility
  - Wind speed (10m)
  - PM10 + PM2.5 combined

### Page 2: Historical Range (Max 2 years)
- Separate navigation view
- Start/end date controls with hard 2-year cap enforcement
- Historical charts:
  - Temperature mean/max/min
  - Sunrise/sunset (converted and displayed in IST)
  - Precipitation totals
  - Wind max speed + dominant direction
  - PM10/PM2.5 trends

### Chart Interaction Standards
- Horizontal navigation support
  - Native horizontal scroll containers
  - ECharts data zoom slider
- Zoom-in/out support via dataZoom
- Responsive chart/card layout for mobile

## Notes
- ECharts is used through `echarts-for-react`.
- Open-Meteo field availability can vary by region/time; unavailable values are shown as `N/A`.
