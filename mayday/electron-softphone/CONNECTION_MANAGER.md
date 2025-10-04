# Connection Manager - Production Grade Reconnection System

## Overview

The Connection Manager is a centralized service that handles all WebSocket, SIP, and AMI connections with production-grade reconnection capabilities. It replaces the previous scattered reconnection logic with a unified, robust system.

## Features

### 🚀 Production-Grade Reconnection
- **Exponential Backoff**: Intelligent retry delays (1s, 2s, 4s, 8s, 16s, 30s max)
- **Max Attempts**: Configurable retry limits (default: 15 attempts)
- **Connection Health Monitoring**: Real-time health checks every 30 seconds
- **Heartbeat System**: Keep-alive messages every 25 seconds

### 🔌 Centralized Connection Management
- **Unified State**: Single source of truth for all connection states
- **Event-Driven**: Real-time updates via EventEmitter
- **Health Scoring**: Overall system health percentage (0-100%)
- **Automatic Recovery**: Self-healing without user intervention

### 📊 Real-Time Monitoring
- **Connection States**: SIP, WebSocket, and AMI status tracking
- **Health Metrics**: Individual and overall connection health
- **Performance Tracking**: Connection latency and failure analysis
- **Visual Indicators**: Real-time health display in UI

## Architecture

### Core Components

1. **ConnectionManager Class**
   - Manages all connection types
   - Handles reconnection logic
   - Provides health monitoring
   - Emits events for UI updates

2. **Enhanced Services**
   - `callMonitoringServiceElectron.js` - WebSocket management
   - `sipService.js` - SIP connection handling
   - Integration with existing AMI services

3. **UI Integration**
   - Real-time health display
   - Enhanced reconnection buttons
   - Connection status indicators

### Connection Types

- **SIP**: Asterisk SIP registration and call handling
- **WebSocket**: Real-time communication with backend
- **AMI**: Asterisk Manager Interface for call control

## Configuration

### Reconnection Settings
```javascript
const config = {
  maxReconnectAttempts: 15,        // Maximum retry attempts
  baseDelay: 1000,                 // Base delay in milliseconds
  maxDelay: 30000,                 // Maximum delay cap
  healthCheckInterval: 30000,      // Health check frequency
  connectionTimeout: 15000,        // Connection timeout
  heartbeatInterval: 25000,        // Heartbeat frequency
  unhealthyThreshold: 3            // Consecutive failures threshold
};
```

### Exponential Backoff Formula
```
delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
```

## Usage

### Basic Integration
```javascript
import connectionManager from '../services/connectionManager';

// Get current status
const status = connectionManager.getConnectionStatus();

// Force reconnection
await connectionManager.forceReconnection();

// Refresh status
const updatedStatus = await connectionManager.refreshStatus();
```

### Event Handling
```javascript
// Listen for connection events
connectionManager.on('connection:stateChanged', ({ type, connected, health }) => {
  console.log(`${type} connection: ${connected ? 'up' : 'down'} (${health})`);
});

connectionManager.on('connection:reconnected', () => {
  console.log('All connections restored');
});

connectionManager.on('connection:maxAttemptsReached', () => {
  console.log('Max reconnection attempts reached');
});
```

## UI Components

### Connection Health Display
- **Green (80-100%)**: All connections healthy
- **Orange (50-79%)**: Some connections degraded
- **Red (0-49%)**: Critical connection issues

### Enhanced Buttons
1. **Force Reconnection (Production Grade)**
   - Initiates complete system reconnection
   - Uses Connection Manager for orchestration
   - Provides real-time feedback

2. **Refresh Connection Status (Production Grade)**
   - Updates all connection health metrics
   - Verifies AMI status
   - Shows comprehensive health information

## Benefits

### 🎯 Reliability
- **Automatic Recovery**: Self-healing connections
- **Intelligent Retries**: Smart backoff strategies
- **Health Monitoring**: Proactive issue detection

### 🚀 Performance
- **Reduced Latency**: Faster connection recovery
- **Eliminated Polling**: Pure event-driven updates
- **Optimized Resources**: Efficient connection management

### 🛠️ Maintainability
- **Centralized Logic**: Single place for connection code
- **Consistent Behavior**: Unified reconnection strategy
- **Easy Debugging**: Comprehensive logging and events

## Migration from Old System

### What Changed
- ❌ Removed scattered reconnection logic
- ❌ Eliminated periodic polling
- ❌ Replaced manual timeout management
- ✅ Added centralized Connection Manager
- ✅ Implemented production-grade reconnection
- ✅ Enhanced health monitoring

### Backward Compatibility
- All existing APIs remain functional
- Enhanced with new capabilities
- Gradual migration path available

## Troubleshooting

### Common Issues

1. **Connection Not Reconnecting**
   - Check `maxReconnectAttempts` configuration
   - Verify network connectivity
   - Review connection manager logs

2. **Health Score Low**
   - Check individual connection states
   - Review health check intervals
   - Verify service configurations

3. **Reconnection Loops**
   - Check for conflicting reconnection logic
   - Verify event handler cleanup
   - Review connection manager state

### Debug Commands
```javascript
// Get detailed connection status
console.log(connectionManager.getConnectionStatus());

// Check individual connection health
console.log(connectionManager.states);

// Monitor reconnection attempts
console.log(connectionManager.reconnectState);
```

## Future Enhancements

### Planned Features
- **Connection Pooling**: Multiple connection endpoints
- **Load Balancing**: Intelligent connection distribution
- **Advanced Metrics**: Detailed performance analytics
- **Custom Policies**: Configurable reconnection strategies

### Integration Opportunities
- **Monitoring Systems**: Prometheus, Grafana integration
- **Alerting**: Slack, email notifications
- **Analytics**: Connection performance insights
- **Automation**: Self-healing workflows

## Conclusion

The Connection Manager provides a robust, production-ready foundation for managing all system connections. It eliminates the previous reconnection issues while providing comprehensive monitoring and self-healing capabilities.

For questions or issues, refer to the connection manager logs and event system for detailed debugging information.
