# PhotoMingle Backend

PhotoMingle is a web application that allows users to create and manage events where photos can be shared and downloaded. The application uses facial recognition to match faces in photos with registered users.

## Features

- User authentication (sign-up, login, logout)
- Event management with invitations
- Photo upload with AWS Rekognition for facial recognition
- Email notifications using SendGrid
- MongoDB for data storage

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/profile-image` - Upload profile image and index face

### Events

- `GET /api/events` - Get all events for current user
- `POST /api/events` - Create a new event
- `GET /api/events/:id` - Get a single event
- `PUT /api/events/:id` - Update an event
- `DELETE /api/events/:id` - Delete an event
- `POST /api/events/:id/invitees` - Add invitees to an event
- `DELETE /api/events/:id/invitees/:inviteeId` - Remove an invitee
- `PUT /api/events/:id/invite-response` - Respond to an invitation

### Photos

- `POST /api/photos/upload/:eventId` - Upload photos to an event
- `GET /api/photos/event/:eventId` - Get all photos for an event
- `GET /api/photos/user` - Get photos containing the current user
- `DELETE /api/photos/:id` - Delete a photo

### Invitations

- `POST /api/invite/:eventId` - Send invitations for an event
- `GET /api/invite/verify/:eventId/:code` - Verify an invitation code

### Notifications

- `GET /api/notifications` - Get all notifications for current user
- `PUT /api/notifications/:id/read` - Mark a notification as read
- `DELETE /api/notifications/:id` - Delete a notification

## Setup and Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables (see `.env.example`)
4. Start the server: `npm start`

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT
- `JWT_EXPIRES_IN` - JWT expiration time
- `MONGODB_URI` - MongoDB connection string
- `AWS_REGION` - AWS region
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REKOGNITION_COLLECTION_ID` - AWS Rekognition collection ID
- `SENDGRID_API_KEY` - SendGrid API key
- `EMAIL_FROM` - Email address for sending emails
- `UPLOAD_DIR` - Directory for uploaded files

## Technologies Used

- Node.js/Express
- MongoDB/Mongoose
- AWS Rekognition
- SendGrid
- JWT for authentication