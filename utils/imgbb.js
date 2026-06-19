/**
 * OMNI ImgBB Upload Utility
 * Created by: lordtarrific
 */

const axios = require('axios');
const FormData = require('form-data');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

async function uploadToImgBB(buffer, options = {}) {
  if (!IMGBB_API_KEY) throw new Error('IMGBB_API_KEY not set');

  const form = new FormData();
  form.append('image', Buffer.isBuffer(buffer) ? buffer.toString('base64') : buffer);
  form.append('name', options.filename || 'image');

  const { data } = await axios.post('https://api.imgbb.com/1/upload', form, {
    params: { key: IMGBB_API_KEY },
    headers: form.getHeaders(),
    timeout: 60000
  });

  if (!data?.data?.url) throw new Error('ImgBB upload failed');
  return data.data.url;
}

module.exports = { uploadToImgBB };
