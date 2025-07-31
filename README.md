# 🚗 Student Ride Sharing Platform

A modern web application that connects college students for ride sharing, making travel affordable and eco-friendly. Built with Node.js, Express, Firebase, and modern web technologies.

## ✨ Features

### 🔐 Authentication & Security
- **Email OTP Verification**: Secure signup with SendGrid email verification
- **User Authentication**: Login/logout functionality with session management
- **Role-based Access**: Separate interfaces for drivers and passengers

### 🚗 Ride Management
- **Post Rides**: Drivers can create ride offers with location, time, and pricing
- **Search Rides**: Advanced search with location-based filtering
- **Booking System**: Real-time ride booking with confirmation
- **Ride History**: Complete tracking of past rides and statistics

### 📊 Dashboard & Analytics
- **User Dashboard**: Personal statistics and ride history
- **Money Tracking**: Track savings from ride sharing
- **Rating System**: User ratings and reviews
- **Real-time Updates**: Live ride status updates

### 🗺️ Location Services
- **Google Maps Integration**: Interactive maps for ride locations
- **Distance Calculation**: Automatic fare calculation using Haversine formula
- **Location Search**: Autocomplete for pickup and drop-off locations

### 📱 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark Theme**: Modern dark interface for better user experience
- **Intuitive Navigation**: Easy-to-use interface for all users

## 🛠️ Tech Stack

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Web application framework
- **Firebase Admin SDK**: Database and authentication
- **SendGrid**: Email service for OTP verification
- **CORS**: Cross-origin resource sharing

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with custom properties
- **JavaScript (ES6+)**: Client-side functionality
- **Google Maps API**: Location services

### Database
- **Firebase Firestore**: NoSQL cloud database
- **Real-time Updates**: Live data synchronization

### External Services
- **SendGrid**: Email delivery service
- **Google Maps API**: Location and mapping services

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v14 or higher)
- **npm** or **yarn** package manager
- **Firebase Project** with Firestore enabled
- **SendGrid Account** for email services
- **Google Maps API Key** for location services

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd student-ride-sharing
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# Firebase Configuration
FIREBASE_DATABASE_URL=your_firebase_database_url
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket

# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDER_EMAIL=your_verified_sender_email

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 4. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Download your service account key and save it as `serviceAccountKey.json` in the root directory
4. Update the Firebase configuration in `firebase-config.js`

### 5. SendGrid Setup

1. Create a SendGrid account at [SendGrid](https://sendgrid.com/)
2. Generate an API key
3. Verify your sender email address
4. Update the SendGrid configuration in your `.env` file

### 6. Google Maps API

1. Create a Google Cloud Project
2. Enable Maps JavaScript API and Places API
3. Generate an API key
4. Update the API key in your HTML files

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
project/
├── server.js              # Main Express server
├── firebase-config.js     # Firebase configuration
├── sendgrid.js           # Email service configuration
├── haversine.js          # Distance calculation utility
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables
├── serviceAccountKey.json # Firebase service account
├── index.html            # Landing page
├── login.html            # Login page
├── signup.html           # Signup page
├── dashboard.html        # User dashboard
├── otp-verification.html # OTP verification page
├── styles.css            # Global styles
├── index.css             # Landing page styles
├── dashboard.css         # Dashboard styles
├── otp-verification.css  # OTP page styles
├── scripts.js            # Global JavaScript
├── dashboard.js          # Dashboard functionality
└── otp-verification.js   # OTP verification logic
```

## 🔧 API Endpoints

### Authentication
- `POST /api/send-otp` - Send OTP to user email
- `POST /api/verify-otp` - Verify OTP
- `POST /api/save-user` - Save user registration data
- `POST /api/login` - User login

### User Management
- `GET /api/user/:email` - Get user data
- `POST /api/update-user/:email` - Update user statistics

### Ride Management
- `POST /api/save-ride` - Create new ride offer
- `GET /api/search-rides` - Search available rides
- `POST /api/book-ride/:rideId` - Book a ride
- `GET /api/user-rides/:userEmail` - Get user's ride history
- `GET /api/ride-history/:userEmail` - Get detailed ride history

## 🎯 Usage Guide

### For Students (Passengers)
1. **Sign Up**: Create an account with your college email
2. **Verify Email**: Complete OTP verification
3. **Search Rides**: Find available rides to your destination
4. **Book Ride**: Reserve your seat and get confirmation
5. **Track Progress**: Monitor your ride status and history

### For Drivers
1. **Register**: Sign up as a driver with vehicle details
2. **Post Rides**: Create ride offers with pickup/drop-off locations
3. **Manage Bookings**: Accept passenger requests
4. **Track Earnings**: Monitor your ride statistics and earnings

## 🔒 Security Features

- **Email Verification**: All users must verify their email address
- **Secure Authentication**: Password-based login with session management
- **Data Validation**: Server-side validation for all user inputs
- **CORS Protection**: Configured cross-origin resource sharing
- **Environment Variables**: Sensitive data stored in environment variables

## 🌟 Key Features

### Real-time Updates
- Live ride status updates
- Instant booking confirmations
- Real-time user statistics

### Location Services
- Google Maps integration
- Distance-based pricing
- Location autocomplete

### User Experience
- Responsive design for all devices
- Modern dark theme interface
- Intuitive navigation

### Analytics
- Personal ride statistics
- Money saved tracking
- User ratings and reviews

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Firebase** for backend services
- **SendGrid** for email delivery
- **Google Maps** for location services
- **Express.js** for the web framework

## 📞 Support

For support and questions, please contact:
- Email: [your-email@example.com]
- GitHub Issues: [Create an issue](https://github.com/yourusername/student-ride-sharing/issues)

---

**Made with ❤️ for college students** 