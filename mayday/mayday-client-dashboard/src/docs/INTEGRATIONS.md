# Third-Party Integrations Documentation

## Overview

The Third-Party Integrations system allows you to connect external data sources to your call center platform, enabling comprehensive data analysis and reporting. This system supports integration with popular CRM platforms, custom APIs, and external databases.

## Supported Integration Types

### 1. Zoho CRM

**Purpose**: Import leads, contacts, and deals from Zoho CRM
**Data Types**: Leads, Contacts, Deals
**Authentication**: OAuth 2.0 with Access Token and Refresh Token

**Setup Requirements**:

- Zoho Developer Account
- Client ID and Client Secret
- Access Token and Refresh Token
- Base URL (usually `https://www.zohoapis.com`)

**API Endpoints Used**:

- `/crm/v3/Leads` - Lead data
- `/crm/v3/Contacts` - Contact data
- `/crm/v3/Deals` - Deal data

**Documentation**: [Zoho CRM API Documentation](https://www.zoho.com/crm/developer/docs/api/)

### 2. Salesforce

**Purpose**: Sync opportunities, accounts, and contact information
**Data Types**: Leads, Contacts, Opportunities
**Authentication**: OAuth 2.0 with Bearer Token

**Setup Requirements**:

- Salesforce Developer Account
- Client ID and Client Secret
- Access Token
- Instance URL (e.g., `https://yourorg.salesforce.com`)

**API Endpoints Used**:

- `/services/data/v58.0/query` - SOQL queries for data retrieval

**Documentation**: [Salesforce REST API Documentation](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)

### 3. HubSpot

**Purpose**: Import contacts, companies, and deals from HubSpot CRM
**Data Types**: Contacts, Companies, Deals
**Authentication**: Private App Access Token

**Setup Requirements**:

- HubSpot Developer Account
- Private App Access Token
- Base URL (usually `https://api.hubapi.com`)

**API Endpoints Used**:

- `/crm/v3/objects/contacts` - Contact data
- `/crm/v3/objects/companies` - Company data
- `/crm/v3/objects/deals` - Deal data

**Documentation**: [HubSpot API Documentation](https://developers.hubspot.com/docs/api)

### 4. Custom API

**Purpose**: Connect to any REST API endpoint for custom data import
**Data Types**: Custom (user-defined)
**Authentication**: Configurable (API Keys, Bearer Tokens, etc.)

**Setup Requirements**:

- API Base URL
- Authentication credentials (if required)
- Test endpoint and method (optional)

**Features**:

- Support for GET and POST methods
- Custom headers configuration
- Flexible data mapping

### 5. External Database

**Purpose**: Connect directly to external databases for data import
**Data Types**: Custom (based on database schema)
**Authentication**: Database credentials

**Supported Databases**:

- MySQL
- PostgreSQL
- SQLite
- MariaDB

**Setup Requirements**:

- Database host and port
- Database name
- Username and password
- Database type (dialect)

## Getting Started

### Step 1: Access the Integrations Tab

1. Navigate to **Analytics > Reports** in the main dashboard
2. Click on the **Third-Party Integrations** tab
3. Click **Setup New Integration** to begin

### Step 2: Choose Integration Type

1. Select the type of integration you want to set up
2. Review the description and requirements for your chosen integration
3. Click on the integration card to proceed

### Step 3: Configure Settings

1. Enter a descriptive name for your integration
2. Fill in all required configuration fields:
   - **API Credentials**: Access tokens, client IDs, etc.
   - **Connection Details**: Base URLs, instance URLs, etc.
   - **Authentication**: Passwords, secrets, etc.
3. Click **Test Connection** to verify your configuration

### Step 4: Complete Setup

1. Review the connection test results
2. If successful, click **Complete Setup**
3. Your integration is now ready to use

## Managing Integrations

### View All Integrations

1. Click **Manage Integrations** from the Third-Party Integrations tab
2. View all configured integrations in a table format
3. See status, last sync time, and error messages

### Integration Actions

- **Test Connection**: Verify the integration is working
- **Sync Data**: Manually trigger data synchronization
- **Edit Configuration**: Update integration settings
- **Delete Integration**: Remove the integration

### Integration Status

- **Active**: Integration is working correctly
- **Inactive**: Integration is disabled or not configured
- **Error**: Integration has encountered an error

## Data Synchronization

### Automatic Sync

- Integrations automatically sync data based on their configured interval
- Default sync interval is 60 minutes
- Sync intervals can be customized per integration

### Manual Sync

- Use the **Sync Data** button to manually trigger synchronization
- Useful for immediate data updates
- Shows real-time sync progress

### Sync Status

- **Synced**: Data was successfully imported
- **Pending**: Data is queued for sync
- **Failed**: Sync encountered an error

## Data Types and Mapping

### CRM Data Types

- **Leads**: Potential customers and opportunities
- **Contacts**: Customer contact information
- **Deals/Opportunities**: Sales opportunities and transactions
- **Companies**: Business entities and organizations

### Data Fields

Each integration type provides different data fields:

- **Basic Info**: Name, email, phone, company
- **Status**: Lead status, deal stage, contact type
- **Timestamps**: Created date, modified date, last activity
- **Custom Fields**: Integration-specific data

## Security and Best Practices

### API Key Management

- Store API keys securely in the database
- Use environment variables for sensitive configuration
- Rotate API keys regularly
- Monitor API usage and rate limits

### Data Privacy

- Only sync necessary data fields
- Respect data retention policies
- Implement proper access controls
- Audit data access regularly

### Error Handling

- Monitor integration error messages
- Set up alerts for failed syncs
- Implement retry mechanisms
- Log all integration activities

## Troubleshooting

### Common Issues

#### Connection Failures

**Problem**: Integration fails to connect to external system
**Solutions**:

- Verify API credentials are correct
- Check network connectivity
- Ensure API endpoints are accessible
- Verify authentication tokens are valid

#### Data Sync Errors

**Problem**: Data synchronization fails
**Solutions**:

- Check API rate limits
- Verify data format compatibility
- Review error logs for specific issues
- Test with smaller data sets

#### Authentication Issues

**Problem**: Authentication tokens expire or become invalid
**Solutions**:

- Refresh authentication tokens
- Update API credentials
- Check token expiration dates
- Re-authenticate if necessary

### Error Messages

- **"Invalid API Key"**: Check your API credentials
- **"Rate Limit Exceeded"**: Wait before retrying or upgrade API plan
- **"Endpoint Not Found"**: Verify the API endpoint URL
- **"Authentication Failed"**: Check your authentication method

## API Reference

### Integration Endpoints

#### Get All Integrations

```
GET /api/integrations
```

#### Get Integration Templates

```
GET /api/integrations/templates
```

#### Create Integration

```
POST /api/integrations
Content-Type: application/json

{
  "name": "My Zoho Integration",
  "type": "zoho",
  "config": {
    "baseUrl": "https://www.zohoapis.com",
    "accessToken": "your-access-token",
    "refreshToken": "your-refresh-token",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }
}
```

#### Test Integration

```
POST /api/integrations/{id}/test
```

#### Sync Integration Data

```
POST /api/integrations/{id}/sync
```

#### Get Integration Metrics

```
GET /api/integrations/{id}/metrics?startDate=2024-01-01&endDate=2024-12-31
```

### Response Formats

#### Integration Object

```json
{
  "id": 1,
  "name": "My Zoho Integration",
  "type": "zoho",
  "status": "active",
  "config": {
    "baseUrl": "https://www.zohoapis.com",
    "accessToken": "***"
  },
  "lastSync": "2024-01-15T10:30:00Z",
  "syncInterval": 60,
  "errorMessage": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Integration Data Object

```json
{
  "id": 1,
  "integrationId": 1,
  "dataType": "leads",
  "externalId": "12345",
  "data": {
    "id": "12345",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Example Corp"
  },
  "syncStatus": "synced",
  "lastSync": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Support and Resources

### Documentation Links

- [Zoho CRM API](https://www.zoho.com/crm/developer/docs/api/)
- [Salesforce REST API](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)
- [HubSpot API](https://developers.hubspot.com/docs/api)
- [Sequelize ORM](https://sequelize.org/docs/v6/)

### Getting Help

- Check the error logs for detailed information
- Review the integration status in the management interface
- Contact support with specific error messages and integration details
- Provide API documentation links for custom integrations

### Feature Requests

- Submit feature requests through the support system
- Include use cases and requirements
- Provide examples of desired functionality
- Specify integration types and data requirements

## Changelog

### Version 1.0.0 (Current)

- Initial release of Third-Party Integrations system
- Support for Zoho CRM, Salesforce, HubSpot, Custom API, and External Database
- Integration setup wizard with step-by-step configuration
- Real-time data synchronization
- Integration management interface
- Comprehensive error handling and logging

### Planned Features

- Webhook support for real-time data updates
- Advanced data mapping and transformation
- Integration templates for common use cases
- Bulk data import/export functionality
- Integration analytics and performance metrics
- Multi-tenant integration support
