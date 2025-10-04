# Chrome Web Store Submission Guide for Mayday Bar Extension

## 📦 Extension Package Ready

- **ZIP File**: `mayday-bar-extension.zip` (2.3MB)
- **Version**: 1.0.0
- **Built from**: `dist/` directory

## 🎯 Chrome Web Store Submission Steps

### 1. Developer Account Setup

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Sign in with your Google account
3. Pay the one-time $5.00 registration fee (if not already done)

### 2. Create New Extension Listing

1. Click "Add new item"
2. Upload the `mayday-bar-extension.zip` file
3. Fill in the following details:

### 3. Store Listing Information

#### Basic Information

- **Extension name**: "Mayday Bar"
- **Short description**: "Professional WebRTC softphone for call center agents"
- **Detailed description**:

```
Mayday Bar is a professional WebRTC-based softphone extension designed specifically for call center agents and customer service representatives.

Key Features:
• Make and receive calls directly from your browser
• Advanced call management: transfer, hold, mute, and call history
• Real-time license validation and session management
• Integration with popular CRM platforms (Zoho CRM, custom CRM systems)
• High-quality audio with echo cancellation and noise suppression
• Call history tracking and management
• Agent pause/unpause functionality
• Secure WebRTC communication with STUN/TURN support

Perfect for:
• Call center agents
• Customer service representatives
• Remote workers
• Sales teams
• Support staff

The extension works seamlessly with the Mayday Call Center Software, providing a complete telephony solution for modern call centers.
```

#### Category & Classification

- **Category**: "Productivity"
- **Language**: English
- **Country**: Your target countries

#### Privacy Policy

- **Privacy Policy URL**: `https://maydaycrm.com/privacy-policy`
- **Data Usage**:
  - Microphone access for calls
  - Storage for user preferences and call history
  - Network access for WebRTC communication

### 4. Store Assets

#### Screenshots (Required)

Create screenshots showing:

1. **Login Interface**: Extension login modal
2. **Softphone Bar**: Active softphone interface
3. **Call History**: Call history dialog
4. **Settings**: Audio settings dialog
5. **CRM Integration**: Extension working on Zoho CRM

#### Promotional Images

- **Small tile (440x280px)**: Extension icon with "Mayday Bar" text
- **Large tile (920x680px)**: Softphone interface screenshot
- **Marquee (1400x560px)**: Professional call center scene with softphone

#### Icons

- **128x128px**: Use the existing `logo.png`
- **16x16px**: Scaled version of logo

### 5. Technical Information

#### Permissions Justification

- **storage**: Save user preferences and call history
- **activeTab**: Access current tab for CRM integration
- **scripting**: Inject softphone interface into web pages
- **tabs**: Manage multiple tabs with extension
- **notifications**: Show call notifications

#### Host Permissions

- `http://localhost:8004/*` - Development backend
- `https://*.morvenconsults.com/*` - Production backend
- `http://localhost:8001/*` - Development master server
- `https://mayday-website-backend-c2abb923fa80.herokuapp.com/*` - Production master server
- `*://*.zoho.com/*` - Zoho CRM integration
- `*://cs.lusuku.shop/*` - Custom CRM integration
- `http://localhost:3000/*` - Development environment

### 6. Content Rating

- **Content Rating**: "Everyone"
- **Violence**: None
- **Language**: None
- **Sexual Content**: None

### 7. Additional Information

#### Support

- **Support URL**: `https://maydaycrm.com/support`
- **Homepage URL**: `https://maydaycrm.com`

#### Release Notes

```
Version 1.0.0 - Initial Release
• Professional WebRTC softphone for call center agents
• Advanced call management features (transfer, hold, mute)
• CRM integration with Zoho and custom platforms
• Real-time license validation and session management
• High-quality audio with echo cancellation
• Call history tracking and management
• Agent pause/unpause functionality
• Secure WebRTC communication
```

## 🚀 Submission Checklist

- [ ] Developer account created and fee paid
- [ ] Extension ZIP file ready (`mayday-bar-extension.zip`)
- [ ] Screenshots created (5 required)
- [ ] Promotional images created (3 sizes)
- [ ] Privacy policy URL available
- [ ] Support URL available
- [ ] All store listing information filled out
- [ ] Content rating completed
- [ ] Release notes written

## 📋 Post-Submission

### Review Process

- Google typically reviews extensions within 1-3 business days
- You'll receive email notifications about the review status
- If rejected, address the issues and resubmit

### After Approval

- Extension will be available on Chrome Web Store
- Users can install directly from the store
- Monitor reviews and feedback
- Plan for future updates

## 🔄 Updates

For future updates:

1. Update version in `package.json` and `manifest.json`
2. Rebuild with `npm run build`
3. Create new ZIP file
4. Upload to Chrome Web Store Developer Dashboard
5. Update release notes

## 📞 Support

For technical support or questions about the submission process, contact the development team.
