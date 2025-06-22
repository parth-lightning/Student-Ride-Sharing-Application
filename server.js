require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sendOTP } = require('./sendgrid');
const { db } = require('./firebase-config');

const app = express();

// Enable CORS for all routes with more permissive settings
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'], // Allow these methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allow these headers
}));

app.use(express.json());

// Serve static files
app.use(express.static('.')); 

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Save user to Firestore
async function saveUserToFirestore(userData) {
  const { 
    email, 
    password, 
    name, 
    role, 
    prn, 
    license = '', 
    vehicle = '', 
    emailVerified = false,
    totalRides = 0,
    moneySaved = 0,
    completed = 0,
    rating = 5
  } = userData;
  
  const userDoc = {
    email,
    password,
    name,
    role,
    prn,
    license,
    vehicle,
    emailVerified,
    totalRides,
    moneySaved,
    completed,
    rating,
    createdAt: new Date()
  };

  await db.collection('users').doc(email).set(userDoc);
}

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log(`Sending OTP to: ${email}`);
    
    // Generate and send OTP
    const otp = await sendOTP(email);
    
    // Store OTP with expiration
    otpStore.set(email, {
      otp,
      expires: Date.now() + 600000 // 10 minutes
    });

    // Clean up OTP after expiration
    setTimeout(() => {
      otpStore.delete(email);
    }, 600000);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }
  
  console.log(`Verifying OTP for: ${email}`);
  
  const storedData = otpStore.get(email);
  
  if (!storedData) {
    return res.status(400).json({ error: 'OTP expired or not found' });
  }
  
  if (storedData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  
  if (Date.now() > storedData.expires) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP expired' });
  }
  
  // Clear OTP after successful verification
  otpStore.delete(email);
  
  res.status(200).json({ message: 'OTP verified successfully' });
});

// Endpoint to save user data
app.post('/api/save-user', async (req, res) => {
  try {
    await saveUserToFirestore(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

// Endpoint to get user data
app.get('/api/user/:email', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.email).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userDoc.data());
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Endpoint to update user data
app.post('/api/update-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { moneySaved, completed } = req.body;

    const userRef = db.collection('users').doc(email);
    await userRef.update({
      moneySaved: moneySaved,
      completed: completed
    });

    res.json({ success: true, message: 'User stats updated successfully' });
  } catch (error) {
    console.error('Error updating user stats:', error);
    res.status(500).json({ error: 'Failed to update user stats' });
  }
});

// Endpoint for user login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userDoc = await db.collection('users').doc(email).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    if (userData.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({
      success: true,
      user: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        emailVerified: userData.emailVerified,
        totalRides: userData.totalRides || 0,
        moneySaved: userData.moneySaved || 0,
        completed: userData.completed || 0,
        rating: userData.rating || 5
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

// Endpoint to save ride data
app.post('/api/save-ride', async (req, res) => {
  try {
    const rideData = {
      ...req.body,
      createdAt: new Date(),
      status: 'active',
      // Convert date strings to Firestore Timestamp
      dateTime: new Date(req.body.dateTime),
      date: req.body.date,
      time: req.body.time,
      // Ensure numbers are stored as numbers
      seats: parseInt(req.body.seats),
      price: parseFloat(req.body.price),
      // Store coordinates as GeoPoint
      fromCoords: {
        latitude: req.body.fromCoords.lat,
        longitude: req.body.fromCoords.lng
      },
      toCoords: {
        latitude: req.body.toCoords.lat,
        longitude: req.body.toCoords.lng
      }
    };

    // Add the ride to Firestore
    const rideRef = await db.collection('rides').add(rideData);
    
    // Update user's total rides count
    const userRef = db.collection('users').doc(rideData.driverEmail);
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists) {
        const userData = userDoc.data();
        transaction.update(userRef, {
          totalRides: (userData.totalRides || 0) + 1
        });
      }
    });
    
    res.json({ 
      success: true, 
      rideId: rideRef.id,
      message: 'Ride posted successfully'
    });
  } catch (error) {
    console.error('Error saving ride:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save ride data. Please try again.' 
    });
  }
});

// Helper function to safely convert Firestore date to ISO string
function safelyConvertDateToISO(dateValue) {
  try {
    if (!dateValue) return null;
    
    let date;
    if (typeof dateValue.toDate === 'function') {
      // Handle Firestore Timestamp
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      // Handle JavaScript Date object
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      // Handle date string
      date = new Date(dateValue);
    } else {
      return null;
    }

    // Validate the date
    return !isNaN(date.getTime()) ? date.toISOString() : null;
  } catch (error) {
    console.error('Error converting date:', error);
    return null;
  }
}

