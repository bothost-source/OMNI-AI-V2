// mediafireDownloader.js - MediaFire File Downloader
const axios = require('axios');

module.exports = {
  async download(ctx, url) {
    try {
      // Use GiftedTech API for MediaFire
      const apiUrl = `https://api.giftedtech.co.ke/api/download/mediafire?apikey=gifted&url=${encodeURIComponent(url)}`;

      const response = await axios.get(apiUrl, { 
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const data = response.data;

      if (!data.success) {
        return { error: 'Failed to fetch file from MediaFire. The link may be invalid or expired.' };
      }

      const result = data.result;

      if (!result.dl_link) {
        return { error: 'Download link not found. The MediaFire file may have been removed.' };
      }

      return {
        fileName: result.fileName || 'mediafire_file',
        downloadUrl: result.dl_link,
        fileSize: result.size || 'Unknown',
        mimeType: result.mime || 'application/octet-stream'
      };

    } catch (error) {
      console.error('MediaFire download error:', error.message);
      if (error.response) {
        return { error: 'MediaFire API error: ' + (error.response.data?.message || error.response.status) };
      }
      return { error: 'Failed to download from MediaFire: ' + error.message };
    }
  }
};
