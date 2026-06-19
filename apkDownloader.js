// apkDownloader.js - APK Download from Aptoide
const axios = require('axios');

module.exports = {
  async download(ctx, appName) {
    try {
      // Use the correct Aptoide API v7 endpoint
      const apiUrl = `https://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(appName)}/limit=1`;

      const response = await axios.get(apiUrl, { 
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const data = response.data;

      // Check if response has expected structure
      if (!data || !data.datalist || !data.datalist.list || !data.datalist.list.length) {
        return { error: 'No APK found for "' + appName + '". Try another app name.' };
      }

      const app = data.datalist.list[0];

      // Validate required fields
      if (!app.file || !app.file.path) {
        return { error: 'APK download link not available for "' + appName + '".' };
      }

      const appSize = (app.size / 1048576).toFixed(2);
      const developerName = app.developer ? app.developer.name : 'Unknown';
      const updatedDate = app.updated || 'Unknown';

      const caption = `📦 ${app.name}
📏 Size: ${appSize} MB
📱 Package: ${app.package}
📅 Updated: ${updatedDate}
👨‍💻 Developer: ${developerName}
🔒 Malware Rank: ${app.file.malware ? app.file.malware.rank : 'Unknown'}`;

      return {
        appName: app.name,
        downloadUrl: app.file.path,  // Direct APK download URL
        downloadUrlAlt: app.file.path_alt,  // Alternative URL
        caption: caption,
        size: appSize,
        package: app.package,
        icon: app.icon || null
      };

    } catch (error) {
      console.error('APK download error:', error.message);
      if (error.response) {
        return { error: 'Aptoide API error: ' + (error.response.data?.info?.status || error.response.status) };
      }
      return { error: 'Failed to fetch APK: ' + error.message };
    }
  }
};