// Endpoint to search rides
app.get('/api/search-rides', async (req, res) => {
  try {
    const { from, to, date } = req.query;
    
    console.log('Search parameters:', { from, to, date });
    
    // Start with base query for active rides
    let query = db.collection('rides')
      .where('status', '==', 'active');

    // Get all active rides first
    const snapshot = await query.get();
    let rides = [];
    
    snapshot.forEach(doc => {
      try {
        const data = doc.data();
        const rideData = {
          id: doc.id,
          from: data.from,
          to: data.to,
          status: data.status,
          price: data.price,
          seats: data.seats,
          driver: data.driver,
          driverEmail: data.driverEmail
        };

        // Handle date fields separately with validation
        rideData.dateTime = safelyConvertDateToISO(data.dateTime);
        if (!rideData.dateTime) {
          console.log(`Skipping ride ${doc.id} due to invalid date`);
          return; // Skip this ride if date is invalid
        }

        // Client-side filtering
        let matchesFilter = true;

        if (from && !rideData.from.toLowerCase().includes(from.toLowerCase())) {
          matchesFilter = false;
        }
        if (to && !rideData.to.toLowerCase().includes(to.toLowerCase())) {
          matchesFilter = false;
        }
        if (date) {
          const searchDate = new Date(date);
          const rideDate = new Date(rideData.dateTime);
          
          // Compare only the date part (ignore time)
          if (searchDate.toDateString() !== rideDate.toDateString()) {
            matchesFilter = false;
          }
        }

        if (matchesFilter) {
          // Handle coordinates safely
          if (data.fromCoords) {
            rideData.fromCoords = {
              lat: data.fromCoords.latitude || data.fromCoords.lat || 0,
              lng: data.fromCoords.longitude || data.fromCoords.lng || 0
            };
          }
          if (data.toCoords) {
            rideData.toCoords = {
              lat: data.toCoords.latitude || data.toCoords.lat || 0,
              lng: data.toCoords.longitude || data.toCoords.lng || 0
            };
          }
          
          rides.push(rideData);
        }
      } catch (docError) {
        console.error('Error processing ride document:', docError, 'Document ID:', doc.id);
      }
    });

    // Sort rides by date and time
    rides.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      return dateA - dateB;
    });
    
    console.log(`Found ${rides.length} matching rides`);
    
    res.json({ 
      success: true,
      rides,
      searchCriteria: { from, to, date }
    });
  } catch (error) {
    console.error('Error searching rides:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to search rides. Please try again.',
      details: error.message
    });
  }
});

// Endpoint to get user's ride history
app.get('/api/user-rides/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    let rides = [];
    try {
      // Try to get all rides where the user is either the driver or passenger
      const ridesSnapshot = await db.collection('rides')
        .where('status', 'in', ['completed', 'cancelled'])
        .orderBy('dateTime', 'desc')
        .get();
      
      ridesSnapshot.forEach(doc => {
        const rideData = {
          id: doc.id,
          ...doc.data()
        };
        
        // Include ride if user is either driver or passenger
        if (rideData.driverEmail === userEmail || rideData.passengerEmail === userEmail) {
          // Convert Firestore Timestamp to ISO string
          if (rideData.dateTime && typeof rideData.dateTime.toDate === 'function') {
            rideData.dateTime = rideData.dateTime.toDate().toISOString();
          }
          // Convert coordinates
          if (rideData.fromCoords) {
            rideData.fromCoords = {
              lat: rideData.fromCoords.latitude || rideData.fromCoords.lat,
              lng: rideData.fromCoords.longitude || rideData.fromCoords.lng
            };
          }
          if (rideData.toCoords) {
            rideData.toCoords = {
              lat: rideData.toCoords.latitude || rideData.toCoords.lat,
              lng: rideData.toCoords.longitude || rideData.toCoords.lng
            };
          }
          rides.push(rideData);
        }
      });
    } catch (error) {
      // If index error occurs, fall back to getting all rides and filtering manually
      if (error.code === 9) {
        console.log('Index not ready, falling back to manual filtering...');
        const ridesSnapshot = await db.collection('rides').get();
        
        ridesSnapshot.forEach(doc => {
          const rideData = {
            id: doc.id,
            ...doc.data()
          };
          
          // Include ride if user is either driver or passenger and status matches
          if ((rideData.driverEmail === userEmail || rideData.passengerEmail === userEmail) &&
              (rideData.status === 'completed' || rideData.status === 'cancelled')) {
            // Convert Firestore Timestamp to ISO string
            if (rideData.dateTime && typeof rideData.dateTime.toDate === 'function') {
              rideData.dateTime = rideData.dateTime.toDate().toISOString();
            }
            // Convert coordinates
            if (rideData.fromCoords) {
              rideData.fromCoords = {
                lat: rideData.fromCoords.latitude || rideData.fromCoords.lat,
                lng: rideData.fromCoords.longitude || rideData.fromCoords.lng
              };
            }
            if (rideData.toCoords) {
              rideData.toCoords = {
                lat: rideData.toCoords.latitude || rideData.toCoords.lat,
                lng: rideData.toCoords.longitude || rideData.toCoords.lng
              };
            }
            rides.push(rideData);
          }
        });
        
        // Sort manually by dateTime in descending order
        rides.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      } else {
        throw error;
      }
    }
    
    res.json({ rides });
  } catch (error) {
    console.error('Error fetching user rides:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch ride history. Please try again.' 
    });
  }
});

