const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas / instance and start server
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed coding problems if the database is empty on startup
    const CodingProblem = require('./models/CodingProblem');
    const problemCount = await CodingProblem.countDocuments();
    if (problemCount === 0) {
      console.log('[Placement Copilot] No coding problems detected in database. Auto-seeding initial 30 original coding problems...');
      const { seedCodingProblems } = require('./scripts/seedCodingProblems');
      await seedCodingProblems({ verbose: false });
      console.log('[Placement Copilot] Coding problem bank successfully seeded.');
    }

    const server = app.listen(PORT, () => {
      console.log(`[Placement Copilot] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[Placement Copilot] Health check available at http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown listeners
    const handleShutdown = (signal) => {
      console.log(`\n[Shutdown] Received ${signal}. Closing HTTP server gracefully...`);
      server.close(() => {
        console.log('[Shutdown] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server Startup Error]:', err.message);
    process.exit(1);
  }
};

startServer();
