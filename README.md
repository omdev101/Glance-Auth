# Glance Auth

Glance Auth is a facial recognition-based authentication and attendance tracking system. It provides a seamless way for institutions to automate attendance marking through facial detection, complete with comprehensive dashboards for both administrators and students.

## Features

*   **Facial Recognition Attendance**: Automated attendance marking using computer vision.
*   **Role-Based Access Control**: Separate interfaces and privileges for Administrators and Students.
*   **Admin Dashboard**: Manage students, courses, enrollment requests, and view detailed attendance statistics and system settings.
*   **Student Dashboard**: View personal attendance records, monthly statistics, and manage profile data including facial encodings.
*   **Automated Scheduling**: Configure automatic marking of absent students at the end of the day.
## Screenshots

### Portal Entry (Light Mode)
![Portal Entry Light](screenshots/portal-light.png)

### Portal Entry (Dark Mode)
![Portal Entry Dark](screenshots/portal-dark.png)

### Admin Dashboard (Reports)
![Admin Dashboard](screenshots/admin-dashboard.png)

## Technology Stack

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS
*   **Backend**: Python, Flask, Flask-JWT-Extended
*   **Database**: MongoDB
*   **Computer Vision**: `face_recognition` library (dlib)

## Prerequisites

Before running the application, ensure you have the following installed:

*   Node.js (v18 or higher)
*   Python (3.8 or higher)
*   MongoDB (running locally on port 27017, or a valid MongoDB URI)
*   C++ Build Tools (required for compiling the `dlib` dependency for face recognition)

## Local Development Setup

### 1. Database Setup

Ensure your MongoDB service is running. By default, the application will attempt to connect to `mongodb://localhost:27017/attendance_system`.

### 2. Backend Setup

Navigate to the backend directory and install the required dependencies:

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the Flask server
python app.py
```
The backend server will start on `http://localhost:5000`.

### 3. Frontend Setup

In a new terminal window, navigate to the frontend directory:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend application will be available at `http://localhost:8080` (or another port depending on Vite's configuration).

## Hosting and Deployment

### Backend Deployment
For production deployment, the Flask application should be served using a production WSGI server such as Gunicorn or Waitress (for Windows), rather than the built-in Flask development server.

1.  Set the `FLASK_ENV` environment variable to `production`.
2.  Configure a strong `JWT_SECRET_KEY` in the environment variables.
3.  Ensure the server has adequate memory, as the face recognition models are memory-intensive.

### Frontend Deployment
The frontend can be built into a static bundle and served via Nginx, Apache, or any static hosting service (e.g., Vercel, Netlify).

```bash
cd frontend
npm run build
```
The compiled static files will be located in the `frontend/dist` directory.

## Project Structure

*   `/backend`: Contains the Python Flask API, authentication logic, database models, and computer vision modules.
*   `/frontend`: Contains the React application, routing, UI components, and API integration services.

## License

This project is licensed under the MIT License - open for educational purposes, modifications, and general use.
