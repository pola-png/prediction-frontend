# **App Name**: GoalGazer

## Core Features:

- Multi-source Match Seeding: Import and reconcile match data from football.json and OpenLigaDB to populate the database with fixtures. Detect duplication using combined fields and hash the data.
- Live Score Updates: Continuously update match scores and statuses using OpenLigaDB, focusing on providing real-time data for supported leagues.
- AI-Powered Prediction Engine: Leverage historical data and current team statistics as a tool to predict match outcomes, including win/draw/lose, over/under goals, and both teams to score, enhanced with machine learning for improved accuracy.
- Personalized Prediction Buckets: Customize and refine the grouping of predictions into risk-based buckets (VIP, 2odds, 5odds, big10) based on confidence levels and implied odds to align with diverse user preferences.
- Secured API Endpoints: Implement robust authentication on admin and cron-triggered endpoints, ensuring that data seeding and updates are protected.
- User-Friendly Public APIs: Develop public API endpoints for upcoming matches, live predictions, and recent results, optimizing for ease of integration into existing app frontends, like AppCreate24c.
- Comprehensive Match History: Maintain an exhaustive historical record of match predictions and outcomes to enable continuous performance monitoring and improvement of prediction algorithms.

## Style Guidelines:

- Primary color: Use a saturated blue (#29ABE2) to evoke feelings of trust and reliability, reflecting the data-driven nature of the app.
- Background color: Employ a very light blue (#F0F8FF), almost white, to provide a clean and unobtrusive backdrop that emphasizes content and enhances readability.
- Accent color: Choose a vibrant green (#90EE90) to highlight successful predictions and key data points, creating a positive and encouraging user experience.
- Body and headline font: 'Inter' (sans-serif) for a clean, modern, and easily readable interface.
- Utilize flat, minimalist icons to represent different match outcomes and prediction types, ensuring clarity and quick recognition.
- Implement a clean and organized layout with a focus on data clarity, using visual hierarchies to guide users through match details and prediction probabilities.
- Incorporate subtle animations for live score updates and prediction changes, providing real-time feedback without overwhelming the user.