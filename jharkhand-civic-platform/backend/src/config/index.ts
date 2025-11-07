import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'jharkhand_civic',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  },
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // AWS S3
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'jharkhand-civic-media',
    cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  
  // Notifications
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
  },
  
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@jharkhancivic.gov.in',
  },
  
  // Rate limiting
  rateLimit: {
    anonymous: {
      maxReports: parseInt(process.env.RATE_LIMIT_ANONYMOUS_REPORTS || '5', 10),
      windowHours: parseInt(process.env.RATE_LIMIT_ANONYMOUS_WINDOW || '24', 10),
    },
    authenticated: {
      maxReports: parseInt(process.env.RATE_LIMIT_AUTH_REPORTS || '20', 10),
      windowHours: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '24', 10),
    },
  },
  
  // ML Service
  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://localhost:5000',
    enabled: process.env.ML_SERVICE_ENABLED === 'true',
  },
};
