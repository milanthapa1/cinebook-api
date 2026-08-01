# CineBook API Backend

Movie ticket booking platform backend API built with Express, TypeScript, and Prisma.

## Features

- **Authentication**: JWT-based auth with refresh tokens, Google OAuth support
- **Movie Management**: CRUD operations for movies with showtimes
- **Seat Booking**: Real-time seat selection with hold mechanism
- **Payment Integration**: Khalti and eSewa payment gateway support
- **Admin Panel**: Full admin capabilities for managing movies, halls, showtimes, and bookings
- **Rate Limiting**: Built-in rate limiting for API protection

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- npm or yarn

## Setup

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"
CLIENT_URL="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
KHALTI_SECRET_KEY="your_khalti_secret_key"
ESEWA_MERCHANT_CODE="your_esewa_merchant_code"
GOOGLE_CLIENT_ID="your_google_client_id" # Optional
```

3. **Set up database**
```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:db-push

# Seed database (optional)
npm run prisma:seed
```

4. **Start development server**
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/google` - Google OAuth login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### Movies
- `GET /api/v1/movies` - Get all movies (with filters)
- `GET /api/v1/movies/:id` - Get movie details

### Showtimes
- `GET /api/v1/showtimes` - Get showtimes (with filters)

### Seats
- `GET /api/v1/seats?showtimeId=xxx` - Get seat availability
- `POST /api/v1/seat-holds` - Hold seats (requires auth)
- `DELETE /api/v1/seat-holds/:id` - Release seat hold (requires auth)

### Bookings
- `POST /api/v1/bookings` - Create booking (requires auth)
- `GET /api/v1/bookings/:id` - Get booking details
- `GET /api/v1/bookings` - Get user bookings (requires auth)

### Payments
- `POST /api/v1/payments/initiate` - Initiate payment
- `POST /api/v1/payments/verify` - Verify payment

### Admin
- `GET /api/v1/admin/dashboard` - Dashboard stats
- `GET /api/v1/admin/movies` - Manage movies
- `GET /api/v1/admin/halls` - Manage halls
- `GET /api/v1/admin/showtimes` - Manage showtimes
- `GET /api/v1/admin/bookings` - Manage bookings
- `GET /api/v1/admin/users` - Manage users
- `GET /api/v1/admin/locations` - Manage locations

## Development

### Running tests
```bash
npm test
```

### Building for production
```bash
npm run build
npm start
```

## Architecture

- **Express.js**: Web framework
- **Prisma**: ORM for database operations
- **TypeScript**: Type safety
- **JWT**: Authentication tokens
- **Zod**: Input validation
- **Cloudinary**: Image storage

## Security Notes

- JWT secrets must be at least 32 characters
- All sensitive endpoints require authentication
- Rate limiting enabled on all routes
- CORS configured for specific origins
- HttpOnly cookies for refresh tokens

## License

MIT