// Endpoint to book a ride
app.post('/api/book-ride/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;
    const { userEmail } = req.body;

    console.log('Booking ride:', { rideId, userEmail });

    // Get the ride document
    const rideRef = db.collection('rides').doc(rideId);
    const rideDoc = await rideRef.get();

    if (!rideDoc.exists) {
      console.log('Ride not found:', rideId);
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }

    const rideData = rideDoc.data();
    console.log('Found ride data:', rideData);

    // Check if ride is already booked
    if (rideData.status !== 'active') {
      console.log('Ride not available:', rideData.status);
      return res.status(400).json({
        success: false,
        error: 'Ride is no longer available'
      });
    }

    try {
      // Create a ride history record
      const rideHistoryData = {
        rideId,
        from: rideData.from,
        to: rideData.to,
        dateTime: rideData.dateTime,
        price: rideData.price,
        driverEmail: rideData.driverEmail,
        passengerEmail: userEmail,
        driver: rideData.driver,
        status: 'booked',
        bookedAt: new Date(),
        fromCoords: rideData.fromCoords || {
          latitude: rideData.fromCoords?.lat || 0,
          longitude: rideData.fromCoords?.lng || 0
        },
        toCoords: rideData.toCoords || {
          latitude: rideData.toCoords?.lat || 0,
          longitude: rideData.toCoords?.lng || 0
        },
        rating: 0
      };

      console.log('Creating ride history:', rideHistoryData);

      // Add to rideHistory collection first
      const historyRef = await db.collection('rideHistory').add(rideHistoryData);
      console.log('Created ride history document:', historyRef.id);

      // Update ride status
      await rideRef.update({
        status: 'booked',
        passengerEmail: userEmail,
        bookedAt: new Date()
      });
      console.log('Updated ride status');

      // Update user stats
      const userRef = db.collection('users').doc(userEmail);
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const userData = userDoc.data();
          transaction.update(userRef, {
            totalRides: (userData.totalRides || 0) + 1
          });
        }
      });
      console.log('Updated user stats');

      res.json({
        success: true,
        message: 'Ride booked successfully',
        historyId: historyRef.id
      });
    } catch (error) {
      console.error('Error in database operations:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error booking ride:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book ride. Please try again.'
    });
  }
});

// Endpoint to get user's ride history
app.get('/api/user-ride-history/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    // Get user's ride history subcollection
    const historySnapshot = await db.collection('users')
      .doc(userEmail)
      .collection('rideHistory')
      .orderBy('dateTime', 'desc')
      .get();

    const rides = [];
    
    historySnapshot.forEach(doc => {
      const rideData = {
        id: doc.id,
        ...doc.data()
      };

      // Convert Firestore Timestamp to ISO string
      if (rideData.dateTime && typeof rideData.dateTime.toDate === 'function') {
        rideData.dateTime = rideData.dateTime.toDate().toISOString();
      }
      if (rideData.bookedAt && typeof rideData.bookedAt.toDate === 'function') {
        rideData.bookedAt = rideData.bookedAt.toDate().toISOString();
      }

      // Convert coordinates if they exist
      if (rideData.fromCoords) {
        rideData.fromCoords = {
          lat: rideData.fromCoords.latitude || rideData.fromCoords.lat,
          lng: rideData.fromCoords.longitude || rideData.fromCoords.lng
        };
      }
      if (rideData.toCoords) {
        rideData.toCoords = {
          lat: rideData.toCoords.latitude || rideData.toCoords.lat,
          lng: rideData.toCoords.longitude || rideData.toCoords.lng
        };
      }

      rides.push(rideData);
    });

    res.json({ 
      success: true,
      rides 
    });
  } catch (error) {
    console.error('Error fetching ride history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch ride history. Please try again.' 
    });
  }
});

// Endpoint to get ride history for a user
app.get('/api/ride-history/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    console.log('Fetching ride history for:', userEmail);

    // Query rides where user is either driver or passenger
    const rideHistoryRef = db.collection('rideHistory');
    const [driverRides, passengerRides] = await Promise.all([
      rideHistoryRef.where('driverEmail', '==', userEmail).get(),
      rideHistoryRef.where('passengerEmail', '==', userEmail).get()
    ]);

    const rides = [];

    // Process driver rides
    driverRides.forEach(doc => {
      const data = doc.data();
      rides.push({
        ...data,
        id: doc.id,
        dateTime: data.dateTime?.toDate?.()?.toISOString() || data.dateTime,
        bookedAt: data.bookedAt?.toDate?.()?.toISOString() || data.bookedAt,
        role: 'driver'
      });
    });

    // Process passenger rides
    passengerRides.forEach(doc => {
      const data = doc.data();
      rides.push({
        ...data,
        id: doc.id,
        dateTime: data.dateTime?.toDate?.()?.toISOString() || data.dateTime,
        bookedAt: data.bookedAt?.toDate?.()?.toISOString() || data.bookedAt,
        role: 'passenger'
      });
    });

    // Sort rides by dateTime in descending order
    rides.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

    console.log(`Found ${rides.length} rides for user:`, userEmail);

    res.json({
      success: true,
      rides
    });
  } catch (error) {
    console.error('Error fetching ride history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ride history'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});