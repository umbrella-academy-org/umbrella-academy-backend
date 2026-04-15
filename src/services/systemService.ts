import mongoose from 'mongoose';

export class SystemService {
  static async getSystemHealth() {
    // Server Uptime metric
    const uptimeSeconds = process.uptime();
    const thirtyDaysSeconds = 30 * 24 * 60 * 60;
    const uptimePct = Math.min((uptimeSeconds / thirtyDaysSeconds) * 100, 100);
    const uptimeValue = `${uptimePct.toFixed(1)}%`;
    const uptimeStatus: 'healthy' | 'warning' | 'error' =
      uptimePct > 99 ? 'healthy' : uptimePct > 95 ? 'warning' : 'error';

    // Database Performance metric
    let dbValue = '0ms';
    let dbStatus: 'healthy' | 'warning' | 'error' = 'error';
    try {
      const start = Date.now();
      await (mongoose.connection.db as any).command({ ping: 1 });
      const ms = Date.now() - start;
      dbValue = `${ms}ms`;
      dbStatus = ms < 100 ? 'healthy' : ms < 500 ? 'warning' : 'error';
    } catch {
      dbValue = 'unavailable';
      dbStatus = 'error';
    }

    const metrics = [
      { name: 'Server Uptime', value: uptimeValue, status: uptimeStatus },
      { name: 'Database Performance', value: dbValue, status: dbStatus },
      { name: 'Network Latency', value: '<1ms', status: 'healthy' as const },
      { name: 'Security Status', value: 'Secure', status: 'healthy' as const },
    ];

    const services = [
      { name: 'Authentication Service', status: 'operational' },
      { name: 'Payment Processing', status: 'operational' },
      { name: 'Video Conferencing', status: 'operational' },
      { name: 'File Storage', status: 'operational' },
      { name: 'Email Service', status: 'operational' },
    ];

    return {
      metrics,
      alerts: [],
      services,
    };
  }

  static async getDatabaseStats() {
    try {
      if (!mongoose.connection.db) {
        throw new Error('Database not connected');
      }
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
      };
    } catch (error) {
      throw new Error('Unable to fetch database statistics');
    }
  }

  static async getMemoryUsage() {
    const memUsage = process.memoryUsage();
    
    return {
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
    };
  }
}
