const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Load environment variables
dotenv.config();

const { sequelize } = require('./db/models');
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Umbrella LMS API',
      version: '1.0.0',
      description: 'Complete API documentation for Umbrella LMS - A personalized learning management system with PostgreSQL',
      contact: {
        name: 'Umbrella LMS Team'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js', './src/db/models.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Routes
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const trainerRoutes = require('./routes/trainer.routes');
const mentorRoutes = require('./routes/mentor.routes');
const fieldRoutes = require('./routes/field.routes');
const companyRoutes = require('./routes/company.routes');
const superAdminRoutes = require('./routes/super-admin.routes');
const roadmapRoutes = require('./routes/roadmap.routes');
const sessionRoutes = require('./routes/session.routes');
const paymentRoutes = require('./routes/payment.routes');
const walletRoutes = require('./routes/wallet.routes');

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Umbrella LMS API is running', database: 'PostgreSQL' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/wallet', walletRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Connect to database and start server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');

    // Sync database (use { alter: true } in dev, { force: false } in prod)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🐘 Database: PostgreSQL @ ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;